"""
incident_manager.py — Rescue Incident Manager for FloodScout.

Handles:
  - Detection debouncing and cooldown tracking
  - Frame saving (original full scene, annotated detector frame, person crops)
  - Unique Incident ID generation (INC-YYYYMMDD-HHMMSS-XXX)
  - Async dispatch of Gemini Vision AI description
  - Thread-safe storage of incident records
  - Real-time WebSocket broadcasting to connected dashboard clients

Note on detection scores:
  Person detections from OpenCV HOG + SVM carry a raw SVM decision margin score
  (stored in 'highestConfidence' for API backward compatibility). This value is
  NOT a probability percentage — it is an SVM weight (typically 0.0 – 2.5+).
"""

import os
import cv2
import numpy as np
import time
import datetime
import threading
import logging
from typing import List, Dict, Any, Optional, Set, Tuple
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class IncidentManager:
    """Manages creation, image persistence, vision AI analysis, and distribution of rescue incidents."""

    # Minimum seconds between re-captures of the SAME already-seen person
    RECAPTURE_COOLDOWN: float = 15.0

    def __init__(
        self,
        captures_dir: str = "captures",
        cooldown_seconds: float = 5.0,
        clear_hold_seconds: float = 3.0,
        vision_analyzer = None
    ):
        self.captures_dir = captures_dir
        self.cooldown_seconds = cooldown_seconds
        self.clear_hold_seconds = clear_hold_seconds
        self.vision_analyzer = vision_analyzer

        # Ensure captures directory exists
        os.makedirs(self.captures_dir, exist_ok=True)

        # Load Haar cascades for smart face-centered person cropping
        self.face_cascades = []
        for cascade_name in [
            "haarcascade_frontalface_default.xml",
            "haarcascade_frontalface_alt2.xml",
            "haarcascade_profileface.xml",
        ]:
            cascade_path = cv2.data.haarcascades + cascade_name
            if os.path.exists(cascade_path):
                self.face_cascades.append(cv2.CascadeClassifier(cascade_path))

        self.lock = threading.Lock()
        self.incidents: List[Dict[str, Any]] = []
        self._incident_counter: int = 0
        self.main_loop: Optional[Any] = None

        # Person ID tracking across the entire session
        # captured_person_ids: IDs ever captured (used by frontend to classify 'new' vs 'returning')
        self.captured_person_ids: Set[int] = set()
        # _person_last_captured: per-person timestamp of last successful capture
        self._person_last_captured: Dict[int, float] = {}
        self._is_person_present: bool = False   # True while persons are actively in frame
        self._last_seen_time: float = 0.0       # Timestamp of last frame where a person was detected
        self._presence_lock = threading.Lock()

        # WebSocket subscribers
        self._ws_lock = threading.Lock()
        self._active_websockets: Set[WebSocket] = set()

    # ─── WebSocket Connection Management ───────────────────────────────────────
    async def connect_websocket(self, websocket: WebSocket):
        """Register a new WebSocket subscriber for real-time alerts."""
        await websocket.accept()
        with self._ws_lock:
            self._active_websockets.add(websocket)
        logger.info(f"Dashboard client connected to incident WebSocket (total: {len(self._active_websockets)}).")

    def disconnect_websocket(self, websocket: WebSocket):
        """Remove a disconnected client."""
        with self._ws_lock:
            self._active_websockets.discard(websocket)
        logger.info(f"Dashboard client disconnected from incident WebSocket.")

    def _broadcast_event_sync(self, event_data: Dict[str, Any]):
        """Synchronously dispatch incident event to all connected WebSockets."""
        import asyncio

        with self._ws_lock:
            sockets = list(self._active_websockets)

        if not sockets:
            return

        async def _send_all():
            for ws in sockets:
                try:
                    await ws.send_json(event_data)
                except BaseException:
                    # Catch BaseException (not just Exception) because Python 3.11+
                    # raises asyncio.CancelledError (a BaseException subclass) when a
                    # WebSocket client disconnects abruptly. Missing this causes the
                    # broadcast coroutine to crash silently.
                    self.disconnect_websocket(ws)

        try:
            if self.main_loop and self.main_loop.is_running():
                asyncio.run_coroutine_threadsafe(_send_all(), self.main_loop)
                return

            try:
                loop = asyncio.get_running_loop()
                if loop and loop.is_running():
                    asyncio.run_coroutine_threadsafe(_send_all(), loop)
                    return
            except RuntimeError:
                pass
        except Exception as e:
            logger.debug(f"Broadcast error: {e}")

    # ─── Incident Detection Trigger ───────────────────────────────────────────────
    def check_and_trigger(
        self,
        original_frame,
        annotated_frame,
        detections: List[Dict[str, Any]],
        summary: Dict[str, Any],
        confidence_threshold: float = 0.0
    ) -> Optional[Dict[str, Any]]:
        """Evaluates detection state and captures incidents, updating By-Time view on every detection.

        Behavior:
          1. NEW person (never seen before): capture incident immediately, add to captured_person_ids.
          2. RETURNING person (re-identified same ID): capture a new incident after RECAPTURE_COOLDOWN
             seconds have elapsed since their last capture. Marked as isReturning=True in personDetails.
             In the frontend, By Person de-duplicates by personId, so returning captures flow into
             'All Captures' without creating a new Person #N card.
          3. Persons still within their cooldown window: no new incident.
          4. Scene clear for clear_hold_seconds with no detections: reset presence flag.
        """
        person_detected = summary.get("personDetected", False)
        highest_conf = summary.get("highestConfidence", 0.0)
        now = time.time()

        with self._presence_lock:
            if person_detected and highest_conf >= confidence_threshold:
                self._last_seen_time = now
                self._is_person_present = True

                # Classify each visible person as new or returnable
                new_ids: List[int] = []
                returning_ids: List[int] = []

                for d in detections:
                    pid = d.get("id")
                    if pid is None:
                        continue
                    if pid not in self.captured_person_ids:
                        # Never captured before — new person
                        new_ids.append(pid)
                    else:
                        # Already seen — eligible for recapture after cooldown
                        last_cap = self._person_last_captured.get(pid, 0.0)
                        if (now - last_cap) >= self.RECAPTURE_COOLDOWN:
                            returning_ids.append(pid)

                if not new_ids and not returning_ids:
                    # All persons within their cooldown window — no capture needed
                    return None

                # Register new persons
                for pid in new_ids:
                    self.captured_person_ids.add(pid)
                    self._person_last_captured[pid] = now

                # Update returning persons' last-captured timestamp
                for pid in returning_ids:
                    self._person_last_captured[pid] = now

                all_triggered = new_ids + returning_ids
                ids_str = ", ".join(
                    f"#{i}{'(new)' if i in new_ids else '(returning)'}" for i in all_triggered
                )
                logger.info(
                    f"Capturing incident — persons: {ids_str} "
                    f"(Score: {highest_conf:.2f}). Unique persons total: {len(self.captured_person_ids)}"
                )
                return self._create_incident(
                    original_frame, annotated_frame, detections, summary,
                    new_ids=set(new_ids), returning_ids=set(returning_ids)
                )
            else:
                # No person detected in this frame
                if self._is_person_present:
                    time_absent = now - self._last_seen_time
                    if time_absent >= self.clear_hold_seconds:
                        self._is_person_present = False
                        logger.info(f"Scene clear for {time_absent:.1f}s.")

                return None

    def rearm(self):
        """Manually force re-arming so all persons can be captured again."""
        with self._presence_lock:
            self._is_person_present = False
            self._last_seen_time = 0.0
            self.captured_person_ids.clear()
            self._person_last_captured.clear()
            logger.info("Presence detector manually re-armed (all person capture records cleared.)")

    def _generate_incident_id(self) -> str:
        """Generates a standardized incident ID: INC-YYYYMMDD-HHMMSS-XXX."""
        self._incident_counter += 1
        now = datetime.datetime.now()
        date_str = now.strftime("%Y%m%d-%H%M%S")
        counter_str = f"{self._incident_counter:03d}"
        return f"INC-{date_str}-{counter_str}"

    def _create_incident(
        self,
        original_frame,
        annotated_frame,
        detections: List[Dict[str, Any]],
        summary: Dict[str, Any],
        new_ids: Optional[Set[int]] = None,
        returning_ids: Optional[Set[int]] = None,
    ) -> Dict[str, Any]:
        """Saves images, creates the incident record, and starts async vision analysis.

        Args:
            new_ids: Person IDs that are brand-new (never captured before).
            returning_ids: Person IDs that were re-identified from a previous session.
                           Their crops are stored as additional captures in the frontend's
                           'All Captures' gallery but do NOT create a new 'Person #N' card
                           in the By Person manifest (de-duplicated by personId on frontend).
        """
        if new_ids is None:
            new_ids = set()
        if returning_ids is None:
            returning_ids = set()

        incident_id = self._generate_incident_id()
        now_dt = datetime.datetime.now()
        timestamp_iso = now_dt.isoformat()
        time_str = now_dt.strftime("%H:%M:%S")

        # 1. Save Full Original Frame
        original_filename = f"{incident_id}_original.jpg"
        original_path = os.path.join(self.captures_dir, original_filename)
        cv2.imwrite(original_path, original_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])

        # 2. Save Annotated Frame with HOG+SVM Bounding Boxes
        annotated_filename = f"{incident_id}_annotated.jpg"
        annotated_path = os.path.join(self.captures_dir, annotated_filename)
        cv2.imwrite(annotated_path, annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])

    def extract_centered_person_crop(
        self,
        frame: np.ndarray,
        det: Dict[str, Any]
    ) -> Tuple[np.ndarray, List[int]]:
        """Extracts a well-centered, high-detail portrait / upper-body crop of a detected person.

        Overcomes the HOG issue where tall, narrow (1:2) pedestrian bounding boxes latch
        onto the left background edge (e.g. wall/door), leaving the person's face cut off
        on the right edge.

        Algorithm:
          1. Detects face/head within or aligned with the person detection.
          2. If a face is found:
             - Centers the crop horizontally directly on the face.
             - Adds natural headroom above forehead and frames down through shoulders/torso.
          3. If no face is found:
             - Expands the narrow HOG box to a balanced portrait aspect ratio (3:4/4:3).
             - Analyzes horizontal gradient/texture variance to shift the center of mass off
               blank background onto the actual person.
          4. Returns the centered crop and clamped bounding box [x, y, w, h].
        """
        frame_h, frame_w = frame.shape[:2]
        x = int(det.get("x", 0))
        y = int(det.get("y", 0))
        w = int(det.get("width", 0))
        h = int(det.get("height", 0))

        if w <= 0 or h <= 0 or frame is None or frame.size == 0:
            return frame, [0, 0, frame_w, frame_h]

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # 1. Search for face in and around detection
        matched_face = None
        for casc in self.face_cascades:
            faces = casc.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(35, 35)
            )
            for fx, fy, fw, fh in faces:
                fcx = fx + fw // 2
                dcx = x + w // 2
                # Face must be reasonably aligned with this person detection
                if abs(fcx - dcx) < max(w * 2.0, 160) and fy < (y + h * 0.85):
                    matched_face = (fx, fy, fw, fh)
                    break
            if matched_face is not None:
                break

        if matched_face is not None:
            fx, fy, fw, fh = matched_face
            center_x = fx + fw // 2
            # Generous width and height to capture full head, shoulders and upper body details
            crop_w = max(int(fw * 2.2), int(w * 1.6), 220)
            crop_h = max(int(fh * 2.6), int(h * 1.2), 260)
            top_y = max(0, fy - int(fh * 0.35))
            bottom_y = min(frame_h, top_y + crop_h)
            left_x = max(0, center_x - crop_w // 2)
            right_x = min(frame_w, left_x + crop_w)
        else:
            # Fallback: edge/texture center or horizontal expansion
            crop_w = max(int(h * 0.85), int(w * 1.8), 220)
            crop_h = max(int(h * 1.15), 260)

            # Check if right half of HOG has more gradient than left half (i.e. wall on left)
            roi = gray[y:min(frame_h, y + h), x:min(frame_w, x + w)]
            if roi.size > 0:
                left_half = roi[:, :max(1, w // 2)]
                right_half = roi[:, max(1, w // 2):]
                std_l = float(np.std(left_half)) if left_half.size > 0 else 0.0
                std_r = float(np.std(right_half)) if right_half.size > 0 else 0.0
                if std_r > std_l * 1.3:
                    center_x = x + int(w * 0.85)
                else:
                    center_x = x + w // 2
            else:
                center_x = x + w // 2

            top_y = max(0, y - int(h * 0.08))
            bottom_y = min(frame_h, top_y + crop_h)
            left_x = max(0, center_x - crop_w // 2)
            right_x = min(frame_w, left_x + crop_w)

        # Boundary clamping while preserving full crop dimensions
        if left_x < 0:
            right_x = min(frame_w, right_x - left_x)
            left_x = 0
        if right_x > frame_w:
            left_x = max(0, left_x - (right_x - frame_w))
            right_x = frame_w
        if top_y < 0:
            bottom_y = min(frame_h, bottom_y - top_y)
            top_y = 0
        if bottom_y > frame_h:
            top_y = max(0, top_y - (bottom_y - frame_h))
            bottom_y = frame_h

        left_x = max(0, int(left_x))
        top_y = max(0, int(top_y))
        right_x = min(frame_w, int(right_x))
        bottom_y = min(frame_h, int(bottom_y))

        final_w = right_x - left_x
        final_h = bottom_y - top_y

        if final_w > 10 and final_h > 10:
            crop = frame[top_y:bottom_y, left_x:right_x]
            return crop, [left_x, top_y, final_w, final_h]

        return frame, [0, 0, frame_w, frame_h]

        # 3. Save Person Crop(s) — tag each as new or returning
        person_images = []
        person_details = []

        for i, det in enumerate(detections, start=1):
            try:
                pid = det.get("id", i)
                score = det.get("confidence", 0.0)
                is_returning = pid in returning_ids

                # Extract centered person crop with full details
                crop, crop_box = self.extract_centered_person_crop(original_frame, det)

                if crop is not None and crop.size > 0:
                    crop_filename = f"{incident_id}_person_{pid}.jpg"
                    crop_path = os.path.join(self.captures_dir, crop_filename)
                    cv2.imwrite(crop_path, crop, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
                    crop_url = f"/captures/{crop_filename}"
                    person_images.append(crop_url)
                    person_details.append({
                        "id": pid,
                        "label": f"Person #{pid}",
                        "imageUrl": crop_url,
                        "score": round(score, 2),
                        "box": crop_box,
                        "isReturning": is_returning,
                    })
            except Exception as e:
                logger.warning(f"Failed to crop person {i} for incident {incident_id}: {e}")

        # 4. Construct Incident Object
        incident: Dict[str, Any] = {
            "id": incident_id,
            "time": time_str,
            "timestamp": timestamp_iso,
            "personCount": summary.get("personCount", len(detections)),
            "highestConfidence": summary.get("highestConfidence", 0.0),
            "imageUrl": f"/captures/{annotated_filename}",
            "originalImageUrl": f"/captures/{original_filename}",
            "personImages": person_images,
            "personDetails": person_details,
            "description": "Analyzing visual scene with Gemini Vision AI...",
            "descriptionStatus": "pending",
            "status": "NEW"
        }

        with self.lock:
            self.incidents.insert(0, incident)
            if len(self.incidents) > 100:
                self.incidents.pop()

        logger.info(
            f"Created rescue incident: {incident_id} | People: {incident['personCount']} | "
            f"Detection score: {incident['highestConfidence']:.4f}"
        )

        # Notify dashboard immediately of the new incident capture
        self._broadcast_event_sync({
            "type": "incident_created",
            "incident": incident
        })

        # 5. Launch Async Vision AI Scene Analysis in a background thread
        threading.Thread(
            target=self._run_vision_analysis,
            args=(incident_id, original_path),
            daemon=True
        ).start()

        return incident

    def _run_vision_analysis(self, incident_id: str, original_image_path: str):
        """Asynchronously runs Google Gemini Vision description on the captured frame."""
        if not self.vision_analyzer:
            self._update_incident_description(
                incident_id,
                "AI description unavailable (Vision module not initialized).",
                status="failed"
            )
            return

        try:
            with open(original_image_path, "rb") as f:
                image_bytes = f.read()

            result = self.vision_analyzer.describe_scene(image_bytes)
            description = result.get("description", "AI description unavailable.")
            status = result.get("status", "failed")

            self._update_incident_description(incident_id, description, status=status)

        except Exception as e:
            logger.error(f"Vision analysis failed for incident {incident_id}: {e}")
            self._update_incident_description(
                incident_id,
                f"AI description unavailable ({type(e).__name__}).",
                status="failed"
            )

    def _update_incident_description(self, incident_id: str, description: str, status: str):
        """Updates the incident record once Vision AI analysis completes and broadcasts the update."""
        updated_incident = None
        with self.lock:
            for inc in self.incidents:
                if inc["id"] == incident_id:
                    inc["description"] = description
                    inc["descriptionStatus"] = status
                    updated_incident = dict(inc)
                    break

        if updated_incident:
            logger.info(f"Updated incident {incident_id} with Vision AI description: '{description}'")
            self._broadcast_event_sync({
                "type": "incident_updated",
                "incident": updated_incident
            })

    # ─── Query Endpoints ───────────────────────────────────────────────────────
    def get_incidents(self, limit: int = 25) -> List[Dict[str, Any]]:
        """Returns the most recent incidents."""
        with self.lock:
            return [dict(inc) for inc in self.incidents[:limit]]

    def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Returns a single incident by ID."""
        with self.lock:
            for inc in self.incidents:
                if inc["id"] == incident_id:
                    return dict(inc)
        return None
