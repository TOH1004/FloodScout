import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useHardwareGps, type HardwareGpsState } from '../hooks/useHardwareGps';

export type RobotMode = 'MANUAL' | 'AUTO_SEARCH' | 'RETURN_TO_BASE' | 'EMERGENCY_STOP';
export type VictimStatus = 'Detected' | 'Verified' | 'Rescue Assigned' | 'Rescued';
export type PriorityLevel = 'Critical' | 'High' | 'Moderate';
export type CameraMode = 'optical' | 'ai' | 'thermal';

export interface Victim {
  id: string;
  status: VictimStatus;
  location: [number, number]; // [lat, lng]
  zone: string;
  confidence: number;
  time: string;
  priority: PriorityLevel;
  peopleCount: number;
  image: string;
  waterDepthAtLocation: number;
  assignedUnit?: string;
  notes?: string;
}

export interface AlertNotification {
  id: string;
  type: 'VICTIM_DETECTED' | 'BATTERY_LOW' | 'DEPTH_ALERT' | 'SIGNAL_WEAK' | 'RESCUE_CONFIRMED' | 'MODE_CHANGED';
  title: string;
  message: string;
  time: string;
  critical: boolean;
  read: boolean;
}

export interface DetectionLog {
  id: string;
  time: string;
  message: string;
  confidence: number;
}

export interface Mission {
  id: string;
  title: string;
  zone: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startTime: string;
  durationSeconds: number;
  distanceTravelledKm: number;
  areaSurveyedSqM: number;
  robotName: string;
}

interface RescueContextType {
  // Robot State
  robotOnline: boolean;
  batteryLevel: number;
  connectionStatus: 'Strong' | 'Moderate' | 'Unstable' | 'Offline';
  waterDepth: number;
  robotSpeed: number;
  robotLocation: [number, number] | null;
  computerLocation: [number, number];
  computerAccuracy: number | null;
  locationStatus: 'locating' | 'ready' | 'denied' | 'timeout' | 'error' | 'idle';
  locationSource: 'gps' | 'wifi' | 'ip' | 'manual' | 'default';
  locationError: string | null;
  refreshComputerLocation: () => Promise<[number, number] | null>;
  setManualComputerLocation: (coords: [number, number]) => void;
  robotHeading: number;
  operatingMode: RobotMode;
  thrusterPwm: number;
  signalDbm: number;
  trajectory: [number, number][];
  cameraMode: CameraMode;
  
  // Hardware GPS Telemetry (NEO-8M on ESP32 Serial2)
  hardwareGps: HardwareGpsState;
  connectWebSerial: () => Promise<void>;

  // Mission & Victims
  activeMission: Mission;
  victims: Victim[];
  alerts: AlertNotification[];
  detectionLogs: DetectionLog[];
  unreadAlertsCount: number;
  latestAlert: AlertNotification | null;

  // Settings
  confidenceThreshold: number;
  soundEnabled: boolean;
  thermalPalette: 'ironbow' | 'whitehot' | 'rainbow';

