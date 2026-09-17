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

Endpoints:
  - GET       /health              -> Health check & vision AI readiness
  - GET       /camera/status       -> Camera connection status & vision metadata
  - GET       /detection/status    -> Current real-time detection state & alert flag
  - GET       /detection/history   -> Historical detection events (debounced)
  - POST      /detection/threshold -> Update confidence threshold on the fly
  - GET       /video_feed          -> MJPEG stream of YOLO-annotated frames
  - GET       /incidents           -> List captured rescue incidents
  - GET       /incidents/{id}      -> Get details for a specific incident
  - GET       /captures/{filename} -> Safely retrieve captured incident imagery
  - WebSocket /ws/incidents        -> Real-time event push for new/updated incidents
"""

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
from fastapi import FastAPI, Query, HTTPException, Body, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse

from camera import USBCameraSource, create_unavailable_frame
from detector import PersonDetector
from vision import VisionAnalyzer
from incident_manager import IncidentManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("floodscout-backend")

# Environment configuration
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.50"))
ALERT_COOLDOWN = float(os.getenv("ALERT_COOLDOWN", "3.0"))
DETECTION_COOLDOWN = float(os.getenv("DETECTION_COOLDOWN", "5.0"))
CLEAR_HOLD_SECONDS = float(os.getenv("CLEAR_HOLD_SECONDS", "3.0"))
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
CAPTURES_DIR = os.getenv("CAPTURES_DIR", "captures")


# Shared Global State
class PipelineState:
    def __init__(self):
        self.lock = threading.Lock()
        self.camera_source: Optional[USBCameraSource] = None
        self.detector: Optional[PersonDetector] = None
        self.vision_analyzer: Optional[VisionAnalyzer] = None
        self.incident_manager: Optional[IncidentManager] = None
        self.running = False

        # Current frame JPEG bytes for streaming
        self.latest_jpeg: Optional[bytes] = None
        self.frame_ready_event = threading.Event()

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

state = PipelineState()


def capture_and_detect_loop():
    """Background worker thread continuously capturing frames, running YOLO, and triggering incident capture."""
    logger.info("Background vision loop started.")
    prev_detection_state = False

    while state.running:
        try:
            connected = state.camera_source.is_connected() if state.camera_source else False
            frame = None

            if connected and state.camera_source:
                success, frame = state.camera_source.read()
                if not success or frame is None:
                    connected = False

            if not connected or frame is None:
                # Generate aesthetic placeholder frame
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

                # Run YOLO person detection and render bounding boxes onto display_frame
                display_frame, detections, summary = state.detector.detect(frame, draw=True)

            now_iso = datetime.datetime.now().isoformat()
            now_time_str = datetime.datetime.now().strftime("%H:%M:%S")
            now_ts = time.time()

            person_detected = summary["personDetected"]
            alert_active = False

            # Check and trigger automatic incident capture (handles 1-time capture & clearance)
            if state.incident_manager and connected:
                state.incident_manager.check_and_trigger(
                    original_frame=raw_frame,
                    annotated_frame=display_frame,
                    detections=detections,
                    summary=summary,
                    confidence_threshold=state.detector.confidence_threshold if state.detector else CONFIDENCE_THRESHOLD
                )

            # Debounced alert logic for dashboard HUD
            with state.lock:
                if person_detected:
                    if (now_ts - state.last_alert_time) >= state.alert_cooldown:
                        state.last_alert_time = now_ts
                        alert_active = True

                        history_entry = {
                            "id": f"DET-{int(now_ts * 1000)}",
                            "time": now_time_str,
                            "timestamp": now_iso,
                            "type": "person_detected",
                            "message": f"Person detected ({int(summary['highestConfidence'] * 100)}% conf)",
                            "peopleCount": summary["personCount"],
                            "confidence": int(summary["highestConfidence"] * 100)
                        }
                        state.history.insert(0, history_entry)
                        if len(state.history) > 50:
                            state.history.pop()
                    elif (now_ts - state.last_alert_time) < 1.0:
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

                prev_detection_state = person_detected

                state.current_summary = {
                    "personDetected": person_detected,
                    "personCount": summary["personCount"],
                    "highestConfidence": summary["highestConfidence"],
                    "timestamp": now_iso,
                    "alertActive": alert_active,
                    "detections": detections
                }

                # Encode frame to JPEG for MJPEG stream
                ret, buffer = cv2.imencode(".jpg", display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if ret:
                    state.latest_jpeg = buffer.tobytes()
                    state.frame_ready_event.set()

            time.sleep(0.03)

        except Exception as e:
            logger.error(f"Error in vision processing loop: {e}", exc_info=True)
            time.sleep(0.1)

    logger.info("Background vision loop ended.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager to initialize camera, detector, vision analyzer, and incident manager."""
    logger.info("Initializing FloodScout Computer Vision Backend...")
    state.camera_source = USBCameraSource(camera_index=CAMERA_INDEX)
    state.detector = PersonDetector(
        model_name="yolo11n.pt",
        confidence_threshold=CONFIDENCE_THRESHOLD
    )
    state.vision_analyzer = VisionAnalyzer()
    state.incident_manager = IncidentManager(
        captures_dir=CAPTURES_DIR,
        cooldown_seconds=DETECTION_COOLDOWN,
        clear_hold_seconds=CLEAR_HOLD_SECONDS,
        vision_analyzer=state.vision_analyzer
    )
    state.running = True

    worker_thread = threading.Thread(target=capture_and_detect_loop, daemon=True)
    worker_thread.start()

    yield

    logger.info("Shutting down FloodScout Computer Vision Backend...")
    state.running = False
    worker_thread.join(timeout=2.0)
    if state.camera_source:
        state.camera_source.release()


