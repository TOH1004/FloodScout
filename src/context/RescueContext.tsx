import React, { createContext, useContext, useState, useEffect } from 'react';

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
  robotLocation: [number, number];
  robotHeading: number;
  operatingMode: RobotMode;
  thrusterPwm: number;
  signalDbm: number;
  trajectory: [number, number][];
  cameraMode: CameraMode;
  
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

// Initial Malaysian flood scenario coordinates (e.g. Sri Muda / Klang valley area)
const INITIAL_COORDS: [number, number] = [3.0425, 101.5280];

export const RescueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [robotOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(84);
  const [connectionStatus] = useState<'Strong' | 'Moderate' | 'Unstable' | 'Offline'>('Strong');
  const [waterDepth, setWaterDepth] = useState(1.85);
  const [robotSpeed, setRobotSpeed] = useState(2.4);
  const [robotLocation, setRobotLocation] = useState<[number, number]>(INITIAL_COORDS);
  const [robotHeading, setRobotHeading] = useState(65);
  const [operatingMode, setOperatingModeState] = useState<RobotMode>('AUTO_SEARCH');
  const [thrusterPwm, setThrusterPwm] = useState(48);
  const [signalDbm] = useState(-58);
  const [cameraMode, setCameraMode] = useState<CameraMode>('ai');
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [thermalPalette] = useState<'ironbow' | 'whitehot' | 'rainbow'>('ironbow');

  const [trajectory, setTrajectory] = useState<[number, number][]>([
    [3.0410, 101.5265],
    [3.0415, 101.5270],
    [3.0418, 101.5275],
    [3.0422, 101.5278],
    INITIAL_COORDS,
  ]);

  const [activeMission, setActiveMission] = useState<Mission>({
    id: 'MISSION-024',
    title: 'Kampung Seri Melati Flash Flood Deployment',
    zone: 'Sector B - Submerged Residential Zone',
    status: 'ACTIVE',
    startTime: '14:15:00',
    durationSeconds: 1140, // 19 minutes
    distanceTravelledKm: 2.84,
    areaSurveyedSqM: 14200,
    robotName: 'FloodScout-01',
  });

  const [victims, setVictims] = useState<Victim[]>([
    {
      id: 'V-001',
      status: 'Verified',
      location: [3.0435, 101.5292],
      zone: 'Sector B - House 14 Roof Area',
      confidence: 96,
      time: '14:22:15',
      priority: 'Critical',
      peopleCount: 2,
      image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=600&auto=format&fit=crop',
      waterDepthAtLocation: 2.4,
      assignedUnit: 'Rescue Boat Unit Bravo-2',
      notes: 'Elderly couple trapped on rooftop terrace, waving red cloth.',
    },
    {
      id: 'V-002',
      status: 'Rescue Assigned',
      location: [3.0418, 101.5305],
      zone: 'Sector B - Near Submerged Vehicle',
      confidence: 91,
      time: '14:28:40',
      priority: 'High',
      peopleCount: 1,
      image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=600&auto=format&fit=crop',
      waterDepthAtLocation: 1.9,
      assignedUnit: 'Hovercraft Swift-1',
      notes: 'Adult male holding onto light pole above water level.',
    },
    {
      id: 'V-003',
      status: 'Rescued',
      location: [3.0402, 101.5260],
      zone: 'Sector A - Community Hall Pergola',
      confidence: 94,
      time: '14:18:02',
      priority: 'Moderate',
      peopleCount: 1,
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
      waterDepthAtLocation: 1.2,
      assignedUnit: 'Amphibious Unit 04',
      notes: 'Safely evacuated to Evacuation Center Alpha.',
    }
  ]);

  const [alerts, setAlerts] = useState<AlertNotification[]>([
    {
      id: 'ALT-101',
      type: 'VICTIM_DETECTED',
      title: 'POTENTIAL VICTIM DETECTED',
      message: 'AI detected 2 people at Sector B (96% Confidence) near submerged rooftop.',
      time: '14:22:15',
      critical: true,
      read: false,
    },
    {
      id: 'ALT-102',
      type: 'DEPTH_ALERT',
      title: 'WATER DEPTH INCREASE',
      message: 'Bathymetric sonar detected rapid surge to 2.4m depth.',
      time: '14:24:50',
      critical: false,
      read: true,
    },
    {
      id: 'ALT-103',
      type: 'RESCUE_CONFIRMED',
      title: 'VICTIM RESCUE CONFIRMED',
      message: 'Victim V-003 safely extracted by Amphibious Unit 04.',
      time: '14:30:10',
      critical: false,
      read: true,
    }
  ]);

  const [detectionLogs, setDetectionLogs] = useState<DetectionLog[]>([
    {
      id: 'LOG-1',
      time: '14:22:15',
      message: 'Initial scan: Possible human shape detected in Sector B.',
      confidence: 72,
    }
  ]);

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

  // Move robot manually or along path
  const moveRobot = (dx: number, dy: number, heading: number) => {
    setRobotLocation(([lat, lng]) => {
      const newLat = parseFloat((lat + dy).toFixed(6));
      const newLng = parseFloat((lng + dx).toFixed(6));
      const newPos: [number, number] = [newLat, newLng];
      setTrajectory((prev) => [...prev.slice(-30), newPos]);
      return newPos;
    });
    setRobotHeading(heading);
  };

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
        robotHeading,
        operatingMode,
        thrusterPwm,
        signalDbm,
        trajectory,
        cameraMode,
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
