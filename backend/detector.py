"""
detector.py — YOLO Person Detection module for FloodScout.

Provides:
  - PersonDetector: loads YOLO model, runs inference, filters class 0 (person),
    draws bounding boxes, and returns structured detection metadata.
  - Automatically selects CUDA if an NVIDIA GPU is available with PyTorch CUDA support,
    otherwise gracefully falls back to CPU.
"""

import logging
from typing import List, Dict, Any, Tuple
import cv2
import numpy as np

logger = logging.getLogger(__name__)

try:
    import torch
    def _is_cuda_operational() -> bool:
        if not torch.cuda.is_available():
            return False
        try:
            # Test a tiny tensor operation to ensure the GPU architecture (e.g. sm_120) is supported by current PyTorch binaries
            x = torch.zeros((1, 1), device="cuda")
            _ = x + 1
            return True
        except Exception as e:
            logger.warning(f"CUDA detected ({torch.cuda.get_device_name(0)}) but not compatible with current PyTorch build ({e}). Using CPU.")
            return False

    CUDA_AVAILABLE = _is_cuda_operational()
except ImportError:
    CUDA_AVAILABLE = False

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False


class PersonDetector:
    """YOLO person detection wrapper.

    Filters strictly for class_id 0 ('person') and draws visually clean,
    tactical bounding boxes suitable for the FloodScout command interface.
    """

    def __init__(self, model_name: str = "yolo11n.pt", confidence_threshold: float = 0.50):
        self.confidence_threshold = confidence_threshold
        self.model_name = model_name
        self.device = "cuda" if CUDA_AVAILABLE else "cpu"
        self.model = None
        self.ready = False

        self._load_model()

    def _load_model(self):
        """Loads or downloads the specified YOLO lightweight model."""
        if not ULTRALYTICS_AVAILABLE:
            logger.error("Ultralytics package is not installed.")
            return

        try:
            logger.info(f"Loading YOLO model '{self.model_name}' on device '{self.device}'...")
            self.model = YOLO(self.model_name)
            self.ready = True
            logger.info(f"YOLO model loaded successfully on {self.device}.")
        except Exception as e:
            logger.warning(f"Failed to load '{self.model_name}' ({e}). Falling back to 'yolov8n.pt'...")
            try:
                self.model = YOLO("yolov8n.pt")
                self.ready = True
                logger.info("Fallback YOLOv8n model loaded successfully.")
            except Exception as e2:
                logger.error(f"Failed to load any YOLO model: {e2}")
                self.ready = False

    def update_confidence_threshold(self, threshold: float):
        """Allows dynamically tuning confidence threshold."""
        self.confidence_threshold = max(0.01, min(0.99, threshold))

    def detect(self, frame: np.ndarray, draw: bool = True) -> Tuple[np.ndarray, List[Dict[str, Any]], Dict[str, Any]]:
        """Run YOLO inference on a frame.

        Args:
            frame: OpenCV BGR image
            draw: Whether to render bounding boxes onto the returned frame

        Returns:
            annotated_frame: Frame with bounding boxes drawn (if draw=True)
            detections: List of detection dictionaries
            summary: Aggregated summary dict (personDetected, personCount, highestConfidence)
        """
        if not self.ready or self.model is None or frame is None:
            empty_summary = {
                "personDetected": False,
                "personCount": 0,
                "highestConfidence": 0.0,
            }
            return frame, [], empty_summary

        output_frame = frame.copy() if draw else frame
        detections: List[Dict[str, Any]] = []

        try:
            # classes=[0] filters inference to only person class (COCO 0)
            results = self.model.predict(
                source=frame,
                classes=[0],
                conf=self.confidence_threshold,
                device=self.device,
                verbose=False,
                imgsz=640
            )

            highest_conf = 0.0

            if results and len(results) > 0:
                boxes = results[0].boxes
                for box in boxes:
                    conf = float(box.conf[0].item()) if hasattr(box.conf[0], 'item') else float(box.conf[0])
                    if conf < self.confidence_threshold:
                        continue

                    xyxy = box.xyxy[0].tolist()
                    x1, y1, x2, y2 = [int(v) for v in xyxy]
                    w = x2 - x1
                    h = y2 - y1

                    if conf > highest_conf:
                        highest_conf = conf

                    det_item = {
                        "class": "person",
                        "confidence": round(conf, 4),
                        "x": x1,
                        "y": y1,
                        "width": w,
                        "height": h,
                    }
                    detections.append(det_item)

                    if draw:
                        # Draw aesthetic FloodScout style bounding box
                        # Emerald green: (74, 222, 128) in BGR -> (128, 222, 74)
                        box_color = (110, 230, 80)
                        cv2.rectangle(output_frame, (x1, y1), (x2, y2), box_color, 2)

                        # Label badge background
                        label = f"PERSON {int(conf * 100)}%"
                        font = cv2.FONT_HERSHEY_SIMPLEX
                        font_scale = 0.5
                        thickness = 1
                        (tw, th), baseline = cv2.getTextSize(label, font, font_scale, thickness)

                        # Draw badge above box or inside if too close to top
                        badge_y1 = max(0, y1 - th - 8)
                        badge_y2 = y1 if y1 - th - 8 >= 0 else y1 + th + 8
                        cv2.rectangle(output_frame, (x1, badge_y1), (x1 + tw + 10, badge_y2), (16, 185, 129), -1)
                        text_baseline_y = badge_y2 - 4 if y1 - th - 8 >= 0 else badge_y2 - 3
                        cv2.putText(output_frame, label, (x1 + 5, text_baseline_y), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

            summary = {
                "personDetected": len(detections) > 0,
                "personCount": len(detections),
                "highestConfidence": round(highest_conf, 4),
            }

            return output_frame, detections, summary

        except Exception as e:
            logger.error(f"Error during YOLO inference on {self.device}: {e}")
            if self.device != "cpu":
                logger.warning("Switching YOLO device to 'cpu' due to inference error.")
                self.device = "cpu"
            empty_summary = {
                "personDetected": False,
                "personCount": 0,
                "highestConfidence": 0.0,
            }
            return output_frame, [], empty_summary