app = FastAPI(
    title="FloodScout AI Vision & Incident Backend",
    description="FastAPI + OpenCV + YOLO + Gemini Vision service for real-time person detection & rescue incident logging",
    version="2.0.0",
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Health check endpoint with Vision AI and storage status."""
    return {
        "status": "ok",
        "service": "floodscout-vision",
        "visionAiReady": state.vision_analyzer.is_ready() if state.vision_analyzer else False,
        "visionModel": state.vision_analyzer.model_name if state.vision_analyzer else "gemini-2.5-flash"
    }


@app.get("/camera/status")
def camera_status():
    """Returns camera connection state, active index, and vision AI metadata."""
    if not state.camera_source:
        return {"connected": False, "camera_index": CAMERA_INDEX, "error": "Camera not initialized"}
    info = state.camera_source.get_info()
    info["visionAiReady"] = state.vision_analyzer.is_ready() if state.vision_analyzer else False
    info["visionModel"] = state.vision_analyzer.model_name if state.vision_analyzer else "gemini-2.5-flash"
    info["cooldownSeconds"] = DETECTION_COOLDOWN
    return info


@app.get("/detection/status")
def detection_status():
    """Returns the most recent real-time detection summary."""
    with state.lock:
        return state.current_summary


@app.get("/detection/history")
def detection_history(limit: int = Query(20, ge=1, le=50)):
    """Returns historical detection event logs."""
    with state.lock:
        return state.history[:limit]


@app.post("/detection/threshold")
def update_threshold(threshold: float = Body(..., embed=True)):
    """Allows dynamic adjustment of the detection confidence threshold."""
    if not (0.05 <= threshold <= 0.95):
        raise HTTPException(status_code=400, detail="Threshold must be between 0.05 and 0.95")
    with state.lock:
        if state.detector:
            state.detector.update_confidence_threshold(threshold)
    return {"status": "success", "confidence_threshold": threshold}


def mjpeg_generator():
    """Streams MJPEG frames continuously to client."""
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


@app.get("/video_feed")
def video_feed():
    """Live MJPEG video stream with YOLO bounding boxes rendered."""
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
    except Exception as e:
        logger.debug(f"WebSocket closed with exception: {e}")
        state.incident_manager.disconnect_websocket(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=BACKEND_PORT,
        reload=False
    )
