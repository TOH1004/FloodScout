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

  // Poll ESP32 hardware directly and via backend proxy — NO MOCK SIMULATION
  useEffect(() => {
    let isMounted = true;
    const backendBase = getBackendBaseUrl();
    const esp32Base = getEsp32BaseUrl();

    const pollHardware = async () => {
      let gotReading = false;

      // Tier 1: Direct fetch to ESP32 /api/sensors (fastest & most direct)
      try {
        const directRes = await fetch(`${esp32Base}/api/sensors`, {
          signal: AbortSignal.timeout(1000),
        });
        if (directRes.ok && isMounted) {
          const directData = await directRes.json();
          if (directData && typeof directData.distance_cm === 'number') {
            const rawCm = directData.distance_cm;
            if (rawCm > 0 && rawCm <= 450.0) {
              const dM = parseFloat((rawCm / 100.0).toFixed(2));
              setDistanceM(dM);
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
        // Direct Wi-Fi unreachable or CORS on mobile, try Vite proxy
      }

      if (gotReading) return;

      // Tier 1.5: Fetch via Vite reverse proxy /esp32-api/sensors (avoids browser CORS)
      try {
        const proxyRes = await fetch('/esp32-api/sensors', {
          signal: AbortSignal.timeout(1000),
        });
        if (proxyRes.ok && isMounted) {
          const proxyData = await proxyRes.json();
          if (proxyData && typeof proxyData.distance_cm === 'number') {
            const rawCm = proxyData.distance_cm;
            if (rawCm > 0 && rawCm <= 450.0) {
              const dM = parseFloat((rawCm / 100.0).toFixed(2));
              setDistanceM(dM);
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
        // Vite proxy unreachable
      }

      if (gotReading) return;

      // Tier 2: Fetch via backend proxy /api/sensor/obstacle
      try {
        const res = await fetch(`${backendBase}/api/sensor/obstacle`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(1200),
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (typeof data.distanceM === 'number' || typeof data.distanceCm === 'number') {
            const dM = typeof data.distanceM === 'number' ? data.distanceM : (data.distanceCm / 100.0);
            const dCm = typeof data.distanceCm === 'number' ? data.distanceCm : Math.round(dM * 100);
            setDistanceM(parseFloat(dM.toFixed(2)));
            setDistanceCm(parseFloat(dCm.toFixed(1)));
            setIsHardwareConnected(Boolean(data.hardwareConnected));
            setDataSource('live');
          }
        }
      } catch {
        // Both backend and ESP32 offline
      }
    };

    // Poll every 350ms for near-instantaneous live distance updates
    pollHardware();
    const interval = setInterval(pollHardware, 350);
    return () => {
      isMounted = false;
      clearInterval(interval);
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
