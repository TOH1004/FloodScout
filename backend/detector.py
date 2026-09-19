"""
detector.py — OpenCV HOG + SVM Person Detection & Tracking module for FloodScout.

Provides:
  - PersonDetector: initializes OpenCV's built-in Histogram of Oriented Gradients
    (HOG) descriptor with the default pre-trained SVM people detector.
  - Multi-person detection: scans at multiple scales with fine stride to detect
    multiple individuals simultaneously.
  - Spatial Deduplication: combines IoU and IoMin (containment) suppression to
    eliminate duplicate/nested boxes on the same physical person.
  - Centroid Tracking: assigns stable unique IDs (Person #1, Person #2, ...)
    across frames so the same person is only detected once and not repeatedly flagged.

Detection Score Semantics
-------------------------
OpenCV HOG + SVM returns raw SVM decision margin weights (referred to here as
"detection scores"), NOT probabilistic confidence percentages. A score of 0.0
means the detector is at its decision boundary; higher positive values indicate
stronger detections. Typical true-positive scores range from 0.0 to ~2.5+.

Do NOT interpret HOG scores as percentages.
"""

import logging
from typing import List, Dict, Any, Tuple, Set, Optional
import cv2
import numpy as np

logger = logging.getLogger(__name__)


class CentroidTracker:
    """Tracks detected people across frames using Euclidean centroid distance (Option 1)
    combined with HSV Appearance Histogram Matching (Option 2).

    Assigns a stable integer ID (Person #1, Person #2, etc.) to each detected individual.
    When a person leaves the frame and returns, their color appearance histogram is compared
    against the known appearance gallery. If a match is found (correlation >= similarity_threshold),
    their existing ID is restored and `isNew=False`, preventing duplicate detections and duplicate alerts.
    """

    def __init__(
        self,
        max_disappeared: int = 25,
        max_distance: float = 120.0,
        similarity_threshold: float = 0.60,
    ):
        self.next_id: int = 1
        self.objects: Dict[int, Tuple[int, int]] = {}           # active person_id -> (cx, cy)
        self.disappeared: Dict[int, int] = {}                   # active person_id -> frames disappeared
        self.logged_ids: Set[int] = set()                       # IDs that have already been alerted
        self.histograms: Dict[int, np.ndarray] = {}             # known person_id -> normalized HSV histogram gallery
        self.max_disappeared: int = max_disappeared
        self.max_distance: float = max_distance
        self.similarity_threshold: float = similarity_threshold # correlation threshold (0.0 to 1.0)

    @staticmethod
    def compute_appearance_histogram(frame: np.ndarray, box: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """Extract a normalized 2D Hue-Saturation color histogram from the person's torso.

        Focuses on the central body region (excluding edges and background) in HSV color space,
        making the representation resilient to lighting brightness changes.
        """
        if frame is None or len(frame.shape) < 3:
            return None

        x, y, w, h = box
        img_h, img_w = frame.shape[:2]
        x1 = max(0, min(x, img_w - 1))
        y1 = max(0, min(y, img_h - 1))
        x2 = max(0, min(x + w, img_w))
        y2 = max(0, min(y + h, img_h))

        if (x2 - x1) < 10 or (y2 - y1) < 20:
            return None

        crop = frame[y1:y2, x1:x2]
        ch, cw = crop.shape[:2]

        # Extract central torso (15% to 85% height, 10% to 90% width) to avoid background pixels
        torso_y1 = int(ch * 0.15)
        torso_y2 = int(ch * 0.85)
        torso_x1 = int(cw * 0.10)
        torso_x2 = int(cw * 0.90)
        body = crop[torso_y1:torso_y2, torso_x1:torso_x2]
        if body.size == 0:
            body = crop

        try:
            hsv = cv2.cvtColor(body, cv2.COLOR_BGR2HSV)
            # Compute 2D Hue-Saturation histogram (H: 24 bins [0-180], S: 24 bins [0-256])
            hist = cv2.calcHist([hsv], [0, 1], None, [24, 24], [0, 180, 0, 256])
            cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
            return hist
        except Exception:
            return None

    def find_best_appearance_match(
        self,
        hist: Optional[np.ndarray],
        exclude_ids: Set[int]
    ) -> Tuple[Optional[int], float]:
        """Compare candidate histogram against known person appearance gallery.

        Returns (best_matched_id, best_score). If best_score >= similarity_threshold,
        returns the existing person ID; otherwise returns (None, score).
        """
        if hist is None or not self.histograms:
            return None, 0.0

        best_id = None
        best_score = -1.0

        for pid, known_hist in self.histograms.items():
            if pid in exclude_ids:
                continue
            try:
                # cv2.HISTCMP_CORREL returns 1.0 for perfect match, -1.0 for completely different
                score = float(cv2.compareHist(hist, known_hist, cv2.HISTCMP_CORREL))
                if score > best_score:
                    best_score = score
                    best_id = pid
            except Exception:
                continue

        if best_id is not None and best_score >= self.similarity_threshold:
            return best_id, best_score
        return None, max(0.0, best_score)

    def update(
        self,
        boxes: List[Tuple[int, int, int, int]],
        scores: List[float],
        frame: Optional[np.ndarray] = None
    ) -> List[Dict[str, Any]]:
        """Update tracker combining Euclidean Centroid Matching + Appearance Histogram Re-ID.

        Args:
            boxes: list of (x, y, w, h) bounding boxes.
            scores: list of corresponding detection scores.
            frame: raw camera frame used to compute appearance color histograms.

        Returns:
            List of dicts with keys: id, box, score, isNew
        """
        # If no detections in this frame, increment disappeared counters for active objects
        if len(boxes) == 0:
            for obj_id in list(self.disappeared.keys()):
                self.disappeared[obj_id] += 1
                if self.disappeared[obj_id] > self.max_disappeared:
                    del self.objects[obj_id]
                    del self.disappeared[obj_id]
            return []

        # 1. Compute centroids and appearance histograms for all incoming boxes
        input_centroids = np.zeros((len(boxes), 2), dtype="int")
        input_hists: List[Optional[np.ndarray]] = []
        for i, (x, y, w, h) in enumerate(boxes):
            input_centroids[i] = (int(x + w / 2), int(y + h / 2))
            hist = self.compute_appearance_histogram(frame, (x, y, w, h)) if frame is not None else None
            input_hists.append(hist)

        used_rows: Set[int] = set()
        used_cols: Set[int] = set()
        used_ids: Set[int] = set()
        results: List[Dict[str, Any]] = []

        # ── STAGE 1: Option 1 — Euclidean Centroid Spatial Matching ──────────
        if len(self.objects) > 0:
            object_ids = list(self.objects.keys())
            object_centroids = np.array(list(self.objects.values()))

            # Distance matrix between currently active objects and incoming centroids
            distances = np.linalg.norm(object_centroids[:, np.newaxis] - input_centroids, axis=2)
            rows = distances.min(axis=1).argsort()
            cols = distances.argmin(axis=1)[rows]

            for row, col in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                if distances[row, col] > self.max_distance:
                    continue

                obj_id = object_ids[row]
                self.objects[obj_id] = tuple(input_centroids[col])
                self.disappeared[obj_id] = 0

                # Smoothly update appearance histogram (Exponential Moving Average)
                new_hist = input_hists[col]
                if new_hist is not None:
                    if obj_id in self.histograms:
                        blended = 0.85 * self.histograms[obj_id] + 0.15 * new_hist
                        cv2.normalize(blended, blended, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
                        self.histograms[obj_id] = blended
                    else:
                        self.histograms[obj_id] = new_hist

                used_rows.add(row)
                used_cols.add(col)
                used_ids.add(obj_id)

                results.append({
                    "id": obj_id,
                    "box": boxes[col],
                    "x": boxes[col][0],
                    "y": boxes[col][1],
                    "width": boxes[col][2],
                    "height": boxes[col][3],
                    "score": scores[col],
                    "isNew": False,  # Continuous active person
                })

            # Increment disappeared for active objects not matched spatially
            for row in range(len(object_ids)):
                if row not in used_rows:
                    obj_id = object_ids[row]
                    self.disappeared[obj_id] += 1
                    if self.disappeared[obj_id] > self.max_disappeared:
                        del self.objects[obj_id]
                        del self.disappeared[obj_id]

        # ── STAGE 2: Option 2 — Appearance Histogram Re-Identification ───────
        # For incoming detections not matched by centroid (e.g. re-entering room, or jumped position)
        for col in range(len(input_centroids)):
            if col in used_cols:
                continue

            hist = input_hists[col]
            matched_id, match_score = self.find_best_appearance_match(hist, exclude_ids=used_ids)

            if matched_id is not None:
                # Re-identify as existing person!
                obj_id = matched_id
                self.objects[obj_id] = tuple(input_centroids[col])
                self.disappeared[obj_id] = 0

                # Update gallery histogram
                if hist is not None:
                    blended = 0.80 * self.histograms[obj_id] + 0.20 * hist
                    cv2.normalize(blended, blended, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
                    self.histograms[obj_id] = blended

                used_cols.add(col)
                used_ids.add(obj_id)

                logger.info(
                    f"Re-identified returning Person #{obj_id} via color appearance "
                    f"(correlation: {match_score:.2f}). Duplicate alert suppressed."
                )

                results.append({
                    "id": obj_id,
                    "box": boxes[col],
                    "x": boxes[col][0],
                    "y": boxes[col][1],
                    "width": boxes[col][2],
                    "height": boxes[col][3],
                    "score": scores[col],
                    "isNew": False,  # Re-identified person — NOT new!
                })

        # ── STAGE 3: Truly New Person Registration ───────────────────────────
        # Any remaining unmatched detections are genuinely new individuals
        for col in range(len(input_centroids)):
            if col in used_cols:
                continue

            obj_id = self.next_id
            self.next_id += 1
            self.objects[obj_id] = tuple(input_centroids[col])
            self.disappeared[obj_id] = 0

            hist = input_hists[col]
            if hist is not None:
                self.histograms[obj_id] = hist

            is_new = obj_id not in self.logged_ids
            self.logged_ids.add(obj_id)
            used_ids.add(obj_id)

            logger.info(f"Registered new Person #{obj_id} with appearance signature.")

            results.append({
                "id": obj_id,
                "box": boxes[col],
                "x": boxes[col][0],
                "y": boxes[col][1],
                "width": boxes[col][2],
                "height": boxes[col][3],
                "score": scores[col],
                "isNew": is_new,
            })

        return results

    def reset(self):
        """Reset tracker state."""
        self.objects.clear()
        self.disappeared.clear()
        self.logged_ids.clear()
        self.histograms.clear()
        self.next_id = 1


# ── HOG Performance Profiles ──────────────────────────────────────────────────
# Inspired by sovit-123/Fast-and-Accurate-Human-Detection-with-HOG:
#   fast:     ~6.8 ms  – winStride=(8,8), scale=1.05, detect_w=480
#   balanced: ~35 ms   – winStride=(6,6), scale=1.05, detect_w=540
#   accurate: ~52 ms   – winStride=(4,4), scale=1.04, detect_w=540 (original)
HOG_MODES: Dict[str, Dict] = {
    "fast": {
        "detect_w": 480,
        "win_stride": (8, 8),
        "padding": (8, 8),
        "scale": 1.05,
        "label": "Fast (~7ms)",
    },
    "balanced": {
        "detect_w": 540,
        "win_stride": (6, 6),
        "padding": (8, 8),
        "scale": 1.05,
        "label": "Balanced (~35ms)",
    },
    "accurate": {
        "detect_w": 540,
        "win_stride": (4, 4),
        "padding": (8, 8),
        "scale": 1.04,
        "label": "Accurate (~52ms)",
    },
}


class PersonDetector:
    """OpenCV HOG + SVM person detection wrapper with tracking, deduplication, and
    selectable performance profiles.

    Performance Modes (based on sovit-123/Fast-and-Accurate-Human-Detection-with-HOG):
      - fast:     ~6.8 ms  (7x faster than original, suitable for real-time 30 FPS)
      - balanced: ~35 ms   (good accuracy, ~28 FPS)
      - accurate: ~52 ms   (~19 FPS, highest HOG detection recall)

    Features:
      - OpenCV built-in HOG descriptor with getDefaultPeopleDetector()
      - Coordinate projection: detection at low-res, boxes scaled to native frame
      - Dual-metric spatial suppression (IoU + IoMin)
      - CentroidTracker for stable IDs across frames
    """

    def __init__(self, hit_threshold: float = 0.0, mode: str = "fast"):
        """Initialize the HOG + SVM people detector.

        Args:
            hit_threshold: SVM decision margin threshold. Default 0.0 (decision boundary).
            mode: Detection speed profile — 'fast', 'balanced', or 'accurate'.
        """
        self.hit_threshold = max(-1.0, hit_threshold)
        self._hog: Optional[cv2.HOGDescriptor] = None
        self.ready = False
        self.tracker = CentroidTracker(max_disappeared=25, max_distance=120.0)
        self._mode = mode if mode in HOG_MODES else "fast"
        self.inference_time_ms: float = 0.0

        self._load_detector()

    def _load_detector(self) -> None:
        """Initialize the HOG descriptor with built-in SVM weights."""
        try:
            self._hog = cv2.HOGDescriptor()
            self._hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            self.ready = True
            logger.info(
                f"OpenCV HOG + SVM people detector initialized. "
                f"Mode: {self._mode} ({HOG_MODES[self._mode]['label']}), "
                f"Hit threshold: {self.hit_threshold}"
            )
        except AttributeError:
            logger.error(
                "cv2.HOGDescriptor is not available. "
                "Please install opencv-python>=4.8,<5."
            )
            self.ready = False
        except Exception as e:
            logger.error(f"Failed to initialize HOG + SVM detector: {e}")
            self.ready = False

    def set_mode(self, mode: str) -> bool:
        """Switch HOG performance profile at runtime.

        Args:
            mode: One of 'fast', 'balanced', or 'accurate'.

        Returns:
            True if mode was changed, False if unknown mode.
        """
        if mode not in HOG_MODES:
            logger.warning(f"Unknown HOG mode '{mode}'. Valid: {list(HOG_MODES.keys())}")
            return False
        self._mode = mode
        logger.info(f"HOG mode switched to '{mode}' ({HOG_MODES[mode]['label']})")
        return True

    @property
    def mode(self) -> str:
        """Current HOG performance mode name."""
        return self._mode

    @property
    def mode_label(self) -> str:
        """Human-readable label of the current mode."""
        return HOG_MODES[self._mode]["label"]

    @staticmethod
    def _filter_and_suppress_boxes(
        boxes: List[Tuple[int, int, int, int]],
        scores: List[float],
        iou_threshold: float = 0.50,
        iomin_threshold: float = 0.72,
    ) -> Tuple[List[Tuple[int, int, int, int]], List[float]]:
        """Deduplicate bounding boxes to ensure ONE box per physical person.

        HOG detectMultiScale produces both overlapping windows and nested windows
        (e.g., torso inside full-body). Standard NMS with IoU threshold > 0.45 misses
        nested boxes because the IoU is low (~0.33).

        This method checks:
          1. IoU (Intersection over Union) > iou_threshold
          2. IoMin (Intersection over Min-Area) > iomin_threshold

        If either condition is met, the lower-scoring box is suppressed as a repeat
        detection of the same person.
        """
        if not boxes:
            return [], []

        # Sort indices by score descending
        idxs = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        kept_indices: List[int] = []

        for i in idxs:
            bx, by, bw, bh = boxes[i]
            area_i = bw * bh
            if area_i <= 0:
                continue

            suppress = False
            for k in kept_indices:
                kx, ky, kw, kh = boxes[k]
                area_k = kw * kh

                inter_x1 = max(bx, kx)
                inter_y1 = max(by, ky)
                inter_x2 = min(bx + bw, kx + kw)
                inter_y2 = min(by + bh, ky + kh)

                inter_w = max(0, inter_x2 - inter_x1)
                inter_h = max(0, inter_y2 - inter_y1)
                inter_area = inter_w * inter_h

                if inter_area > 0:
                    union_area = float(area_i + area_k - inter_area)
                    iou = inter_area / union_area if union_area > 0 else 0.0
                    min_area = float(min(area_i, area_k))
                    iomin = inter_area / min_area if min_area > 0 else 0.0

                    if iou > iou_threshold or iomin > iomin_threshold:
                        suppress = True
                        break

            if not suppress:
                kept_indices.append(i)

        return [boxes[i] for i in kept_indices], [scores[i] for i in kept_indices]

    def update_threshold(self, threshold: float) -> None:
        """Dynamically update the SVM hit threshold."""
        self.hit_threshold = max(-1.0, min(3.0, threshold))
        logger.info(f"HOG hit threshold updated to {self.hit_threshold:.3f}")

    def update_confidence_threshold(self, threshold: float) -> None:
        """Alias for update_threshold for backward compatibility."""
        self.update_threshold(threshold)

    def is_ready(self) -> bool:
        """Return True if the HOG detector is loaded and ready."""
        return self.ready

    @property
    def confidence_threshold(self) -> float:
        """Backward-compatible property; returns hit_threshold."""
        return self.hit_threshold

    def get_telemetry(self) -> Dict[str, Any]:
        """Return current detector performance telemetry."""
        return {
            "mode": self._mode,
            "modeLabel": self.mode_label,
            "inferenceTimeMs": round(self.inference_time_ms, 2),
            "detectorFps": round(1000.0 / self.inference_time_ms, 1) if self.inference_time_ms > 0 else 0.0,
            "hitThreshold": self.hit_threshold,
        }

    def detect(
        self,
        frame: np.ndarray,
        draw: bool = True,
    ) -> Tuple[np.ndarray, List[Dict[str, Any]], Dict[str, Any]]:
        """Run OpenCV HOG + SVM multi-person detection and tracking on a single frame.

        Pipeline:
          1. Look up current mode profile (fast/balanced/accurate).
          2. Downscale frame to mode's detect_w for efficient processing.
          3. Run detectMultiScale with mode-specific stride, padding, and scale.
          4. Filter raw detections below hit_threshold.
          5. Apply dual-metric spatial deduplication (IoU + IoMin).
          6. Project bounding box coordinates back to native frame dimensions.
          7. Update CentroidTracker for stable IDs and new-person detection.
          8. Draw emerald-green bounding boxes with 'PERSON #ID  Score:X.XX' badges.
          9. Record inference time (ms) for telemetry.

        Returns:
            (annotated_frame, detections, summary)
        """
        if not self.ready or self._hog is None:
            return frame, [], {
                "personDetected": False,
                "personCount": 0,
                "highestConfidence": 0.0,
                "hasNewPerson": False,
                "newPersonsCount": 0,
            }

        import time as _time
        _t0 = _time.perf_counter()

        output_frame = frame.copy() if draw else frame
        orig_h, orig_w = frame.shape[:2]

        try:
            # ── Step 1: Select mode profile ────────────────────────────────────
            profile = HOG_MODES[self._mode]
            detect_w: int = profile["detect_w"]
            win_stride: Tuple[int, int] = profile["win_stride"]
            padding: Tuple[int, int] = profile["padding"]
            hog_scale: float = profile["scale"]

            # ── Step 2: Downscale to detection resolution ──────────────────────
            if orig_w > detect_w:
                scale = detect_w / orig_w
                detect_h = int(orig_h * scale)
                detect_frame = cv2.resize(frame, (detect_w, detect_h))
            else:
                scale = 1.0
                detect_frame = frame

            # ── Step 3: Multi-scale HOG detection with mode-specific parameters ─
            boxes_raw, weights_raw = self._hog.detectMultiScale(
                detect_frame,
                hitThreshold=self.hit_threshold,
                winStride=win_stride,
                padding=padding,
                scale=hog_scale,
                useMeanshiftGrouping=False,
            )

            # Flatten weights and extract boxes
            boxes_filtered = []
            scores_filtered = []
            if len(boxes_raw) > 0:
                weights_flat = [
                    float(w[0]) if hasattr(w, "__len__") else float(w)
                    for w in weights_raw
                ]
                for (x, y, w, h), score in zip(boxes_raw, weights_flat):
                    if score >= self.hit_threshold:
                        # Scale coordinates back to original frame space
                        x1 = max(0, min(int(x / scale), orig_w - 1))
                        y1 = max(0, min(int(y / scale), orig_h - 1))
                        w_orig = min(orig_w - x1, int(w / scale))
                        h_orig = min(orig_h - y1, int(h / scale))
                        if w_orig > 10 and h_orig > 20:
                            boxes_filtered.append((x1, y1, w_orig, h_orig))
                            scores_filtered.append(score)

            # ── Step 4: Dual-metric spatial deduplication ──────────────────────
            # Suppresses nested torso boxes (iomin > 0.72) or shifted boxes (iou > 0.50)
            # while keeping adjacent people detected separately
            dedup_boxes, dedup_scores = self._filter_and_suppress_boxes(
                boxes_filtered,
                scores_filtered,
                iou_threshold=0.50,
                iomin_threshold=0.72,
            )

            # ── Step 5: Track persons (Centroid + Appearance Re-ID) ────────────
            tracked = self.tracker.update(dedup_boxes, dedup_scores, frame=frame)

            detections: List[Dict[str, Any]] = []
            highest_score = 0.0
            has_new_person = False
            new_persons_count = 0

            for item in tracked:
                obj_id = item["id"]
                x1, y1, w_orig, h_orig = item["box"]
                score = item["score"]
                is_new = item["isNew"]

                if is_new:
                    has_new_person = True
                    new_persons_count += 1

                if score > highest_score:
                    highest_score = score

                x2 = min(orig_w, x1 + w_orig)
                y2 = min(orig_h, y1 + h_orig)

                det_dict: Dict[str, Any] = {
                    "id": obj_id,
                    "class": "person",
                    "confidence": round(score, 4),
                    "x": x1,
                    "y": y1,
                    "width": w_orig,
                    "height": h_orig,
                    "isNew": is_new,
                }
                detections.append(det_dict)

                # ── Step 5: Draw tactical bounding boxes ──────────────────────
                if draw:
                    box_color = (80, 230, 110)  # Emerald green (BGR)
                    cv2.rectangle(output_frame, (x1, y1), (x2, y2), box_color, 2)

                    # Label badge: "PERSON #1  Score: X.XX"
                    label = f"PERSON #{obj_id}  Score:{score:.2f}"
                    font = cv2.FONT_HERSHEY_SIMPLEX
                    font_scale = 0.45
                    thickness = 1
                    (tw, th), baseline = cv2.getTextSize(label, font, font_scale, thickness)

                    badge_y1 = max(0, y1 - th - 8)
                    badge_y2 = y1 if (y1 - th - 8) >= 0 else y1 + th + 8
                    cv2.rectangle(
                        output_frame,
                        (x1, badge_y1),
                        (x1 + tw + 10, badge_y2),
                        (16, 185, 129),
                        -1,
                    )
                    text_y = badge_y2 - 4 if (y1 - th - 8) >= 0 else badge_y2 - 3
                    cv2.putText(
                        output_frame,
                        label,
                        (x1 + 5, text_y),
                        font,
                        font_scale,
                        (255, 255, 255),
                        thickness,
                        cv2.LINE_AA,
                    )

            person_count = len(detections)

            # ── Step 9: Record inference time for telemetry ────────────────────
            self.inference_time_ms = (_time.perf_counter() - _t0) * 1000.0

            summary = {
                "personDetected": person_count > 0,
                "personCount": person_count,
                "highestConfidence": round(highest_score, 4),
                "hasNewPerson": has_new_person,
                "newPersonsCount": new_persons_count,
                "inferenceTimeMs": round(self.inference_time_ms, 2),
            }

            return output_frame, detections, summary

        except Exception as e:
            logger.error(f"Detection failed: {e}", exc_info=True)
            return output_frame, [], {
                "personDetected": False,
                "personCount": 0,
                "highestConfidence": 0.0,
                "hasNewPerson": False,
                "newPersonsCount": 0,
            }
