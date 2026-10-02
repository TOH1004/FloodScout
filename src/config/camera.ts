/**
 * camera.ts — Centralized Wi-Fi configuration and management for ESP32 / XIAO Camera streaming.
 *
 * Supports:
 * - Direct Wi-Fi MJPEG streaming from ESP32-CAM / XIAO ESP32-S3 over local network.
 * - AI Vision overlay streaming proxied through the Python OpenCV backend.
 * - Dynamic IP / URL configuration stored in localStorage and synchronized with the backend.
 */

export const DEFAULT_CAMERA_IP = '10.185.112.149';
export const DEFAULT_CAMERA_STREAM_PATH = ':81/stream';

const STORAGE_URL_KEY = 'floodscout_camera_stream_url';
const STORAGE_MODE_KEY = 'floodscout_camera_feed_mode'; // 'ai' | 'direct'

/**
 * Normalizes a raw camera IP or URL to a complete, valid stream URL.
 * Examples:
 * - "10.185.112.106" -> "http://10.185.112.106:81/stream"
 * - "http://10.185.112.106" -> "http://10.185.112.106:81/stream"
 * - "http://10.185.112.106/stream" -> "http://10.185.112.106/stream"
 * - "http://10.185.112.106:81/stream" -> "http://10.185.112.106:81/stream"
 */
export function normalizeCameraStreamUrl(raw: string): string {
  let cleaned = (raw || '').trim();
  if (!cleaned) {
    return `http://${DEFAULT_CAMERA_IP}${DEFAULT_CAMERA_STREAM_PATH}`;
  }

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // Add protocol if missing
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://') && !cleaned.startsWith('rtsp://')) {
    cleaned = `http://${cleaned}`;
  }

  try {
    const url = new URL(cleaned);
    // Auto-correct /cam.mjpg to :81/stream since official ESP32 CameraWebServer uses :81/stream
    if (url.pathname === '/cam.mjpg') {
      return `http://${url.hostname}:81/stream`;
    }
    // If no port and no specific path, default to :81/stream for ESP32 / XIAO cameras
    if (!url.port && (!url.pathname || url.pathname === '/' || url.pathname === '')) {
      return `${url.origin}:81/stream`;
    }
    return cleaned;
  } catch {
    return cleaned;
  }
}

/**
 * Extracts just the IP / hostname from a stream URL.
 */
export function extractCameraHost(streamUrl: string): string {
  try {
    const url = new URL(normalizeCameraStreamUrl(streamUrl));
    return url.hostname;
  } catch {
    return DEFAULT_CAMERA_IP;
  }
}

/**
 * Returns the currently active Camera Wi-Fi Stream URL.
 */
export function getCameraStreamUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_URL_KEY);
    if (saved && saved.trim()) {
      return normalizeCameraStreamUrl(saved);
    }
  } catch {
    // ignore
  }

  const envUrl = import.meta.env.VITE_CAMERA_STREAM_URL as string | undefined;
  if (envUrl && envUrl.trim()) {
    return normalizeCameraStreamUrl(envUrl);
  }

  return `http://${DEFAULT_CAMERA_IP}${DEFAULT_CAMERA_STREAM_PATH}`;
}

/**
 * Persists the Camera Wi-Fi Stream URL to localStorage.
 */
export function setCameraStreamUrl(newUrl: string): string {
  const normalized = normalizeCameraStreamUrl(newUrl);
  try {
    localStorage.setItem(STORAGE_URL_KEY, normalized);
  } catch {
    // ignore
  }
  return normalized;
}

export type CameraFeedMode = 'ai' | 'direct';

/**
 * Returns the selected camera feed mode:
 * - 'ai': Live stream with AI HOG+SVM person detection bounding boxes (via Python backend)
 * - 'direct': Direct, zero-latency Wi-Fi stream directly from the camera
 */
export function getCameraFeedMode(): CameraFeedMode {
  try {
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    if (saved === 'direct' || saved === 'ai') return saved;
  } catch {
    // ignore
  }
  return 'ai';
}

export function setCameraFeedMode(mode: CameraFeedMode): void {
  try {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
