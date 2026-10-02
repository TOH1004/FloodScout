import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getCameraStreamUrl,
  setCameraStreamUrl,
  getCameraFeedMode,
  setCameraFeedMode,
  type CameraFeedMode,
} from '../config/camera';

export interface DetectionItem {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionStatus {
  personDetected: boolean;
  personCount: number;
  highestConfidence: number;
  timestamp: string;
  alertActive?: boolean;
  detections?: DetectionItem[];
}

export interface CameraStatus {
  connected: boolean;
  camera_index: number;
  type?: string;
  url?: string;
  visionAiReady?: boolean;
  visionModel?: string;
  cooldownSeconds?: number;
  resolution?: {
    width: number;
    height: number;
  };
  // Streaming & detector telemetry (from upgraded pipeline)
  streamFps?: number;
  inferenceTimeMs?: number;
  detectorFps?: number;
  mode?: 'fast' | 'balanced' | 'accurate';
  modeLabel?: string;
  xiaoSerial?: XiaoSerialStatus;
}

export interface CameraHardwareSettings {
  xclk: number;           // 5 to 40 (MHz, default 20)
  framesize: number;      // 0 to 13 (Resolution)
  quality: number;        // 4 to 63 (JPEG quality, lower is better)
  brightness: number;     // -3 to 3
  contrast: number;       // -3 to 3
  saturation: number;     // -4 to 4
  sharpness: number;      // -3 to 3
  denoise: number;        // 0 to 8
  ae_level: number;       // -5 to 5 (Exposure Level)
  gainceiling: number;    // 0 to 511
  special_effect: number; // 0 to 6
  awb: number;            // 0 or 1 (AWB Enable)
  awb_gain: number;       // 0 or 1 (Advanced AWB)
  wb_mode: number;        // 0 to 4 (Manual AWB Mode)
  aec: number;            // 0 or 1 (AEC Enable)
  aec2: number;           // 0 or 1 (Night Mode)
  agc: number;            // 0 or 1 (AGC Enable)
  raw_gma: number;        // 0 or 1 (GMA Enable)
  lenc: number;           // 0 or 1 (Lens Correction)
  hmirror: number;        // 0 or 1 (H-Mirror)
  vflip: number;          // 0 or 1 (V-Flip)
  bpc: number;            // 0 or 1 (Black Pixel Correction)
  wpc: number;            // 0 or 1 (White Pixel Correction)
  colorbar: number;       // 0 or 1 (Color Bar Test Pattern)
}

export interface XiaoSerialStatus {
  connected: boolean;
  port: string | null;
  baud_rate?: number;
  last_error?: string | null;
  settings?: CameraHardwareSettings;
}

export interface SettingFeedback {
  message: string;
  success: boolean;
  timestamp: number;
}

export interface DetectionHistoryItem {
  id: string;
  time: string;
  timestamp: string;
  type: 'person_detected' | 'no_person';
  message: string;
  peopleCount: number;
  confidence: number;
}

export interface PersonDetail {
  id: number;
  label: string;
  imageUrl: string;
  score?: number;
  box?: [number, number, number, number];
  isReturning?: boolean;
}

export interface RescueIncident {
  id: string;
  time: string;
  timestamp: string;
  personCount: number;
  highestConfidence: number;
  imageUrl: string; // annotated frame with HOG+SVM bounding boxes
  originalImageUrl: string; // raw clean scene
  personImages: string[]; // individual person crops
  personDetails?: PersonDetail[]; // individual person metadata with ID (Person #1, Person #2, etc.)
  description: string;
  descriptionStatus: 'pending' | 'completed' | 'failed';
  status: 'NEW' | 'VERIFIED' | 'RESOLVED';
}

const STORAGE_KEY = 'floodscout_backend_url';

export function getBackendBaseUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      let cleaned = saved.trim();
      const isRemoteClient =
        typeof window !== 'undefined' &&
        window.location.hostname &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';

      // If on mobile/remote client and saved URL points to localhost, ignore it (it's unreachable on mobile)
      if (!isRemoteClient || (!cleaned.includes('localhost') && !cleaned.includes('127.0.0.1'))) {
        if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
          cleaned = `https://${cleaned}`;
        }
        return cleaned.replace(/\/+$/, '');
      }
    }
  } catch {
    // ignore
  }

  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl && envUrl.trim()) {
    let cleaned = envUrl.trim();
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = `https://${cleaned}`;
    }
    return cleaned.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    const host = window.location.hostname;
    const isCloudDeploy = host.includes('vercel.app') || host.includes('netlify.app') || host.includes('pages.dev');
    if (!isCloudDeploy) {
      // Use current Vite server origin (e.g. http://10.185.112.238:5174 or http://localhost:5174)
      // Vite proxy forwards /video_feed, /camera, /detection to 127.0.0.1:8000 seamlessly
      return window.location.origin;
    }
  }

  return 'http://localhost:8000';
}

