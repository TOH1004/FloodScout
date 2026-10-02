import { useState, useMemo, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  User,
  Route,
  Copy,
  Check,
  Milestone,
  Maximize2,
  Radio,
  Activity,
  Laptop,
  AlertTriangle,
  History,
  Target,
  FileSpreadsheet,
  Satellite,
  Globe,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRescue, type Mission, type Victim } from '../context/RescueContext';

// ─── Custom Leaflet Icons for History Google Map ──────────────────────────────
const pcMapIcon = L.divIcon({
  className: 'custom-pc-history-marker',
  html: `<div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(2,132,199,0.35);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <div style="position:relative;width:28px;height:28px;background:#0284C7;border:2.5px solid #FAF7F2;border-radius:50%;box-shadow:0 0 12px rgba(2,132,199,0.9);display:flex;align-items:center;justify-content:center;font-size:13px;color:#FAF7F2;cursor:pointer;">💻</div>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const getRobotHistoryIcon = (isAlert: boolean) => L.divIcon({
  className: 'custom-robot-history-marker',
  html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
    <div style="position:absolute;inset:0;border-radius:50%;background:${isAlert ? 'rgba(239,68,68,0.5)' : 'rgba(6,182,212,0.45)'};animation:ping 1.5s infinite;"></div>
    <div style="position:relative;width:30px;height:30px;background:${isAlert ? '#DC2626' : '#0891B2'};border:2.5px solid #FAF7F2;border-radius:50%;box-shadow:0 0 14px ${isAlert ? 'rgba(239,68,68,0.9)' : 'rgba(6,182,212,0.9)'};display:flex;align-items:center;justify-content:center;font-size:14px;color:#FAF7F2;">${isAlert ? '🚨' : '🤖'}</div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const victimHistoryIcon = L.divIcon({
  className: 'custom-victim-history-marker',
  html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.45);animation:ping 1.5s infinite;"></div>
    <div style="position:relative;width:26px;height:26px;background:#EF4444;border:2px solid #FAF7F2;border-radius:50%;box-shadow:0 0 10px rgba(239,68,68,0.9);display:flex;align-items:center;justify-content:center;font-size:12px;color:#FAF7F2;">👤</div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const createWaypointMapIcon = (idx: number) => L.divIcon({
  className: 'custom-waypoint-marker',
  html: `<div style="width:18px;height:18px;background:#0284C7;border:2px solid #FFFFFF;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:9px;font-family:monospace;font-weight:bold;color:#FFFFFF;">${idx}</div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function HistoryMapController({
  points,
  fitTrigger,
}: {
  points: [number, number][];
  fitTrigger?: number;
}) {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (points.length > 0) {
        try {
          const bounds = L.latLngBounds(points);
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
          }
        } catch {
          // ignore
        }
      }
    }, 150);
    return () => clearTimeout(t);
  }, [map, points, fitTrigger]);

  return null;
}

export interface RescueLocationAnalysisProps {
  robotLocation: [number, number] | null;
  robotHeading: number;
  robotSpeed: number;
  waterDepth: number;
  batteryLevel: number;
  connectionStatus: string;
  operatingMode: string;
  signalDbm: number;
  activeMission: Mission;
  trajectory: [number, number][];
  victims: Victim[];
  manifestPersons?: Array<{
    personId: number;
    location: [number, number] | null;
    time: string;
    label: string;
    score: number;
    incident: any;
  }>;
  detectionStatus?: {
    personDetected: boolean;
    personCount: number;
    highestConfidence: number;
  };
  baseLocation: [number, number]; // PC Location (Ground Control)
  onSelectLocation?: (coords: [number, number]) => void;
  onInspectIncident?: (incident: any, personId?: number) => void;
  onShowVictimManifest?: () => void;
}

