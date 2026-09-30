# ── Windows asyncio fix (must be FIRST, before any other imports) ─────────────
# Python 3.11+ on Windows defaults to ProactorEventLoop which has a known bug
# causing "AttributeError: 'NoneType' object has no attribute 'close'" on
# shutdown/WebSocket use. WindowsSelectorEventLoopPolicy resolves this.
import sys
if sys.platform == "win32":
    import asyncio as _asyncio
    _asyncio.set_event_loop_policy(_asyncio.WindowsSelectorEventLoopPolicy())
# ──────────────────────────────────────────────────────────────────────────────

"""
main.py — FastAPI server and streaming hub for FloodScout CV pipeline.

Person detection uses OpenCV's built-in HOG + SVM people detector.
No external model weights, no YOLO, no Ultralytics dependency.

Detection scores reported by HOG + SVM are raw SVM decision margin weights
(not probabilistic confidence percentages). The HOG_DETECTION_THRESHOLD
environment variable controls the minimum score; the useful range is 0.0–1.5.
This is fundamentally different from YOLO confidence (0.0–1.0 as probability).

Endpoints:
  - GET       /health              -> Health check & vision AI readiness
  - GET       /camera/status       -> Camera connection status & detector metadata
  - GET       /detection/status    -> Current real-time detection state & alert flag
  - GET       /detection/history   -> Historical detection events (debounced)
  - POST      /detection/threshold -> Update HOG hit threshold on the fly
  - GET       /video_feed          -> MJPEG stream with HOG bounding boxes rendered
  - GET       /incidents           -> List captured rescue incidents
  - GET       /incidents/{id}      -> Get details for a specific incident
  - GET       /captures/{filename} -> Safely retrieve captured incident imagery
  - WebSocket /ws/incidents        -> Real-time event push for new/updated incidents
"""

import asyncio
import os
import sys
import time
import datetime
import threading
import logging
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

try:
    from dotenv import load_dotenv
    # Load .env relative to this file first, then fallback to current working directory
    backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(backend_env):
        load_dotenv(dotenv_path=backend_env, override=True)
    load_dotenv()
except ImportError:
    pass

import cv2
import numpy as np
from fastapi import FastAPI, Query, HTTPException, Body, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse

from camera import USBCameraSource, IPCameraSource, create_unavailable_frame
from detector import PersonDetector
from vision import VisionAnalyzer
from incident_manager import IncidentManager
from serial_bridge import XiaoSerialBridge
from pan_tilt import get_pan_tilt_controller, SUPPORTED_COMMANDS, PanTiltController
from pydantic import BaseModel, Field

# ── N-frame skip: run HOG every Nth frame, redraw cached boxes on skipped frames ─
DETECT_EVERY_N_FRAMES = 2  # 1 = every frame, 2 = detect ~15x/sec at 30 FPS stream


