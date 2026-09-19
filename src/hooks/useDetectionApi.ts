import { useState, useEffect, useRef, useCallback } from 'react';

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

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

// Convert http/https URL to ws/wss
const WS_BASE_URL = API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

export function useDetectionApi() {
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

  const isPollingRef = useRef<boolean>(true);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch Incidents via REST
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents?limit=25`, { signal: AbortSignal.timeout(2000) });
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
  }, [activeIncident]);

  // Poll Detection Status & Camera Status
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Detection Status
      const detRes = await fetch(`${API_BASE_URL}/detection/status`, { signal: AbortSignal.timeout(2000) });
      if (detRes.ok) {
        const detData: DetectionStatus = await detRes.json();
        setDetectionStatus(detData);
        setBackendOnline(true);

        if (detData.alertActive && detData.personDetected) {
          setLastAlertTimestamp(new Date().toLocaleTimeString());
        }
      } else {
        setBackendOnline(false);
      }

      // 2. Fetch Camera Status
      const camRes = await fetch(`${API_BASE_URL}/camera/status`, { signal: AbortSignal.timeout(2000) });
      if (camRes.ok) {
        const camData: CameraStatus = await camRes.json();
        setCameraStatus(camData);
        setVisionAiStatus({
          ready: Boolean(camData.visionAiReady),
          model: camData.visionModel || 'gemini-2.5-flash',
        });
      }

      // 3. Fetch Detection History
      const histRes = await fetch(`${API_BASE_URL}/detection/history?limit=25`, { signal: AbortSignal.timeout(2000) });
      if (histRes.ok) {
        const histData: DetectionHistoryItem[] = await histRes.json();
        setHistory(histData);
      }

      // 4. Fetch Incidents
      fetchIncidents();
    } catch {
      setBackendOnline(false);
      setCameraStatus((prev) => ({ ...prev, connected: false }));
    }
  }, [fetchIncidents]);

  // Connect WebSocket for Real-Time Incident Push
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connectWs() {
      try {
        const ws = new WebSocket(`${WS_BASE_URL}/ws/incidents`);
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
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        reconnectTimeout = setTimeout(connectWs, 4000);
      }
    }

    connectWs();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Periodic polling interval
  useEffect(() => {
    isPollingRef.current = true;
    fetchData();

    const interval = setInterval(() => {
      if (isPollingRef.current) {
        fetchData();
      }
    }, 1000);

    return () => {
      isPollingRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  // Adjust HOG+SVM hit threshold (SVM score, NOT a YOLO confidence percentage)
  const setConfidenceThreshold = async (threshold: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/detection/threshold`, {
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
      const res = await fetch(`${API_BASE_URL}/detection/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const dismissActiveIncident = () => {
    setActiveIncident(null);
  };

  const videoFeedUrl = `${API_BASE_URL}/video_feed`;

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
    apiBaseUrl: API_BASE_URL,
    dismissActiveIncident,
    setConfidenceThreshold,
    setHogMode,
    refresh: fetchData,
  };
}
