import { useState, useEffect, useCallback } from 'react';
import { getEsp32BaseUrl } from '../config/esp32';
import { getBackendBaseUrl } from './useDetectionApi';

export interface MotorItemState {
  us: number;
  percent: number;
  dir: 'FWD' | 'REV' | 'STOP';
  status: string;
}

export interface MotorMotionTelemetry {
  state: string; // e.g., 'FORWARD STRAIGHT', 'SPIN LEFT', 'STOP', etc.
  direction: string;
  rcConnected: boolean;
  left: MotorItemState;
  right: MotorItemState;
  rc?: {
    ch1Steer: number;
    ch2Throttle: number;
  };
}

export interface UseMotorTelemetryReturn {
  motion: MotorMotionTelemetry;
  isConnected: boolean;
  isSending: boolean;
  sendMotorCommand: (action: 'forward' | 'reverse' | 'left' | 'right' | 'stop') => Promise<void>;
  setMotorSpeed: (leftPwm: number, rightPwm: number) => Promise<void>;
}

const DEFAULT_MOTOR_STATE: MotorMotionTelemetry = {
  state: 'STOP',
  direction: 'STOP',
  rcConnected: false,
  left: { us: 1500, percent: 0, dir: 'STOP', status: 'STOP [1500us]' },
  right: { us: 1500, percent: 0, dir: 'STOP', status: 'STOP [1500us]' },
};

export function useMotorTelemetry(): UseMotorTelemetryReturn {
  const [motion, setMotion] = useState<MotorMotionTelemetry>(DEFAULT_MOTOR_STATE);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Poll ESP32 for live motor metrics
  useEffect(() => {
    let isMounted = true;
    const backendBase = getBackendBaseUrl();

    const fetchMotorData = async () => {
      let gotData = false;
      const esp32Base = getEsp32BaseUrl();

      // Tier 1: Direct ESP32 /api/sensors (contains "motors")
      try {
        const res = await fetch(`${esp32Base}/api/sensors`, { signal: AbortSignal.timeout(1000) });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data && data.motors) {
            updateFromPayload(data.motors);
            gotData = true;
          }
        }
      } catch {
        // Direct failed, try Vite reverse proxy
      }

      if (gotData) return;

      // Tier 2: Vite proxy /esp32-api/sensors
      try {
        const proxyRes = await fetch('/esp32-api/sensors', { signal: AbortSignal.timeout(1000) });
        if (proxyRes.ok && isMounted) {
          const data = await proxyRes.json();
          if (data && data.motors) {
            updateFromPayload(data.motors);
            gotData = true;
          }
        }
      } catch {
        // Proxy failed
      }

      if (gotData) return;

      // Tier 3: Standalone /api/motors
      try {
        const mRes = await fetch(`${esp32Base}/api/motors`, { signal: AbortSignal.timeout(1000) });
        if (mRes.ok && isMounted) {
          const data = await mRes.json();
          if (data && (data.motion || data.motors || data.left)) {
            updateFromPayload(data.motors || data.motion || data);
            gotData = true;
          }
        }
      } catch {
        // Standalone failed
      }

      if (gotData) return;

      // Tier 4: Backend /api/motors (via USB serial or backend relay)
      try {
        const bRes = await fetch(`${backendBase}/api/motors`, { signal: AbortSignal.timeout(1000) });
        if (bRes.ok && isMounted) {
          const data = await bRes.json();
          if (data && (data.motors || data.motion)) {
            updateFromPayload(data.motors || data.motion);
            gotData = true;
          }
        }
      } catch {
        if (isMounted) setIsConnected(false);
      }
    };

    const updateFromPayload = (payload: any) => {
      const leftUs = payload.left?.us ?? payload.left_us ?? 1500;
      const rightUs = payload.right?.us ?? payload.right_us ?? 1500;
      const motionState = payload.state || payload.motion_state || 'STOP';

      const leftPercent = payload.left?.percent ?? (leftUs > 1530 ? Math.round(((leftUs - 1500) / 500) * 100) : (leftUs < 1470 ? Math.round(((1500 - leftUs) / 500) * 100) : 0));
      const rightPercent = payload.right?.percent ?? (rightUs > 1530 ? Math.round(((rightUs - 1500) / 500) * 100) : (rightUs < 1470 ? Math.round(((1500 - rightUs) / 500) * 100) : 0));

      const leftDir = leftUs > 1530 ? 'FWD' : (leftUs < 1470 ? 'REV' : 'STOP');
      const rightDir = rightUs > 1530 ? 'FWD' : (rightUs < 1470 ? 'REV' : 'STOP');

      setMotion({
        state: motionState,
        direction: payload.direction || (leftDir === 'FWD' && rightDir === 'FWD' ? 'FORWARD' : leftDir),
        rcConnected: Boolean(payload.rc_connected ?? payload.rcConnected ?? false),
        left: {
          us: leftUs,
          percent: Math.min(100, Math.max(0, leftPercent)),
          dir: leftDir,
          status: payload.left?.status || `${leftDir} ${leftPercent}% [${leftUs}us]`,
        },
        right: {
          us: rightUs,
          percent: Math.min(100, Math.max(0, rightPercent)),
          dir: rightDir,
          status: payload.right?.status || `${rightDir} ${rightPercent}% [${rightUs}us]`,
        },
        rc: payload.rc ? {
          ch1Steer: payload.rc.ch1_steer ?? payload.rc.ch1Steer ?? 1500,
          ch2Throttle: payload.rc.ch2_throttle ?? payload.rc.ch2Throttle ?? 1500,
        } : undefined,
      });
      setIsConnected(true);
    };

    fetchMotorData();
    const interval = setInterval(fetchMotorData, 350);

    const handleUrlChange = () => {
      fetchMotorData();
    };
    window.addEventListener('floodscout_esp32_url_changed', handleUrlChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('floodscout_esp32_url_changed', handleUrlChange);
    };
  }, []);

  // Send high-level motor directional command (for manual web steering)
  const sendMotorCommand = useCallback(async (action: 'forward' | 'reverse' | 'left' | 'right' | 'stop') => {
    setIsSending(true);
    const esp32Base = getEsp32BaseUrl();
    try {
      await fetch(`${esp32Base}/api/motor/${action}`, {
        method: 'GET',
        signal: AbortSignal.timeout(1500),
      });
    } catch {
      try {
        await fetch(`/esp32-api/motor/${action}`, {
          method: 'GET',
          signal: AbortSignal.timeout(1500),
        });
      } catch {
        // ignore
      }
    } finally {
      setIsSending(false);
    }
  }, []);

  // Send precise PWM microsecond values
  const setMotorSpeed = useCallback(async (leftPwm: number, rightPwm: number) => {
    setIsSending(true);
    const esp32Base = getEsp32BaseUrl();
    const url = `${esp32Base}/api/motor/set?left=${leftPwm}&right=${rightPwm}`;
    try {
      await fetch(url, { method: 'GET', signal: AbortSignal.timeout(1500) });
    } catch {
      try {
        await fetch(`/esp32-api/motor/set?left=${leftPwm}&right=${rightPwm}`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      } catch {
        // ignore
      }
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    motion,
    isConnected,
    isSending,
    sendMotorCommand,
    setMotorSpeed,
  };
}
