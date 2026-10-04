/**
 * usePanTilt.ts — Wi-Fi HTTP Client for FloodScout ESP32 Pan & Tilt System.
 * 
 * Controls the ESP32 SG90 pan/tilt servos and PIZ Action Sonar via direct
 * HTTP GET requests over local Wi-Fi:
 *   - GET /api/pan-tilt/left
 *   - GET /api/pan-tilt/right
 *   - GET /api/pan-tilt/up
 *   - GET /api/pan-tilt/down
 *   - GET /api/pan-tilt/stop
 *   - GET /api/pan-tilt/center
 *   - GET /api/pan-tilt/status
 * 
 * Configurable via src/config/esp32.ts or VITE_ESP32_PAN_TILT_URL in .env.
 * Zero dependency on USB Serial.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getEsp32BaseUrl, setEsp32BaseUrl, ESP32_BASE_URL } from '../config/esp32';
import { getBackendBaseUrl } from './useDetectionApi';

export { ESP32_BASE_URL, getEsp32BaseUrl, setEsp32BaseUrl };

export type PanTiltCommand =
  | 'LEFT'
  | 'RIGHT'
  | 'UP'
  | 'DOWN'
  | 'CENTER'
  | 'STOP'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'center'
  | 'stop';

export interface PanTiltPosition {
  panAngle: number;
  tiltAngle: number;
}

export interface PanTiltResponse {
  success?: boolean;
  command?: string;
  panAngle?: number;
  tiltAngle?: number;
  connected?: boolean;
  message?: string;
  error?: string;
  status?: string;
  [key: string]: unknown;
}

export interface UsePanTiltReturn {
  panAngle: number;
  tiltAngle: number;
  mode: 'esp32';
  connected: boolean;
  isProcessing: boolean;
  lastCommand: string | null;
  error: string | null;
  esp32Url: string;
  setEsp32Url: (newUrl: string) => void;
  sendCommand: (command: PanTiltCommand | string) => Promise<PanTiltResponse | null>;
  fetchStatus: () => Promise<void>;
  resetError: () => void;
}

/**
 * Reusable function to dispatch an HTTP GET command to the ESP32 over Wi-Fi.
 * When accessed from an HTTPS origin (e.g. mobile phone / Vercel), it routes through
 * the backend proxy to prevent Mixed Content security blocking.
 */
export async function sendPanTiltCommand(command: string, customBaseUrl?: string): Promise<PanTiltResponse> {
  const endpoint = command.toLowerCase().trim();
  const rootUrl = customBaseUrl || getEsp32BaseUrl();

  // Route through backend proxy when:
  // 1. HTTPS origin trying to reach HTTP ESP32 (mixed content), OR
  // 2. Non-localhost origin (phone/remote device) — direct ESP32 reach is unreliable due to CORS
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isRemoteOrigin = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  const useProxy = (isHttpsOrigin && rootUrl.startsWith('http://')) || isRemoteOrigin;
  const url = useProxy
    ? `${getBackendBaseUrl()}/api/pan-tilt/${endpoint}?target=${encodeURIComponent(rootUrl)}`
    : `${rootUrl}/api/pan-tilt/${endpoint}`;

  // Try direct fetch first
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(1200),
    });

    if (!response.ok) {
      throw new Error(`ESP32 request failed: ${response.status}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: true, message: text, command: endpoint, connected: true };
    }
  } catch (error: unknown) {
    // Fallback 1: try Backend proxy /api/pan-tilt/:command with ?target= (bypasses browser CORS completely!)
    try {
      const backendUrl = `${getBackendBaseUrl()}/api/pan-tilt/${endpoint}?target=${encodeURIComponent(rootUrl)}`;
      const bRes = await fetch(backendUrl, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: AbortSignal.timeout(2000),
      });
      if (bRes.ok) {
        const bText = await bRes.text();
        try {
          return JSON.parse(bText);
        } catch {
          return { success: true, message: bText, command: endpoint, connected: true };
        }
      }
    } catch {
      // Backend proxy failed, try Vite proxy
    }

    // Fallback 2: try Vite proxy /esp32-api to bypass browser CORS / mixed-content
    try {
      const fbUrl = `/esp32-api/pan-tilt/${endpoint}`;
      const fbRes = await fetch(fbUrl, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: AbortSignal.timeout(1200),
      });
      if (fbRes.ok) {
        const fbText = await fbRes.text();
        try {
          return JSON.parse(fbText);
        } catch {
          return { success: true, message: fbText, command: endpoint, connected: true };
        }
      }
    } catch {
      // Vite proxy failed
    }

    const err = error as Error;
    const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('timeout');

    if (isTimeout) {
      console.warn(
        `[PanTilt Wi-Fi] Request to ${url} timed out (ESP32 unreachable).\n` +
          `• Verify that ESP32 is powered on and connected to the same Wi-Fi.\n` +
          `• Check if the ESP32 IP address has changed.`
      );
    } else {
      console.warn(`[PanTilt Wi-Fi] Error reaching ${url}:`, err.message || err);
    }
    throw error;
  }
}

/**
 * Check the connection status and current angles from the ESP32:
 * GET http://<ESP32_IP>/api/pan-tilt/status
 */
export async function fetchPanTiltStatus(customBaseUrl?: string): Promise<PanTiltResponse> {
  const rootUrl = customBaseUrl || getEsp32BaseUrl();
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isRemoteOrigin = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  const useProxy = (isHttpsOrigin && rootUrl.startsWith('http://')) || isRemoteOrigin;
  const url = useProxy
    ? `${getBackendBaseUrl()}/api/pan-tilt/status?target=${encodeURIComponent(rootUrl)}`
    : `${rootUrl}/api/pan-tilt/status`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(1200),
    });

    if (!response.ok) {
      throw new Error(`ESP32 status check failed: ${response.status}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: true, connected: true, status: text };
    }
  } catch (err) {
    // Try Backend proxy fallback with ?target=
    try {
      const backendUrl = `${getBackendBaseUrl()}/api/pan-tilt/status?target=${encodeURIComponent(rootUrl)}`;
      const bRes = await fetch(backendUrl, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: AbortSignal.timeout(1800),
      });
      if (bRes.ok) {
        const bText = await bRes.text();
        return JSON.parse(bText);
      }
    } catch {
      // ignore
    }

    // Try Vite proxy fallback
    try {
      const fbResponse = await fetch('/esp32-api/pan-tilt/status', {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: AbortSignal.timeout(1200),
      });
      if (fbResponse.ok) {
        const fbText = await fbResponse.text();
        return JSON.parse(fbText);
      }
    } catch {
      // ignore
    }

    throw err;
  }
}