  // Actions
  setCameraMode: (mode: CameraMode) => void;
  setOperatingMode: (mode: RobotMode) => void;
  setConfidenceThreshold: (val: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  moveRobot: (dx: number, dy: number, heading: number) => void;
  setRobotLocationDirect: (coords: [number, number]) => void;
  updateVictimStatus: (id: string, status: VictimStatus, assignedUnit?: string) => void;
  addVictim: (victim: Omit<Victim, 'id' | 'time'>) => void;
  simulateVictimDetection: () => void;
  clearLatestAlert: () => void;
  dismissAlert: (id: string) => void;
  markAllAlertsRead: () => void;
  emergencyStop: () => void;
  startNewMission: (title: string, zone: string) => void;
  completeMission: () => void;
}

const RescueContext = createContext<RescueContextType | undefined>(undefined);

// Default detected GPS coordinates from NEO-8M hardware module (Batu Pahat / Live Vessel area)
const INITIAL_COORDS: [number, number] = [1.8642, 103.1142];

export const RescueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [robotOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(84);
  const [connectionStatus] = useState<'Strong' | 'Moderate' | 'Unstable' | 'Offline'>('Strong');
  const [waterDepth, setWaterDepth] = useState(1.85);
  const [robotSpeed, setRobotSpeed] = useState(2.4);
  const [robotLocation, setRobotLocation] = useState<[number, number] | null>(INITIAL_COORDS);

  // Multi-tier Ground Control Computer Geolocation
  const [computerLocation, setComputerLocation] = useState<[number, number]>(() => {
    try {
      const saved = localStorage.getItem('floodscout_pc_coords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2 && !isNaN(parsed[0]) && !isNaN(parsed[1])) {
          // Reject stale mock Johor Bahru coords [1.5588, 103.6375]
          const isStaleJohor = Math.abs(parsed[0] - 1.5588) < 0.005 && Math.abs(parsed[1] - 103.6375) < 0.005;
          if (!isStaleJohor) {
            return [parsed[0], parsed[1]];
          }
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_COORDS;
  });
  const [computerAccuracy, setComputerAccuracy] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'locating' | 'ready' | 'denied' | 'timeout' | 'error' | 'idle'>('idle');
  const [locationSource, setLocationSource] = useState<'gps' | 'wifi' | 'ip' | 'manual' | 'default'>('default');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Core Geolocation Engine:
  // 1. Instant IP Geolocation (HTTPS, CORS-enabled, runs in parallel in ~200ms)
  // 2. Wi-Fi Positioning (fast, reliable on laptops without hardware GPS)
  // 3. High-Accuracy GPS (for phones/GPS hardware)
  const acquireLocation = useCallback(async (): Promise<[number, number] | null> => {
    setLocationStatus('locating');
    setLocationError(null);

    // Fast CORS-compatible IP Geolocation provider
    const tryIpGeo = async (): Promise<[number, number] | null> => {
      // Tier A: GeoJS (verified 200 OK + CORS * in Malaysia)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
            const coords: [number, number] = [lat, lng];
            setComputerLocation(coords);
            setComputerAccuracy(typeof data.accuracy === 'number' ? data.accuracy : 1200);
            setLocationStatus('ready');
            setLocationSource((prev) => (prev === 'gps' || prev === 'wifi' ? prev : 'ip'));
            setLocationError(null);
            try {
              localStorage.setItem('floodscout_pc_coords', JSON.stringify(coords));
            } catch {}
            return coords;
          }
        }
      } catch (e) {
        console.warn('[Geolocation] GeoJS IP lookup failed:', e);
      }

      // Tier B: IPWhoIs fallback (verified 200 OK + CORS * in Malaysia)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://ipwho.is/', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            const coords: [number, number] = [data.latitude, data.longitude];
            setComputerLocation(coords);
            setComputerAccuracy(1500);
            setLocationStatus('ready');
            setLocationSource((prev) => (prev === 'gps' || prev === 'wifi' ? prev : 'ip'));
            setLocationError(null);
            try {
              localStorage.setItem('floodscout_pc_coords', JSON.stringify(coords));
            } catch {}
            return coords;
          }
        }
      } catch (e) {
        console.warn('[Geolocation] IPWhoIs fallback failed:', e);
      }

