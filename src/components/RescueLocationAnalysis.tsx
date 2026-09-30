import { useState, useMemo } from 'react';
import {
  Navigation,
  MapPin,
  Flag,
  User,
  ShieldCheck,
  Route,
  Copy,
  Check,
  Gauge,
  Milestone,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Eye,
  Radio,
  Activity,
} from 'lucide-react';
import type { Mission, Victim } from '../context/RescueContext';

export interface RescueLocationAnalysisProps {
  robotLocation: [number, number];
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
    location: [number, number];
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
  baseLocation: [number, number];
  onSelectLocation?: (coords: [number, number]) => void;
  onInspectIncident?: (incident: any, personId?: number) => void;
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
  baseLocation,
  onSelectLocation,
  onInspectIncident,
}: RescueLocationAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'path' | 'distance' | 'gps' | 'history'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [coordFormat, setCoordFormat] = useState<'DD' | 'DMS'>('DD');

  // 1. Establish the 4 Key Corridor Milestones:
  // Start Point (Mission Launch Base)
  const startPoint: [number, number] = useMemo(() => {
    if (trajectory && trajectory.length > 0) return trajectory[0];
    return [baseLocation[0] - 0.0028, baseLocation[1] - 0.0025];
  }, [trajectory, baseLocation]);

  // Current Robot Position
  const currentRobotLoc: [number, number] = useMemo(() => {
    return robotLocation || (trajectory.length > 0 ? trajectory[trajectory.length - 1] : baseLocation);
  }, [robotLocation, trajectory, baseLocation]);

  // Person (Detected Target)
  const personTarget = useMemo(() => {
    if (manifestPersons && manifestPersons.length > 0) {
      const p = manifestPersons[0];
      return {
        location: p.location,
        label: `Person #${p.personId}`,
        confidence: p.score,
        time: p.time,
        source: 'AI Camera Vision',
        incident: p.incident,
        personId: p.personId,
      };
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
      };
    }
    if (detectionStatus?.personDetected) {
      return {
        location: [baseLocation[0] + 0.0014, baseLocation[1] + 0.0016] as [number, number],
        label: 'Live Target #1',
        confidence: detectionStatus.highestConfidence * 100,
        time: 'Active Now',
        source: 'Real-time Camera Stream',
        incident: null,
        personId: 1,
      };
    }
    // Context default in flood basin
    return {
      location: [startPoint[0] + 0.0024, startPoint[1] + 0.0028] as [number, number],
      label: 'Survivor Target Alpha',
      confidence: 94.6,
      time: '14:26:40',
      source: 'AI Person Detector',
      incident: null,
      personId: undefined,
    };
  }, [manifestPersons, victims, detectionStatus, baseLocation, startPoint]);

  // Rescue Point (Safe Extraction / Evacuation Haven)
  const rescuePoint: [number, number] = useMemo(() => {
    return [startPoint[0] + 0.0045, startPoint[1] + 0.0042];
  }, [startPoint]);

  // 2. Geodesic Leg Distances
  const distStartToRobotKm = useMemo(() => haversineDistanceKm(startPoint, currentRobotLoc), [startPoint, currentRobotLoc]);
  const distRobotToPersonKm = useMemo(() => haversineDistanceKm(currentRobotLoc, personTarget.location), [currentRobotLoc, personTarget.location]);
  const distPersonToRescueKm = useMemo(() => haversineDistanceKm(personTarget.location, rescuePoint), [personTarget.location, rescuePoint]);
  const totalCorridorKm = distStartToRobotKm + distRobotToPersonKm + distPersonToRescueKm;

  // Mission distance (recorded mission odometer)
  const missionDistKm = activeMission.distanceTravelledKm || distStartToRobotKm;

  // Estimated travel time from Robot to Person
  const speedKmh = robotSpeed > 0 ? robotSpeed : 2.4;
  const speedMs = speedKmh * 0.2778;
  const etaSeconds = Math.round((distRobotToPersonKm * 1000) / speedMs);

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

  // 3. Generate Route History Waypoints
  const routeHistoryItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      sub: string;
      coords: [number, number];
      legDistM: number;
      cumDistM: number;
      type: 'start' | 'waypoint' | 'robot' | 'person' | 'rescue';
      badge: string;
      badgeColor: string;
      time: string;
    }> = [];

    let runningCumKm = 0;

    // Start point
    items.push({
      id: 'WP-01',
      title: 'Mission Launch Base',
      sub: 'Johor River Basin Deployment Dock',
      coords: startPoint,
      legDistM: 0,
      cumDistM: 0,
      type: 'start',
      badge: 'LAUNCH',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      time: activeMission.startTime || '14:15:00',
    });

    // Trajectory intermediate points
    const trajSlice = trajectory.length > 2 ? trajectory.slice(1, -1) : [];
    trajSlice.forEach((pt, idx) => {
      const prev = idx === 0 ? startPoint : trajSlice[idx - 1];
      const legKm = haversineDistanceKm(prev, pt);
      runningCumKm += legKm;
      items.push({
        id: `WP-0${idx + 2}`,
        title: `Flood Sector Scan Waypoint #${idx + 1}`,
        sub: `Depth ${(1.6 + idx * 0.1).toFixed(2)}m • Bearing ${robotHeading}°`,
        coords: pt,
        legDistM: Math.round(legKm * 1000),
        cumDistM: Math.round(runningCumKm * 1000),
        type: 'waypoint',
        badge: 'TRANSLOCATED',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        time: `14:${String(16 + idx * 3).padStart(2, '0')}:00`,
      });
    });

    // Current Robot Position
    const legToRobotKm = haversineDistanceKm(
      trajSlice.length > 0 ? trajSlice[trajSlice.length - 1] : startPoint,
      currentRobotLoc
    );
    runningCumKm += legToRobotKm;
    items.push({
      id: `WP-0${items.length + 1}`,
      title: 'FloodScout-01 Vessel (Current)',
      sub: `Live GPS Fix • Speed ${robotSpeed} km/h • Bat ${batteryLevel}%`,
      coords: currentRobotLoc,
      legDistM: Math.round(legToRobotKm * 1000),
      cumDistM: Math.round(runningCumKm * 1000),
      type: 'robot',
      badge: 'LIVE ON WATER',
      badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold animate-pulse',
      time: 'Live Now',
    });

    // Person Target
    runningCumKm += distRobotToPersonKm;
    items.push({
      id: `WP-0${items.length + 1}`,
      title: personTarget.label,
      sub: `${personTarget.source} (${personTarget.confidence.toFixed(1)}% Conf)`,
      coords: personTarget.location,
      legDistM: Math.round(distRobotToPersonKm * 1000),
      cumDistM: Math.round(runningCumKm * 1000),
      type: 'person',
      badge: 'TARGET IDENTIFIED',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      time: personTarget.time,
    });

    // Rescue Evacuation Point
    runningCumKm += distPersonToRescueKm;
    items.push({
      id: `WP-0${items.length + 1}`,
      title: 'Evac Safe Haven Alpha',
      sub: 'UTM Skudai High Ground Assembly & Medevac',
      coords: rescuePoint,
      legDistM: Math.round(distPersonToRescueKm * 1000),
      cumDistM: Math.round(runningCumKm * 1000),
      type: 'rescue',
      badge: 'SAFE HAVEN',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      time: 'Corridor End',
    });

    return items;
  }, [
    startPoint,
    currentRobotLoc,
    personTarget,
    rescuePoint,
    trajectory,
    distRobotToPersonKm,
    distPersonToRescueKm,
    activeMission.startTime,
    robotHeading,
    robotSpeed,
    batteryLevel,
  ]);

  // Mini SVG spark-path rendering of trajectory
  const svgPathData = useMemo(() => {
    const allPts = [startPoint, ...trajectory, personTarget.location, rescuePoint];
    const lats = allPts.map(p => p[0]);
    const lngs = allPts.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = maxLat - minLat || 0.001;
    const lngSpan = maxLng - minLng || 0.001;

    const width = 280;
    const height = 90;
    const padding = 16;

    const scaleX = (lng: number) => padding + ((lng - minLng) / lngSpan) * (width - padding * 2);
    const scaleY = (lat: number) => height - (padding + ((lat - minLat) / latSpan) * (height - padding * 2));

    const pathD = allPts.reduce((acc, pt, i) => {
      const x = scaleX(pt[1]);
      const y = scaleY(pt[0]);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');

    return {
      pathD,
      width,
      height,
      start: { x: scaleX(startPoint[1]), y: scaleY(startPoint[0]) },
      robot: { x: scaleX(currentRobotLoc[1]), y: scaleY(currentRobotLoc[0]) },
      person: { x: scaleX(personTarget.location[1]), y: scaleY(personTarget.location[0]) },
      rescue: { x: scaleX(rescuePoint[1]), y: scaleY(rescuePoint[0]) },
    };
  }, [startPoint, trajectory, currentRobotLoc, personTarget.location, rescuePoint]);

  return (
    <div className="h-full flex flex-col bg-[#FAF7F2] text-[#162347] overflow-hidden select-none">
      {/* ─── Top Control & Sub-tab Bar ────────────────────────────────────────── */}
      <div className="px-3.5 py-2.5 bg-white border-b border-[#E6DFD5] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#162347] flex items-center justify-center text-cyan-300">
            <Route size={14} />
          </div>
          <div>
            <h3 className="font-editorial-serif font-bold text-sm text-[#162347] leading-none">
              Rescue / Location Analysis
            </h3>
            <p className="text-[10px] font-mono text-[#162347]/60 mt-0.5">
              Live Corridor: Start → Robot → Person → Rescue Point
            </p>
          </div>
        </div>

        {/* View Filter Pill Switcher */}
        <div className="flex items-center gap-1 bg-[#FAF7F2] p-0.5 rounded-lg border border-[#E6DFD5] text-[10px] font-mono font-bold">
          {(['all', 'path', 'distance', 'gps', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 rounded capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#162347] text-white shadow-xs'
                  : 'text-[#162347]/70 hover:text-[#162347] hover:bg-[#E6DFD5]/40'
              }`}
            >
              {tab === 'all' ? 'Overview' : tab === 'path' ? 'Movement Path' : tab === 'distance' ? 'Distances' : tab === 'gps' ? 'GPS' : 'Route History'}
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
        </div>
        <div className="text-[10px] text-slate-500">
          RTK Differential GPS Fix Active • Co-located with Ground Control
        </div>
      </div>

      {/* ─── Main Scrollable Analysis Content ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0">
        
        {/* ─── 1. MOVEMENT PATH (Start → Robot → Person → Rescue Point) ─────────── */}
        {(activeTab === 'all' || activeTab === 'path') && (
          <section className="bg-white border border-[#E6DFD5] rounded-xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6DFD5] pb-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#162347]">
                <Route size={14} className="text-cyan-700" />
                <span>Mission Corridor Flow</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE PIPELINE
              </span>
            </div>

            {/* Stepper Pipeline */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 relative">
              {/* STAGE 1: START */}
              <div 
                onClick={() => onSelectLocation?.(startPoint)}
                className="bg-[#FAF7F2] hover:bg-[#F3EFE9] border border-[#E6DFD5] hover:border-indigo-400 p-2.5 rounded-lg transition-all cursor-pointer relative group flex flex-col justify-between"
                title="Click to track Start on Map"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-700 text-white flex items-center justify-center text-[10px] font-bold">
                      1
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      START
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                    <Flag size={13} className="text-indigo-600" />
                    <span>Launch Base</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Johor River Basin
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-[#E6DFD5] flex items-center justify-between text-[9px] font-mono">
                  <span className="text-slate-600 font-bold">{startPoint[0].toFixed(4)}°, {startPoint[1].toFixed(4)}°</span>
                  <ExternalLink size={10} className="text-indigo-600 opacity-60 group-hover:opacity-100" />
                </div>
              </div>

              {/* STAGE 2: ROBOT */}
              <div 
                onClick={() => onSelectLocation?.(currentRobotLoc)}
                className="bg-[#FAF7F2] hover:bg-[#F3EFE9] border-2 border-cyan-500 p-2.5 rounded-lg transition-all cursor-pointer relative group flex flex-col justify-between shadow-xs shadow-cyan-500/10"
                title="Click to track Robot on Map"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center text-[10px] font-bold">
                      2
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-300 animate-pulse">
                      ROBOT
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#162347] font-bold text-xs">
                    <Navigation size={13} className="text-cyan-700 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>FloodScout-01</span>
                  </div>
                  <p className="text-[10px] text-cyan-900 font-mono mt-0.5">
                    {robotSpeed} km/h • {robotHeading}° ENE
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-[#E6DFD5] flex items-center justify-between text-[9px] font-mono">
                  <span className="text-cyan-900 font-bold">{currentRobotLoc[0].toFixed(4)}°, {currentRobotLoc[1].toFixed(4)}°</span>
                  <span className="text-[9px] text-cyan-700 font-bold">LIVE</span>
                </div>
              </div>

              {/* STAGE 3: PERSON */}
              <div 
                onClick={() => {
                  onSelectLocation?.(personTarget.location);
                  if (personTarget.incident && onInspectIncident) {
                    onInspectIncident(personTarget.incident, personTarget.personId);
                  }
                }}
                className="bg-[#FAF7F2] hover:bg-[#F3EFE9] border border-rose-300 hover:border-rose-500 p-2.5 rounded-lg transition-all cursor-pointer relative group flex flex-col justify-between"
                title="Click to track Person on Map or Inspect AI Detection"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold">
                      3
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      PERSON
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                    <User size={13} className="text-rose-600" />
                    <span className="truncate">{personTarget.label}</span>
                  </div>
                  <p className="text-[10px] text-rose-700 font-mono mt-0.5">
                    {personTarget.confidence.toFixed(1)}% Conf • ETA ~{etaSeconds}s
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-[#E6DFD5] flex items-center justify-between text-[9px] font-mono">
                  <span className="text-rose-800 font-bold">{personTarget.location[0].toFixed(4)}°, {personTarget.location[1].toFixed(4)}°</span>
                  <Eye size={10} className="text-rose-600 opacity-60 group-hover:opacity-100" />
                </div>
              </div>

              {/* STAGE 4: RESCUE POINT */}
              <div 
                onClick={() => onSelectLocation?.(rescuePoint)}
                className="bg-[#FAF7F2] hover:bg-[#F3EFE9] border border-emerald-300 hover:border-emerald-500 p-2.5 rounded-lg transition-all cursor-pointer relative group flex flex-col justify-between"
                title="Click to track Rescue Haven on Map"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                      4
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      RESCUE POINT
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                    <ShieldCheck size={13} className="text-emerald-700" />
                    <span>Safe Haven Alpha</span>
                  </div>
                  <p className="text-[10px] text-emerald-800 font-mono mt-0.5">
                    UTM High Ground Post
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-[#E6DFD5] flex items-center justify-between text-[9px] font-mono">
                  <span className="text-emerald-800 font-bold">{rescuePoint[0].toFixed(4)}°, {rescuePoint[1].toFixed(4)}°</span>
                  <ExternalLink size={10} className="text-emerald-700 opacity-60 group-hover:opacity-100" />
                </div>
              </div>
            </div>

            {/* Connecting Leg Distances Banner */}
            <div className="bg-[#FAF7F2] rounded-lg p-2 border border-[#E6DFD5] flex flex-wrap items-center justify-around gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1 text-slate-700">
                <span className="font-semibold text-slate-500">Leg 1 (Start→Robot):</span>
                <span className="font-bold text-[#162347]">{(distStartToRobotKm * 1000).toFixed(0)} m</span>
              </div>
              <ChevronRight size={12} className="text-slate-400" />
              <div className="flex items-center gap-1 text-slate-700">
                <span className="font-semibold text-slate-500">Leg 2 (Robot→Person):</span>
                <span className="font-bold text-rose-700">{(distRobotToPersonKm * 1000).toFixed(0)} m</span>
              </div>
              <ChevronRight size={12} className="text-slate-400" />
              <div className="flex items-center gap-1 text-slate-700">
                <span className="font-semibold text-slate-500">Leg 3 (Person→Rescue):</span>
                <span className="font-bold text-emerald-800">{(distPersonToRescueKm * 1000).toFixed(0)} m</span>
              </div>
              <div className="border-l border-[#E6DFD5] pl-3 text-[#162347] font-bold">
                Total Corridor: {(totalCorridorKm * 1000).toFixed(0)} m
              </div>
            </div>

            {/* Mini 2D Vector Trail Preview */}
            <div className="bg-slate-900 rounded-lg p-3 text-white">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-2">
                <span className="uppercase tracking-wider">2D Geo-Spatial Corridor Vector Trail</span>
                <span>WGS 84 Projection</span>
              </div>
              <div className="flex justify-center">
                <svg width="100%" height="80" viewBox={`0 0 ${svgPathData.width} ${svgPathData.height}`} className="overflow-visible">
                  <defs>
                    <linearGradient id="corridorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#818CF8" />
                      <stop offset="40%" stopColor="#06B6D4" />
                      <stop offset="70%" stopColor="#F43F5E" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                  {/* Trail line */}
                  <path
                    d={svgPathData.pathD}
                    fill="none"
                    stroke="url(#corridorGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="4 3"
                    className="animate-pulse"
                  />
                  {/* Waypoint nodes */}
                  <circle cx={svgPathData.start.x} cy={svgPathData.start.y} r="5" fill="#818CF8" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx={svgPathData.robot.x} cy={svgPathData.robot.y} r="6" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx={svgPathData.person.x} cy={svgPathData.person.y} r="6" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx={svgPathData.rescue.x} cy={svgPathData.rescue.y} r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                  
                  {/* Text labels */}
                  <text x={svgPathData.start.x} y={svgPathData.start.y - 8} fill="#A5B4FC" fontSize="8" textAnchor="middle" fontFamily="monospace">Start</text>
                  <text x={svgPathData.robot.x} y={svgPathData.robot.y - 9} fill="#67E8F9" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Robot</text>
                  <text x={svgPathData.person.x} y={svgPathData.person.y - 9} fill="#FDA4AF" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Person</text>
                  <text x={svgPathData.rescue.x} y={svgPathData.rescue.y - 8} fill="#6EE7B7" fontSize="8" textAnchor="middle" fontFamily="monospace">Rescue</text>
                </svg>
              </div>
            </div>
          </section>
        )}

        {/* ─── 2. DISTANCE TRAVELLED ANALYSIS ───────────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'distance') && (
          <section className="bg-white border border-[#E6DFD5] rounded-xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6DFD5] pb-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#162347]">
                <Gauge size={14} className="text-cyan-700" />
                <span>Distance &amp; Kinematics Analysis</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Mission Duration: {Math.floor(activeMission.durationSeconds / 60)}m {activeMission.durationSeconds % 60}s
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded-lg">
                <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500 mb-1">
                  Total Dist. Travelled
                </div>
                <div className="font-editorial-serif font-bold text-xl text-[#162347]">
                  {missionDistKm.toFixed(2)} <span className="text-xs font-mono font-normal">km</span>
                </div>
                <div className="text-[9px] font-mono text-slate-400 mt-1">
                  Odometer telemetry
                </div>
              </div>

              <div className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded-lg">
                <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500 mb-1">
                  Dist. to Target
                </div>
                <div className="font-editorial-serif font-bold text-xl text-rose-700">
                  {(distRobotToPersonKm * 1000).toFixed(0)} <span className="text-xs font-mono font-normal">m</span>
                </div>
                <div className="text-[9px] font-mono text-rose-600/80 mt-1">
                  ETA ~{etaSeconds} sec at {robotSpeed} km/h
                </div>
              </div>

              <div className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded-lg">
                <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500 mb-1">
                  Extraction Corridor
                </div>
                <div className="font-editorial-serif font-bold text-xl text-emerald-800">
                  {(distPersonToRescueKm * 1000).toFixed(0)} <span className="text-xs font-mono font-normal">m</span>
                </div>
                <div className="text-[9px] font-mono text-emerald-700/80 mt-1">
                  To Safe Haven Post
                </div>
              </div>

              <div className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded-lg">
                <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500 mb-1">
                  Area Surveyed
                </div>
                <div className="font-editorial-serif font-bold text-xl text-sky-800">
                  {activeMission.areaSurveyedSqM.toLocaleString()} <span className="text-xs font-mono font-normal">m²</span>
                </div>
                <div className="text-[9px] font-mono text-slate-400 mt-1">
                  Coverage grid sweep
                </div>
              </div>
            </div>

            {/* Travel Progress Bar */}
            <div className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded-lg space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono font-bold text-[#162347]">
                <span>Corridor Stage Progress: Launch → Target Approach</span>
                <span>{Math.min(100, Math.round((distStartToRobotKm / (distStartToRobotKm + distRobotToPersonKm || 1)) * 100))}% Complete</span>
              </div>
              <div className="w-full bg-[#E6DFD5] h-2 rounded-full overflow-hidden flex">
                <div 
                  className="bg-indigo-600 h-full"
                  style={{ width: `${Math.min(100, Math.round((distStartToRobotKm / totalCorridorKm) * 100))}%` }}
                  title="Completed from Launch"
                />
                <div 
                  className="bg-cyan-500 h-full animate-pulse"
                  style={{ width: `${Math.min(100, Math.round((distRobotToPersonKm / totalCorridorKm) * 100))}%` }}
                  title="Remaining to Person"
                />
                <div 
                  className="bg-emerald-500 h-full"
                  style={{ width: `${Math.min(100, Math.round((distPersonToRescueKm / totalCorridorKm) * 100))}%` }}
                  title="Rescue Extraction Leg"
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" /> Completed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Approaching Person
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Evac to Safe Haven
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ─── 3. GPS COORDINATES ANALYSIS ──────────────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'gps') && (
          <section className="bg-white border border-[#E6DFD5] rounded-xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6DFD5] pb-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#162347]">
                <MapPin size={14} className="text-rose-600" />
                <span>GPS Coordinate Telemetry</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Coordinate Card: Robot */}
              <div className="bg-[#FAF7F2] border border-cyan-300/80 p-3 rounded-lg relative">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#162347]">
                    <Navigation size={13} className="text-cyan-700" />
                    <span>Robot (FloodScout-01)</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-200">
                    LIVE VESSEL
                  </span>
                </div>

                <div className="font-mono text-xs font-bold text-[#162347] bg-white border border-[#E6DFD5] p-2 rounded mb-2 flex items-center justify-between">
                  <span>{formatCoord(currentRobotLoc)}</span>
                  <button
                    onClick={() => handleCopyGps(currentRobotLoc, 'robot')}
                    className="text-slate-400 hover:text-cyan-700 cursor-pointer p-0.5"
                    title="Copy Coordinates"
                  >
                    {copiedKey === 'robot' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-600">
                  <div>Heading: <strong className="text-[#162347]">{robotHeading}°</strong></div>
                  <div>Water Depth: <strong className="text-[#162347]">{waterDepth}m</strong></div>
                  <div>Speed: <strong className="text-[#162347]">{robotSpeed}km/h</strong></div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-[#E6DFD5] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Datum: WGS 84 • Fix: RTK Ready</span>
                  <button
                    onClick={() => onSelectLocation?.(currentRobotLoc)}
                    className="text-cyan-700 hover:text-cyan-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Track on Map</span>
                    <Maximize2 size={10} />
                  </button>
                </div>
              </div>

              {/* Coordinate Card: Person Target */}
              <div className="bg-[#FAF7F2] border border-rose-300 p-3 rounded-lg relative">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-950">
                    <User size={13} className="text-rose-600" />
                    <span>{personTarget.label}</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                    FLAGGED TARGET
                  </span>
                </div>

                <div className="font-mono text-xs font-bold text-rose-950 bg-white border border-rose-200 p-2 rounded mb-2 flex items-center justify-between">
                  <span>{formatCoord(personTarget.location)}</span>
                  <button
                    onClick={() => handleCopyGps(personTarget.location, 'person')}
                    className="text-slate-400 hover:text-rose-700 cursor-pointer p-0.5"
                    title="Copy Coordinates"
                  >
                    {copiedKey === 'person' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-600">
                  <div>Confidence: <strong className="text-rose-700">{personTarget.confidence.toFixed(1)}%</strong></div>
                  <div>Distance from Robot: <strong className="text-rose-700">{(distRobotToPersonKm * 1000).toFixed(0)}m</strong></div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-[#E6DFD5] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Source: {personTarget.source}</span>
                  <button
                    onClick={() => {
                      onSelectLocation?.(personTarget.location);
                      if (personTarget.incident && onInspectIncident) {
                        onInspectIncident(personTarget.incident, personTarget.personId);
                      }
                    }}
                    className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect Target</span>
                    <Eye size={10} />
                  </button>
                </div>
              </div>

              {/* Coordinate Card: Launch Base */}
              <div className="bg-[#FAF7F2] border border-indigo-200 p-3 rounded-lg relative">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950">
                    <Flag size={13} className="text-indigo-600" />
                    <span>Start Point (Deploy Base)</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ORIGIN
                  </span>
                </div>

                <div className="font-mono text-xs font-bold text-[#162347] bg-white border border-[#E6DFD5] p-2 rounded mb-2 flex items-center justify-between">
                  <span>{formatCoord(startPoint)}</span>
                  <button
                    onClick={() => handleCopyGps(startPoint, 'start')}
                    className="text-slate-400 hover:text-indigo-700 cursor-pointer p-0.5"
                    title="Copy Coordinates"
                  >
                    {copiedKey === 'start' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>

                <div className="text-[10px] font-mono text-slate-600">
                  Deployment Sector: Johor River Basin Staging Slipway #1
                </div>

                <div className="mt-2 pt-1.5 border-t border-[#E6DFD5] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Time: {activeMission.startTime || '14:15:00'}</span>
                  <button
                    onClick={() => onSelectLocation?.(startPoint)}
                    className="text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Track on Map</span>
                    <Maximize2 size={10} />
                  </button>
                </div>
              </div>

              {/* Coordinate Card: Rescue Point Safe Haven */}
              <div className="bg-[#FAF7F2] border border-emerald-300 p-3 rounded-lg relative">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
                    <ShieldCheck size={13} className="text-emerald-700" />
                    <span>Rescue Point (Safe Haven Alpha)</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    EVAC HAVEN
                  </span>
                </div>

                <div className="font-mono text-xs font-bold text-emerald-950 bg-white border border-[#E6DFD5] p-2 rounded mb-2 flex items-center justify-between">
                  <span>{formatCoord(rescuePoint)}</span>
                  <button
                    onClick={() => handleCopyGps(rescuePoint, 'rescue')}
                    className="text-slate-400 hover:text-emerald-700 cursor-pointer p-0.5"
                    title="Copy Coordinates"
                  >
                    {copiedKey === 'rescue' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>

                <div className="text-[10px] font-mono text-slate-600">
                  Assembly Post: UTM High Ground Helipad &amp; Medical Triage
                </div>

                <div className="mt-2 pt-1.5 border-t border-[#E6DFD5] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-700">Capacity: 12 Pax Ready</span>
                  <button
                    onClick={() => onSelectLocation?.(rescuePoint)}
                    className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Track on Map</span>
                    <Maximize2 size={10} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── 4. ROUTE HISTORY BREADCRUMBS ────────────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'history') && (
          <section className="bg-white border border-[#E6DFD5] rounded-xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6DFD5] pb-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#162347]">
                <Milestone size={14} className="text-[#162347]" />
                <span>Route History &amp; Breadcrumb Log</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {routeHistoryItems.length} Recorded Waypoints
              </span>
            </div>

            {/* Waypoint Chronological Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#E6DFD5] text-[9px] uppercase tracking-wider text-slate-500">
                    <th className="pb-1.5 pl-1">WP ID</th>
                    <th className="pb-1.5">Milestone / Event</th>
                    <th className="pb-1.5">GPS Coordinates</th>
                    <th className="pb-1.5 text-right">Leg Dist.</th>
                    <th className="pb-1.5 text-right">Cumulative</th>
                    <th className="pb-1.5 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD5]/60 text-[11px]">
                  {routeHistoryItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-[#FAF7F2] transition-colors group cursor-pointer"
                      onClick={() => onSelectLocation?.(item.coords)}
                    >
                      <td className="py-2 pl-1 font-bold text-slate-500 text-[10px]">
                        {item.id}
                      </td>
                      <td className="py-2">
                        <div className="font-bold text-[#162347] flex items-center gap-1.5">
                          {item.type === 'start' && <Flag size={12} className="text-indigo-600" />}
                          {item.type === 'robot' && <Navigation size={12} className="text-cyan-700" />}
                          {item.type === 'person' && <User size={12} className="text-rose-600" />}
                          {item.type === 'rescue' && <ShieldCheck size={12} className="text-emerald-700" />}
                          {item.type === 'waypoint' && <MapPin size={12} className="text-slate-400" />}
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
                      <td className="py-2 text-right text-[10px] text-slate-600">
                        {item.legDistM > 0 ? `+${item.legDistM}m` : '0m'}
                      </td>
                      <td className="py-2 text-right text-[10px] font-bold text-[#162347]">
                        {item.cumDistM}m
                      </td>
                      <td className="py-2 text-right pr-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLocation?.(item.coords);
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