// Haversine geodesic distance in kilometers
function haversineDistanceKm(c1: [number, number], c2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const dLat = (c2[0] - c1[0]) * (Math.PI / 180);
  const dLng = (c2[1] - c1[1]) * (Math.PI / 180);
  const lat1 = c1[0] * (Math.PI / 180);
  const lat2 = c2[0] * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Azimuth bearing in degrees from c1 to c2
function calculateBearing(c1: [number, number], c2: [number, number]): number {
  const lat1 = (c1[0] * Math.PI) / 180;
  const lat2 = (c2[0] * Math.PI) / 180;
  const dLng = ((c2[1] - c1[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

function bearingToCompass(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

// Convert Decimal Degrees to DMS format
function toDMS(val: number, isLat: boolean): string {
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
  return `${deg}°${min}'${sec}"${dir}`;
}

export function RescueLocationAnalysis({
  robotLocation,
  robotHeading,
  robotSpeed,
  waterDepth,
  batteryLevel,
  connectionStatus,
  operatingMode,
  signalDbm,
  activeMission,
  trajectory,
  victims,
  manifestPersons = [],
  detectionStatus,
  baseLocation, // PC Location
  onSelectLocation,
  onInspectIncident,
  onShowVictimManifest,
}: RescueLocationAnalysisProps) {
  const { hardwareGps } = useRescue();
  const [activeTab, setActiveTab] = useState<'all' | 'trace' | 'pc' | 'robot' | 'victim' | 'history'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [coordFormat, setCoordFormat] = useState<'DD' | 'DMS'>('DD');
  const [historyMapLayer, setHistoryMapLayer] = useState<'google' | 'google-hybrid'>('google');
  const [fitCounter, setFitCounter] = useState(0);

  // Check if person is currently detected at robot location
  const isPersonDetectedAtRobot = Boolean(
    detectionStatus?.personDetected ||
    (detectionStatus && detectionStatus.personCount > 0)
  );

  // 1. Primary Location 1: PC Location (Ground Control Station)
  const pcLoc: [number, number] = useMemo(() => {
    return baseLocation || [1.8642, 103.1142];
  }, [baseLocation]);

  // 2. Primary Location 2: Robot Location (FloodScout-01 Vessel)
  const currentRobotLoc: [number, number] | null = useMemo(() => {
    return robotLocation || null;
  }, [robotLocation]);

  // 3. Primary Location 3: Victim Location (Detected Human Targets)
  const victimTarget = useMemo(() => {
    if (manifestPersons && manifestPersons.length > 0) {
      const p = manifestPersons.find(item => item.location !== null);
      if (p && p.location) {
        return {
          location: p.location,
          label: `Person #${p.personId}`,
          confidence: p.score,
          time: p.time,
          source: 'AI Camera Vision (HOG+SVM)',
          incident: p.incident,
          personId: p.personId,
          allVictimsCount: manifestPersons.filter(item => item.location !== null).length,
        };
      }
    }
    if (victims && victims.length > 0) {
      const v = victims[0];
      return {
        location: v.location,
        label: `Victim ${v.id}`,
        confidence: v.confidence,
        time: v.time,
        source: 'Thermal / Sonar Scan',
        incident: null,
        personId: undefined,
        allVictimsCount: victims.length,
      };
    }
    if (detectionStatus?.personDetected && currentRobotLoc) {
      return {
        location: currentRobotLoc,
        label: 'Live Target #1',
        confidence: (detectionStatus.highestConfidence || 0.95) * 100,
        time: 'Active Now',
        source: 'Real-time Camera Stream',
        incident: null,
        personId: 1,
        allVictimsCount: detectionStatus.personCount || 1,
      };
    }
    return null;
  }, [manifestPersons, victims, detectionStatus, currentRobotLoc]);

  // Victim location only if a victim is actually detected
  const displayVictimLoc: [number, number] | null = victimTarget ? victimTarget.location : null;

  // Composite bounds points for Google Map fit
  const mapPoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [pcLoc];
    if (trajectory && trajectory.length > 0) {
      pts.push(...trajectory);
    }
    if (currentRobotLoc) {
      pts.push(currentRobotLoc);
    }
    if (displayVictimLoc) {
      pts.push(displayVictimLoc);
    }
    return pts;
  }, [pcLoc, trajectory, currentRobotLoc, displayVictimLoc]);

  // Geodesic Distances & Bearings between the 3 Locations
  const distPcToRobotKm = useMemo(() => {
    if (!currentRobotLoc) return null;
    return haversineDistanceKm(pcLoc, currentRobotLoc);
  }, [pcLoc, currentRobotLoc]);

  const bearingPcToRobot = useMemo(() => {
    if (!currentRobotLoc) return null;
    return calculateBearing(pcLoc, currentRobotLoc);
  }, [pcLoc, currentRobotLoc]);

  const compassPcToRobot = useMemo(() => {
    if (bearingPcToRobot === null) return 'N/A';
    return bearingToCompass(bearingPcToRobot);
  }, [bearingPcToRobot]);

  const distRobotToVictimKm = useMemo(() => {
    if (!currentRobotLoc || !displayVictimLoc) return null;
    return haversineDistanceKm(currentRobotLoc, displayVictimLoc);
  }, [currentRobotLoc, displayVictimLoc]);

  const bearingRobotToVictim = useMemo(() => {
    if (!currentRobotLoc || !displayVictimLoc) return null;
    return calculateBearing(currentRobotLoc, displayVictimLoc);
  }, [currentRobotLoc, displayVictimLoc]);

  const compassRobotToVictim = useMemo(() => {
    if (bearingRobotToVictim === null) return 'N/A';
    return bearingToCompass(bearingRobotToVictim);
  }, [bearingRobotToVictim]);

  const distPcToVictimKm = useMemo(() => {
    if (!displayVictimLoc) return null;
    return haversineDistanceKm(pcLoc, displayVictimLoc);
  }, [pcLoc, displayVictimLoc]);

  const speedKmh = robotSpeed > 0 ? robotSpeed : 2.4;
  const speedMs = speedKmh * 0.2778;
  const etaRobotToVictimSeconds = distRobotToVictimKm !== null
    ? Math.round((distRobotToVictimKm * 1000) / speedMs)
    : null;

  const handleCopyGps = (coords: [number, number], key: string) => {
    const text = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatCoord = (coords: [number, number]) => {
    if (coordFormat === 'DMS') {
      return `${toDMS(coords[0], true)} ${toDMS(coords[1], false)}`;
    }
    return `${coords[0].toFixed(6)}° N, ${coords[1].toFixed(6)}° E`;
  };

  // Generate Chronological Trace Log (PC & Robot Breadcrumb History)
  const traceLogItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      sub: string;
      coords: [number, number];
      distFromPcM: number;
      bearingFromPc: number;
      type: 'pc' | 'robot' | 'victim' | 'trace';
      badge: string;
      badgeColor: string;
      time: string;
      isAlert?: boolean;
    }> = [];

    // 1. PC Origin Point
    items.push({
      id: 'TRACE-00',
      title: 'PC Ground Control Station',
      sub: 'Operator Command Terminal Baseline',
      coords: pcLoc,
      distFromPcM: 0,
      bearingFromPc: 0,
      type: 'pc',
      badge: 'PC GROUND STATION',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300 font-bold',
      time: activeMission.startTime || '14:15:00',
    });

    // 2. Historical Trajectory Points (sample evenly if large and robot has been located)
    if (currentRobotLoc && trajectory.length > 0) {
      const pointsToUse = trajectory.length > 8
        ? trajectory.filter((_, idx) => idx % Math.ceil(trajectory.length / 6) === 0 || idx === trajectory.length - 1)
        : trajectory;

      pointsToUse.forEach((pt, idx) => {
        const dKm = haversineDistanceKm(pcLoc, pt);
        const brng = calculateBearing(pcLoc, pt);
        items.push({
          id: `TR-${String(idx + 1).padStart(2, '0')}`,
          title: `Robot Autonomous Sector Trace #${idx + 1}`,
          sub: `Depth ${(1.7 + (idx % 4) * 0.1).toFixed(2)}m • Bearing ${brng}° (${bearingToCompass(brng)})`,
          coords: pt,
          distFromPcM: Math.round(dKm * 1000),
          bearingFromPc: brng,
          type: 'trace',
          badge: 'TELEMETRY TRACE',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
          time: `14:${String(16 + idx * 2).padStart(2, '0')}:00`,
        });
      });
    }

    // 3. Current Live Robot Position (Only if detected)
    if (currentRobotLoc) {
      items.push({
        id: `TR-LIVE`,
        title: 'Robot Location (FloodScout-01 Vessel)',
        sub: isPersonDetectedAtRobot
          ? '🚨 PERSON DETECTED AT THIS VESSEL LOCATION!'
          : hardwareGps?.isValid
          ? `NEO-8M 3D Lock (${hardwareGps.satellites} Sats • Alt ${hardwareGps.altitude.toFixed(1)}m) • Speed ${robotSpeed} km/h`
          : `Live GPS Fix • Speed ${robotSpeed} km/h • Bat ${batteryLevel}%`,
        coords: currentRobotLoc,
        distFromPcM: distPcToRobotKm !== null ? Math.round(distPcToRobotKm * 1000) : 0,
        bearingFromPc: bearingPcToRobot !== null ? bearingPcToRobot : 0,
        type: 'robot',
        badge: isPersonDetectedAtRobot
          ? '🚨 PERSON DETECTED'
          : hardwareGps?.isValid
          ? '📡 HARDWARE GNSS'
          : 'LIVE ON WATER',
        badgeColor: isPersonDetectedAtRobot
          ? 'bg-rose-600 text-white border-rose-700 font-bold animate-pulse'
          : hardwareGps?.isValid
          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
          : 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold animate-pulse',
        time: 'Live Now',
        isAlert: isPersonDetectedAtRobot,
      });
    }

    // 4. Victim Locations (if any detected)
    if (victimTarget) {
      items.push({
        id: `TR-VICTIM`,
        title: `Victim Location (${victimTarget.label})`,
        sub: `${victimTarget.source} (${victimTarget.confidence.toFixed(1)}% Conf)`,
        coords: victimTarget.location,
        distFromPcM: distPcToVictimKm !== null ? Math.round(distPcToVictimKm * 1000) : 0,
        bearingFromPc: calculateBearing(pcLoc, victimTarget.location),
        type: 'victim',
        badge: 'SURVIVOR DETECTED',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        time: victimTarget.time,
        isAlert: true,
      });
    }

    return items;
  }, [
    pcLoc,
    trajectory,
    currentRobotLoc,
    distPcToRobotKm,
    bearingPcToRobot,
    distPcToVictimKm,
    isPersonDetectedAtRobot,
    robotSpeed,
    batteryLevel,
    victimTarget,
    activeMission.startTime,
    hardwareGps,
  ]);

  return (
    <div className="h-full flex flex-col bg-[#12141a] text-slate-200 overflow-hidden select-none">
      {/* ─── Top Control & Sub-tab Bar ────────────────────────────────────────── */}
      <div className="px-3.5 py-2 bg-[#171a23] border-b border-[#232733] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#202534] flex items-center justify-center text-cyan-400 border border-[#2b3348]">
            <History size={14} />
          </div>
          <div>
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-200 leading-none flex items-center gap-2">
              <span>Location &amp; Telemetry History</span>
              {isPersonDetectedAtRobot && (
                <span className="text-[9px] bg-rose-600 text-white font-mono font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                  🚨 PERSON DETECTED
                </span>
              )}
            </h3>
            <p className="text-[10px] font-mono text-slate-400 mt-1">
              3 Primary Locations: 1. PC Location • 2. Robot Location • 3. Victim Location
            </p>
          </div>
        </div>

        {/* View Filter Pill Switcher */}
        <div className="flex items-center gap-1 bg-[#12141a] p-0.5 rounded-lg border border-[#242938] text-[10px] font-mono font-bold">
          {(['all', 'trace', 'pc', 'robot', 'victim', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 rounded capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'all'
                ? 'Overview'
                : tab === 'trace'
                ? 'PC & Robot Trace'
                : tab === 'pc'
                ? '1. PC Location'
                : tab === 'robot'
                ? '2. Robot Location'
                : tab === 'victim'
                ? '3. Victim Location'
                : 'Trace Log'}
            </button>
          ))}
        </div>
      </div>

      {/* Telemetry Status Strip */}
      <div className="px-3.5 py-1.5 bg-[#FAF7F2] border-b border-[#E6DFD5] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded">
            <Radio size={10} className="text-emerald-700" />
            Link: {connectionStatus} ({signalDbm} dBm)
          </span>
          <span className="flex items-center gap-1 font-bold text-cyan-900 bg-cyan-100/70 border border-cyan-300 px-2 py-0.5 rounded">
            <Activity size={10} className="text-cyan-700" />
            Mode: {operatingMode.replace(/_/g, ' ')}
          </span>
          <span className="flex items-center gap-1 font-bold text-sky-800 bg-sky-100/70 border border-sky-300 px-2 py-0.5 rounded">
            <Route size={10} className="text-sky-700" />
            PC ↔ Robot Trace: {distPcToRobotKm !== null ? `${(distPcToRobotKm * 1000).toFixed(0)}m (${compassPcToRobot})` : 'Awaiting Robot Fix'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPersonDetectedAtRobot ? (
            <button
              onClick={() => onShowVictimManifest?.()}
              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded transition-all cursor-pointer shadow-xs active:scale-95 animate-pulse"
              title="Person detected at robot location! Click to open Victim Manifest"
            >
              <AlertTriangle size={11} />
              <span>Person Detected! Open Manifest</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-500">
              {currentRobotLoc ? 'Live Coordinate Sync Active' : 'Centered on PC Station'}
            </span>
          )}
        </div>
      </div>

      {/* ─── Main Scrollable History & Trace Content ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0">
        
        {/* ─── 3 PRIMARY LOCATION CARDS ────────────────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'pc' || activeTab === 'robot' || activeTab === 'victim') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6DFD5] pb-1.5">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#162347]">
                <MapPin size={14} className="text-rose-600" />
                <span>Active Locations (3 Target Types)</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">Format:</span>
                <div className="flex border border-[#E6DFD5] rounded overflow-hidden text-[9px] font-mono font-bold">
                  <button
                    onClick={() => setCoordFormat('DD')}
                    className={`px-1.5 py-0.5 cursor-pointer ${coordFormat === 'DD' ? 'bg-[#162347] text-white' : 'bg-[#FAF7F2] text-slate-600'}`}
                  >
                    DD
                  </button>
                  <button
                    onClick={() => setCoordFormat('DMS')}
                    className={`px-1.5 py-0.5 cursor-pointer ${coordFormat === 'DMS' ? 'bg-[#162347] text-white' : 'bg-[#FAF7F2] text-slate-600'}`}
                  >
                    DMS
                  </button>
                </div>
              </div>
            </div>

            {/* Grid of the 3 Locations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* ─── LOCATION 1: PC LOCATION ─────────────────────────────────────── */}
              {(activeTab === 'all' || activeTab === 'pc') && (
                <div 
                  className={`bg-white border rounded-xl p-3.5 shadow-xs transition-all relative flex flex-col justify-between ${
                    activeTab === 'pc' ? 'ring-2 ring-sky-500 border-sky-400' : 'border-[#E6DFD5] hover:border-sky-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                          1
                        </span>
                        <span className="text-xs font-bold text-[#162347] flex items-center gap-1">
                          <Laptop size={13} className="text-sky-600" />
                          <span>PC Location</span>
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        GROUND CONTROL
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 mb-2">
                      Operator Command Terminal • Live Telemetry Link
                    </p>

                    <div className="font-mono text-xs font-bold text-[#162347] bg-[#FAF7F2] border border-[#E6DFD5] p-2 rounded mb-2 flex items-center justify-between">
                      <span className="truncate">{formatCoord(pcLoc)}</span>
                      <button
                        onClick={() => handleCopyGps(pcLoc, 'pc')}
                        className="text-slate-400 hover:text-sky-700 cursor-pointer p-0.5 shrink-0 ml-1"
                        title="Copy PC Coordinates"
                      >
                        {copiedKey === 'pc' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>

                    <div className="space-y-1 text-[10px] font-mono text-slate-600 bg-sky-50/50 p-2 rounded border border-sky-100">
                      <div className="flex justify-between">
                        <span>Vector to Robot:</span>
                        <strong className="text-sky-900">
                          {distPcToRobotKm !== null && bearingPcToRobot !== null
                            ? `${(distPcToRobotKm * 1000).toFixed(0)}m @ ${bearingPcToRobot}° (${compassPcToRobot})`
                            : 'Awaiting Robot Fix'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Radio Telemetry:</span>
                        <strong className="text-emerald-700">{signalDbm} dBm (Active)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Station Datum:</span>
                        <span className="text-slate-600 font-bold">WGS 84 • GNSS Datum</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#E6DFD5] flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Target Type 1 of 3</span>
                    <button
                      onClick={() => onSelectLocation?.(pcLoc)}
                      className="text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Center PC Station on Tactical Map"
                    >
                      <span>Track PC on Map</span>
                      <Maximize2 size={11} />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── LOCATION 2: ROBOT LOCATION ──────────────────────────────────── */}
              {(activeTab === 'all' || activeTab === 'robot') && (
                <div 
                  className={`border rounded-xl p-3.5 shadow-xs transition-all relative flex flex-col justify-between ${
                    isPersonDetectedAtRobot
                      ? 'bg-rose-50/90 border-2 border-rose-500 shadow-rose-500/20 ring-2 ring-rose-400 cursor-pointer'
                      : activeTab === 'robot'
                      ? 'bg-white ring-2 ring-cyan-500 border-cyan-400'
                      : 'bg-white border-[#E6DFD5] hover:border-cyan-400'
                  }`}
                  onClick={() => {
                    if (isPersonDetectedAtRobot && onShowVictimManifest) {
                      onShowVictimManifest();
                    }
                  }}
                  title={isPersonDetectedAtRobot ? "Click to view Victim Manifest" : currentRobotLoc ? "Click to view Robot details" : "Robot GPS Offline"}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isPersonDetectedAtRobot ? 'bg-rose-600 text-white animate-pulse' : currentRobotLoc ? 'bg-cyan-700 text-white' : 'bg-slate-400 text-white'
                        }`}>
                          2
                        </span>
                        <span className={`text-xs font-bold flex items-center gap-1 ${
                          isPersonDetectedAtRobot ? 'text-rose-950 font-extrabold' : 'text-[#162347]'
                        }`}>
                          <Navigation size={13} className={isPersonDetectedAtRobot ? 'text-rose-600 animate-spin' : currentRobotLoc ? 'text-cyan-700' : 'text-slate-400'} />
                          <span>Robot Location</span>
                        </span>
                      </div>

                      {isPersonDetectedAtRobot ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white border border-rose-700 animate-pulse flex items-center gap-1">
                          <AlertTriangle size={9} />
                          PERSON DETECTED!
                        </span>
                      ) : currentRobotLoc ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-300">
                          LIVE VESSEL
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
                          NO SIGNAL
                        </span>
                      )}
                    </div>

                    <p className={`text-[10px] mb-2 ${isPersonDetectedAtRobot ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>
                      {isPersonDetectedAtRobot
                        ? '🚨 Target detected at vessel position! Click to open Victim Manifest.'
                        : currentRobotLoc
                        ? 'FloodScout-01 Autonomous Vessel • Real-Time Stream'
                        : 'Awaiting Hardware GNSS Fix (GY-NEO8M on ESP32)'}
                    </p>

                    <div className={`font-mono text-xs font-bold p-2 rounded mb-2 flex items-center justify-between ${
                      isPersonDetectedAtRobot
                        ? 'bg-white border-2 border-rose-400 text-rose-950'
                        : 'bg-[#FAF7F2] border border-[#E6DFD5] text-[#162347]'
                    }`}>
                      {currentRobotLoc ? (
                        <>
                          <span className="truncate">{formatCoord(currentRobotLoc)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyGps(currentRobotLoc, 'robot');
                            }}
                            className={`cursor-pointer p-0.5 shrink-0 ml-1 ${
                              isPersonDetectedAtRobot ? 'text-rose-600 hover:text-rose-800' : 'text-slate-400 hover:text-cyan-700'
                            }`}
                            title="Copy Robot Coordinates"
                          >
                            {copiedKey === 'robot' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 italic font-normal text-[11px]">
                          No Location Detected (Awaiting Fix)
                        </span>
                      )}
                    </div>

                    <div className={`space-y-1 text-[10px] font-mono p-2 rounded border ${
                      isPersonDetectedAtRobot
                        ? 'bg-rose-100/60 border-rose-200 text-rose-900'
                        : 'bg-cyan-50/50 border-cyan-100 text-slate-600'
                    }`}>
                      <div className="flex justify-between">
                        <span>Speed / Heading:</span>
                        <strong className={isPersonDetectedAtRobot ? 'text-rose-950' : 'text-[#162347]'}>
                          {currentRobotLoc ? `${robotSpeed} km/h • ${robotHeading}°` : '0.0 km/h • 0°'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Water Depth / Bat:</span>
                        <strong className={isPersonDetectedAtRobot ? 'text-rose-950' : 'text-[#162347]'}>
                          {waterDepth}m • {batteryLevel}%
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Dist. from PC Station:</span>
                        <strong className={isPersonDetectedAtRobot ? 'text-rose-950' : 'text-cyan-900'}>
                          {distPcToRobotKm !== null ? `${(distPcToRobotKm * 1000).toFixed(0)}m` : 'N/A'}
                        </strong>
                      </div>
                      <div className={`flex justify-between items-center pt-1 border-t ${
                        isPersonDetectedAtRobot ? 'border-rose-200' : 'border-cyan-100'
                      }`}>
                        <span className="flex items-center gap-1">
                          <Satellite size={10} className={hardwareGps?.isValid ? "text-emerald-600 animate-pulse" : "text-amber-500"} />
                          <span>NEO-8M GNSS:</span>
                        </span>
                        <strong className={
                          hardwareGps?.isValid
                            ? 'text-emerald-700 font-bold'
                            : isPersonDetectedAtRobot
                            ? 'text-rose-950'
                            : 'text-slate-500'
                        }>
                          {hardwareGps?.isValid
                            ? `${hardwareGps.satellites} Sats • Alt ${hardwareGps.altitude.toFixed(1)}m (${hardwareGps.port || 'COM5'})`
                            : (hardwareGps?.connected ? 'Locking GNSS Satellites...' : 'Searching GNSS Ports...')}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#E6DFD5] flex items-center justify-between text-[10px] font-mono">
                    {isPersonDetectedAtRobot ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowVictimManifest?.();
                        }}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2 rounded flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet size={12} />
                        <span>View Victim Manifest</span>
                      </button>
                    ) : (
                      <>
                        <span className="text-slate-400">Target Type 2 of 3</span>
                        {currentRobotLoc ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLocation?.(currentRobotLoc);
                            }}
                            className="text-cyan-700 hover:text-cyan-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Center Robot on Tactical Map"
                          >
                            <span>Track Robot on Map</span>
                            <Maximize2 size={11} />
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No Target on Map</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ─── LOCATION 3: VICTIM LOCATION ─────────────────────────────────── */}
              {(activeTab === 'all' || activeTab === 'victim') && (
                <div 
                  className={`bg-white border rounded-xl p-3.5 shadow-xs transition-all relative flex flex-col justify-between ${
                    victimTarget
                      ? 'border-rose-300 hover:border-rose-500'
                      : 'border-[#E6DFD5] hover:border-slate-400'
                  } ${activeTab === 'victim' ? 'ring-2 ring-rose-500' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          victimTarget ? 'bg-rose-600 text-white' : 'bg-slate-400 text-white'
                        }`}>
                          3
                        </span>
                        <span className="text-xs font-bold text-rose-950 flex items-center gap-1">
                          <User size={13} className={victimTarget ? "text-rose-600" : "text-slate-400"} />
                          <span>Victim Location</span>
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        victimTarget ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {victimTarget ? `${victimTarget.allVictimsCount} TARGET(S)` : '0 TARGETS DETECTED'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 mb-2 truncate">
                      {victimTarget ? `${victimTarget.label} • ${victimTarget.source}` : 'AI Thermal & Visual Human Silhouette Scanner'}
                    </p>

                    <div className="font-mono text-xs font-bold text-rose-950 bg-[#FAF7F2] border border-rose-200 p-2 rounded mb-2 flex items-center justify-between">
                      {displayVictimLoc ? (
                        <>
                          <span className="truncate">{formatCoord(displayVictimLoc)}</span>
                          <button
                            onClick={() => handleCopyGps(displayVictimLoc, 'victim')}
                            className="text-slate-400 hover:text-rose-700 cursor-pointer p-0.5 shrink-0 ml-1"
                            title="Copy Victim Coordinates"
                          >
                            {copiedKey === 'victim' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 italic font-normal text-[11px]">
                          No Targets Detected
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-[10px] font-mono text-slate-600 bg-rose-50/50 p-2 rounded border border-rose-100">
                      <div className="flex justify-between">
                        <span>Distance from Robot:</span>
                        <strong className="text-rose-700">
                          {distRobotToVictimKm !== null
                            ? `${(distRobotToVictimKm * 1000).toFixed(0)}m (${compassRobotToVictim}, ETA ~${etaRobotToVictimSeconds}s)`
                            : 'N/A'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Distance from PC Station:</span>
                        <strong className="text-slate-800">
                          {distPcToVictimKm !== null ? `${(distPcToVictimKm * 1000).toFixed(0)}m` : 'N/A'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Detection Confidence:</span>
                        <strong className={victimTarget ? "text-emerald-700" : "text-slate-500"}>
                          {victimTarget ? `${victimTarget.confidence.toFixed(1)}%` : 'Standby (No Detection)'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#E6DFD5] flex items-center justify-between text-[10px] font-mono">
                    <button
                      onClick={() => onShowVictimManifest?.()}
                      className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer"
                      title="Inspect recorded entries in Victim Manifest"
                    >
                      <Target size={11} />
                      <span>Manifest</span>
                    </button>
                    {displayVictimLoc ? (
                      <button
                        onClick={() => {
                          onSelectLocation?.(displayVictimLoc);
                          if (victimTarget?.incident && onInspectIncident) {
                            onInspectIncident(victimTarget.incident, victimTarget.personId);
                          }
                        }}
                        className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Center Victim on Tactical Map"
                      >
                        <span>Track on Map</span>
                        <Maximize2 size={11} />
                      </button>
                    ) : (
                      <span className="text-slate-400 italic">No Target on Map</span>
                    )}
                  </div>
                </div>
              )}

            </div>
          </section>
        )}

        {/* ─── PC & ROBOT TRACE ANALYSIS ────────────────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'trace') && (
          <section className="bg-white border border-[#E6DFD5] rounded-xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6DFD5] pb-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#162347]">
                <Route size={14} className="text-cyan-700" />
                <span>PC Location ↔ Robot Location Trace Analysis</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                REAL-TIME TELEMETRY TRACE
              </span>
            </div>

            {/* Trace Telemetry KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded-lg">
                <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500 mb-1">
                  Line of Sight Trace
                </div>
                <div className="font-editorial-serif font-bold text-xl text-[#162347]">
                  {distPcToRobotKm !== null ? (distPcToRobotKm * 1000).toFixed(0) : '--'} <span className="text-xs font-mono font-normal">m</span>
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-1">
                  Haversine Direct Vector
                </div>
              </div>

              <div className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded-lg">
                <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500 mb-1">
                  Azimuth Bearing
                </div>
                <div className="font-editorial-serif font-bold text-xl text-sky-800">
                  {bearingPcToRobot !== null ? `${bearingPcToRobot}° ` : '-- '}
                  <span className="text-xs font-mono font-normal font-bold">({compassPcToRobot})</span>
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-1">
                  Relative to PC Station
                </div>
              </div>

              <div className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded-lg">
                <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500 mb-1">
                  Total Travelled Trail
                </div>
                <div className="font-editorial-serif font-bold text-xl text-cyan-800">
                  {activeMission.distanceTravelledKm.toFixed(2)} <span className="text-xs font-mono font-normal">km</span>
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-1">
                  {trajectory.length} Trajectory Breadcrumbs
                </div>
              </div>

              <div className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded-lg">
                <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500 mb-1">
                  RF Uplink Quality
                </div>
                <div className="font-editorial-serif font-bold text-xl text-emerald-800">
                  {signalDbm} <span className="text-xs font-mono font-normal">dBm</span>
                </div>
                <div className="text-[9px] font-mono text-emerald-700 mt-1">
                  ~18ms Telemetry Ping
                </div>
              </div>
            </div>

            {/* ─── GOOGLE MAP MISSION TRACE & TRAJECTORY VIEWER ──────────────────── */}
            <div className="bg-[#FAF7F2] border border-[#E6DFD5] rounded-xl overflow-hidden shadow-xs flex flex-col space-y-0">
              {/* Map Header with Tile Layer Selector & Reset Zoom */}
              <div className="bg-white px-3 py-2 border-b border-[#E6DFD5] flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#162347]">
                  <Globe size={13} className="text-sky-600" />
                  <span className="uppercase tracking-wider">Google Maps Mission Trajectory Trace</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Layer Switcher */}
                  <div className="flex border border-[#E6DFD5] rounded overflow-hidden text-[9px] font-mono font-bold">
                    <button
                      onClick={() => setHistoryMapLayer('google')}
                      className={`px-2 py-0.5 transition-colors cursor-pointer ${
                        historyMapLayer === 'google' ? 'bg-[#162347] text-white' : 'bg-[#FAF7F2] text-slate-600 hover:bg-[#E6DFD5]'
                      }`}
                    >
                      Google Street
                    </button>
                    <button
                      onClick={() => setHistoryMapLayer('google-hybrid')}
                      className={`px-2 py-0.5 transition-colors cursor-pointer ${
                        historyMapLayer === 'google-hybrid' ? 'bg-[#162347] text-white' : 'bg-[#FAF7F2] text-slate-600 hover:bg-[#E6DFD5]'
                      }`}
                    >
                      Google Hybrid
                    </button>
                  </div>

                  {/* Fit Trace Bounds */}
                  <button
                    onClick={() => setFitCounter(c => c + 1)}
                    className="flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                    title="Fit view to entire trajectory path"
                  >
                    <Maximize2 size={10} /> Fit Trace
                  </button>
                </div>
              </div>

              {/* Leaflet MapContainer with Google Tiles */}
              <div className="h-72 w-full relative z-0 isolate">
                <MapContainer
                  center={currentRobotLoc || pcLoc}
                  zoom={16}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                >
                  <HistoryMapController points={mapPoints} fitTrigger={fitCounter} />

                  {historyMapLayer === 'google' && (
                    <TileLayer
                      attribution='&copy; Google Maps'
                      url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                      subdomains={['0', '1', '2', '3']}
                      maxZoom={20}
                      minZoom={5}
                    />
                  )}

                  {historyMapLayer === 'google-hybrid' && (
                    <TileLayer
                      attribution='&copy; Google Maps'
                      url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                      subdomains={['0', '1', '2', '3']}
                      maxZoom={20}
                      minZoom={5}
                    />
                  )}

                  {/* Real-time Line-of-Sight Vector: PC Station ↔ Robot */}
                  {currentRobotLoc && (
                    <Polyline
                      positions={[pcLoc, currentRobotLoc]}
                      pathOptions={{
                        color: isPersonDetectedAtRobot ? '#EF4444' : '#0284C7',
                        weight: 2.5,
                        dashArray: '6 6',
                        opacity: 0.85,
                      }}
                    />
                  )}

                  {/* Robot Trajectory Trace (Full Historical Path) */}
                  {trajectory && trajectory.length > 1 && (
                    <Polyline
                      positions={trajectory}
                      pathOptions={{
                        color: '#06B6D4',
                        weight: 4,
                        opacity: 0.9,
                      }}
                    />
                  )}

                  {/* Waypoint Breadcrumbs along the Trace */}
                  {trajectory && trajectory.length > 0 && trajectory.map((pt, idx) => {
                    const step = Math.max(1, Math.floor(trajectory.length / 8));
                    if (idx % step !== 0 && idx !== trajectory.length - 1) return null;
                    return (
                      <Marker key={`wp-${idx}`} position={pt} icon={createWaypointMapIcon(idx + 1)}>
                        <Popup>
                          <div className="font-mono text-xs">
                            <strong>Trace Point #{idx + 1}</strong>
                            <div>GPS: {pt[0].toFixed(6)}°, {pt[1].toFixed(6)}°</div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {/* PC Ground Control Marker */}
                  <Marker position={pcLoc} icon={pcMapIcon}>
                    <Popup>
                      <div className="font-mono text-xs space-y-1">
                        <strong className="text-sky-700">💻 PC Ground Control Station</strong>
                        <div>GPS: {pcLoc[0].toFixed(6)}°, {pcLoc[1].toFixed(6)}°</div>
                        <div className="text-[10px] text-slate-500">Operator Command Baseline</div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Robot Vessel Marker */}
                  {currentRobotLoc && (
                    <Marker position={currentRobotLoc} icon={getRobotHistoryIcon(isPersonDetectedAtRobot)}>
                      <Popup>
                        <div className="font-mono text-xs space-y-1">
                          <strong className={isPersonDetectedAtRobot ? 'text-rose-600' : 'text-cyan-700'}>
                            {isPersonDetectedAtRobot ? '🚨 Person Detected at Robot!' : '🤖 FloodScout-01 Vessel'}
                          </strong>
                          <div>GPS: {currentRobotLoc[0].toFixed(6)}°, {currentRobotLoc[1].toFixed(6)}°</div>
                          <div>Speed: {robotSpeed} km/h • Heading: {robotHeading}°</div>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Victim Target Marker */}
                  {displayVictimLoc && (
                    <Marker position={displayVictimLoc} icon={victimHistoryIcon}>
                      <Popup>
                        <div className="font-mono text-xs space-y-1">
                          <strong className="text-rose-600">👤 {victimTarget?.label || 'Victim Target'}</strong>
                          <div>GPS: {displayVictimLoc[0].toFixed(6)}°, {displayVictimLoc[1].toFixed(6)}°</div>
                          {victimTarget && <div>Confidence: {victimTarget.confidence.toFixed(1)}%</div>}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              {/* Sub-bar below map */}
              <div className="bg-white px-3 py-1.5 border-t border-[#E6DFD5] flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-[#06B6D4] rounded-full inline-block" />
                  Cyan Line = Historical Robot Trajectory Trace ({trajectory.length} waypoints)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-[#0284C7] border-t border-dashed border-[#0284C7] inline-block" />
                  Dashed Blue = Line of Sight to PC Ground Station
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ─── CHRONOLOGICAL TRACE BREADCRUMB LOG ───────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'history') && (
          <section className="bg-white border border-[#E6DFD5] rounded-xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6DFD5] pb-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#162347]">
                <Milestone size={14} className="text-[#162347]" />
                <span>PC &amp; Robot Trace Breadcrumb Log</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {traceLogItems.length} Recorded Waypoint Records
              </span>
            </div>

            {/* Trace Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#E6DFD5] text-[9px] uppercase tracking-wider text-slate-500">
                    <th className="pb-1.5 pl-1">Trace ID</th>
                    <th className="pb-1.5">Node / Event</th>
                    <th className="pb-1.5">GPS Coordinates</th>
                    <th className="pb-1.5 text-right">Dist. from PC</th>
                    <th className="pb-1.5 text-right">Bearing</th>
                    <th className="pb-1.5 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD5]/60 text-[11px]">
                  {traceLogItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-[#FAF7F2] transition-colors group cursor-pointer ${
                        item.isAlert ? 'bg-rose-50/50' : ''
                      }`}
                      onClick={() => onSelectLocation?.(item.coords)}
                    >
                      <td className="py-2 pl-1 font-bold text-slate-500 text-[10px]">
                        {item.id}
                      </td>
                      <td className="py-2">
                        <div className="font-bold text-[#162347] flex items-center gap-1.5">
                          {item.type === 'pc' && <Laptop size={12} className="text-sky-600" />}
                          {item.type === 'robot' && (
                            <Navigation size={12} className={item.isAlert ? 'text-rose-600' : 'text-cyan-700'} />
                          )}
                          {item.type === 'victim' && <User size={12} className="text-rose-600" />}
                          {item.type === 'trace' && <MapPin size={12} className="text-slate-400" />}
                          <span>{item.title}</span>
                          <span className={`text-[8px] font-mono px-1 py-0.2 rounded border ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {item.sub}
                        </div>
                      </td>
                      <td className="py-2 text-[10px] text-slate-700">
                        {item.coords[0].toFixed(5)}°, {item.coords[1].toFixed(5)}°
                      </td>
                      <td className="py-2 text-right text-[10px] font-bold text-[#162347]">
                        {item.distFromPcM}m
                      </td>
                      <td className="py-2 text-right text-[10px] text-slate-600">
                        {item.bearingFromPc}° ({bearingToCompass(item.bearingFromPc)})
                      </td>
                      <td className="py-2 text-right pr-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLocation?.(item.coords);
                            if (item.type === 'robot' && isPersonDetectedAtRobot && onShowVictimManifest) {
                              onShowVictimManifest();
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-[#162347] text-slate-700 hover:text-white text-[9px] font-bold transition-all shadow-2xs"
                          title="Center Map on this Waypoint"
                        >
                          Locate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

// Named alias export for convenience
export const LocationHistory = RescueLocationAnalysis;