export function setBackendBaseUrl(newUrl: string): string {
  let cleaned = newUrl.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  cleaned = cleaned.replace(/\/+$/, '');
  try {
    localStorage.setItem(STORAGE_KEY, cleaned);
  } catch {
    // ignore
  }
  return cleaned;
}

export function useDetectionApi() {
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(() => getBackendBaseUrl());
  const wsBaseUrl = apiBaseUrl.startsWith('https://')
    ? `wss://${apiBaseUrl.replace(/^https?:\/\//, '')}`
    : `ws://${apiBaseUrl.replace(/^https?:\/\//, '')}`;
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>({ connected: false, camera_index: 0 });
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    personDetected: false,
    personCount: 0,
    highestConfidence: 0,
    timestamp: '',
    alertActive: false,
    detections: [],
  });

  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [lastAlertTimestamp, setLastAlertTimestamp] = useState<string | null>(null);

  // Incidents State
  const [incidents, setIncidents] = useState<RescueIncident[]>([]);
  const [activeIncident, setActiveIncident] = useState<RescueIncident | null>(null);
  const [visionAiStatus, setVisionAiStatus] = useState<{ ready: boolean; model: string }>({
    ready: false,
    model: 'gemini-2.5-flash',
  });

  // XIAO ESP32-S3 Hardware Settings & Serial Status
  const [cameraSettings, setCameraSettings] = useState<CameraHardwareSettings>({
    xclk: 20,
    framesize: 4,
    quality: 12,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    denoise: 0,
    ae_level: 0,
    gainceiling: 0,
    special_effect: 0,
    awb: 1,
    awb_gain: 1,
    wb_mode: 0,
    aec: 1,
    aec2: 0,
    agc: 1,
    raw_gma: 1,
    lenc: 1,
    hmirror: 0,
    vflip: 0,
    bpc: 0,
    wpc: 1,
    colorbar: 0,
  });
  const [xiaoStatus, setXiaoStatus] = useState<XiaoSerialStatus>({
    connected: false,
    port: null,
    last_error: null,
  });
  const [settingFeedback, setSettingFeedback] = useState<SettingFeedback | null>(null);
  const [isUpdatingSetting, setIsUpdatingSetting] = useState<boolean>(false);

  const isPollingRef = useRef<boolean>(true);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch Incidents via REST
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/incidents?limit=25`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data: RescueIncident[] = await res.json();
        setIncidents(data);
        if (data.length > 0 && !activeIncident) {
          // Keep active incident visible if recent (within 15 seconds)
          const latest = data[0];
          const ageMs = Date.now() - new Date(latest.timestamp).getTime();
          if (ageMs < 15000) {
            setActiveIncident(latest);
          }
        }
      }
    } catch {
      // Handled silently
    }
  }, [activeIncident, apiBaseUrl]);

  // Poll Detection Status & Camera Status
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Detection Status (primary health ping)
      const detRes = await fetch(`${apiBaseUrl}/detection/status`, { signal: AbortSignal.timeout(2000) });
      if (detRes.ok) {
        const detData: DetectionStatus = await detRes.json();
        setDetectionStatus(detData);
        setBackendOnline(true);

        if (detData.alertActive && detData.personDetected) {
          setLastAlertTimestamp(new Date().toLocaleTimeString());
        }
      } else {
        setBackendOnline(false);
        return;
      }

      // 2. Fetch Camera Status
      const camRes = await fetch(`${apiBaseUrl}/camera/status`, { signal: AbortSignal.timeout(2000) });
      if (camRes.ok) {
        const camData: CameraStatus = await camRes.json();
        setCameraStatus(camData);
        setVisionAiStatus({
          ready: Boolean(camData.visionAiReady),
          model: camData.visionModel || 'gemini-2.5-flash',
        });
        if (camData.xiaoSerial) {
          setXiaoStatus(camData.xiaoSerial);
          if (camData.xiaoSerial.settings) {
            setCameraSettings(camData.xiaoSerial.settings);
          }
        }
      }

      // 3. Fetch Detection History
      const histRes = await fetch(`${apiBaseUrl}/detection/history?limit=25`, { signal: AbortSignal.timeout(2000) });
      if (histRes.ok) {
        const histData: DetectionHistoryItem[] = await histRes.json();
        setHistory(histData);
      }

      // 4. Fetch Incidents
      fetchIncidents();
    } catch {
      setBackendOnline(false);
      setCameraStatus((prev) => ({ ...prev, connected: false }));
      setXiaoStatus((prev) => ({ ...prev, connected: false }));
    }
  }, [fetchIncidents, apiBaseUrl]);

  // Connect WebSocket for Real-Time Incident Push (only when backend is confirmed online)
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    if (!backendOnline) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    function connectWs() {
      try {
        const ws = new WebSocket(`${wsBaseUrl}/ws/incidents`);
        wsRef.current = ws;

        ws.onopen = () => {
          // Connected
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'incident_created' && data.incident) {
              const newInc: RescueIncident = data.incident;
              setIncidents((prev) => [newInc, ...prev.filter((i) => i.id !== newInc.id)]);
              setActiveIncident(newInc);
            } else if (data.type === 'incident_updated' && data.incident) {
              const updatedInc: RescueIncident = data.incident;
              setIncidents((prev) => prev.map((i) => (i.id === updatedInc.id ? updatedInc : i)));
              setActiveIncident((prev) => (prev && prev.id === updatedInc.id ? updatedInc : prev));
            }
          } catch {
            // Non-JSON or ping
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        reconnectTimeout = setTimeout(connectWs, 5000);
      }
    }

    connectWs();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [backendOnline, wsBaseUrl]);

  // Periodic polling interval
  useEffect(() => {
    isPollingRef.current = true;
    fetchData();

    const intervalTime = backendOnline ? 1000 : 3500;
    const interval = setInterval(() => {
      if (isPollingRef.current) {
        fetchData();
      }
    }, intervalTime);

    return () => {
      isPollingRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData, backendOnline]);

  // Adjust HOG+SVM hit threshold (SVM score, NOT a YOLO confidence percentage)
  const setConfidenceThreshold = async (threshold: number): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/detection/threshold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const setHogMode = async (mode: 'fast' | 'balanced' | 'accurate'): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/detection/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const updateCameraSetting = async (
    setting: keyof CameraHardwareSettings,
    value: number
  ): Promise<boolean> => {
    setIsUpdatingSetting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/camera/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting, value }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCameraSettings((prev) => ({ ...prev, [setting]: value }));
        setSettingFeedback({
          message: `✓ ${setting.charAt(0).toUpperCase() + setting.slice(1)} updated`,
          success: true,
          timestamp: Date.now(),
        });
        return true;
      } else {
        const errorMsg = data.message || `Failed to update ${setting}`;
        setSettingFeedback({
          message: `✗ ${errorMsg}`,
          success: false,
          timestamp: Date.now(),
        });
        return false;
      }
    } catch {
      setSettingFeedback({
        message: `✗ Failed to update ${setting} (backend offline)`,
        success: false,
        timestamp: Date.now(),
      });
      return false;
    } finally {
      setIsUpdatingSetting(false);
    }
  };

  const dismissActiveIncident = () => {
    setActiveIncident(null);
  };

  const updateBackendUrl = useCallback((newUrl: string) => {
    const saved = setBackendBaseUrl(newUrl);
    setApiBaseUrlState(saved);
  }, []);

  // Direct Wi-Fi Camera Stream state & mode ('ai' vs 'direct')
  const [cameraStreamUrl, setCameraStreamUrlState] = useState<string>(() => getCameraStreamUrl());
  const [feedMode, setFeedModeState] = useState<CameraFeedMode>(() => getCameraFeedMode());
  const [isUpdatingCameraUrl, setIsUpdatingCameraUrl] = useState<boolean>(false);

  const setFeedMode = useCallback((mode: CameraFeedMode) => {
    setCameraFeedMode(mode);
    setFeedModeState(mode);
  }, []);

  const updateCameraUrl = useCallback(async (newUrl: string): Promise<boolean> => {
    const saved = setCameraStreamUrl(newUrl);
    setCameraStreamUrlState(saved);
    setIsUpdatingCameraUrl(true);
    try {
      const res = await fetch(`${apiBaseUrl}/camera/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: saved }),
      });
      if (res.ok) {
        await fetchData();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsUpdatingCameraUrl(false);
    }
  }, [apiBaseUrl, fetchData]);

  const reconnectCamera = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/camera/reconnect`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [apiBaseUrl, fetchData]);

  const videoFeedUrl = `${apiBaseUrl}/video_feed`;

  return {
    backendOnline,
    cameraStatus,
    detectionStatus,
    history,
    incidents,
    activeIncident,
    visionAiStatus,
    lastAlertTimestamp,
    videoFeedUrl,
    cameraStreamUrl,
    setCameraStreamUrl: updateCameraUrl,
    feedMode,
    setFeedMode,
    isUpdatingCameraUrl,
    reconnectCamera,
    apiBaseUrl,
    setBackendUrl: updateBackendUrl,
    xiaoStatus,
    cameraSettings,
    settingFeedback,
    isUpdatingSetting,
    updateCameraSetting,
    dismissActiveIncident,
    setConfidenceThreshold,
    setHogMode,
    refresh: fetchData,
  };
}