export function usePanTilt(): UsePanTiltReturn {
  const [panAngle, setPanAngle] = useState<number>(90);
  const [tiltAngle, setTiltAngle] = useState<number>(90);
  const [connected, setConnected] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [esp32Url, setEsp32UrlState] = useState<string>(() => getEsp32BaseUrl());

  // Debounce / click throttling ref
  const isLockedRef = useRef<boolean>(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setErrorWithTimeout = useCallback((msg: string | null, timeoutMs = 4500) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setError(msg);
    if (msg) {
      errorTimerRef.current = setTimeout(() => {
        setError(null);
      }, timeoutMs);
    }
  }, []);

  const updateEsp32Url = useCallback((newUrl: string) => {
    const updated = setEsp32BaseUrl(newUrl);
    setEsp32UrlState(updated);
    setError(null);
    setConnected(false);
  }, []);

  // Poll ESP32 status over Wi-Fi
  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetchPanTiltStatus(esp32Url);
      if (data && data.connected === false) {
        setConnected(false);
        return;
      }
      setConnected(true);
      setError(null);
      if (typeof data.panAngle === 'number') setPanAngle(data.panAngle);
      if (typeof data.tiltAngle === 'number') setTiltAngle(data.tiltAngle);
    } catch {
      // Gracefully indicate disconnected when offline
      setConnected(false);
    }
  }, [esp32Url]);

  // Send directional / stop command over Wi-Fi
  const sendCommand = useCallback(
    async (command: PanTiltCommand | string): Promise<PanTiltResponse | null> => {
      // Prevent flood if a command is in-flight
      if (isLockedRef.current) {
        return null;
      }

      isLockedRef.current = true;
      setIsProcessing(true);
      const normalizedCmd = command.toLowerCase().trim();
      setLastCommand(normalizedCmd);

      try {
        const data = await sendPanTiltCommand(normalizedCmd, esp32Url);
        if (data && (data.connected === false || data.success === false)) {
          throw new Error(data.error || `ESP32 command failed`);
        }
        setConnected(true);
        setError(null);

        // Update angles if returned by ESP32 or step estimation
        if (typeof data.panAngle === 'number') {
          setPanAngle(data.panAngle);
        } else if (normalizedCmd === 'left') {
          setPanAngle(prev => Math.max(0, prev - 5));
        } else if (normalizedCmd === 'right') {
          setPanAngle(prev => Math.min(180, prev + 5));
        }

        if (typeof data.tiltAngle === 'number') {
          setTiltAngle(data.tiltAngle);
        } else if (normalizedCmd === 'up') {
          setTiltAngle(prev => Math.min(180, prev + 5));
        } else if (normalizedCmd === 'down') {
          setTiltAngle(prev => Math.max(0, prev - 5));
        } else if (normalizedCmd === 'center') {
          setPanAngle(90);
          setTiltAngle(90);
        }

        return data;
      } catch (err: unknown) {
        setConnected(false);
        const errObj = err as Error;
        const isTimeout =
          errObj?.name === 'TimeoutError' || errObj?.message?.includes('timeout');
        const msg = isTimeout
          ? `ESP32 timed out (${esp32Url}). Verify Wi-Fi & IP.`
          : `ESP32 unreachable (${esp32Url})`;
        setErrorWithTimeout(msg);
        return null;
      } finally {
        setIsProcessing(false);
        setTimeout(() => {
          isLockedRef.current = false;
        }, 50);
      }
    },
    [esp32Url, setErrorWithTimeout]
  );

  // Periodically check status (heartbeat)
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => {
      clearInterval(interval);
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, [fetchStatus]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    panAngle,
    tiltAngle,
    mode: 'esp32',
    connected,
    isProcessing,
    lastCommand,
    error,
    esp32Url,
    setEsp32Url: updateEsp32Url,
    sendCommand,
    fetchStatus,
    resetError,
  };
}

