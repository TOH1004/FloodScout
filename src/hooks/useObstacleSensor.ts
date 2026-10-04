import { useState, useEffect, useRef, useCallback } from 'react';
import { getBackendBaseUrl } from './useDetectionApi';
import { getEsp32BaseUrl } from '../config/esp32';

export type ObstacleStatus = 'CLEAR' | 'CAUTION' | 'DANGER' | 'OFFLINE';

export interface DistanceRecord {
  id: string;
  time: string;
  distanceM: number;
  status: ObstacleStatus;
}

export interface ObstacleSensorState {
  distanceM: number;
  distanceCm: number;
  isObstacleDetected: boolean;
  status: ObstacleStatus;
  warningThresholdM: number;
  criticalThresholdM: number;
  autoBrakeArmed: boolean;
  buzzerEnabled: boolean;
  sensorModel: string;
  beamAngleDeg: number;
  maxRangeM: number;
  minRangeM: number;
  pingRateHz: number;
  isHardwareConnected: boolean;
  dataSource: 'live' | 'simulation';
  history: DistanceRecord[];
  setWarningThresholdM: (val: number) => void;
  setCriticalThresholdM: (val: number) => void;
  setAutoBrakeArmed: (enabled: boolean) => void;
  setBuzzerEnabled: (enabled: boolean) => void;
  setDataSource: (src: 'live' | 'simulation') => void;
  setManualDistance: (distM: number) => void;
}