      return null;
    };

    // Kick off IP lookup immediately in parallel so the user gets their real computer location in <300ms
    const ipPromise = tryIpGeo();

    const tryBrowserGeo = (options: PositionOptions, sourceLabel: 'gps' | 'wifi'): Promise<[number, number]> => {
      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !('geolocation' in navigator)) {
          return reject(new Error('Geolocation not supported (requires HTTPS or localhost)'));
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setComputerLocation(coords);
            setComputerAccuracy(Math.round(pos.coords.accuracy));
            setLocationStatus('ready');
            setLocationSource(sourceLabel);
            setLocationError(null);
            try {
              localStorage.setItem('floodscout_pc_coords', JSON.stringify(coords));
            } catch {}
            resolve(coords);
          },
          (err) => reject(err),
          options
        );
      });
    };

    // Step 1: Query Wi-Fi/Cell positioning (enableHighAccuracy: false).
    // On Windows laptops without GPS hardware, this succeeds rapidly using Windows Location Service.
    try {
      const coords = await tryBrowserGeo({ enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }, 'wifi');
      // If successful, attempt to refine with high-accuracy in the background if GNSS hardware exists
      tryBrowserGeo({ enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }, 'gps').catch(() => {});
      return coords;
    } catch (err: unknown) {
      const errObj = err as GeolocationPositionError;
      console.warn('[Geolocation] Fast Wi-Fi query failed/timeout:', errObj?.message || err);
    }

    // Step 2: Try High Accuracy GPS query
    try {
      const coords = await tryBrowserGeo({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }, 'gps');
      return coords;
    } catch (err: unknown) {
      const errObj = err as GeolocationPositionError;
      if (errObj?.code === 1) {
        setLocationError('Browser location permission denied. Using IP location.');
      } else if (errObj?.code === 2) {
        setLocationError('Position unavailable from Windows Location Service. Using IP location.');
      } else if (errObj?.code === 3) {
        setLocationError('GPS timed out. Using IP location.');
      }
    }

    // Step 3: Wait for parallel IP-based Geolocation fallback
    const ipCoords = await ipPromise;
    if (ipCoords) return ipCoords;

    setLocationStatus('error');
    setLocationError('Could not determine location. Using default.');
    return null;
  }, []);

  const setManualComputerLocation = useCallback((coords: [number, number]) => {
    setComputerLocation(coords);
    setComputerAccuracy(5);
    setLocationStatus('ready');
    setLocationSource('manual');
    setLocationError(null);
    try {
      localStorage.setItem('floodscout_pc_coords', JSON.stringify(coords));
    } catch {}
  }, []);

  // Run on mount + watch for updates
  useEffect(() => {
    acquireLocation();

    let watchId: number | null = null;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setComputerLocation(coords);
            setComputerAccuracy(Math.round(pos.coords.accuracy));
            setLocationStatus('ready');
            setLocationSource(pos.coords.accuracy < 30 ? 'gps' : 'wifi');
            try {
              localStorage.setItem('floodscout_pc_coords', JSON.stringify(coords));
            } catch {}
          },
          () => {},
          { enableHighAccuracy: false, maximumAge: 10000 }
        );
      } catch {}
    }

    return () => {
      if (watchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [acquireLocation]);
  const [robotHeading, setRobotHeading] = useState(65);
  const [operatingMode, setOperatingModeState] = useState<RobotMode>('AUTO_SEARCH');
  const [thrusterPwm, setThrusterPwm] = useState(48);
  const [signalDbm] = useState(-58);
  const [cameraMode, setCameraMode] = useState<CameraMode>('ai');
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [thermalPalette] = useState<'ironbow' | 'whitehot' | 'rainbow'>('ironbow');

  const [trajectory, setTrajectory] = useState<[number, number][]>([]);

  const [activeMission, setActiveMission] = useState<Mission>({
    id: 'MISSION-024',
    title: 'FloodScout Live Deployment',
    zone: 'Live Operational Sector (GNSS Tracked)',
    status: 'ACTIVE',
    startTime: '14:15:00',
    durationSeconds: 1140, // 19 minutes
    distanceTravelledKm: 0.12,
    areaSurveyedSqM: 1200,
    robotName: 'FloodScout-01',
  });

  const [victims, setVictims] = useState<Victim[]>([]);

  const [alerts, setAlerts] = useState<AlertNotification[]>([]);

  const [detectionLogs, setDetectionLogs] = useState<DetectionLog[]>([]);

  const [latestAlert, setLatestAlert] = useState<AlertNotification | null>(null);

  // Active Mission Clock
  useEffect(() => {
    if (activeMission.status !== 'ACTIVE') return;
    const interval = setInterval(() => {
      setActiveMission((prev) => ({
        ...prev,
        durationSeconds: prev.durationSeconds + 1,
        distanceTravelledKm: parseFloat((prev.distanceTravelledKm + (robotSpeed > 0 ? 0.0006 : 0)).toFixed(2)),
        areaSurveyedSqM: prev.areaSurveyedSqM + (robotSpeed > 0 ? 4 : 0),
      }));

      // Subtle water depth oscillation
      setWaterDepth(parseFloat((1.8 + Math.sin(Date.now() / 4000) * 0.25).toFixed(2)));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMission.status, robotSpeed]);

  // Battery Drain Simulation
  useEffect(() => {
    const batInterval = setInterval(() => {
      setBatteryLevel((prev) => (prev > 5 ? prev - 1 : prev));
    }, 35000);
    return () => clearInterval(batInterval);
  }, []);

  // Mode change handler
  const setOperatingMode = (mode: RobotMode) => {
    setOperatingModeState(mode);
    if (mode === 'EMERGENCY_STOP') {
      setRobotSpeed(0);
      setThrusterPwm(0);
    } else if (mode === 'AUTO_SEARCH') {
      setRobotSpeed(2.4);
      setThrusterPwm(50);
    } else if (mode === 'MANUAL') {
      setRobotSpeed(1.8);
      setThrusterPwm(40);
    } else if (mode === 'RETURN_TO_BASE') {
      setRobotSpeed(3.2);
      setThrusterPwm(65);
    }

    const newAlert: AlertNotification = {
      id: `ALT-${Date.now()}`,
      type: 'MODE_CHANGED',
      title: `MODE SWITCHED: ${mode.replace('_', ' ')}`,
      message: `FloodScout robot operation mode updated to ${mode}.`,
      time: new Date().toLocaleTimeString(),
      critical: mode === 'EMERGENCY_STOP',
      read: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
  };

  // Synchronize initial robot deployment near PC Ground Control only if hardware GPS is not active
  const isHardwareGpsActiveRef = useRef(false);
  useEffect(() => {
    if (isHardwareGpsActiveRef.current) return;
    if (computerLocation) {
      setRobotLocation(computerLocation);
    }
  }, [computerLocation]);

  // Hardware GPS Integration (NEO-8M on ESP32 Serial2 / WebSerial)
  const handleHardwareGpsFix = useCallback((coords: [number, number], telemetry: Partial<HardwareGpsState>) => {
    isHardwareGpsActiveRef.current = true;
    setRobotLocation(coords);
    setTrajectory((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.abs(last[0] - coords[0]) < 0.000005 && Math.abs(last[1] - coords[1]) < 0.000005) {
        return prev;
      }
      return [...prev.slice(-200), coords];
    });

    if (telemetry.heading && telemetry.heading > 0) {
      setRobotHeading(telemetry.heading);
    }
    if (telemetry.speedKmh && telemetry.speedKmh > 0) {
      setRobotSpeed(telemetry.speedKmh);
    }
  }, []);

  const { gpsState: hardwareGps, connectWebSerial } = useHardwareGps(handleHardwareGpsFix);

  // Real-time autonomous robot movement and trajectory update on tactical map
  useEffect(() => {
    // If real hardware GPS fix is active, the live NEO-8M stream drives robot location directly!
    if (hardwareGps.isValid) return;

    if (activeMission.status !== 'ACTIVE' || robotSpeed <= 0) return;

    const interval = setInterval(() => {
      setRobotHeading((prevHeading) => {
        // Course variation (+/- 2.5 degrees sinusoidal) to simulate realistic water navigation
        const headingWobble = Math.sin(Date.now() / 3500) * 3.5;
        const newHeading = Math.round((prevHeading + headingWobble + 360) % 360);

        setRobotLocation((current) => {
          if (!current) return null;
          const [lat, lng] = current;
          // Speed: km/h to lat/lng step. e.g. 2.4 km/h -> ~0.67 m/s -> in 1.5s is ~1.0 meter ~ 0.000009 deg
          const metersInInterval = (robotSpeed * (1000 / 3600)) * 1.5;
          const degPerMeter = 1 / 111320;
          const rad = (newHeading * Math.PI) / 180;
          const dLat = Math.cos(rad) * metersInInterval * degPerMeter;
          const cosLat = Math.cos((lat * Math.PI) / 180) || 1;
          const dLng = (Math.sin(rad) * metersInInterval * degPerMeter) / cosLat;

          const newLat = parseFloat((lat + dLat).toFixed(6));
          const newLng = parseFloat((lng + dLng).toFixed(6));
          const newPos: [number, number] = [newLat, newLng];

          setTrajectory((prevTraj) => {
            return [...prevTraj.slice(-150), newPos];
          });

          return newPos;
        });

        return newHeading;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [activeMission.status, robotSpeed]);

  // Move robot manually or along path
  const moveRobot = (dx: number, dy: number, heading: number) => {
    setRobotLocation((current) => {
      const base = current || computerLocation;
      const newLat = parseFloat((base[0] + dy).toFixed(6));
      const newLng = parseFloat((base[1] + dx).toFixed(6));
      const newPos: [number, number] = [newLat, newLng];
      setTrajectory((prev) => [...prev.slice(-150), newPos]);
      return newPos;
    });
    setRobotHeading(heading);
  };

  // Direct robot position setter (for map clicks, calibrations)
  const setRobotLocationDirect = useCallback((coords: [number, number]) => {
    setRobotLocation(coords);
    setTrajectory((prev) => [...prev.slice(-150), coords]);
  }, []);

  // Update victim lifecycle status
  const updateVictimStatus = (id: string, status: VictimStatus, assignedUnit?: string) => {
    setVictims((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status,
              assignedUnit: assignedUnit || v.assignedUnit,
            }
          : v
      )
    );

    const alert: AlertNotification = {
      id: `ALT-${Date.now()}`,
      type: status === 'Rescued' ? 'RESCUE_CONFIRMED' : 'VICTIM_DETECTED',
      title: `VICTIM ${id} → ${status.toUpperCase()}`,
      message: `Status updated for victim at ${victims.find((v) => v.id === id)?.zone || 'Flood Zone'}.`,
      time: new Date().toLocaleTimeString(),
      critical: status === 'Detected',
      read: false,
    };
    setAlerts((prev) => [alert, ...prev]);
  };

  const addVictim = (victimData: Omit<Victim, 'id' | 'time'>) => {
    const newId = `V-00${victims.length + 1}`;
    const newVictim: Victim = {
      ...victimData,
      id: newId,
      time: new Date().toLocaleTimeString(),
    };
    setVictims((prev) => [newVictim, ...prev]);
  };

  // High-impact simulation trigger for Hackathon Demos
  const simulateVictimDetection = () => {
    const newId = `V-00${victims.length + 1}`;
    const latOffset = (Math.random() - 0.5) * 0.003;
    const lngOffset = (Math.random() - 0.5) * 0.003;
    const newLoc: [number, number] = [
      parseFloat((robotLocation[0] + latOffset).toFixed(6)),
      parseFloat((robotLocation[1] + lngOffset).toFixed(6)),
    ];

    const newVictim: Victim = {
      id: newId,
      status: 'Detected',
      location: newLoc,
      zone: `Sector B - Submerged Structure ${Math.floor(Math.random() * 20) + 1}`,
      confidence: Math.floor(Math.random() * 8) + 91,
      time: new Date().toLocaleTimeString(),
      priority: 'Critical',
      peopleCount: Math.random() > 0.6 ? 2 : 1,
      image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=600&auto=format&fit=crop',
      waterDepthAtLocation: parseFloat((1.6 + Math.random() * 0.9).toFixed(2)),
      notes: 'Real-time AI person detection flagged heat signature and human silhouette.',
    };

    setVictims((prev) => [newVictim, ...prev]);

    const newAlert: AlertNotification = {
      id: `ALT-${Date.now()}`,
      type: 'VICTIM_DETECTED',
      title: '🚨 POTENTIAL VICTIM DETECTED',
      message: `AI detected ${newVictim.peopleCount} person(s) at ${newVictim.zone} (${newVictim.confidence}% confidence).`,
      time: newVictim.time,
      critical: true,
      read: false,
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setLatestAlert(newAlert);
    
    const newLog: DetectionLog = {
      id: `LOG-${Date.now()}`,
      time: newVictim.time,
      message: `AI vision flagged ${newVictim.peopleCount} person(s) at ${newVictim.zone}.`,
      confidence: newVictim.confidence,
    };
    setDetectionLogs((prev) => [newLog, ...prev]);
  };

  const emergencyStop = () => {
    setOperatingMode('EMERGENCY_STOP');
  };

  const clearLatestAlert = () => setLatestAlert(null);
  const dismissAlert = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id));
  const markAllAlertsRead = () => setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));

  const startNewMission = (title: string, zone: string) => {
    setActiveMission({
      id: `MISSION-${Math.floor(Math.random() * 900) + 100}`,
      title,
      zone,
      status: 'ACTIVE',
      startTime: new Date().toLocaleTimeString(),
      durationSeconds: 0,
      distanceTravelledKm: 0.1,
      areaSurveyedSqM: 500,
      robotName: 'FloodScout-01',
    });
  };

  const completeMission = () => {
    setActiveMission((m) => ({ ...m, status: 'COMPLETED' }));
  };

  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  return (
    <RescueContext.Provider
      value={{
        robotOnline,
        batteryLevel,
        connectionStatus,
        waterDepth,
        robotSpeed,
        robotLocation,
        computerLocation,
        computerAccuracy,
        locationStatus,
        locationSource,
        locationError,
        refreshComputerLocation: acquireLocation,
        setManualComputerLocation,
        robotHeading,
        operatingMode,
        thrusterPwm,
        signalDbm,
        trajectory,
        cameraMode,
        hardwareGps,
        connectWebSerial,
        activeMission,
        victims,
        alerts,
        detectionLogs,
        unreadAlertsCount,
        latestAlert,
        confidenceThreshold,
        soundEnabled,
        thermalPalette,
        setCameraMode,
        setOperatingMode,
        setConfidenceThreshold,
        setSoundEnabled,
        moveRobot,
        setRobotLocationDirect,
        updateVictimStatus,
        addVictim,
        simulateVictimDetection,
        clearLatestAlert,
        dismissAlert,
        markAllAlertsRead,
        emergencyStop,
        startNewMission,
        completeMission,
      }}
    >
      {children}
    </RescueContext.Provider>
  );
};

export const useRescue = () => {
  const context = useContext(RescueContext);
  if (!context) {
    throw new Error('useRescue must be used within a RescueProvider');
  }
  return context;
};
