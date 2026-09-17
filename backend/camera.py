"""
camera.py — Camera source abstraction for FloodScout.

Provides:
  - CameraSource (abstract base class) — future ESP32-CAM can subclass this
  - USBCameraSource — wraps cv2.VideoCapture for USB/laptop webcams

Design:
  The abstract CameraSource makes it easy to swap USB → ESP32-CAM later
  without touching the detection or API code.
"""

import cv2
import numpy as np
from abc import ABC, abstractmethod
from typing import Optional, Tuple
import time
import logging

logger = logging.getLogger(__name__)


class CameraSource(ABC):
    """Abstract base class for camera sources.

    Subclass this to add new camera types (ESP32-CAM, IP camera, etc.)
    without modifying the detection or API layers.
    """

    @abstractmethod
    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Read a single frame from the camera.

        Returns:
            (success, frame) — success is False if the frame could not be read.
        """
        ...

    @abstractmethod
    def release(self) -> None:
        """Release the camera resource."""
        ...

    @abstractmethod
    def is_connected(self) -> bool:
        """Check whether the camera is currently accessible."""
        ...

    @abstractmethod
    def get_info(self) -> dict:
        """Return camera metadata (index, type, resolution, etc.)."""
        ...


class USBCameraSource(CameraSource):
    """USB / laptop webcam source using OpenCV VideoCapture."""

    def __init__(self, camera_index: int = 0):
        self.camera_index = camera_index
        self._cap: Optional[cv2.VideoCapture] = None
        self._last_reconnect_attempt = 0.0
        self._reconnect_interval = 3.0  # seconds between reconnect attempts
        self._open()

    def _open(self) -> bool:
        """Attempt to open the camera. Returns True on success."""
        try:
            if self._cap is not None:
                self._cap.release()

            self._cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)

            if not self._cap.isOpened():
                # Fallback: try without DirectShow
                self._cap = cv2.VideoCapture(self.camera_index)

            if self._cap.isOpened():
                # Set reasonable defaults for webcam streaming
                self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                logger.info(f"Camera opened successfully (index={self.camera_index})")
                return True
            else:
                logger.warning(f"Failed to open camera (index={self.camera_index})")
                return False
        except Exception as e:
            logger.error(f"Error opening camera: {e}")
            return False

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Read a frame, attempting reconnect if camera is disconnected."""
        if self._cap is None or not self._cap.isOpened():
            return self._try_reconnect_and_read()

        ret, frame = self._cap.read()
        if not ret or frame is None:
            return self._try_reconnect_and_read()

        return True, frame

    def _try_reconnect_and_read(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Attempt reconnection with rate limiting."""
        now = time.time()
        if now - self._last_reconnect_attempt < self._reconnect_interval:
            return False, None

        self._last_reconnect_attempt = now
        logger.info("Attempting camera reconnection...")
        if self._open():
            ret, frame = self._cap.read()  # type: ignore
            if ret and frame is not None:
                return True, frame
        return False, None

    def release(self) -> None:
        """Release the camera."""
        if self._cap is not None:
            self._cap.release()
            self._cap = None
            logger.info("Camera released")

    def is_connected(self) -> bool:
        """Check if the camera is currently open and readable."""
        if self._cap is None:
            return False
        return self._cap.isOpened()

    def get_info(self) -> dict:
        """Return camera metadata."""
        connected = self.is_connected()
        info = {
            "connected": connected,
            "camera_index": self.camera_index,
            "type": "USB",
        }
        if connected and self._cap is not None:
            info["resolution"] = {
                "width": int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                "height": int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            }
        return info


def create_unavailable_frame(width: int = 640, height: int = 480) -> np.ndarray:
    """Generate a black frame with 'Camera Unavailable' text overlay."""
    frame = np.zeros((height, width, 3), dtype=np.uint8)

    # Dark navy background instead of pure black (matches FloodScout palette)
    frame[:] = (48, 35, 22)  # BGR for #162347

    text = "CAMERA UNAVAILABLE"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.8
    thickness = 2
    text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
    text_x = (width - text_size[0]) // 2
    text_y = (height + text_size[1]) // 2
    cv2.putText(frame, text, (text_x, text_y), font, font_scale, (100, 140, 200), thickness)

    sub_text = "Check USB connection"
    sub_size = cv2.getTextSize(sub_text, font, 0.5, 1)[0]
    sub_x = (width - sub_size[0]) // 2
    cv2.putText(frame, sub_text, (sub_x, text_y + 35), font, 0.5, (100, 120, 160), 1)

    return frame
