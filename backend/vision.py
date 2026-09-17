"""
vision.py — Vision AI scene describer for FloodScout using Google Gemini.

Provides:
  - VisionAnalyzer: Generates short (1–2 sentences) rescue-relevant descriptions
    focusing ONLY on directly observable surroundings, posture, and clothing colors.
  - Strictly prevents unsupported assumptions (no guessing age, ethnicity, medical/mental states).
  - Graceful degradation if API key is missing or offline.
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Try importing google-genai
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai library not found. Vision AI will operate in fallback mode.")

SYSTEM_PROMPT = (
    "You are the vision perception assistant for FloodScout, an autonomous search and rescue robot "
    "operating in disaster and flood response scenarios. "
    "Analyze the provided camera image where one or more people have been detected. "
    "Provide a concise, factual 1 to 2 sentence rescue-relevant description focusing ONLY on directly observable facts:\n"
    "1. Directly visible environment or surroundings (e.g., flood water, doorway, building structure, vehicle, boat, debris).\n"
    "2. Visible clothing colors/types, observable posture (e.g., standing, seated, waving), and spatial position in the frame.\n\n"
    "STRICT SAFETY & ETHICAL RULES:\n"
    "- Do NOT guess or assume age, ethnicity, identity, emotional state, or mental state.\n"
    "- Do NOT assume medical conditions or injuries unless an unambiguous physical aid/wound is directly visible.\n"
    "- State only verifiable, observable facts in a neutral tone.\n"
    "- Limit the response to at most 2 sentences."
)


class VisionAnalyzer:
    """Handles visual scene description via Google Gemini API."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-3.6-flash"):
        self.api_key = api_key or os.getenv("VISION_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
        self.model_name = model_name or os.getenv("VISION_MODEL", "gemini-3.6-flash")
        self._client = None

        if self.api_key and GENAI_AVAILABLE:
            try:
                self._client = genai.Client(api_key=self.api_key)
                logger.info(f"Gemini Vision client initialized with model '{self.model_name}'.")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                self._client = None
        else:
            if not self.api_key:
                logger.info("VISION_API_KEY is not set. Vision AI descriptions will use fallback status.")

    def is_ready(self) -> bool:
        """Returns True if the Vision AI client is configured and ready."""
        return bool(self._client is not None and self.api_key and GENAI_AVAILABLE)

    def describe_scene(self, image_bytes: bytes) -> Dict[str, Any]:
        """Analyzes a captured image and generates a 1-2 sentence rescue description.

        Args:
            image_bytes: JPEG-encoded image bytes

        Returns:
            {
                "status": "completed" | "failed",
                "description": str,
                "model": str
            }
        """
        if not self.api_key:
            return {
                "status": "failed",
                "description": "AI description unavailable (VISION_API_KEY not configured).",
                "model": self.model_name,
            }

        if not GENAI_AVAILABLE or self._client is None:
            return {
                "status": "failed",
                "description": "AI description unavailable (google-genai SDK not initialized).",
                "model": self.model_name,
            }

        try:
            image_part = types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/jpeg"
            )

            response = self._client.models.generate_content(
                model=self.model_name,
                contents=[
                    image_part,
                    SYSTEM_PROMPT
                ]
            )

            text = response.text.strip() if response and response.text else ""
            if not text:
                return {
                    "status": "failed",
                    "description": "AI description unavailable (empty response).",
                    "model": self.model_name,
                }

            return {
                "status": "completed",
                "description": text,
                "model": self.model_name,
            }

        except Exception as e:
            logger.error(f"Gemini Vision API error during inference: {e}")
            err_str = str(e)
            if "API_KEY_SERVICE_BLOCKED" in err_str or "Requests to this API" in err_str:
                msg = "AI description unavailable: API key is blocked for Generative Language API in Google Cloud restrictions."
            elif "PERMISSION_DENIED" in err_str:
                msg = "AI description unavailable: 403 Permission Denied (API key not authorized or service disabled)."
            elif "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
                msg = "AI description unavailable: Rate limit exceeded (429)."
            else:
                msg = f"AI description unavailable (service error: {type(e).__name__})."

            return {
                "status": "failed",
                "description": msg,
                "model": self.model_name,
            }
