import { useState, useEffect, useRef, useCallback } from 'react';
import { getBackendBaseUrl } from './useDetectionApi';
import { getEsp32BaseUrl } from '../config/esp32';

export interface HardwareGpsState {
  connected: boolean;
  isValid: boolean;
  latitude: number | null;
  longitude: number | null;
  satellites: number;
  altitude: number;
  speedKmh: number;
  heading: number;
  port: string | null;
  statusMessage: string;
  source: 'backend_serial' | 'web_serial' | 'simulated' | 'none';
  lastSeen: number | null;
}

export function useHardwareGps(onGpsFix?: (coords: [number, number], telemetry: Partial<HardwareGpsState>) => void) {
  const [gpsState, setGpsState] = useState<HardwareGpsState>({
    connected: false,
    isValid: false,
    latitude: null,
    longitude: null,
    satellites: 0,
    altitude: 0,
    speedKmh: 0,
    heading: 0,
    port: null,
    statusMessage: 'Connecting to hardware GPS...',
    source: 'none',
    lastSeen: null,
  });

  const [webSerialActive, setWebSerialActive] = useState(false);
  const webSerialPortRef = useRef<any>(null);
  const webSerialReaderRef = useRef<any>(null);
  const onGpsFixRef = useRef(onGpsFix);
  onGpsFixRef.current = onGpsFix;

  // 1. Backend Serial Polling & WebSocket integration
  useEffect(() => {
    if (webSerialActive) return; // Prioritize direct browser Web Serial if user opened it

    let isMounted = true;
    let ws: WebSocket | null = null;
    let pollInterval: any = null;

    const backendBase = getBackendBaseUrl();
    const esp32Base = getEsp32BaseUrl();
    const wsUrl = backendBase.replace(/^http/, 'ws') + '/ws/gps';

    // Fast polling fallback (checks ESP32 directly and backend proxy)
    const pollGps = async () => {
      // 1. Try direct ESP32 Wi-Fi /api/sensors
      try {
        const espRes = await fetch(`${esp32Base}/api/sensors`, { signal: AbortSignal.timeout(1200) });
        if (espRes.ok && isMounted) {
          const data = await espRes.json();
          if (data && data.gps) {
            const gps = data.gps;
            const hasCoords = typeof gps.lat === 'number' && typeof gps.lng === 'number' &&
              (Math.abs(gps.lat) > 0.001 || Math.abs(gps.lng) > 0.001);
            const isValid = Boolean(gps.fix && hasCoords);

            const newState: HardwareGpsState = {
              connected: true,
              isValid,
              latitude: gps.lat ?? null,
              longitude: gps.lng ?? null,
              satellites: gps.satellites ?? 0,
              altitude: gps.altitude_m ?? 0,
              speedKmh: 0,
              heading: 0,
              port: `Wi-Fi (${getEsp32BaseUrl().replace(/^https?:\/\//, '')})`,
              statusMessage: isValid
                ? `Live Hardware GPS 3D Fix (${gps.satellites ?? 0} Sats)`
                : `Acquiring lock (${gps.satellites ?? 0} Sats visible)...`,
              source: 'backend_serial',
              lastSeen: Date.now(),
            };

            setGpsState(newState);

            if (isValid && gps.lat !== null && gps.lng !== null) {
              onGpsFixRef.current?.([gps.lat, gps.lng], newState);
            }
            return;
          }
        }
      } catch {
        // Direct fetch failed, try Vite proxy
        try {
          const espProxyRes = await fetch('/esp32-api/sensors', { signal: AbortSignal.timeout(1200) });
          if (espProxyRes.ok && isMounted) {
            const data = await espProxyRes.json();
            if (data && data.gps) {
              const gps = data.gps;
              const hasCoords = typeof gps.lat === 'number' && typeof gps.lng === 'number' &&
                (Math.abs(gps.lat) > 0.001 || Math.abs(gps.lng) > 0.001);
              const isValid = Boolean(gps.fix && hasCoords);

              const newState: HardwareGpsState = {
                connected: true,
                isValid,
                latitude: gps.lat ?? null,
                longitude: gps.lng ?? null,
                satellites: gps.satellites ?? 0,
                altitude: gps.altitude_m ?? 0,
                speedKmh: 0,
                heading: 0,
                port: `Wi-Fi (${getEsp32BaseUrl().replace(/^https?:\/\//, '')})`,
                statusMessage: isValid
                  ? `Live Hardware GPS 3D Fix (${gps.satellites ?? 0} Sats)`
                  : `Acquiring lock (${gps.satellites ?? 0} Sats visible)...`,
                source: 'backend_serial',
                lastSeen: Date.now(),
              };

              setGpsState(newState);

              if (isValid && gps.lat !== null && gps.lng !== null) {
                onGpsFixRef.current?.([gps.lat, gps.lng], newState);
              }
              return;
            }
          }
        } catch {
          // Fallback to backend polling
        }
      }

      // 2. Fallback to Python Backend /api/gps
      try {
        const res = await fetch(`${backendBase}/api/gps`, { signal: AbortSignal.timeout(1200) });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            const hasCoords = typeof data.latitude === 'number' && typeof data.longitude === 'number' &&
              (Math.abs(data.latitude) > 0.001 || Math.abs(data.longitude) > 0.001);

            const newState: HardwareGpsState = {
              connected: Boolean(data.connected),
              isValid: Boolean(data.is_valid && hasCoords),
              latitude: data.latitude ?? null,
              longitude: data.longitude ?? null,
              satellites: data.satellites ?? 0,
              altitude: data.altitude ?? 0,
              speedKmh: data.speed_kmh ?? 0,
              heading: data.heading ?? 0,
              port: data.port ?? 'COM5',
              statusMessage: data.status_message ?? (hasCoords ? 'Live Hardware GPS 3D Fix' : 'Waiting for satellite lock...'),
              source: 'backend_serial',
              lastSeen: Date.now(),
            };

            setGpsState(newState);

            if (newState.isValid && newState.latitude !== null && newState.longitude !== null) {
              onGpsFixRef.current?.([newState.latitude, newState.longitude], newState);
            }
          }
        }
      } catch {
        // Backend offline or unreachable
      }
    };

    // Initial poll
    pollGps();
    pollInterval = setInterval(pollGps, 1200);

    // Real-time WebSocket connection
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (isMounted && data) {
            const hasCoords = typeof data.latitude === 'number' && typeof data.longitude === 'number' &&
              (Math.abs(data.latitude) > 0.001 || Math.abs(data.longitude) > 0.001);

            const newState: HardwareGpsState = {
              connected: Boolean(data.connected),
              isValid: Boolean(data.is_valid && hasCoords),
              latitude: data.latitude ?? null,
              longitude: data.longitude ?? null,
              satellites: data.satellites ?? 0,
              altitude: data.altitude ?? 0,
              speedKmh: data.speed_kmh ?? 0,
              heading: data.heading ?? 0,
              port: data.port ?? 'COM5',
              statusMessage: data.status_message ?? (hasCoords ? 'Live Hardware GPS Fix' : 'Waiting for satellite lock...'),
              source: 'backend_serial',
              lastSeen: Date.now(),
            };

            setGpsState(newState);

            if (newState.isValid && newState.latitude !== null && newState.longitude !== null) {
              onGpsFixRef.current?.([newState.latitude, newState.longitude], newState);
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, [webSerialActive]);

  // 2. Direct Web Serial API (Chrome/Edge capability)
  const connectWebSerial = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      alert('Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      const navSerial = (navigator as any).serial;
      const port = await navSerial.requestPort();
      await port.open({ baudRate: 115200 });
      webSerialPortRef.current = port;
      setWebSerialActive(true);

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      webSerialReaderRef.current = reader;

      let buffer = '';
      let pendingLat: number | null = null;
      let pendingLng: number | null = null;
      let pendingSats = 0;
      let pendingAlt = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const clean = line.trim();
            const latMatch = clean.match(/Latitude:\s*([+-]?\d+(?:\.\d+)?)/i);
            if (latMatch) pendingLat = parseFloat(latMatch[1]);

            const lngMatch = clean.match(/Longitude:\s*([+-]?\d+(?:\.\d+)?)/i);
            if (lngMatch) pendingLng = parseFloat(lngMatch[1]);

            const satMatch = clean.match(/Satellites:\s*(\d+)/i);
            if (satMatch) pendingSats = parseInt(satMatch[1], 10);

            const altMatch = clean.match(/Altitude:\s*([+-]?\d+(?:\.\d+)?)/i);
            if (altMatch) pendingAlt = parseFloat(altMatch[1]);

            if (clean.startsWith('---') || (pendingLat !== null && pendingLng !== null && pendingSats > 0)) {
              if (pendingLat !== null && pendingLng !== null && (pendingLat !== 0 || pendingLng !== 0)) {
                const newState: HardwareGpsState = {
                  connected: true,
                  isValid: true,
                  latitude: pendingLat,
                  longitude: pendingLng,
                  satellites: pendingSats,
                  altitude: pendingAlt,
                  speedKmh: 0,
                  heading: 0,
                  port: 'WebSerial (USB)',
                  statusMessage: `Direct Web Serial Fix (${pendingSats} Sats)`,
                  source: 'web_serial',
                  lastSeen: Date.now(),
                };
                setGpsState(newState);
                onGpsFixRef.current?.([pendingLat, pendingLng], newState);
              }
              pendingLat = null;
              pendingLng = null;
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Web Serial connection error:', err);
      setWebSerialActive(false);
    }
  }, []);

  const disconnectWebSerial = useCallback(async () => {
    try {
      if (webSerialReaderRef.current) {
        await webSerialReaderRef.current.cancel();
        webSerialReaderRef.current = null;
      }
      if (webSerialPortRef.current) {
        await webSerialPortRef.current.close();
        webSerialPortRef.current = null;
      }
    } catch {}
    setWebSerialActive(false);
  }, []);

  return {
    gpsState,
    connectWebSerial,
    disconnectWebSerial,
    webSerialActive,
    isHardwareConnected: gpsState.connected,
    isHardwareValid: gpsState.isValid,
  };
}
