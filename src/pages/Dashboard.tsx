import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  User, BatteryCharging, Waves, Radar, Maximize2, Minimize2,
  ChevronDown, X, Columns, RotateCcw, GripVertical, GripHorizontal
} from 'lucide-react';
import { useDetectionApi } from '../hooks/useDetectionApi';
import { useObstacleSensor } from '../hooks/useObstacleSensor';
import { ObstacleSensorSection } from '../components/ObstacleSensorSection';
import { usePanTilt } from '../hooks/usePanTilt';
import { useRescue } from '../context/RescueContext';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ─── Custom Tactical Map Icons ────────────────────────────────────────────────
const createUsvIcon = (heading: number) =>
  L.divIcon({
    className: 'tactical-usv-icon',
    html: `<div style="transform: rotate(${heading}deg); width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <polygon points="12,2 22,22 12,17 2,22" fill="#22d3ee" stroke="#083344" stroke-width="1.5" />
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const detectedPersonMapIcon = L.divIcon({
  className: 'tactical-person-icon',
  html: `<div style="position:relative; width:22px; height:22px; display:flex; align-items:center; justify-content:center;">
    <div style="position:absolute; inset:0; border-radius:50%; background:#f97316; opacity:0.4; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <div style="width:14px; height:14px; border-radius:50%; background:#f97316; border:2.5px solid #ffffff; box-shadow:0 0 12px #f97316;"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const baseStationMapIcon = L.divIcon({
  className: 'tactical-base-icon',
  html: `<div style="width:14px; height:14px; background:#ffffff; border:2.5px solid #06b6d4; border-radius:2px; box-shadow:0 0 8px rgba(255,255,255,0.85);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function MapController({ center }: { center?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ animate: false });
    const timer = setTimeout(() => map.invalidateSize({ animate: false }), 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (center) {
      map.panTo(center, { animate: true, duration: 0.5 });
    }
  }, [center, map]);

  return null;
}

// ─── Custom Zoom Control Buttons ──────────────────────────────────────────────
function MapZoomButtons() {
  const map = useMap();
  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="w-7 h-7 bg-[#101b27]/90 hover:bg-[#1a2c3f] text-slate-200 border border-[#21374d] rounded flex items-center justify-center font-bold text-sm shadow cursor-pointer active:scale-95 transition-all"
        title="Zoom In"
      >
        +
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-7 h-7 bg-[#101b27]/90 hover:bg-[#1a2c3f] text-slate-200 border border-[#21374d] rounded flex items-center justify-center font-bold text-sm shadow cursor-pointer active:scale-95 transition-all"
        title="Zoom Out"
      >
        −
      </button>
    </div>
  );
}

// ─── Map Tile Providers (Google Map, Google Hybrid, Carto, OSM) ─────────────
export type MapTileType = 'google-hybrid' | 'google-map' | 'carto' | 'osm';

interface MapTileConfig {
  name: string;
  badge: string;
  url: string;
  subdomains?: string[];
  maxZoom: number;
}

const MAP_TILE_CONFIGS: Record<MapTileType, MapTileConfig> = {
  'google-hybrid': {
    name: 'Google Hybrid',
    badge: 'GOOGLE HYBRID',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
  },
  'google-map': {
    name: 'Google Map',
    badge: 'GOOGLE MAP',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
  },
  'carto': {
    name: 'Carto',
    badge: 'CARTO',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  'osm': {
    name: 'OSM',
    badge: 'OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
  },
};

export type DockId = 'camera' | 'target' | 'sensor' | 'panTilt' | 'map' | 'log';

interface DockConfig {
  id: DockId;
  label: string;
}

const AVAILABLE_DOCKS: DockConfig[] = [
  { id: 'camera', label: 'Live Reconnaissance (Camera Feed)' },
  { id: 'target', label: 'Target Information (Victim Detection)' },
  { id: 'sensor', label: 'Front Range Sonar (HC-SR04)' },
  { id: 'panTilt', label: 'Camera Arm (Pan/Tilt Servos)' },
  { id: 'map', label: 'Tactical Map' },
  { id: 'log', label: 'Victims & Detection Log' },
];

interface LogEntry {
  id: string;
  time: string;
  type: 'confirmed' | 'detected' | 'range' | 'rejected' | 'scan' | 'deployed';
  text: string;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const {
    robotOnline,
    emergencyStop,
    robotLocation,
    computerLocation,
    batteryLevel,
    robotSpeed,
    robotHeading,
    victims,
    addVictim,
  } = useRescue();

  const detectionApi = useDetectionApi();
  const panTilt = usePanTilt();
  const obstacleSensor = useObstacleSensor();

  // Switch default from ESP32 direct to XIAO if direct was set
  useEffect(() => {
    if (detectionApi.feedMode === 'direct') {
      detectionApi.setFeedMode('ai');
    }
  }, [detectionApi]);

  // Real-time clock in MYT (Malaysian Time)
  const [currentTimeMyt, setCurrentTimeMyt] = useState<string>('08:44:38 MYT');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kuala_Lumpur',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      const formatted = new Intl.DateTimeFormat('en-GB', options).format(now);
      setCurrentTimeMyt(`${formatted} MYT`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Map Tile Selector
  const [mapTileSource, setMapTileSource] = useState<MapTileType>('google-hybrid');
  const [showMapMenu, setShowMapMenu] = useState<boolean>(false);

  // ─── View Dock Management State ─────────────────────────────────────────────
  const [visibleDocks, setVisibleDocks] = useState<Record<DockId, boolean>>({
    camera: true,
    target: true,
    sensor: true,
    panTilt: true,
    map: true,
    log: true,
  });
  const [showDocksMenu, setShowDocksMenu] = useState<boolean>(false);
  const [maximizedDock, setMaximizedDock] = useState<DockId | null>(null);

  // Resizable layout split percentages
  const [topRowHeight, setTopRowHeight] = useState<number>(56); // % height
  const [cameraColWidth, setCameraColWidth] = useState<number>(58); // % width
  const [bottomSplit1, setBottomSplit1] = useState<number>(28); // Camera arm %
  const [bottomSplit2, setBottomSplit2] = useState<number>(70); // Tactical map boundary %

  // Splitter dragging ref
  const draggingSplitterRef = useRef<'horizontal' | 'topVertical' | 'bottom1' | 'bottom2' | null>(null);

  const toggleDock = (id: DockId) => {
    setVisibleDocks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetAllDocks = () => {
    setVisibleDocks({
      camera: true,
      target: true,
      sensor: true,
      panTilt: true,
      map: true,
      log: true,
    });
    setMaximizedDock(null);
    setTopRowHeight(56);
    setCameraColWidth(58);
    setBottomSplit1(28);
    setBottomSplit2(70);
  };

  // Dragging event listeners for resizing components
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingSplitterRef.current) return;
      if (draggingSplitterRef.current === 'horizontal') {
        const pct = Math.max(30, Math.min(80, (e.clientY / window.innerHeight) * 100));
        setTopRowHeight(pct);
      } else if (draggingSplitterRef.current === 'topVertical') {
        const pct = Math.max(30, Math.min(80, (e.clientX / window.innerWidth) * 100));
        setCameraColWidth(pct);
      } else if (draggingSplitterRef.current === 'bottom1') {
        const pct = Math.max(18, Math.min(45, (e.clientX / window.innerWidth) * 100));
        setBottomSplit1(pct);
      } else if (draggingSplitterRef.current === 'bottom2') {
        const pct = Math.max(45, Math.min(85, (e.clientX / window.innerWidth) * 100));
        setBottomSplit2(pct);
      }
    };

    const handleMouseUp = () => {
      draggingSplitterRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Sensor subviews: 'bar' (linear meter + sparkline), 'radar' (60° acoustic radar sector arc), 'thresholds' (auto-brake sliders)
  const [sensorViewMode, setSensorViewMode] = useState<'bar' | 'radar' | 'thresholds'>('bar');
  const [showFullSensorModal, setShowFullSensorModal] = useState<boolean>(false);

  // Local Pan & Tilt angle states for high-frequency interactive control
  const [panAngle, setPanAngle] = useState<number>(90);
  const [tiltAngle, setTiltAngle] = useState<number>(55);

  // Sync with ESP32 status if received
  useEffect(() => {
    if (panTilt.panAngle !== undefined && panTilt.panAngle !== 90) {
      setPanAngle(panTilt.panAngle);
    }
    if (panTilt.tiltAngle !== undefined && panTilt.tiltAngle !== 90) {
      setTiltAngle(panTilt.tiltAngle);
    }
  }, [panTilt.panAngle, panTilt.tiltAngle]);

  const setServoAngles = useCallback((pan: number, tilt: number) => {
    setPanAngle(pan);
    setTiltAngle(tilt);
    if (pan > panAngle) panTilt.sendCommand('RIGHT');
    else if (pan < panAngle) panTilt.sendCommand('LEFT');
    if (tilt > tiltAngle) panTilt.sendCommand('UP');
    else if (tilt < tiltAngle) panTilt.sendCommand('DOWN');
  }, [panAngle, tiltAngle, panTilt]);

  // Target confirmation state
  const [isTargetConfirmed, setIsTargetConfirmed] = useState<boolean>(true);
  const [isFalseAlarm, setIsFalseAlarm] = useState<boolean>(false);

  // Follow Target Auto-tracking toggle
  const [followTarget, setFollowTarget] = useState<boolean>(false);
  const [isAutoSweep, setIsAutoSweep] = useState<boolean>(false);

  // Model speed selection
  const [modelMode, setModelMode] = useState<'Fast' | 'Balanced' | 'Accurate'>('Balanced');

  // Elapsed Mission Timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(328);
  useEffect(() => {
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatElapsedTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `T+ ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Coordinates
  const effectiveRobotLocation: [number, number] = robotLocation || [4.29870, 100.76430];
  const effectiveBaseLocation: [number, number] = computerLocation || [4.29650, 100.76210];

  // Estimated victim location (offset based on pan bearing + distance)
  const targetLocation: [number, number] = useMemo(() => {
    const lat = effectiveRobotLocation[0] - 0.000037;
    const lng = effectiveRobotLocation[1] - 0.000238;
    return [lat, lng];
  }, [effectiveRobotLocation]);

  // Ultrasonic distance & bearing
  const liveDistance = obstacleSensor.distanceM > 0 ? obstacleSensor.distanceM : 2.45;
  const bearingFromBow = panAngle - 90;

  // Log events
  const [logEvents, setLogEvents] = useState<LogEntry[]>([
    { id: '1', time: '00:05:31', type: 'confirmed', text: 'Victim #1 confirmed by operator' },
    { id: '2', time: '00:05:24', type: 'detected',  text: 'Person detected - 94% - 2.45 m' },
    { id: '3', time: '00:05:19', type: 'range',     text: 'Range closing - 3.10 m' },
    { id: '4', time: '00:04:52', type: 'rejected',  text: 'Debris detected - rejected' },
    { id: '5', time: '00:03:10', type: 'scan',      text: 'Sector B scan started' },
    { id: '6', time: '00:00:12', type: 'deployed',  text: 'USV-01 deployed' },
  ]);

  // Sparkline history for HC-SR04
  const [distanceHistory, setDistanceHistory] = useState<number[]>([
    3.8, 3.7, 3.6, 3.4, 3.3, 3.1, 3.0, 2.9, 2.8, 2.7, 2.65, 2.6, 2.55, 2.5, 2.48, 2.45, 2.45, 2.45
  ]);

  useEffect(() => {
    if (obstacleSensor.distanceM > 0) {
      setDistanceHistory((prev) => {
        const next = [...prev.slice(1), obstacleSensor.distanceM];
        return next;
      });
    }
  }, [obstacleSensor.distanceM]);

  // Automated sweep effect
  useEffect(() => {
    if (!isAutoSweep) return;
    let dir = 1;
    const sweepInterval = setInterval(() => {
      setPanAngle((prevPan) => {
        let next = prevPan + dir * 15;
        if (next >= 150) {
          next = 150;
          dir = -1;
        } else if (next <= 30) {
          next = 30;
          dir = 1;
        }
        return next;
      });
    }, 1200);

    return () => clearInterval(sweepInterval);
  }, [isAutoSweep]);

  // Laptop webcam stream
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (detectionApi.feedMode === 'webcam') {
      navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
        .then((s) => {
          stream = s;
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = s;
            webcamVideoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => console.warn('Webcam stream error:', err));
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [detectionApi.feedMode]);

  // Target confirmation handlers
  const handleConfirmVictim = useCallback(() => {
    setIsTargetConfirmed(true);
    setIsFalseAlarm(false);

    addVictim({
      status: 'Verified',
      location: targetLocation,
      zone: 'Sector Ayer Tawar',
      confidence: 94,
      priority: 'Critical',
      peopleCount: 1,
      image: detectionApi.activeIncident?.imageUrl || '',
      waterDepthAtLocation: 0.8,
      notes: `Verified human contact at ${targetLocation[0].toFixed(6)}°N, ${targetLocation[1].toFixed(6)}°E. Range: ${liveDistance.toFixed(2)}m`,
    });

    setLogEvents((prev) => [
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        type: 'confirmed',
        text: `Victim #1 confirmed by operator`,
      },
      ...prev,
    ]);
  }, [addVictim, targetLocation, liveDistance, detectionApi.activeIncident]);

  const handleFalseAlarm = useCallback(() => {
    setIsTargetConfirmed(false);
    setIsFalseAlarm(true);
    setLogEvents((prev) => [
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        type: 'rejected',
        text: 'Contact marked as false alarm / rejected',
      },
      ...prev,
    ]);
  }, []);

  // 2D Pan/Tilt visualizer drag / click handler
  const handle2DGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const newPan = Math.round((x / rect.width) * 180);
    const newTilt = Math.round((1 - y / rect.height) * 180);
    setServoAngles(newPan, newTilt);
  };

  // Close map menu when clicking outside
  useEffect(() => {
    if (!showMapMenu) return;
    const handleOutside = () => setShowMapMenu(false);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [showMapMenu]);

  return (
    <div className="h-screen w-screen overflow-y-auto lg:overflow-hidden bg-[#0b1118] text-slate-100 flex flex-col p-2.5 gap-2.5 font-sans select-none">

      {/* ─── TOP HEADER BAR ─── */}
      <header className="h-[52px] bg-[#0c1219] border border-[#172332] rounded-2xl px-3.5 flex items-center justify-between shrink-0 shadow-sm z-30">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-sm">
            <Waves size={18} />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm tracking-wider uppercase leading-none">
              FLOODSCOUT USV-01
            </h1>
            <p className="text-cyan-400/75 text-[10px] font-mono mt-0.5 leading-none">
              Flood victim search · Ground control
            </p>
          </div>
        </div>

        {/* Center: [Robot console] [Operations] & [Docks ▾] */}
        <div className="flex items-center gap-2">
          {/* Page Switcher */}
          <div className="flex items-center bg-[#101b27] p-1 rounded-xl border border-[#1b2b3c]">
            <button
              className="px-3.5 py-1 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 shadow-sm cursor-pointer"
            >
              Robot console
            </button>
            <button
              onClick={() => navigate('/operations')}
              className="px-3.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              Operations
            </button>
          </div>

          {/* Docks Visibility Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDocksMenu(!showDocksMenu)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#101b27] hover:bg-[#18283a] text-cyan-400 border border-[#1b2b3c] rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors shadow-sm"
              title="Toggle dock panels visibility and layout"
            >
              <Columns size={13} />
              <span>Docks</span>
              <ChevronDown size={12} />
            </button>

            {showDocksMenu && (
              <div
                className="absolute left-0 top-full mt-1.5 w-64 bg-[#0c141e] border border-cyan-700/60 rounded-xl p-2.5 shadow-2xl z-[3000] font-mono text-xs space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="font-bold text-white text-[11px] uppercase tracking-wider">VIEW DOCKS</span>
                  <button
                    onClick={resetAllDocks}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    title="Reset all docks to default visible"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>

                {/* Dock Checkboxes */}
                <div className="space-y-1">
                  {AVAILABLE_DOCKS.map((dock) => {
                    const isVisible = visibleDocks[dock.id];
                    return (
                      <button
                        key={dock.id}
                        onClick={() => toggleDock(dock.id)}
                        className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-left ${
                          isVisible ? 'bg-[#152334] text-white' : 'text-slate-400 hover:bg-[#101a26]'
                        }`}
                      >
                        <span className="text-[11px] truncate">{dock.label}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                            isVisible ? 'bg-cyan-500 text-slate-950' : 'border border-slate-600 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Layout Presets</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <button
                      onClick={() => {
                        resetAllDocks();
                        setShowDocksMenu(false);
                      }}
                      className="px-2 py-1 bg-[#152334] hover:bg-[#1e324a] text-cyan-300 rounded text-center cursor-pointer"
                    >
                      Default
                    </button>
                    <button
                      onClick={() => {
                        setVisibleDocks({
                          camera: true,
                          target: false,
                          sensor: true,
                          panTilt: false,
                          map: true,
                          log: false,
                        });
                        setTopRowHeight(65);
                        setShowDocksMenu(false);
                      }}
                      className="px-2 py-1 bg-[#152334] hover:bg-[#1e324a] text-cyan-300 rounded text-center cursor-pointer"
                    >
                      Camera Focus
                    </button>
                    <button
                      onClick={() => {
                        setVisibleDocks({
                          camera: true,
                          target: false,
                          sensor: false,
                          panTilt: false,
                          map: true,
                          log: true,
                        });
                        setTopRowHeight(40);
                        setShowDocksMenu(false);
                      }}
                      className="px-2 py-1 bg-[#152334] hover:bg-[#1e324a] text-cyan-300 rounded text-center cursor-pointer"
                    >
                      Map Focus
                    </button>
                    <button
                      onClick={() => {
                        setVisibleDocks({
                          camera: true,
                          target: true,
                          sensor: true,
                          panTilt: true,
                          map: true,
                          log: true,
                        });
                        setTopRowHeight(50);
                        setCameraColWidth(50);
                        setShowDocksMenu(false);
                      }}
                      className="px-2 py-1 bg-[#152334] hover:bg-[#1e324a] text-cyan-300 rounded text-center cursor-pointer"
                    >
                      Quad Split
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Telemetry, Time & E-STOP */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {/* LINK */}
            <div className="flex items-center gap-1 bg-[#101b27] border border-[#1b2b3c] px-2 py-1 rounded-lg">
              <span className={`w-2 h-2 rounded-full ${robotOnline ? 'bg-emerald-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_6px_#34d399]`} />
              <span className="text-emerald-400 font-bold">LINK 82%</span>
            </div>

            {/* GPS FIX */}
            <div className="flex items-center gap-1 bg-[#101b27] border border-[#1b2b3c] px-2 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-emerald-400 font-bold">GPS FIX</span>
            </div>

            {/* BATTERY */}
            <div className="flex items-center gap-1 bg-[#101b27] border border-[#1b2b3c] px-2 py-1 rounded-lg text-cyan-300">
              <BatteryCharging size={13} className="text-cyan-400" />
              <span className="font-bold">BAT {batteryLevel}%</span>
            </div>

            {/* MISSION TIMER */}
            <div className="bg-[#101b27] border border-[#1b2b3c] px-2 py-1 rounded-lg text-slate-300 font-bold">
              {formatElapsedTime(elapsedSeconds)}
            </div>

            {/* REAL-TIME CLOCK IN RIGHT CORNER */}
            <div className="bg-[#101b27] border border-[#1b2b3c] px-2.5 py-1 rounded-lg text-slate-200 font-bold">
              {currentTimeMyt}
            </div>
          </div>

          {/* E-STOP Button */}
          <button
            onClick={() => emergencyStop()}
            className="bg-[#d32f2f] hover:bg-red-600 text-white font-black text-xs px-3.5 py-1.5 rounded-lg tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer uppercase"
          >
            E-STOP
          </button>
        </div>
      </header>

      {/* ─── TOP SECTION: LIVE FEED (LEFT) & TARGET + SONAR (RIGHT) ─── */}
      {(visibleDocks.camera || visibleDocks.target || visibleDocks.sensor) &&
        (!maximizedDock || ['camera', 'target', 'sensor'].includes(maximizedDock)) && (
        <div
          style={{
            height:
              maximizedDock
                ? '100%'
                : visibleDocks.panTilt || visibleDocks.map || visibleDocks.log
                ? `${topRowHeight}%`
                : '100%',
          }}
          className="flex flex-col lg:flex-row gap-2.5 min-h-[220px] w-full"
        >
          {/* ── LIVE FEED PANEL ── */}
          {visibleDocks.camera && (!maximizedDock || maximizedDock === 'camera') && (
            <section
              style={{
                width:
                  maximizedDock === 'camera'
                    ? '100%'
                    : visibleDocks.target || visibleDocks.sensor
                    ? `${cameraColWidth}%`
                    : '100%',
              }}
              className="bg-[#0e1722] border border-[#192738] rounded-2xl p-3 flex flex-col min-h-0 shadow-sm relative overflow-hidden"
            >
          {/* Live Feed Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1b2b3c]">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
              <span className="text-white font-extrabold text-sm tracking-wide font-sans">LIVE FEED</span>
              <span className="text-cyan-400/80 ml-2">
                {detectionApi.cameraStatus.streamFps || 30} FPS · 4200 kbps · 0 dropped
              </span>
            </div>

            {/* Feed Mode Switcher (ESP32 removed; XIAO and Laptop only) & Dock Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => detectionApi.setFeedMode('ai')}
                  className={`px-3 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    detectionApi.feedMode === 'ai'
                      ? 'bg-[#22d3ee] text-slate-950 font-extrabold shadow-sm'
                      : 'bg-[#131f2d] text-slate-300 hover:text-white border border-[#1b2b3c]'
                  }`}
                >
                  XIAO
                </button>
                <button
                  onClick={() => detectionApi.setFeedMode('webcam')}
                  className={`px-3 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    detectionApi.feedMode === 'webcam'
                      ? 'bg-[#22d3ee] text-slate-950 font-extrabold shadow-sm'
                      : 'bg-[#131f2d] text-slate-300 hover:text-white border border-[#1b2b3c]'
                  }`}
                >
                  Laptop
                </button>
              </div>

              {/* Dock Window Controls */}
              <div className="flex items-center gap-1 pl-2 border-l border-[#1b2b3c]">
                <button
                  onClick={() => setMaximizedDock(maximizedDock === 'camera' ? null : 'camera')}
                  className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer transition-colors"
                  title={maximizedDock === 'camera' ? 'Restore layout' : 'Maximize dock'}
                >
                  {maximizedDock === 'camera' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
                <button
                  onClick={() => toggleDock('camera')}
                  className="text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer transition-colors"
                  title="Hide dock"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Video Stream Viewport */}
          <div className="relative flex-1 bg-[#080e15] rounded-xl overflow-hidden border border-[#172433] flex items-center justify-center min-h-[220px]">
            {/* Background Stream or Webcam */}
            {detectionApi.feedMode === 'webcam' ? (
              <video
                ref={webcamVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : detectionApi.feedMode === 'direct' ? (
              <img
                src={detectionApi.cameraStreamUrl}
                alt="Direct Camera Feed"
                className="w-full h-full object-cover"
                onError={() => {}}
              />
            ) : (
              <img
                src={detectionApi.videoFeedUrl}
                alt="AI Reconnaissance Stream"
                className="w-full h-full object-cover"
                onError={() => {}}
              />
            )}

            {/* Stylized background contour lines */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/30 via-transparent to-transparent" />

            {/* Top-Left Overlay Badge */}
            <div className="absolute top-2.5 left-2.5 bg-[#0a121c]/85 backdrop-blur-md border border-[#1b2b3c] px-3 py-1.5 rounded-lg text-[11px] font-mono shadow-md">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>OpenCV HOG+SVM · tracking</span>
              </div>
              <div className="text-slate-300 mt-0.5">
                PAN {panAngle}° · TILT {tiltAngle}°
              </div>
            </div>

            {/* Top-Right Label */}
            <div className="absolute top-2.5 right-2.5 text-[11px] font-mono text-cyan-400/90 font-bold bg-[#0a121c]/70 px-2 py-0.5 rounded border border-cyan-900/40">
              [LIVE CAMERA STREAM]
            </div>

            {/* Center Detected Person Bounding Box */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-48 border-2 border-[#f97316] rounded-md pointer-events-none flex flex-col justify-between shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              {/* Tag Header */}
              <div className="bg-[#f97316] text-black font-extrabold text-[10px] px-2 py-0.5 rounded-t-sm flex items-center justify-between font-mono">
                <span>PERSON 94%</span>
                <span>{liveDistance.toFixed(2)} m</span>
              </div>

              {/* Water sonar target graphic inside box */}
              <div className="flex-1 flex items-center justify-center relative">
                <div className="w-16 h-16 rounded-full border border-cyan-400/40 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-300/60 flex items-center justify-center text-cyan-300">
                    <User size={22} className="opacity-90 text-cyan-300" />
                  </div>
                </div>
                <div className="absolute bottom-1 w-20 h-4 border-b-2 border-cyan-400/40 rounded-full" />
              </div>
            </div>

            {/* Bottom-Left Robot Coordinates */}
            <div className="absolute bottom-2.5 left-2.5 bg-[#0a121c]/85 backdrop-blur-md border border-[#1b2b3c] px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-200 shadow-md">
              <div className="font-bold text-white">
                ROBOT {effectiveRobotLocation[0].toFixed(5)}°N {effectiveRobotLocation[1].toFixed(5)}°E
              </div>
              <div className="text-slate-400 mt-0.5">
                HDG {String(robotHeading).padStart(3, '0')}° · {robotSpeed.toFixed(1)} km/h
              </div>
            </div>

            {/* Bottom-Right Model Profile Selector */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-[#0a121c]/85 p-1 rounded-lg border border-[#1b2b3c] text-xs font-semibold">
              {(['Fast', 'Balanced', 'Accurate'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setModelMode(mode)}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                    modelMode === mode
                      ? 'bg-[#22d3ee] text-slate-950 font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Vertical Splitter Handle: Camera ↔ Target/Sensor */}
        {!maximizedDock && visibleDocks.camera && (visibleDocks.target || visibleDocks.sensor) && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              draggingSplitterRef.current = 'topVertical';
            }}
            className="hidden lg:flex w-1.5 hover:w-2 bg-[#172332] hover:bg-cyan-500/80 cursor-col-resize transition-all rounded-full shrink-0 items-center justify-center select-none group"
            title="Drag left/right to resize Camera / Target split"
          >
            <GripVertical size={10} className="text-slate-600 group-hover:text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* ── TARGET INFO & FRONT RANGE STACK ── */}
        {(visibleDocks.target || visibleDocks.sensor) &&
          (!maximizedDock || ['target', 'sensor'].includes(maximizedDock)) && (
          <div
            style={{
              width: maximizedDock ? '100%' : visibleDocks.camera ? `${100 - cameraColWidth}%` : '100%',
            }}
            className="flex flex-col gap-2.5 min-h-0 flex-1 lg:flex-initial"
          >

            {/* Upper Card: VICTIM #1 CONFIRMED */}
            {visibleDocks.target && (!maximizedDock || maximizedDock === 'target') && (
              <section className="flex-1 bg-[#0e1722] border border-[#192738] rounded-2xl p-3.5 flex flex-col justify-between shadow-sm min-h-0 relative">
                {/* Card Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#1b2b3c]">
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm tracking-wide">
                    <User size={16} />
                    <span>{isFalseAlarm ? 'TARGET REJECTED' : 'VICTIM #1 CONFIRMED'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-[#132230] border border-[#1b2b3c] text-white px-2 py-0.5 rounded text-xs font-mono font-bold">
                      CONF 94%
                    </div>
                    {/* Dock Controls */}
                    <div className="flex items-center gap-1 pl-1 border-l border-[#1b2b3c]">
                      <button
                        onClick={() => setMaximizedDock(maximizedDock === 'target' ? null : 'target')}
                        className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer transition-colors"
                        title={maximizedDock === 'target' ? 'Restore layout' : 'Maximize dock'}
                      >
                        {maximizedDock === 'target' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      </button>
                      <button
                        onClick={() => toggleDock('target')}
                        className="text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer transition-colors"
                        title="Hide dock"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Distance & Bearing Metrics */}
                <div className="grid grid-cols-2 gap-4 my-auto py-1">
                  <div>
                    <span className="text-slate-400 text-xs font-sans block">Distance (ultrasonic)</span>
                    <div className="text-white font-extrabold text-3xl font-mono leading-tight mt-0.5">
                      {liveDistance.toFixed(2)} <span className="text-xl font-normal text-slate-400">m</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-sans block">Bearing from bow</span>
                    <div className="text-white font-extrabold text-3xl font-mono leading-tight mt-0.5">
                      {bearingFromBow >= 0 ? `+${bearingFromBow}` : bearingFromBow}°
                    </div>
                  </div>
                </div>

                {/* Estimated Position */}
                <div className="text-slate-300 font-mono text-xs pb-2">
                  Est. position {targetLocation[0].toFixed(6)}°N, {targetLocation[1].toFixed(6)}°E
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#1b2b3c]">
                  <button
                    onClick={handleConfirmVictim}
                    className="flex-1 bg-[#f97316] hover:bg-[#ea580c] text-black font-extrabold text-xs py-2 px-3 rounded-lg shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{isTargetConfirmed ? 'Confirmed ✓' : 'Confirm Victim'}</span>
                  </button>
                  <button
                    onClick={handleFalseAlarm}
                    className="bg-[#131f2d] hover:bg-[#1a2b3d] text-slate-200 border border-[#21354a] font-semibold text-xs py-2 px-3 rounded-lg transition-all active:scale-95 cursor-pointer"
                  >
                    False alarm
                  </button>
                  <button
                    onClick={() => {
                      setLogEvents((p) => [
                        {
                          id: String(Date.now()),
                          time: new Date().toLocaleTimeString(),
                          type: 'range',
                          text: `Navigating toward target at ${targetLocation[0].toFixed(5)}, ${targetLocation[1].toFixed(5)}`,
                        },
                        ...p,
                      ]);
                    }}
                    className="bg-[#131f2d] hover:bg-[#1a2b3d] text-slate-200 border border-[#21354a] font-semibold text-xs py-2 px-3 rounded-lg transition-all active:scale-95 cursor-pointer"
                  >
                    Navigate to
                  </button>
                </div>
              </section>
            )}

            {/* Lower Card: FRONT RANGE (HC-SR04 · 10 Hz) */}
            {visibleDocks.sensor && (!maximizedDock || maximizedDock === 'sensor') && (
              <section className="flex-1 bg-[#0e1722] border border-[#192738] rounded-2xl p-3.5 flex flex-col justify-between shadow-sm min-h-0 relative">
                {/* Header with Subview Tabs & Expand Button */}
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1b2b3c]">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-extrabold text-sm tracking-wide">FRONT RANGE</span>

                    {/* Subview Selector: Bar | Radar | Brake */}
                    <div className="flex items-center bg-[#101b27] p-0.5 rounded border border-[#1d2f42] text-[10px] font-mono">
                      <button
                        onClick={() => setSensorViewMode('bar')}
                        className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          sensorViewMode === 'bar' ? 'bg-[#22d3ee] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Bar
                      </button>
                      <button
                        onClick={() => setSensorViewMode('radar')}
                        className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          sensorViewMode === 'radar' ? 'bg-[#22d3ee] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Radar
                      </button>
                      <button
                        onClick={() => setSensorViewMode('thresholds')}
                        className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          sensorViewMode === 'thresholds' ? 'bg-[#22d3ee] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Brake
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                    <span>HC-SR04 · 10 Hz</span>
                    <button
                      onClick={() => setShowFullSensorModal(true)}
                      className="w-5 h-5 rounded hover:bg-[#1a2b3d] text-cyan-400 border border-[#21354a] flex items-center justify-center cursor-pointer shadow-xs transition-colors"
                      title="Expand to Full Radar Sector Arc Station"
                    >
                      <Maximize2 size={11} />
                    </button>
                    {/* Dock Controls */}
                    <div className="flex items-center gap-1 pl-1 border-l border-[#1b2b3c]">
                      <button
                        onClick={() => setMaximizedDock(maximizedDock === 'sensor' ? null : 'sensor')}
                        className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer transition-colors"
                        title={maximizedDock === 'sensor' ? 'Restore layout' : 'Maximize dock'}
                      >
                        {maximizedDock === 'sensor' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      </button>
                      <button
                        onClick={() => toggleDock('sensor')}
                        className="text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer transition-colors"
                        title="Hide dock"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>

            {/* ── SUBVIEW 1: LINEAR BAR + SPARKLINE (DEFAULT) ── */}
            {sensorViewMode === 'bar' && (
              <>
                <div className="space-y-1.5 my-auto">
                  <div className="relative w-full h-3 rounded-sm overflow-hidden flex bg-slate-900 border border-slate-700/60">
                    <div style={{ width: '12.5%' }} className="h-full bg-rose-600" />
                    <div style={{ width: '37.5%' }} className="h-full bg-amber-500" />
                    <div style={{ width: '50.0%' }} className="h-full bg-emerald-500" />
                    <div
                      style={{ left: `${Math.min(99, Math.max(1, (liveDistance / 4.0) * 100))}%` }}
                      className="absolute top-0 bottom-0 w-1.5 bg-white -translate-x-1/2 shadow-[0_0_8px_#ffffff] rounded-xs"
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
                    <span>0</span>
                    <span>0.5</span>
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4 m</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-slate-300">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-rose-600 rounded-xs" />
                      <span>Contact &lt; 0.5 m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-amber-500 rounded-xs" />
                      <span>Approach 0.5–2 m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-xs" />
                      <span>Clear</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-[#1b2b3c]">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Last 30 s</span>
                    <span className="text-cyan-400 font-semibold">closing 0.18 m/s</span>
                  </div>
                  <div className="w-full h-10">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 30">
                      <defs>
                        <linearGradient id="cyanSparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const min = 0;
                        const max = 4.5;
                        const pts = distanceHistory.map((val, idx) => {
                          const x = (idx / (distanceHistory.length - 1)) * 100;
                          const y = 30 - ((val - min) / (max - min)) * 26;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        });
                        const pathD = `M 0,30 L ${pts.join(' L ')} L 100,30 Z`;
                        const lineD = `M ${pts.join(' L ')}`;
                        return (
                          <>
                            <path d={pathD} fill="url(#cyanSparkGrad)" />
                            <path d={lineD} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              </>
            )}

            {/* ── SUBVIEW 2: 60° ACOUSTIC RADAR SECTOR ARC ── */}
            {sensorViewMode === 'radar' && (
              <div className="my-auto py-1 flex flex-col items-center justify-center relative">
                <svg width="240" height="96" viewBox="0 0 240 96" className="overflow-visible">
                  <defs>
                    <radialGradient id="inCardSonarGlow" cx="50%" cy="100%" r="100%">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                    </radialGradient>
                  </defs>

                  {/* 60° Cone: origin at (120, 92), radius 80 */}
                  <path
                    d="M 120 92 L 80 23 A 80 80 0 0 1 160 23 Z"
                    fill="url(#inCardSonarGlow)"
                    stroke="#0284C7"
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                  {/* Warning Arc Layer at 40px radius */}
                  <path
                    d="M 120 92 L 100 57 A 40 40 0 0 1 140 57 Z"
                    fill="#F59E0B"
                    fillOpacity="0.12"
                    stroke="#F59E0B"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  {/* Danger Arc Layer at 20px radius */}
                  <path
                    d="M 120 92 L 110 75 A 20 20 0 0 1 130 75 Z"
                    fill="#EF4444"
                    fillOpacity="0.25"
                    stroke="#EF4444"
                    strokeWidth="1.2"
                  />

                  {/* Concentric rings */}
                  <path d="M 90 40 A 60 60 0 0 1 150 40" fill="none" stroke="#22d3ee" strokeWidth="0.8" strokeDasharray="2 2" strokeOpacity="0.4" />

                  {/* Sonar sweep line */}
                  <line x1="120" y1="92" x2="135" y2="25" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.8">
                    <animateTransform attributeName="transform" type="rotate" from="-28 120 92" to="28 120 92" dur="1.8s" repeatCount="indefinite" />
                  </line>

                  {/* Target Blip */}
                  {liveDistance < 4.0 && (
                    <circle
                      cx="120"
                      cy={Math.max(28, 92 - (liveDistance / 4.0) * 64)}
                      r="4.5"
                      fill={liveDistance < 0.6 ? '#EF4444' : liveDistance < 1.5 ? '#F59E0B' : '#10B981'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="animate-pulse"
                    />
                  )}
                </svg>

                <div className="flex items-center justify-between w-full px-2 text-[10px] font-mono text-slate-300 mt-1">
                  <span>Cone: <strong>60° Forward</strong></span>
                  <span>Dist: <strong className="text-cyan-300 font-bold">{liveDistance.toFixed(2)}m</strong></span>
                  <span className={`px-1.5 py-0.2 rounded font-bold ${
                    obstacleSensor.status === 'DANGER' ? 'bg-rose-950 text-rose-300' : obstacleSensor.status === 'CAUTION' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {obstacleSensor.status}
                  </span>
                </div>
              </div>
            )}

            {/* ── SUBVIEW 3: AUTO-BRAKE THRESHOLDS & CONTROLS ── */}
            {sensorViewMode === 'thresholds' && (
              <div className="space-y-2 my-auto text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Auto-Brake System:</span>
                  <button
                    onClick={() => obstacleSensor.setAutoBrakeArmed(!obstacleSensor.autoBrakeArmed)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      obstacleSensor.autoBrakeArmed
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-xs'
                        : 'bg-[#15202c] text-slate-500 border-slate-700'
                    }`}
                  >
                    {obstacleSensor.autoBrakeArmed ? 'ARMED ✓' : 'DISARMED'}
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-amber-400">Warning Slowdown:</span>
                    <span className="font-bold text-white">{obstacleSensor.warningThresholdM.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={obstacleSensor.warningThresholdM}
                    onChange={(e) => obstacleSensor.setWarningThresholdM(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#14202d] rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-rose-400">Critical Stop / Halt:</span>
                    <span className="font-bold text-white">{obstacleSensor.criticalThresholdM.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={obstacleSensor.criticalThresholdM}
                    onChange={(e) => obstacleSensor.setCriticalThresholdM(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer h-1.5 bg-[#14202d] rounded-lg"
                  />
                </div>
              </div>
            )}
          </section>
          )}

        </div>
        )}
      </div>
      )}

      {/* Horizontal Splitter Handle: Top Row ↕ Bottom Row */}
      {!maximizedDock &&
        (visibleDocks.camera || visibleDocks.target || visibleDocks.sensor) &&
        (visibleDocks.panTilt || visibleDocks.map || visibleDocks.log) && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              draggingSplitterRef.current = 'horizontal';
            }}
            className="hidden lg:flex h-1.5 hover:h-2 bg-[#172332] hover:bg-cyan-500/80 cursor-row-resize transition-all rounded-full shrink-0 items-center justify-center select-none group"
            title="Drag up/down to resize Top & Bottom layout"
          >
            <GripHorizontal size={12} className="text-slate-600 group-hover:text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
      )}

      {/* ─── BOTTOM SECTION: CAMERA ARM, TACTICAL MAP, VICTIMS & LOG ─── */}
      {(visibleDocks.panTilt || visibleDocks.map || visibleDocks.log) &&
        (!maximizedDock || ['panTilt', 'map', 'log'].includes(maximizedDock)) && (
        <div
          style={{
            height:
              maximizedDock
                ? '100%'
                : visibleDocks.camera || visibleDocks.target || visibleDocks.sensor
                ? `${100 - topRowHeight}%`
                : '100%',
          }}
          className="flex flex-col lg:flex-row gap-2.5 min-h-[220px] w-full"
        >

          {/* ── CAMERA ARM (SG90) ── */}
          {visibleDocks.panTilt && (!maximizedDock || maximizedDock === 'panTilt') && (
            <section
              style={{
                width:
                  maximizedDock === 'panTilt'
                    ? '100%'
                    : visibleDocks.map || visibleDocks.log
                    ? `${bottomSplit1}%`
                    : '100%',
              }}
              className="bg-[#0e1722] border border-[#192738] rounded-2xl p-3 flex flex-col justify-between shadow-sm min-h-0 relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-1 border-b border-[#1b2b3c]">
                <span className="text-white font-extrabold text-sm tracking-wide">CAMERA ARM</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-xs">2x SG90 · GPIO 18 / 19</span>
                  <div className="flex items-center gap-1 pl-1 border-l border-[#1b2b3c]">
                    <button
                      onClick={() => setMaximizedDock(maximizedDock === 'panTilt' ? null : 'panTilt')}
                      className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer transition-colors"
                      title={maximizedDock === 'panTilt' ? 'Restore layout' : 'Maximize dock'}
                    >
                      {maximizedDock === 'panTilt' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                    <button
                      onClick={() => toggleDock('panTilt')}
                      className="text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer transition-colors"
                      title="Hide dock"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>

          {/* Interactive 2D Grid Visualizer & D-Pad */}
          <div className="flex items-center justify-between gap-3 my-auto py-1">
            {/* 2D Tactical Grid */}
            <div className="relative">
              <div
                onClick={handle2DGridClick}
                className="w-24 h-24 bg-[#0b121a] border border-[#1d2f42] rounded-lg grid grid-cols-3 grid-rows-3 relative cursor-crosshair shadow-inner"
                title="Click anywhere to orient Pan & Tilt"
              >
                <div className="border-r border-b border-[#162433]" />
                <div className="border-r border-b border-[#162433]" />
                <div className="border-b border-[#162433]" />
                <div className="border-r border-b border-[#162433]" />
                <div className="border-r border-b border-[#162433]" />
                <div className="border-b border-[#162433]" />
                <div className="border-r border-b border-[#162433]" />
                <div className="border-r border-b border-[#162433]" />
                <div />

                {/* Glowing Current Position Dot */}
                <div
                  style={{
                    left: `${Math.min(92, Math.max(8, (panAngle / 180) * 100))}%`,
                    top: `${Math.min(92, Math.max(8, (1 - tiltAngle / 180) * 100))}%`,
                  }}
                  className="absolute w-3.5 h-3.5 rounded-full bg-[#22d3ee] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_#22d3ee] pointer-events-none transition-all duration-75"
                />
              </div>

              {/* Grid Axis Labels */}
              <span className="absolute -top-3 left-0 text-[9px] font-mono text-slate-500">0°</span>
              <span className="absolute -bottom-3 right-0 text-[9px] font-mono text-slate-500">180°</span>
            </div>

            {/* D-Pad Cross Controls */}
            <div className="flex flex-col items-center gap-1 select-none pr-2">
              <button
                onClick={() => {
                  panTilt.sendCommand('UP');
                  setTiltAngle((t) => Math.min(180, t + 10));
                }}
                className="w-8 h-7 rounded bg-[#131f2d] hover:bg-[#22d3ee] hover:text-slate-950 text-slate-200 border border-[#21354a] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                title="Tilt Up"
              >
                <ArrowUp size={14} />
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    panTilt.sendCommand('LEFT');
                    setPanAngle((p) => Math.max(0, p - 10));
                  }}
                  className="w-8 h-7 rounded bg-[#131f2d] hover:bg-[#22d3ee] hover:text-slate-950 text-slate-200 border border-[#21354a] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  title="Pan Left"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    panTilt.sendCommand('CENTER');
                    setPanAngle(90);
                    setTiltAngle(90);
                  }}
                  className="w-8 h-7 rounded-full bg-[#1b2b3c] hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-[#2b4159] flex items-center justify-center transition-all active:scale-90 cursor-pointer font-bold text-xs"
                  title="Center Gimbal"
                >
                  ●
                </button>
                <button
                  onClick={() => {
                    panTilt.sendCommand('RIGHT');
                    setPanAngle((p) => Math.min(180, p + 10));
                  }}
                  className="w-8 h-7 rounded bg-[#131f2d] hover:bg-[#22d3ee] hover:text-slate-950 text-slate-200 border border-[#21354a] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  title="Pan Right"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
              <button
                onClick={() => {
                  panTilt.sendCommand('DOWN');
                  setTiltAngle((t) => Math.max(0, t - 10));
                }}
                className="w-8 h-7 rounded bg-[#131f2d] hover:bg-[#22d3ee] hover:text-slate-950 text-slate-200 border border-[#21354a] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                title="Tilt Down"
              >
                <ArrowDown size={14} />
              </button>
            </div>
          </div>

          {/* Sliders for Pan & Tilt */}
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 text-[11px] w-6">Pan</span>
              <input
                type="range"
                min="0"
                max="180"
                value={panAngle}
                onChange={(e) => setServoAngles(Number(e.target.value), tiltAngle)}
                className="flex-1 accent-[#22d3ee] cursor-pointer h-1.5 bg-[#14202d] rounded-lg"
              />
              <span className="text-white font-bold w-8 text-right">{panAngle}°</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 text-[11px] w-6">Tilt</span>
              <input
                type="range"
                min="0"
                max="180"
                value={tiltAngle}
                onChange={(e) => setServoAngles(panAngle, Number(e.target.value))}
                className="flex-1 accent-[#22d3ee] cursor-pointer h-1.5 bg-[#14202d] rounded-lg"
              />
              <span className="text-white font-bold w-8 text-right">{tiltAngle}°</span>
            </div>
          </div>

          {/* Quick Action Presets & Follow Target */}
          <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-[#1b2b3c] text-[10px] font-mono">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setServoAngles(30, 90)}
                className="px-2 py-0.5 rounded bg-[#131f2d] hover:bg-[#1a2c3f] text-slate-300 border border-[#21374d] cursor-pointer"
              >
                Left
              </button>
              <button
                onClick={() => setServoAngles(90, 90)}
                className="px-2 py-0.5 rounded bg-[#131f2d] hover:bg-[#1a2c3f] text-slate-300 border border-[#21374d] cursor-pointer"
              >
                Ahead
              </button>
              <button
                onClick={() => setServoAngles(150, 90)}
                className="px-2 py-0.5 rounded bg-[#131f2d] hover:bg-[#1a2c3f] text-slate-300 border border-[#21374d] cursor-pointer"
              >
                Right
              </button>
              <button
                onClick={() => setServoAngles(90, 55)}
                className="px-2 py-0.5 rounded bg-[#131f2d] hover:bg-[#1a2c3f] text-slate-300 border border-[#21374d] cursor-pointer"
              >
                Waterline
              </button>
              <button
                onClick={() => setIsAutoSweep((s) => !s)}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  isAutoSweep
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-[#131f2d] hover:bg-[#1a2c3f] text-slate-300 border border-[#21374d]'
                }`}
              >
                Auto-sweep
              </button>
            </div>

            <button
              onClick={() => setFollowTarget((f) => !f)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                followTarget
                  ? 'bg-[#22d3ee] text-slate-950'
                  : 'bg-[#152433] text-cyan-400 border border-cyan-800/40'
              }`}
            >
              Follow target {followTarget ? 'on' : 'off'}
            </button>
          </div>
        </section>
        )}

        {/* Splitter 1: Camera Arm ↔ Tactical Map */}
        {!maximizedDock && visibleDocks.panTilt && (visibleDocks.map || visibleDocks.log) && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              draggingSplitterRef.current = 'bottom1';
            }}
            className="hidden lg:flex w-1.5 hover:w-2 bg-[#172332] hover:bg-cyan-500/80 cursor-col-resize transition-all rounded-full shrink-0 items-center justify-center select-none group"
            title="Drag left/right to resize Camera Arm width"
          >
            <GripVertical size={10} className="text-slate-600 group-hover:text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* ── TACTICAL MAP DOCK ── */}
        {visibleDocks.map && (!maximizedDock || maximizedDock === 'map') && (
          <section
            style={{
              width:
                maximizedDock === 'map'
                  ? '100%'
                  : visibleDocks.log
                  ? `${visibleDocks.panTilt ? Math.max(20, bottomSplit2 - bottomSplit1) : bottomSplit2}%`
                  : '100%',
            }}
            className="bg-[#0e1722] border border-[#192738] rounded-2xl p-3 flex flex-col justify-between shadow-sm min-h-0 relative overflow-hidden"
          >
            {/* Header with Interactive Map Provider Selector and Dock Controls */}
            <div className="flex items-center justify-between pb-1 border-b border-[#1b2b3c] z-10 relative">
              <span className="text-white font-extrabold text-sm tracking-wide">TACTICAL MAP</span>

              <div className="flex items-center gap-2">

            {/* Map Tile Dropdown Switcher */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowMapMenu((m) => !m)}
                className="text-cyan-400 hover:text-cyan-200 font-mono text-xs flex items-center gap-1 bg-[#101b27] px-2 py-0.5 rounded border border-[#1b2b3c] cursor-pointer transition-all active:scale-95 shadow-xs"
                title="Change Map Tile Provider"
              >
                <span>Ayer Tawar</span>
                <span className="text-slate-500">·</span>
                <span className="text-cyan-300 font-bold">[{MAP_TILE_CONFIGS[mapTileSource].badge}]</span>
                <span className="text-[9px] text-slate-400 ml-0.5">▼</span>
              </button>

              {/* Dropdown Menu */}
              {showMapMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#0c141e] border border-cyan-700/60 rounded-xl p-1 shadow-2xl z-[2000] font-mono text-xs space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-white/5">
                    SELECT MAP LAYER
                  </div>
                  {(Object.keys(MAP_TILE_CONFIGS) as MapTileType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setMapTileSource(type);
                        setShowMapMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                        mapTileSource === type
                          ? 'bg-[#22d3ee] text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-[#162334] hover:text-white'
                      }`}
                    >
                      <span>{MAP_TILE_CONFIGS[type].name}</span>
                      {mapTileSource === type && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dock Controls */}
            <div className="flex items-center gap-1 pl-1 border-l border-[#1b2b3c]">
              <button
                onClick={() => setMaximizedDock(maximizedDock === 'map' ? null : 'map')}
                className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer transition-colors"
                title={maximizedDock === 'map' ? 'Restore layout' : 'Maximize dock'}
              >
                {maximizedDock === 'map' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                onClick={() => toggleDock('map')}
                className="text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer transition-colors"
                title="Hide dock"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>

          {/* Map View */}
          <div className="relative flex-1 rounded-xl overflow-hidden border border-[#172433] mt-1.5">
            <MapContainer
              center={effectiveRobotLocation}
              zoom={17}
              zoomControl={false}
              attributionControl={false}
              className="w-full h-full bg-[#080d14]"
            >
              <TileLayer
                key={mapTileSource}
                url={MAP_TILE_CONFIGS[mapTileSource].url}
                subdomains={MAP_TILE_CONFIGS[mapTileSource].subdomains}
                maxZoom={MAP_TILE_CONFIGS[mapTileSource].maxZoom}
              />
              <MapController center={effectiveRobotLocation} />
              <MapZoomButtons />

              {/* Base Station (PC) */}
              <Marker position={effectiveBaseLocation} icon={baseStationMapIcon}>
                <Popup className="font-mono text-xs">Ground Control Station</Popup>
              </Marker>

              {/* Target Location Marker */}
              <Marker position={targetLocation} icon={detectedPersonMapIcon}>
                <Popup className="font-mono text-xs font-bold text-rose-600">
                  Target #1 (Victim In Sight)
                </Popup>
              </Marker>

              {/* Dashed line to detected person */}
              <Polyline
                positions={[effectiveRobotLocation, targetLocation]}
                pathOptions={{ color: '#f97316', dashArray: '5 5', weight: 2, opacity: 0.9 }}
              />

              {/* Robot Vessel Marker */}
              <Marker position={effectiveRobotLocation} icon={createUsvIcon(robotHeading)}>
                <Popup className="font-mono text-xs">USV-01 Recon Vessel</Popup>
              </Marker>

              {/* Search radius circle around robot */}
              <Circle
                center={effectiveRobotLocation}
                radius={28}
                pathOptions={{
                  color: '#22d3ee',
                  dashArray: '4 4',
                  weight: 1.5,
                  fillOpacity: 0.04,
                  fillColor: '#22d3ee',
                }}
              />
            </MapContainer>

            {/* Floating Bottom-Left Tactical Legend */}
            <div className="absolute bottom-2 left-2 z-[1000] bg-[#0c141d]/90 backdrop-blur-md border border-[#1b2b3c] p-2 rounded-lg text-[10px] font-mono text-slate-300 space-y-1 shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-cyan-400 rotate-45 inline-block" />
                <span>USV-01</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] inline-block shadow-[0_0_6px_#f97316]" />
                <span>Detected person</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-white border border-cyan-400 rounded-xs inline-block" />
                <span>Base station (PC)</span>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Splitter 2: Tactical Map ↔ Victims & Log */}
        {!maximizedDock && visibleDocks.map && visibleDocks.log && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              draggingSplitterRef.current = 'bottom2';
            }}
            className="hidden lg:flex w-1.5 hover:w-2 bg-[#172332] hover:bg-cyan-500/80 cursor-col-resize transition-all rounded-full shrink-0 items-center justify-center select-none group"
            title="Drag left/right to resize Tactical Map / Victims split"
          >
            <GripVertical size={10} className="text-slate-600 group-hover:text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* ── VICTIMS & LOG ── */}
        {visibleDocks.log && (!maximizedDock || maximizedDock === 'log') && (
          <section
            style={{
              width:
                maximizedDock === 'log'
                  ? '100%'
                  : visibleDocks.panTilt || visibleDocks.map
                  ? `${Math.max(20, 100 - (visibleDocks.map ? bottomSplit2 : (visibleDocks.panTilt ? bottomSplit1 : 0)))}%`
                  : '100%',
            }}
            className="bg-[#0e1722] border border-[#192738] rounded-2xl p-3 flex flex-col justify-between shadow-sm min-h-0 relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-[#1b2b3c]">
              <span className="text-white font-extrabold text-sm tracking-wide">VICTIMS &amp; LOG</span>
              <div className="flex items-center gap-2">
                <span className="text-[#f97316] font-bold text-xs font-mono">
                  {isTargetConfirmed ? '1 confirmed' : '0 confirmed'}
                </span>
                {/* Dock Controls */}
                <div className="flex items-center gap-1 pl-1 border-l border-[#1b2b3c]">
                  <button
                    onClick={() => setMaximizedDock(maximizedDock === 'log' ? null : 'log')}
                    className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer transition-colors"
                    title={maximizedDock === 'log' ? 'Restore layout' : 'Maximize dock'}
                  >
                    {maximizedDock === 'log' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                  <button
                    onClick={() => toggleDock('log')}
                    className="text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer transition-colors"
                    title="Hide dock"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>

          {/* 3 Counter Metric Cards */}
          <div className="grid grid-cols-3 gap-2 py-1.5 text-center">
            <div className="bg-[#121c27] border border-[#1c2c3e] rounded-lg p-1.5">
              <span className="text-[10px] text-slate-400 block font-sans">Detections</span>
              <span className="text-white font-extrabold text-lg font-mono">
                {7 + (victims?.length || 0)}
              </span>
            </div>
            <div className="bg-[#181f26] border border-[#2b251e] rounded-lg p-1.5">
              <span className="text-[10px] text-slate-400 block font-sans">Confirmed</span>
              <span className="text-[#f97316] font-extrabold text-lg font-mono">
                {isTargetConfirmed ? 1 : 0}
              </span>
            </div>
            <div className="bg-[#121c27] border border-[#1c2c3e] rounded-lg p-1.5">
              <span className="text-[10px] text-slate-400 block font-sans">False</span>
              <span className="text-white font-extrabold text-lg font-mono">
                {isFalseAlarm ? 7 : 6}
              </span>
            </div>
          </div>

          {/* Chronological Event Log Feed */}
          <div className="flex-1 overflow-y-auto space-y-1.5 text-[11px] font-mono pr-1 mt-0.5">
            {logEvents.map((log) => {
              const dotColor =
                log.type === 'confirmed'
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : log.type === 'detected'
                  ? 'bg-[#f97316] shadow-[0_0_6px_#f97316]'
                  : log.type === 'range'
                  ? 'bg-cyan-400'
                  : 'bg-slate-500';

              return (
                <div key={log.id} className="flex items-center gap-2 text-slate-300">
                  <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                  <span className="truncate">{log.text}</span>
                </div>
              );
            })}
          </div>
        </section>
        )}

      </div>
      )}

      {/* ─── FULL SENSOR & RADAR SECTOR ARC MODAL ─── */}
      {showFullSensorModal && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#0c131d] border border-cyan-800/70 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-[#1b2b3c] bg-[#090f17]">
              <div className="flex items-center gap-2 text-cyan-400">
                <Radar size={18} />
                <span className="font-mono font-bold text-sm text-white">
                  FRONT RANGE SENSOR &amp; 60° ACOUSTIC RADAR (HC-SR04)
                </span>
              </div>
              <button
                onClick={() => setShowFullSensorModal(false)}
                className="w-8 h-8 rounded-lg bg-[#14202e] hover:bg-[#1e2f42] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer border border-[#233548] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <ObstacleSensorSection />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
