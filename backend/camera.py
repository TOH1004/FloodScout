"""
camera.py — High-performance camera source abstraction for FloodScout.

Provides:
  - CameraSource (abstract base class) — supports USB and network IP/XIAO cameras
  - USBCameraSource — threaded, zero-lag DirectShow/MJPG capture for USB & laptop webcams
  - IPCameraSource — future-ready stream client for Seeed Studio XIAO / ESP32-CAM streams

Design:
  - Hardware MJPG acceleration requests 720p / 1080p at 30 FPS over USB.
  - Dedicated capture thread constantly drains the OpenCV/driver buffer so that
    read() always returns the latest frame instantly (0 ms latency, no buffer lag).
"""

import cv2
import numpy as np
import urllib.request
import urllib.parse
from abc import ABC, abstractmethod
from typing import Optional, Tuple, Dict, Any
import time
import threading
import logging

logger = logging.getLogger(__name__)


class CameraSource(ABC):
    """Abstract base class for camera sources (USB, Seeed XIAO, ESP32-CAM, RTSP)."""

    @abstractmethod
    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Read the latest single frame from the camera."""
        ...

    @abstractmethod
    def release(self) -> None:
        """Release camera resources."""
        ...

    @abstractmethod
    def is_connected(self) -> bool:
        """Check whether the camera is currently open and healthy."""
        ...

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """Return camera metadata (resolution, actual FPS, type, etc.)."""
        ...


class USBCameraSource(CameraSource):
    """Threaded, non-blocking USB / laptop webcam source with hardware MJPG support."""

    def __init__(
        self,
        camera_index: int = 0,
        width: int = 1280,
        height: int = 720,
        fps: int = 30,
    ):
        self.camera_index = camera_index
        self.requested_width = width
        self.requested_height = height
        self.requested_fps = fps

        self._cap: Optional[cv2.VideoCapture] = None
        self._last_reconnect_attempt = 0.0
        self._reconnect_interval = 3.0

        # Threaded capture state
        self._lock = threading.Lock()
        self._latest_frame: Optional[np.ndarray] = None
        self._frame_time: float = 0.0
        self._is_capturing = False
        self._capture_thread: Optional[threading.Thread] = None

        # Telemetry
        self.actual_width: int = 0
        self.actual_height: int = 0
        self.actual_fps: float = 0.0
        self.measured_fps: float = 0.0
        self._fps_counter: int = 0
        self._fps_timer: float = time.time()

        self._open()

    def _open(self) -> bool:
        """Attempt to open the camera with hardware MJPG and start the capture thread."""
        try:
            self._stop_capture_thread()
            if self._cap is not None:
                self._cap.release()
                self._cap = None

            # On Windows, DirectShow (CAP_DSHOW) offers direct access to webcam modes
            self._cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
            if not self._cap.isOpened():
                self._cap = cv2.VideoCapture(self.camera_index)

            if not self._cap.isOpened():
                logger.warning(f"Failed to open USB camera at index {self.camera_index}")
                return False

            # Request hardware MJPG compression to unlock 720p/1080p @ 30 FPS over USB
            try:
                self._cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
            except Exception as e:
                logger.debug(f"FourCC MJPG set failed: {e}")

            self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.requested_width)
            self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.requested_height)
            self._cap.set(cv2.CAP_PROP_FPS, self.requested_fps)
            self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            # Probe actual capabilities
            self.actual_width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.actual_height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self.actual_fps = float(self._cap.get(cv2.CAP_PROP_FPS))

            logger.info(
                f"Camera opened (index={self.camera_index}): "
                f"{self.actual_width}x{self.actual_height} @ {self.actual_fps:.1f} FPS"
            )

            # Warmup read
            ret, frame = self._cap.read()
            if ret and frame is not None:
                with self._lock:
                    self._latest_frame = frame
                    self._frame_time = time.time()

            # Start non-blocking background frame grabber
            self._start_capture_thread()
            return True

        except Exception as e:
            logger.error(f"Error initializing camera: {e}", exc_info=True)
            return False

    def _start_capture_thread(self) -> None:
        """Start thread to continuously drain the camera buffer."""
        self._is_capturing = True
        self._capture_thread = threading.Thread(
            target=self._capture_worker,
            name=f"CameraCapture-{self.camera_index}",
            daemon=True,
        )
        self._capture_thread.start()

    def _stop_capture_thread(self) -> None:
        """Stop capture thread."""
        self._is_capturing = False
        if self._capture_thread is not None and self._capture_thread.is_alive():
            self._capture_thread.join(timeout=1.0)
            self._capture_thread = None

    def _capture_worker(self) -> None:
        """Continuously pulls latest frames from the hardware buffer with 0ms queue delay."""
        consecutive_failures = 0

        while self._is_capturing and self._cap is not None and self._cap.isOpened():
            ret, frame = self._cap.read()
            if ret and frame is not None:
                consecutive_failures = 0
                now = time.time()
                with self._lock:
                    self._latest_frame = frame
                    self._frame_time = now

                # Measure actual FPS delivered by camera driver
                self._fps_counter += 1
                dt = now - self._fps_timer
                if dt >= 1.0:
                    self.measured_fps = round(self._fps_counter / dt, 1)
                    self._fps_counter = 0
                    self._fps_timer = now
            else:
                consecutive_failures += 1
                if consecutive_failures > 30:
                    logger.warning("Camera dropped consecutive frames. Reconnection needed.")
                    break
                time.sleep(0.01)

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Non-blocking read: returns the freshest frame instantly."""
        if not self.is_connected():
            return self._try_reconnect()

        with self._lock:
            if self._latest_frame is not None:
                # Check if frame is fresh (within 1.5 seconds)
                if time.time() - self._frame_time < 1.5:
                    return True, self._latest_frame

        return self._try_reconnect()

    def _try_reconnect(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Throttled reconnection logic."""
        now = time.time()
        if now - self._last_reconnect_attempt < self._reconnect_interval:
            return False, None

        self._last_reconnect_attempt = now
        logger.info("Attempting camera reconnection...")
        if self._open():
            with self._lock:
                if self._latest_frame is not None:
                    return True, self._latest_frame
        return False, None

    def release(self) -> None:
        """Release camera and shut down capture thread."""
        self._stop_capture_thread()
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        with self._lock:
            self._latest_frame = None
        logger.info("Camera released.")

    def is_connected(self) -> bool:
        """Check if camera capture is currently healthy and active."""
        if self._cap is None or not self._cap.isOpened():
            return False
        return self._is_capturing

    def get_info(self) -> Dict[str, Any]:
        """Return camera telemetry."""
        connected = self.is_connected()
        width = self.actual_width if self.actual_width > 0 else self.requested_width
        height = self.actual_height if self.actual_height > 0 else self.requested_height
        return {
            "connected": connected,
            "camera_index": self.camera_index,
            "type": "USB",
            "resolution": {"width": width, "height": height},
            "driverFps": self.actual_fps,
            "measuredFps": self.measured_fps if self.measured_fps > 0 else self.actual_fps,
        }


class IPCameraSource(CameraSource):
    """Network camera source (Seeed XIAO ESP32S3, ESP32-CAM, RTSP / HTTP MJPEG) with auto-fallback."""

    def __init__(self, stream_url: str):
        self.stream_url = stream_url
        self.camera_index = 0
        parsed = urllib.parse.urlparse(stream_url)
        self.host = parsed.hostname or "10.133.81.149"
        self.capture_url = f"http://{self.host}/capture"
        self._lock = threading.Lock()
        self._latest_frame: Optional[np.ndarray] = None
        self._frame_time: float = time.time()
        self._is_capturing = False
        self._capture_thread: Optional[threading.Thread] = None
        self._mode = "init"
        self._open()

    def _open(self) -> bool:
        try:
            self._stop()
            self._is_capturing = True
            self._frame_time = time.time()
            self._capture_thread = threading.Thread(
                target=self._worker, name="IPCameraGrabber", daemon=True
            )
            self._capture_thread.start()
            logger.info(f"IP camera grabber started for {self.stream_url} (fallback: {self.capture_url})")
            return True
        except Exception as e:
            logger.error(f"Failed to start IP camera grabber: {e}")
            return False

    def _worker(self) -> None:
        while self._is_capturing:
            # 1. Attempt high-speed HTTP MJPEG stream (port 81)
            connected_stream = False
            try:
                req = urllib.request.Request(self.stream_url)
                with urllib.request.urlopen(req, timeout=3) as stream:
                    buf = b""
                    self._mode = "stream"
                    logger.info(f"High-speed MJPEG stream connected: {self.stream_url}")
                    while self._is_capturing:
                        chunk = stream.read(4096)
                        if not chunk:
                            break
                        buf += chunk

                        # Find the LATEST complete JPEG in buffer to guarantee zero streaming lag
                        b = buf.rfind(b"\xff\xd9")
                        if b != -1:
                            a = buf.rfind(b"\xff\xd8", 0, b)
                            if a != -1:
                                jpg = buf[a : b + 2]
                                buf = buf[b + 2 :] # Discard older backlog frames
                                frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                                if frame is not None:
                                    with self._lock:
                                        self._latest_frame = frame
                                        self._frame_time = time.time()
                                    connected_stream = True

                        # Cap buffer size to avoid stale backlog
                        if len(buf) > 65536:
                            buf = buf[-16384:]
            except Exception as e:
                logger.debug(f"Direct stream {self.stream_url} not accessible ({e}), using /capture fallback")

            # 2. Fallback mode: Poll /capture endpoint on port 80 (always available)
            if self._is_capturing:
                self._mode = "capture"
                fallback_rounds = 0
                while self._is_capturing and fallback_rounds < 30:  # Check port 81 every ~3 seconds
                    try:
                        resp = urllib.request.urlopen(self.capture_url, timeout=1.5)
                        jpg_data = resp.read()
                        frame = cv2.imdecode(np.frombuffer(jpg_data, dtype=np.uint8), cv2.IMREAD_COLOR)
                        if frame is not None:
                            with self._lock:
                                self._latest_frame = frame
                                self._frame_time = time.time()
                        time.sleep(0.04)
                    except Exception:
                        time.sleep(0.2)
                    fallback_rounds += 1

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        with self._lock:
            if self._latest_frame is not None and (time.time() - self._frame_time < 5.0):
                return True, self._latest_frame
        return False, None

    def _stop(self) -> None:
        self._is_capturing = False
        if self._capture_thread and self._capture_thread.is_alive():
            self._capture_thread.join(timeout=1.5)
            self._capture_thread = None
        with self._lock:
            self._latest_frame = None

    def release(self) -> None:
        self._stop()

    def is_connected(self) -> bool:
        with self._lock:
            return self._is_capturing and (self._latest_frame is not None) and (time.time() - self._frame_time < 5.0)

    def get_info(self) -> Dict[str, Any]:
        with self._lock:
            w = self._latest_frame.shape[1] if self._latest_frame is not None else 640
            h = self._latest_frame.shape[0] if self._latest_frame is not None else 480
        return {
            "connected": self.is_connected(),
            "type": f"Seeed XIAO (Wi-Fi {'Stream' if self._mode == 'stream' else 'Capture'})",
            "camera_index": 0,
            "url": self.stream_url,
            "resolution": {"width": w, "height": h},
        }


def create_unavailable_frame(width: int = 1280, height: int = 720) -> np.ndarray:
    """Generate high-resolution aesthetic frame with 'Camera Unavailable' overlay."""
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:] = (48, 35, 22)  # Dark navy background (#162347)

    scale_factor = max(0.6, min(1.5, width / 1000.0))
    text = "CAMERA UNAVAILABLE"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.9 * scale_factor
    thickness = max(2, int(2 * scale_factor))
    text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
    text_x = (width - text_size[0]) // 2
    text_y = (height + text_size[1]) // 2 - int(20 * scale_factor)
    cv2.putText(frame, text, (text_x, text_y), font, font_scale, (100, 140, 200), thickness, cv2.LINE_AA)

    sub_text = "Check USB / Seeed XIAO connection"
    sub_font_scale = 0.55 * scale_factor
    sub_thickness = max(1, int(1 * scale_factor))
    sub_size = cv2.getTextSize(sub_text, font, sub_font_scale, sub_thickness)[0]
    sub_x = (width - sub_size[0]) // 2
    cv2.putText(
        frame,
        sub_text,
        (sub_x, text_y + int(45 * scale_factor)),
        font,
        sub_font_scale,
        (100, 120, 160),
        sub_thickness,
        cv2.LINE_AA,
    )

    return frame