def draw_cached_boxes(frame: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
    """Re-draw previously computed bounding boxes onto a fresh camera frame.

    Called on skipped (non-detection) frames to keep the stream looking annotated
    without paying the HOG detection cost every frame.
    """
    out = frame.copy()
    for det in detections:
        x, y, w, h = det.get("x", 0), det.get("y", 0), det.get("w", 0), det.get("h", 0)
        pid = det.get("id", "?")
        score = det.get("confidence", 0.0)
        # Green bounding box
        cv2.rectangle(out, (x, y), (x + w, y + h), (0, 255, 0), 2)
        label = f"Person #{pid}  {score:.2f}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        cv2.rectangle(out, (x, y - th - 8), (x + tw + 6, y), (0, 200, 0), -1)
        cv2.putText(out, label, (x + 3, y - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2, cv2.LINE_AA)
    return out

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("floodscout-backend")

# ── Environment configuration ──────────────────────────────────────────────────
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
CAMERA_URL = (os.getenv("CAMERA_URL") or "").strip()

# HOG_DETECTION_THRESHOLD: minimum SVM decision score to count as a detection.
# Range: typically 0.0 (boundary) – 1.5 (very strict). Default 0.0.
# NOTE: This is NOT equivalent to YOLO confidence (0–100%). HOG scores are raw
#       SVM margin weights; they do not map to probability percentages.
HOG_DETECTION_THRESHOLD = float(os.getenv("HOG_DETECTION_THRESHOLD", "0.0"))
HOG_MODE = os.getenv("HOG_MODE", "fast")  # fast | balanced | accurate

# Backward-compatible alias — if user set CONFIDENCE_THRESHOLD but not HOG_DETECTION_THRESHOLD,
# use CONFIDENCE_THRESHOLD as a starting point (clamped to sane HOG range).
_legacy_threshold = os.getenv("CONFIDENCE_THRESHOLD")
if _legacy_threshold is not None and os.getenv("HOG_DETECTION_THRESHOLD") is None:
    try:
        _val = float(_legacy_threshold)
        # YOLO confidence 0.5 → HOG threshold 0.0 (much more lenient starting point)
        HOG_DETECTION_THRESHOLD = max(0.0, min(1.5, _val * 0.5))
        logger.info(
            f"CONFIDENCE_THRESHOLD={_legacy_threshold} detected (legacy YOLO setting). "
            f"Mapped to HOG_DETECTION_THRESHOLD={HOG_DETECTION_THRESHOLD:.3f}."
        )
    except ValueError:
        pass

ALERT_COOLDOWN = float(os.getenv("ALERT_COOLDOWN", "3.0"))
DETECTION_COOLDOWN = float(os.getenv("DETECTION_COOLDOWN", "5.0"))
CLEAR_HOLD_SECONDS = float(os.getenv("CLEAR_HOLD_SECONDS", "3.0"))
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
CAPTURES_DIR = os.getenv("CAPTURES_DIR", "captures")


# ── Shared Global State ────────────────────────────────────────────────────────
class PipelineState:
    def __init__(self):
        self.lock = threading.Lock()
        self.camera_source: Optional[USBCameraSource] = None
        self.detector: Optional[PersonDetector] = None
        self.vision_analyzer: Optional[VisionAnalyzer] = None
        self.incident_manager: Optional[IncidentManager] = None
        self.serial_bridge: Optional[XiaoSerialBridge] = None
        self.pan_tilt_controller: PanTiltController = get_pan_tilt_controller()
        self.running = False

        # Current frame JPEG bytes for streaming
        self.latest_jpeg: Optional[bytes] = None
        self.frame_ready_event = threading.Event()

        # Streaming telemetry
        self.stream_fps: float = 0.0
        self._stream_fps_counter: int = 0
        self._stream_fps_timer: float = 0.0

        # Detection metadata
        self.current_summary: Dict[str, Any] = {
            "personDetected": False,
            "personCount": 0,
            "highestConfidence": 0.0,
            "timestamp": datetime.datetime.now().isoformat(),
            "alertActive": False,
            "detections": []
        }

        # Alert debouncing
        self.last_alert_time: float = 0.0
        self.alert_cooldown: float = ALERT_COOLDOWN

        # Detection history log (latest 50 events)
        self.history: List[Dict[str, Any]] = []
        self.logged_person_ids: Set[int] = set()

state = PipelineState()


def capture_and_detect_loop():
    """Background worker thread — captures frames, runs HOG+SVM, triggers incidents.

    HOG detection runs every DETECT_EVERY_N_FRAMES frames. On skipped frames the
    previous detection boxes are redrawn on the fresh camera frame at near-zero cost,
    letting the MJPEG stream reach full camera FPS without blocking on HOG.
    """
    logger.info(
        f"Background vision loop started (OpenCV HOG + SVM detector, "
        f"detecting every {DETECT_EVERY_N_FRAMES} frames)."
    )
    prev_detection_state = False
    _frame_count = 0
    _last_detections: List[Dict[str, Any]] = []
    _last_summary: Dict[str, Any] = {
        "personDetected": False, "personCount": 0, "highestConfidence": 0.0,
        "hasNewPerson": False
    }

    while state.running:
        try:
            connected = state.camera_source.is_connected() if state.camera_source else False
            frame = None

            if connected and state.camera_source:
                success, frame = state.camera_source.read()
                if not success or frame is None:
                    connected = False

            if not connected or frame is None:
                # Generate aesthetic placeholder frame when camera is unavailable
                display_frame = create_unavailable_frame(640, 480)
                raw_frame = display_frame.copy()
                detections = []
                summary = {
                    "personDetected": False,
                    "personCount": 0,
                    "highestConfidence": 0.0,
                }
            else:
                # Preserve unannotated original frame for archival and crop extraction
                raw_frame = frame.copy()

                _frame_count += 1
                if _frame_count % DETECT_EVERY_N_FRAMES == 0:
                    # ── Detection frame: run full HOG + SVM ──────────────────────
                    display_frame, detections, summary = state.detector.detect(frame, draw=True)
                    _last_detections = detections
                    _last_summary = summary
                else:
                    # ── Skip frame: reuse cached boxes, skip HOG cost ─────────────
                    display_frame = draw_cached_boxes(frame, _last_detections)
                    detections = _last_detections
                    summary = _last_summary

            now_iso = datetime.datetime.now().isoformat()
            now_time_str = datetime.datetime.now().strftime("%H:%M:%S")
            now_ts = time.time()

            person_detected = summary["personDetected"]
            alert_active = False

            # Check and trigger automatic incident capture (1-time per presence session)
            if state.incident_manager and connected:
                state.incident_manager.check_and_trigger(
                    original_frame=raw_frame,
                    annotated_frame=display_frame,
                    detections=detections,
                    summary=summary,
                    confidence_threshold=state.detector.confidence_threshold if state.detector else HOG_DETECTION_THRESHOLD
                )

            # Debounced alert logic for dashboard HUD:
            # ONLY record new events when a new person arrives or scene clears.
            # Does NOT repeat detection history entries for the same person!
            with state.lock:
                if person_detected:
                    has_new = summary.get("hasNewPerson", False)
                    new_ids = [d["id"] for d in detections if d.get("isNew", False)]
                    all_ids = [d["id"] for d in detections]

                    # Update detection log on:
                    # 1. New arrival after clear state (not prev_detection_state)
                    # 2. A new individual entering the frame (has_new)
                    if has_new or not prev_detection_state:
                        state.last_alert_time = now_ts
                        alert_active = True

                        score_str = f"{summary['highestConfidence']:.2f}"
                        if new_ids:
                            ids_label = ", ".join(f"#{i}" for i in new_ids)
                            msg = f"Person {ids_label} detected (Score: {score_str}) — {summary['personCount']} in view"
                        else:
                            ids_label = ", ".join(f"#{i}" for i in all_ids)
                            msg = f"Person {ids_label} detected (Score: {score_str}) — {summary['personCount']} in view"

                        history_entry = {
                            "id": f"DET-{int(now_ts * 1000)}",
                            "time": now_time_str,
                            "timestamp": now_iso,
                            "type": "person_detected",
                            "message": msg,
                            "peopleCount": summary["personCount"],
                            "confidence": summary["highestConfidence"]
                        }
                        state.history.insert(0, history_entry)
                        if len(state.history) > 50:
                            state.history.pop()
                    else:
                        # Existing person(s) continuously visible — keep HUD alert active without repeating log entries
                        alert_active = True

                elif prev_detection_state and not person_detected:
                    history_entry = {
                        "id": f"DET-{int(now_ts * 1000)}",
                        "time": now_time_str,
                        "timestamp": now_iso,
                        "type": "no_person",
                        "message": "Zone clear — No person",
                        "peopleCount": 0,
                        "confidence": 0
                    }
                    state.history.insert(0, history_entry)
                    if len(state.history) > 50:
                        state.history.pop()
                    alert_active = False

                prev_detection_state = person_detected

                state.current_summary = {
                    "personDetected": person_detected,
                    "personCount": summary["personCount"],
                    "highestConfidence": summary["highestConfidence"],
                    "timestamp": now_iso,
                    "alertActive": alert_active,
                    "detections": detections
                }

                # Encode frame to JPEG for MJPEG stream — quality 80 for sharp HD output
                ret, buffer = cv2.imencode(".jpg", display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if ret:
                    state.latest_jpeg = buffer.tobytes()
                    state.frame_ready_event.set()

                    # Measure stream FPS
                    now_fps = time.time()
                    if state._stream_fps_timer == 0.0:
                        state._stream_fps_timer = now_fps
                    state._stream_fps_counter += 1
                    dt = now_fps - state._stream_fps_timer
                    if dt >= 1.0:
                        state.stream_fps = round(state._stream_fps_counter / dt, 1)
                        state._stream_fps_counter = 0
                        state._stream_fps_timer = now_fps

            time.sleep(0.03)

        except Exception as e:
            logger.error(f"Error in vision processing loop: {e}", exc_info=True)
            time.sleep(0.1)

    logger.info("Background vision loop ended.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager — initializes camera, HOG+SVM detector, vision analyzer, incident manager."""
    logger.info("Initializing FloodScout Computer Vision Backend (OpenCV HOG + SVM)...")
    if CAMERA_URL:
        logger.info(f"Connecting to network camera stream at: {CAMERA_URL}")
        state.camera_source = IPCameraSource(stream_url=CAMERA_URL)
    else:
        logger.info(f"Connecting to USB camera at index {CAMERA_INDEX}...")
        state.camera_source = USBCameraSource(
            camera_index=CAMERA_INDEX,
            width=int(os.getenv("CAMERA_WIDTH", "1280")),
            height=int(os.getenv("CAMERA_HEIGHT", "720")),
            fps=int(os.getenv("CAMERA_FPS", "30")),
        )
    state.detector = PersonDetector(hit_threshold=HOG_DETECTION_THRESHOLD, mode=HOG_MODE)

    if not state.detector.ready:
        logger.critical(
            "PersonDetector failed to initialize! "
            "Ensure opencv-python>=4.8,<5 is installed (HOGDescriptor requires OpenCV 4.x). "
            "Run: pip install 'opencv-python>=4.8,<5'"
        )

    state.vision_analyzer = VisionAnalyzer()
    state.incident_manager = IncidentManager(
        captures_dir=CAPTURES_DIR,
        cooldown_seconds=DETECTION_COOLDOWN,
        clear_hold_seconds=CLEAR_HOLD_SECONDS,
        vision_analyzer=state.vision_analyzer
    )
    try:
        import asyncio
        state.incident_manager.main_loop = asyncio.get_running_loop()
    except Exception:
        pass

    # Initialize USB Serial Bridge for XIAO camera hardware controls
    try:
        state.serial_bridge = XiaoSerialBridge()
    except Exception as e:
        logger.warning(f"Could not initialize XIAO serial bridge: {e}")

    state.running = True

    worker_thread = threading.Thread(target=capture_and_detect_loop, daemon=True)
    worker_thread.start()

    yield

    logger.info("Shutting down FloodScout Computer Vision Backend...")
    state.running = False
    worker_thread.join(timeout=2.0)
    if state.camera_source:
        state.camera_source.release()
    if state.serial_bridge:
        state.serial_bridge.disconnect()


app = FastAPI(
    title="FloodScout AI Vision & Incident Backend",
    description=(
        "FastAPI + OpenCV HOG+SVM + Gemini Vision service for real-time person detection "
        "& rescue incident logging. Detection scores are raw SVM margin weights, not YOLO percentages."
    ),
    version="2.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )


@app.get("/health")
def health():
    """Health check endpoint with Vision AI and detector readiness."""
    return {
        "status": "ok",
        "service": "floodscout-vision",
        "detector": "OpenCV HOG+SVM",
        "detectorReady": state.detector.ready if state.detector else False,
        "visionAiReady": state.vision_analyzer.is_ready() if state.vision_analyzer else False,
        "visionModel": state.vision_analyzer.model_name if state.vision_analyzer else "gemini-3.6-flash"
    }


@app.get("/camera/status")
def camera_status():
    """Returns camera connection state, active index, detector metadata, and streaming telemetry."""
    if not state.camera_source:
        return {"connected": False, "camera_index": CAMERA_INDEX, "error": "Camera not initialized"}
    info = state.camera_source.get_info()
    info["visionAiReady"] = state.vision_analyzer.is_ready() if state.vision_analyzer else False
    info["visionModel"] = state.vision_analyzer.model_name if state.vision_analyzer else "gemini-3.6-flash"
    info["cooldownSeconds"] = DETECTION_COOLDOWN
    info["detector"] = "OpenCV HOG+SVM"
    info["detectorReady"] = state.detector.ready if state.detector else False
    info["hogThreshold"] = state.detector.hit_threshold if state.detector else HOG_DETECTION_THRESHOLD
    # Streaming telemetry
    info["streamFps"] = state.stream_fps
    if state.detector:
        info.update(state.detector.get_telemetry())
    if state.serial_bridge:
        info["xiaoSerial"] = state.serial_bridge.get_status()
    else:
        info["xiaoSerial"] = {"connected": False, "port": None, "last_error": "Bridge not initialized", "settings": {}}
    if hasattr(state, "pan_tilt_controller") and state.pan_tilt_controller:
        info["panTilt"] = state.pan_tilt_controller.get_status()
    return info


@app.get("/camera/settings")
def get_camera_settings():
    """Return current XIAO hardware settings and USB Serial connection status."""
    if not state.serial_bridge:
        return {
            "connected": False,
            "port": None,
            "settings": {"brightness": 0, "contrast": 0, "saturation": 0, "hflip": 0, "vflip": 0},
            "last_error": "Serial bridge unavailable"
        }
    return state.serial_bridge.get_status()


@app.post("/camera/settings")
def set_camera_setting(payload: Dict[str, Any] = Body(...)):
    """
    Update a camera hardware setting on XIAO via USB Serial.
    Payload: {"setting": "brightness", "value": 1}
    Supported settings: brightness (-2..2), contrast (-2..2), saturation (-2..2),
                        hflip (0|1), vflip (0|1)
    """
    if not state.serial_bridge:
        raise HTTPException(status_code=503, detail="Serial bridge not initialized")

    setting = payload.get("setting")
    value = payload.get("value")
    if setting is None or value is None:
        raise HTTPException(status_code=400, detail="Missing 'setting' or 'value' in request payload")

    try:
        value_int = int(value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Setting value must be an integer")

    success, message = state.serial_bridge.send_command(setting, value_int)
    if not success:
        return JSONResponse(status_code=400, content={
            "success": False,
            "message": message,
            "setting": setting,
            "value": value_int,
            "current_settings": state.serial_bridge.settings
        })

    return {
        "success": True,
        "message": message,
        "setting": setting,
        "value": value_int,
        "current_settings": state.serial_bridge.settings
    }


# ── Pan & Tilt Sonar Actuator Endpoints ─────────────────────────────────────────
class PanTiltCommandPayload(BaseModel):
    command: str = Field(..., description="Directional command: LEFT, RIGHT, UP, DOWN, CENTER, STOP")


@app.post("/api/pan-tilt/command")
@app.post("/pan-tilt/command")
def pan_tilt_command(payload: PanTiltCommandPayload):
    """Execute a Pan/Tilt command (LEFT, RIGHT, UP, DOWN, CENTER, STOP).

    Validates the incoming command and forwards it to the active PanTiltController
    (Mock simulation or physical ESP32 driving SG90 servos).
    """
    cmd = payload.command.strip().upper()
    if cmd not in SUPPORTED_COMMANDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid command '{payload.command}'. Supported commands: {', '.join(sorted(SUPPORTED_COMMANDS))}"
        )

    try:
        return state.pan_tilt_controller.execute_command(cmd)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[PanTilt] Error executing command '{cmd}': {e}")
        raise HTTPException(status_code=500, detail=f"Pan/Tilt controller execution error: {e}")


@app.get("/api/pan-tilt/status")
@app.get("/pan-tilt/status")
def pan_tilt_status():
    """Return the current simulated or physical Pan & Tilt servo angles and connection state."""
    return state.pan_tilt_controller.get_status()


@app.get("/api/pan-tilt/health")
@app.get("/pan-tilt/health")
def pan_tilt_health():
    """Health check for Pan/Tilt subsystem. In ESP32 mode, verifies controller connectivity."""
    return state.pan_tilt_controller.check_health()


@app.get("/detection/status")
def detection_status():
    """Returns the most recent real-time detection summary.

    Note: 'highestConfidence' contains the raw HOG+SVM detection score,
    not a probability percentage. Values typically range 0.0 – 2.5+.
    """
    with state.lock:
        return state.current_summary


@app.get("/detection/history")
def detection_history(limit: int = Query(20, ge=1, le=50)):
    """Returns historical detection event logs."""
    with state.lock:
        return state.history[:limit]


@app.post("/detection/threshold")
def update_threshold(threshold: float = Body(..., embed=True)):
    """Dynamically adjust the HOG+SVM detection hit threshold."""
    if not (-0.5 <= threshold <= 2.5):
        raise HTTPException(
            status_code=400,
            detail=(
                "HOG threshold must be between -0.5 and 2.5. "
                "Recommended range: 0.0 – 1.5."
            )
        )
    with state.lock:
        if state.detector:
            state.detector.update_threshold(threshold)
    return {"status": "success", "hog_threshold": threshold}


@app.post("/detection/mode")
def update_detection_mode(mode: str = Body(..., embed=True)):
    """Switch HOG performance mode: 'fast' (~7ms), 'balanced' (~35ms), or 'accurate' (~52ms)."""
    valid_modes = ["fast", "balanced", "accurate"]
    if mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode '{mode}'. Valid: {valid_modes}"
        )
    with state.lock:
        if state.detector:
            state.detector.set_mode(mode)
    return {"status": "success", "mode": mode}


def mjpeg_generator():
    """Streams MJPEG frames continuously to client."""
    try:
        while state.running:
            state.frame_ready_event.wait(timeout=1.0)
            state.frame_ready_event.clear()

            with state.lock:
                frame_bytes = state.latest_jpeg

            if frame_bytes is not None:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                )
    except (GeneratorExit, asyncio.CancelledError):
        pass
    except Exception as e:
        logger.debug(f"Streaming connection closed: {e}")


@app.get("/video_feed")
def video_feed():
    """Live MJPEG video stream with OpenCV HOG+SVM bounding boxes rendered."""
    return StreamingResponse(
        mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# ─── Incident Capture & Media Endpoints ────────────────────────────────────────
@app.get("/incidents")
def list_incidents(limit: int = Query(25, ge=1, le=100)):
    """Returns list of automatically captured rescue incidents."""
    if not state.incident_manager:
        return []
    return state.incident_manager.get_incidents(limit=limit)


@app.get("/incidents/{incident_id}")
def get_incident_detail(incident_id: str):
    """Retrieves a single incident by its ID."""
    if not state.incident_manager:
        raise HTTPException(status_code=503, detail="Incident manager not initialized")
    inc = state.incident_manager.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@app.get("/captures/{filename}")
def get_capture_image(filename: str):
    """Safely retrieves a captured image file from disk."""
    # Prevent directory traversal by stripping path elements
    safe_name = os.path.basename(filename)
    file_path = os.path.join(CAPTURES_DIR, safe_name)

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(file_path, media_type="image/jpeg")


@app.post("/incidents/rearm")
def rearm_incident_capture():
    """Manually re-arms single-shot incident capture."""
    if state.incident_manager:
        state.incident_manager.rearm()
        return {"status": "success", "message": "Incident detector manually re-armed"}
    return {"status": "error", "message": "Incident manager not active"}


@app.websocket("/ws/incidents")
async def incident_websocket(websocket: WebSocket):
    """WebSocket connection for real-time incident event pushes."""
    if not state.incident_manager:
        await websocket.close(code=1013)
        return

    await state.incident_manager.connect_websocket(websocket)
    try:
        while True:
            # Keep connection alive; client can send pings or messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        state.incident_manager.disconnect_websocket(websocket)
    except asyncio.CancelledError:
        # Python 3.11+: CancelledError is BaseException, not Exception.
        # Raised when the client disconnects abruptly or the server is shutting down.
        # Must be caught explicitly here — otherwise it propagates through uvicorn
        # and kills the entire server process.
        state.incident_manager.disconnect_websocket(websocket)
    except Exception as e:
        logger.debug(f"WebSocket closed with exception: {e}")
        state.incident_manager.disconnect_websocket(websocket)


# ─── ESP32 Wi-Fi Pan/Tilt Proxy (Enables mobile HTTPS clients to control ESP32) ───
ESP32_PAN_TILT_URL = (os.getenv("ESP32_PAN_TILT_URL") or "http://10.185.112.106").rstrip("/")

@app.get("/api/pan-tilt/{command}")
def proxy_pan_tilt_command(command: str):
    """Proxies pan/tilt commands to ESP32 over local Wi-Fi.
    Allows mobile phones accessing over HTTPS to control the ESP32 without Mixed Content blocks."""
    import urllib.request
    import urllib.error
    import json
    
    cmd = command.lower().strip()
    target_url = f"{ESP32_PAN_TILT_URL}/api/pan-tilt/{cmd}"
    try:
        req = urllib.request.Request(
            target_url,
            headers={"User-Agent": "FloodScout-Backend-Proxy", "Accept": "*/*"}
        )
        with urllib.request.urlopen(req, timeout=2.5) as response:
            body = response.read().decode("utf-8")
            try:
                return json.loads(body)
            except Exception:
                return {"success": True, "command": cmd, "message": body}
    except urllib.error.URLError as e:
        logger.warning(f"ESP32 Wi-Fi unreachable at {target_url}: {e}")
        return JSONResponse(
            status_code=504,
            content={"success": False, "error": f"ESP32 unreachable at {ESP32_PAN_TILT_URL}: {e}", "connected": False},
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.error(f"Error proxying pan/tilt command {cmd}: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)},
            headers={"Access-Control-Allow-Origin": "*"}
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=BACKEND_PORT,
    )