export function useObstacleSensor(): ObstacleSensorState {
  // Live hardware state from ESP32 HC-SR04 ultrasonic sensor
  const [distanceM, setDistanceM] = useState<number>(0.17);
  const [distanceCm, setDistanceCm] = useState<number>(17.0);
  const [warningThresholdM, setWarningThresholdM] = useState<number>(1.50);
  const [criticalThresholdM, setCriticalThresholdM] = useState<number>(0.60);
  const [autoBrakeArmed, setAutoBrakeArmed] = useState<boolean>(true);
  const [buzzerEnabled, setBuzzerEnabled] = useState<boolean>(false);
  const [isHardwareConnected, setIsHardwareConnected] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<'live' | 'simulation'>('live');
  const [history, setHistory] = useState<DistanceRecord[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextBeepTimeRef = useRef<number>(0);

  // Play proximity beep based on real measured distance
  const playProximityBeep = useCallback((dist: number) => {
    if (dist > warningThresholdM) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'suspended') {
        ctx?.resume();
      }
      if (!ctx) return;

      const now = ctx.currentTime;
      // Interval speeds up as distance approaches 0
      const normDist = Math.max(0.1, Math.min(1.0, (dist - criticalThresholdM) / (warningThresholdM - criticalThresholdM)));
      const intervalSec = dist <= criticalThresholdM ? 0.08 : 0.15 + normDist * 0.45;

      if (now >= nextBeepTimeRef.current) {
        nextBeepTimeRef.current = now + intervalSec;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(dist <= criticalThresholdM ? 1400 : 950, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch {
      // Audio autoplay policy or unavailable
    }
  }, [warningThresholdM, criticalThresholdM]);

  // Determine obstacle status based on real distance
  const status: ObstacleStatus =
    distanceM <= criticalThresholdM
      ? 'DANGER'
      : distanceM <= warningThresholdM
      ? 'CAUTION'
      : 'CLEAR';

  const isObstacleDetected = distanceM <= warningThresholdM;


  // Poll ESP32 hardware directly and via backend proxy
  useEffect(() => {
    let isMounted = true;
    const backendBase = getBackendBaseUrl();

    const pollHardware = async () => {
      let gotReading = false;
      const esp32Base = getEsp32BaseUrl();

      // Tier 1: Direct fetch to ESP32 /api/sensors (fastest over local Wi-Fi)
      try {
        const directRes = await fetch(`${esp32Base}/api/sensors`, {
          signal: AbortSignal.timeout(800),
        });
        if (directRes.ok && isMounted) {
          const directData = await directRes.json();
          if (directData && typeof directData.distance_cm === 'number') {
            const rawCm = directData.distance_cm;
            if (rawCm > 0 && rawCm <= 450.0) {
              setDistanceM(parseFloat((rawCm / 100.0).toFixed(2)));
              setDistanceCm(parseFloat(rawCm.toFixed(1)));
            } else {
              // -1.0 or >450cm indicates clear path beyond 4 meters
              setDistanceM(4.0);
              setDistanceCm(400.0);
            }
            setIsHardwareConnected(true);
            setDataSource('live');
            gotReading = true;
          }
        }
      } catch {
        // Direct Wi-Fi blocked by CORS or network, proceed to proxy
      }

      if (gotReading) return;

      // Tier 1.5: Fetch via Backend proxy with ?target= (100% CORS-free and targets exact active ESP32 IP)
      try {
        const proxyRes = await fetch(`${backendBase}/api/sensors?target=${encodeURIComponent(esp32Base)}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(1200),
        });
        if (proxyRes.ok && isMounted) {
          const proxyData = await proxyRes.json();
          if (proxyData && typeof proxyData.distance_cm === 'number') {
            const rawCm = proxyData.distance_cm;
            if (rawCm > 0 && rawCm <= 450.0) {
              setDistanceM(parseFloat((rawCm / 100.0).toFixed(2)));
              setDistanceCm(parseFloat(rawCm.toFixed(1)));
            } else {
              setDistanceM(4.0);
              setDistanceCm(400.0);
            }
            setIsHardwareConnected(Boolean(proxyData.success));
            setDataSource('live');
            gotReading = true;
          }
        }
      } catch {
        // Backend proxy failed, try Vite reverse proxy
      }

      if (gotReading) return;

      // Tier 2: Vite reverse proxy /esp32-api/sensors
      try {
        const vRes = await fetch('/esp32-api/sensors', {
          signal: AbortSignal.timeout(1000),
        });
        if (vRes.ok && isMounted) {
          const vData = await vRes.json();
          if (vData && typeof vData.distance_cm === 'number') {
            const rawCm = vData.distance_cm;
            if (rawCm > 0 && rawCm <= 450.0) {
              setDistanceM(parseFloat((rawCm / 100.0).toFixed(2)));
              setDistanceCm(parseFloat(rawCm.toFixed(1)));
            } else {
              setDistanceM(4.0);
              setDistanceCm(400.0);
            }
            setIsHardwareConnected(true);
            setDataSource('live');
            gotReading = true;
          }
        }
      } catch {
        // Tier 2 failed
      }

      if (!gotReading && isMounted) {
        setIsHardwareConnected(false);
      }
    };

    // Poll every 350ms for live distance updates
    pollHardware();
    const interval = setInterval(pollHardware, 350);

    const handleUrlChange = () => {
      pollHardware();
    };
    window.addEventListener('floodscout_esp32_url_changed', handleUrlChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('floodscout_esp32_url_changed', handleUrlChange);
    };
  }, []);


  // Record history & trigger audio from real measurements
  useEffect(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setHistory(prev => {
      const nextRecord: DistanceRecord = {
        id: `${now.getTime()}`,
        time: timeStr,
        distanceM,
        status,
      };
      const updated = [...prev, nextRecord];
      return updated.length > 25 ? updated.slice(-25) : updated;
    });

    if (buzzerEnabled) {
      playProximityBeep(distanceM);
    }
  }, [distanceM, status, buzzerEnabled, playProximityBeep]);

  const setManualDistance = useCallback((distM: number) => {
    setDistanceM(Math.max(0.05, Math.min(4.5, parseFloat(distM.toFixed(2)))));
    setDistanceCm(Math.round(distM * 100));
  }, []);

  return {
    distanceM,
    distanceCm,
    isObstacleDetected,
    status,
    warningThresholdM,
    criticalThresholdM,
    autoBrakeArmed,
    buzzerEnabled,
    sensorModel: 'ESP32 HC-SR04 Ultrasonic Distance Sensor',
    beamAngleDeg: 60,
    maxRangeM: 4.0,
    minRangeM: 0.05,
    pingRateHz: 10,
    isHardwareConnected,
    dataSource,
    history,
    setWarningThresholdM,
    setCriticalThresholdM,
    setAutoBrakeArmed,
    setBuzzerEnabled,
    setDataSource,
    setManualDistance,
  };
}
