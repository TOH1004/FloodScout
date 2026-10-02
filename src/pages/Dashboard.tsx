import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import {
  ArrowLeft, Clock, Compass, MapPin, ArrowUp, ArrowDown, ArrowRight,
  Camera, X, Cpu, Target, FileText,
  GripVertical, Eye, User, Users, ArrowUpDown,
  Navigation, Laptop, Maximize2, Minimize2, Wifi, Settings, Check, RefreshCw, Globe, Edit3, Radio,
  History as HistoryIcon, Radar, Layers, AlertTriangle
} from 'lucide-react';
import { useDetectionApi, type RescueIncident } from '../hooks/useDetectionApi';
import { RescueLocationAnalysis } from '../components/RescueLocationAnalysis';
import { ObstacleSensorSection } from '../components/ObstacleSensorSection';
import { usePanTilt, type UsePanTiltReturn } from '../hooks/usePanTilt';
import { IncidentModal } from '../components/IncidentModal';
import { CameraSettingsPanel } from '../components/CameraSettingsPanel';
import { WifiCameraModal } from '../components/WifiCameraModal';
import { extractCameraHost } from '../config/camera';
import { MotorTelemetryCard } from '../components/MotorTelemetryCard';
import { useMotorTelemetry } from '../hooks/useMotorTelemetry';
import { ObsStudioModeView } from '../components/obs/ObsStudioModeView';
import { ObsTopMenu } from '../components/obs/ObsTopMenu';
import { ObsStatusBar } from '../components/obs/ObsStatusBar';

export interface SceneItem {
  id: string;
  name: string;
  preset: string;
}
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRescue } from '../context/RescueContext';
import type { VictimStatus } from '../context/RescueContext';
import {
  type LayoutNode,
  type PanelId,
  DEFAULT_OBS_LAYOUT,
  TACTICAL_QUAD_LAYOUT,
  AI_FOCUS_LAYOUT,
  MAP_FOCUS_LAYOUT,
  removeNode,
  insertNode,
  hasPanel,
  addDockPanel,
} from '../utils/layoutTree';
export type { PanelId, LayoutNode };

// ─── Map Icons ────────────────────────────────────────────────────────────────
const computerIcon = L.divIcon({
  className: 'custom-computer-marker',
  html: `<div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(2,132,199,0.4);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <div style="position:relative;width:32px;height:32px;background:#0284C7;border:3px solid #FAF7F2;border-radius:50%;box-shadow:0 0 16px rgba(2,132,199,0.9);display:flex;align-items:center;justify-content:center;font-size:14px;color:#FAF7F2;cursor:pointer;">💻</div>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const livePersonIcon = L.divIcon({
  className: 'custom-live-person-marker',
  html: `<div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.45);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <div style="position:relative;width:30px;height:30px;background:#EF4444;border:3px solid #FAF7F2;border-radius:50%;box-shadow:0 0 16px rgba(239,68,68,0.95);display:flex;align-items:center;justify-content:center;font-size:13px;color:#FAF7F2;cursor:pointer;">👤</div>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const getVictimMarkerIcon = (status: VictimStatus) => {
  const color = status === 'Rescued' ? '#10B981' : status === 'Rescue Assigned' ? '#0284C7' : status === 'Verified' ? '#F59E0B' : '#EF4444';
  return L.divIcon({
    className: 'custom-victim-marker',
    html: `<div style="width:26px;height:26px;background:${color};border:2.5px solid #FAF7F2;border-radius:50%;box-shadow:0 0 12px ${color};display:flex;align-items:center;justify-content:center;font-size:11px">${status === 'Rescued' ? '✅' : '👤'}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const getRobotIcon = (personDetected: boolean) => {
  if (personDetected) {
    return L.divIcon({
      className: 'custom-robot-marker-alert',
      html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.65);animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative;width:36px;height:36px;background:#DC2626;border:3px solid #FFFFFF;border-radius:50%;box-shadow:0 0 20px rgba(239,68,68,1);display:flex;align-items:center;justify-content:center;font-size:16px;color:#FFFFFF;">🚨</div>
        <div style="position:absolute;bottom:-8px;background:#991B1B;color:#FFFFFF;font-family:monospace;font-size:8px;font-weight:bold;padding:1px 4px;border-radius:4px;border:1px solid #FECACA;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.5);">TARGET!</div>
      </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }
  return L.divIcon({
    className: 'custom-robot-marker',
    html: `<div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(6,182,212,0.45);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative;width:32px;height:32px;background:#0891B2;border:3px solid #FAF7F2;border-radius:50%;box-shadow:0 0 16px rgba(6,182,212,0.9);display:flex;align-items:center;justify-content:center;font-size:14px;color:#FAF7F2;">🤖</div>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapResizerAndController({
  center,
  computerLocation,
}: {
  center?: [number, number] | null;
  computerLocation?: [number, number];
}) {
  const map = useMap();
  const hasAutoCentered = useRef(false);

  // Guarantee Leaflet recalculates true container dimensions on mount, resize, and panel drag
  useEffect(() => {
    // 1. Immediate invalidation
    map.invalidateSize({ animate: false });

    // 2. Multi-stage invalidations as flex / resizable panels settle
    const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 40);
    const t2 = setTimeout(() => map.invalidateSize({ animate: false }), 150);
    const t3 = setTimeout(() => map.invalidateSize({ animate: false }), 350);
    const t4 = setTimeout(() => map.invalidateSize({ animate: false }), 700);

    // 3. Dynamic ResizeObserver on Leaflet's container element
    const container = map.getContainer();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      ro = new ResizeObserver(() => {
        map.invalidateSize({ animate: false });
      });
      ro.observe(container);
    }

    const onResize = () => map.invalidateSize({ animate: false });
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [map]);

  // Center/focus on target smoothly and promptly
  useEffect(() => {
    if (center) {
      map.panTo(center, { animate: true, duration: 0.35 });
    }
  }, [center, map]);

  // When live computerLocation arrives, center the map strictly on PC location
  useEffect(() => {
    if (center) return;
    const target = computerLocation;
    if (target && !hasAutoCentered.current) {
      // Discard old mock Johor Bahru placeholder [1.5588, 103.6375]
      const isMockJohor = Math.abs(target[0] - 1.5588) < 0.005 && Math.abs(target[1] - 103.6375) < 0.005;
      if (!isMockJohor) {
        hasAutoCentered.current = true;
        map.flyTo(target, 16, { duration: 0.8 });
      }
    }
  }, [computerLocation, center, map]);

  return null;
}



// ─── Types ────────────────────────────────────────────────────────────────────
interface PanelDef { id: PanelId; label: string; icon: React.ElementType }

const PANEL_DEFS: PanelDef[] = [
  { id: 'camera',     label: 'USV Recon Stream',                icon: Camera },
  { id: 'map',        label: 'Tactical GIS Map',                icon: MapPin },
  { id: 'navigation', label: 'Thrusters & Pan-Tilt (PTZ)',      icon: Compass },
  { id: 'sensors',    label: 'Victim Distance Sonar (HC-SR04)', icon: Radar },
  { id: 'victims',    label: 'Victim Geolocation Manifest',     icon: Target },
  { id: 'status',     label: 'Hardware System Telemetry',       icon: HistoryIcon },
  { id: 'log',        label: 'Search Mission Log',              icon: FileText },
];

// ─── Sortable Panel Wrapper ─────────────────────────────────────────────────────
function SortablePanel({
  id, children, onClose, onMaximize, isMaximized, dropPosition,
}: {
  id: PanelId;
  children: React.ReactNode;
  onClose: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  dropPosition?: 'top' | 'bottom' | 'left' | 'right' | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : 'auto',
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
  };
  const def = PANEL_DEFS.find(p => p.id === id)!;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[#12141a] border border-[#262b3a] rounded overflow-hidden h-full w-full min-h-0 relative flex-1 shadow-md"
    >
      {/* Drop indicators for the 4 zones */}
      {dropPosition === 'top' && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-sky-500 z-50 rounded-t pointer-events-none" />
      )}
      {dropPosition === 'bottom' && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-sky-500 z-50 rounded-b pointer-events-none" />
      )}
      {dropPosition === 'left' && (
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-sky-500 z-50 rounded-l pointer-events-none" />
      )}
      {dropPosition === 'right' && (
        <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-sky-500 z-50 rounded-r pointer-events-none" />
      )}
      <div className="bg-[#181b25] px-3 py-1.5 border-b border-[#262c3c] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 text-slate-200">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 touch-none p-0.5"
            title="Drag to reorder dock"
          >
            <GripVertical size={14} />
          </button>
          <def.icon size={13} className="text-emerald-400" />
          <h3 className="font-mono text-xs font-bold tracking-wider uppercase text-slate-200">{def.label}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer rounded hover:bg-white/10"
              title={isMaximized ? "Restore split layout" : "Maximize dock"}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-400 transition-colors p-1 cursor-pointer rounded hover:bg-white/10"
            title="Close dock"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative min-h-0 bg-[#12141a]">{children}</div>
    </div>
  );
}

// ─── Resize Handle ────────────────────────────────────────────────────────────
// orientation='horizontal' = column divider (sits between columns, needs full HEIGHT)
// orientation='vertical'   = row divider    (sits between rows,    needs full WIDTH)
function ResizeHandle({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <PanelResizeHandle
      className={`group relative flex items-center justify-center bg-[#171922] hover:bg-sky-600/40 data-[separator=active]:bg-sky-500 transition-colors duration-150 shrink-0 select-none ${
        orientation === 'horizontal'
          ? 'w-2 h-full cursor-col-resize border-x border-[#232733]'
          : 'h-2 w-full cursor-row-resize border-y border-[#232733]'
      }`}
    >
      <div className={`flex items-center justify-center gap-0.5 pointer-events-none ${
        orientation === 'horizontal' ? 'flex-col' : 'flex-row'
      }`}>
        {[0,1,2].map(i => (
          <div key={i} className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-slate-300 group-data-[separator=active]:bg-white transition-colors" />
        ))}
      </div>
    </PanelResizeHandle>
  );
}

// ─── Panel Content Renderer ───────────────────────────────────────────────────
function PanelContent({
  id,
  detectionApi,
  panTilt,
  onInspectIncident,
  focusedLocation,
  onTrackPerson,
  onMaximizeMap,
  isMapMaximized,
  onShowVictimManifest,
}: {
  id: PanelId;
  detectionApi: ReturnType<typeof useDetectionApi>;
  panTilt: UsePanTiltReturn;
  onInspectIncident: (inc: RescueIncident, personId?: number) => void;
  focusedLocation?: [number, number] | null;
  onTrackPerson?: (loc: [number, number]) => void;
  onMaximizeMap?: () => void;
  isMapMaximized?: boolean;
  onShowVictimManifest?: () => void;
}) {
  const {
    waterDepth, robotSpeed, computerLocation, computerAccuracy, operatingMode,
    activeMission, victims, batteryLevel, connectionStatus,
    refreshComputerLocation, setManualComputerLocation,
    setOperatingMode,
    robotLocation, robotHeading, trajectory, signalDbm,
    hardwareGps, setRobotLocationDirect,
  } = useRescue();

  const { detectionStatus } = detectionApi;
  const isPersonDetectedAtRobot = Boolean(
    detectionStatus.personDetected ||
    (detectionStatus.personCount && detectionStatus.personCount > 0)
  );

  const motorTelemetry = useMotorTelemetry();

  const [aiBoxes] = useState(true);
  const [crosshair] = useState(true);
  const [waypoint, setWaypoint] = useState<[number, number] | null>(null);
  const [localThreshold, setLocalThreshold] = useState(50);
  const [victimSortBy, setVictimSortBy] = useState<'person' | 'time'>('person');
  const [mapTileSource, setMapTileSource] = useState<'google' | 'google-hybrid' | 'carto' | 'osm'>('google');
  const [logFilter, setLogFilter] = useState<'all' | 'victims'>('all');
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [showCamSettings, setShowCamSettings] = useState(false);
  const [directFeedError, setDirectFeedError] = useState(false);
  const [inlineCameraIpInput, setInlineCameraIpInput] = useState('');

  // Laptop Webcam integration state
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  // Manage laptop webcam stream lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    if (detectionApi.feedMode === 'webcam') {
      const initWebcam = async () => {
        try {
          setWebcamError(null);
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false,
          });
          if (!isCancelled && webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = stream;
            await webcamVideoRef.current.play();
            setWebcamActive(true);
          }
        } catch (err: any) {
          if (!isCancelled) {
            console.warn('Laptop camera access error:', err);
            setWebcamError(err.message || 'Camera permission denied or camera device busy');
            setWebcamActive(false);
          }
        }
      };
      initWebcam();
    } else {
      if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
        const activeStream = webcamVideoRef.current.srcObject as MediaStream;
        activeStream.getTracks().forEach(t => t.stop());
        webcamVideoRef.current.srcObject = null;
      }
      setWebcamActive(false);
    }

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [detectionApi.feedMode]);

  // Reset stream error when URL or mode changes so the new feed can attempt connection
  useEffect(() => {
    setDirectFeedError(false);
  }, [detectionApi.cameraStreamUrl, detectionApi.feedMode]);

  // GPS coordination for Operator Ground Control Station (PC)
  const isComputerJohorMock = computerLocation && Math.abs(computerLocation[0] - 1.5588) < 0.005 && Math.abs(computerLocation[1] - 103.6375) < 0.005;
  const baseLocation: [number, number] = (!isComputerJohorMock && computerLocation) || robotLocation || [1.8642, 103.1142];

  // AI Person Detection Overlay for Laptop Webcam
  useEffect(() => {
    if (detectionApi.feedMode !== 'webcam' || !webcamActive) return;

    let isRunning = true;
    let frameCount = 0;

    const renderOverlay = () => {
      if (!isRunning) return;
      frameCount++;

      const video = webcamVideoRef.current;
      const canvas = webcamCanvasRef.current;
      if (video && canvas && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (aiBoxes) {
            // Smooth target tracking bounding box simulating person recognition
            const cx = canvas.width * 0.5 + Math.sin(frameCount * 0.025) * (canvas.width * 0.04);
            const cy = canvas.height * 0.44 + Math.cos(frameCount * 0.02) * (canvas.height * 0.03);
            const bw = canvas.width * 0.38;
            const bh = canvas.height * 0.62;
            const bx = cx - bw / 2;
            const by = cy - bh / 2;
            const confidence = 0.92 + Math.sin(frameCount * 0.035) * 0.05;

            // Bounding box
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(bx, by, bw, bh);

            // High-visibility corner brackets
            const cl = 18;
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#34d399';
            ctx.beginPath(); ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bx, by + bh - cl); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cl, by + bh); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bx + bw - cl, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cl); ctx.stroke();

            // Header Banner
            ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
            ctx.fillRect(bx, by - 26, 220, 24);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by - 26, 220, 24);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`VICTIM #1 | ${(confidence * 100).toFixed(1)}% CONF`, bx + 6, by - 9);

            // Geolocation Tag
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fillRect(bx, by + bh + 4, 240, 20);
            ctx.fillStyle = '#38bdf8';
            ctx.font = '10px monospace';
            ctx.fillText(`GPS: ${baseLocation[0].toFixed(5)}°N, ${baseLocation[1].toFixed(5)}°E`, bx + 6, by + bh + 18);
          }
        }
      }

      requestAnimationFrame(renderOverlay);
    };

    const animId = requestAnimationFrame(renderOverlay);
    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [detectionApi.feedMode, webcamActive, aiBoxes, baseLocation]);

  const getPersonGps = (personId: number, _base: [number, number]): [number, number] | null => {
    // When robot detects a person, anchor victim coordinates directly to live robot vessel position
    if (!robotLocation) return null;
    const anchor = robotLocation;
    if (personId <= 1) {
      return [
        parseFloat(anchor[0].toFixed(6)),
        parseFloat(anchor[1].toFixed(6)),
      ];
    }
    // Subtle micro-spread (~3 meters) for multiple targets so markers don't overlap completely
    const angle = ((personId - 1) * 72) * (Math.PI / 180);
    const dist = 0.00003;
    return [
      parseFloat((anchor[0] + Math.sin(angle) * dist).toFixed(6)),
      parseFloat((anchor[1] + Math.cos(angle) * dist).toFixed(6)),
    ];
  };

  // Build manifest persons with GPS Coordination
  interface ManifestPerson {
    personId: number;
    label: string;
    time: string;
    timestamp: string;
    score: number;
    cropUrl?: string;
    incident: RescueIncident;
    description?: string;
    descriptionStatus?: string;
    captureCount: number;
    location: [number, number] | null;
  }

  const personCaptureCounts = new Map<number, number>();
  (detectionApi.incidents || []).forEach((inc) => {
    if (inc.personDetails && inc.personDetails.length > 0) {
      inc.personDetails.forEach((p) => {
        personCaptureCounts.set(p.id, (personCaptureCounts.get(p.id) || 0) + 1);
      });
    } else if (inc.personImages && inc.personImages.length > 0) {
      inc.personImages.forEach((url, idx) => {
        const urlMatch = url.match(/person_(\d+)/);
        const pId = urlMatch ? parseInt(urlMatch[1]) : idx + 1;
        personCaptureCounts.set(pId, (personCaptureCounts.get(pId) || 0) + 1);
      });
    }
  });

  const personsMap = new Map<number, ManifestPerson>();
  const incidentsChronologicalDesc = [...(detectionApi.incidents || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  incidentsChronologicalDesc.forEach((inc) => {
    if (inc.personDetails && inc.personDetails.length > 0) {
      inc.personDetails.forEach((p) => {
        if (!personsMap.has(p.id)) {
          personsMap.set(p.id, {
            personId: p.id,
            label: p.label || `Person #${p.id}`,
            time: inc.time,
            timestamp: inc.timestamp,
            score: p.score ?? inc.highestConfidence,
            cropUrl: p.imageUrl,
            incident: inc,
            description: inc.description,
            descriptionStatus: inc.descriptionStatus,
            captureCount: personCaptureCounts.get(p.id) || 1,
            location: getPersonGps(p.id, baseLocation),
          });
        }
      });
    } else if (inc.personImages && inc.personImages.length > 0) {
      inc.personImages.forEach((url, idx) => {
        const urlMatch = url.match(/person_(\d+)/);
        const pId = urlMatch ? parseInt(urlMatch[1]) : idx + 1;
        if (!personsMap.has(pId)) {
          personsMap.set(pId, {
            personId: pId,
            label: `Person #${pId}`,
            time: inc.time,
            timestamp: inc.timestamp,
            score: inc.highestConfidence,
            cropUrl: url,
            incident: inc,
            description: inc.description,
            descriptionStatus: inc.descriptionStatus,
            captureCount: personCaptureCounts.get(pId) || 1,
            location: getPersonGps(pId, baseLocation),
          });
        }
      });
    } else {
      const pId = 1;
      if (!personsMap.has(pId)) {
        personsMap.set(pId, {
          personId: pId,
          label: `Person #${pId}`,
          time: inc.time,
          timestamp: inc.timestamp,
          score: inc.highestConfidence,
          cropUrl: inc.imageUrl,
          incident: inc,
          description: inc.description,
          descriptionStatus: inc.descriptionStatus,
          captureCount: personCaptureCounts.get(pId) || 1,
          location: getPersonGps(pId, baseLocation),
        });
      }
    }
  });

  const manifestPersons = Array.from(personsMap.values());
  manifestPersons.sort((a, b) => b.personId - a.personId);

  const incidentsByTime = [...(detectionApi.incidents || [])].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  switch (id) {
    case 'camera': {
      const {
        backendOnline, cameraStatus, detectionStatus, videoFeedUrl,
        cameraStreamUrl, setCameraStreamUrl, feedMode, setFeedMode, isUpdatingCameraUrl,
        activeIncident, dismissActiveIncident, apiBaseUrl, setHogMode
      } = detectionApi;
      const currentMode = cameraStatus.mode ?? 'fast';
      const isPersonDetected = (feedMode === 'webcam' && webcamActive) || Boolean(detectionStatus.personDetected);
      const effectivePersonCount = (feedMode === 'webcam' && webcamActive) ? 1 : (detectionStatus.personCount || 0);
      const effectiveConfidence = (feedMode === 'webcam' && webcamActive) ? 0.94 : (detectionStatus.highestConfidence || 0);

      return (
        <div className="relative h-full bg-slate-950 flex flex-col overflow-hidden select-none">
          {/* Main Video Viewport */}
          <div className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden ${
            isPersonDetected ? 'ring-2 ring-rose-500/80' : ''
          }`}>
            {/* Live Target Lock HUD Overlay when a victim is detected in stream */}
            {isPersonDetected && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-rose-600/95 text-white px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.9)] border border-rose-300 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <AlertTriangle size={14} className="text-yellow-300" />
                <span>VICTIM DETECTED • {effectivePersonCount} TARGET IN VIEW • SCORE {effectiveConfidence.toFixed(2)}</span>
              </div>
            )}
            {feedMode === 'webcam' ? (
              webcamError ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3 max-w-md">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Laptop size={24} />
                  </div>
                  <div>
                    <h4 className="font-mono text-sm font-bold text-rose-300 uppercase tracking-wider">
                      Laptop Camera Inactive
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {webcamError}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Check your browser camera permissions or reconnect your USB webcam.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setFeedMode('direct')}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Switch to XIAO Cam
                    </button>
                    <button
                      onClick={() => setFeedMode('ai')}
                      className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-mono transition-all cursor-pointer"
                    >
                      Switch to AI Vision
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  <canvas
                    ref={webcamCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                  <div className="absolute bottom-3 left-3 bg-purple-950/85 border border-purple-500/40 text-purple-200 px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-2 shadow-lg backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span>LAPTOP OPTICAL FEED • LOCAL AI TRACKING</span>
                  </div>
                </div>
              )
            ) : feedMode === 'direct' ? (
              directFeedError ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Wifi size={24} />
                  </div>
                  <div>
                    <h4 className="font-mono text-sm font-bold text-amber-300 uppercase tracking-wider">
                      Direct Wi-Fi Stream Unreachable
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm font-mono">
                      Could not reach: <span className="text-sky-300 font-bold">{cameraStreamUrl}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                      Verify the camera is powered on and connected to this Wi-Fi network.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setShowWifiModal(true)}
                      className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Wifi size={13} /> Configure Wi-Fi IP
                    </button>
                    <button
                      onClick={() => {
                        setDirectFeedError(false);
                        setFeedMode('ai');
                      }}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono transition-all cursor-pointer"
                    >
                      Switch to AI Feed
                    </button>
                  </div>
                </div>
              ) : (
                <img
                  src={cameraStreamUrl}
                  alt="FloodScout Direct Wi-Fi Cam"
                  className="w-full h-full object-contain"
                  onError={() => setDirectFeedError(true)}
                  onLoad={() => setDirectFeedError(false)}
                />
              )
            ) : backendOnline ? (
              <img
                src={videoFeedUrl}
                alt="FloodScout Live Stream"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-4 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-lg">
                  <Wifi size={28} />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-sky-300 uppercase tracking-wider">
                    {backendOnline ? 'Wi-Fi Camera Standby' : 'AI Vision Backend Offline'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {backendOnline
                      ? `Waiting for camera stream at: ${cameraStatus.url || cameraStreamUrl}`
                      : 'Connect your ESP32-CAM over local Wi-Fi or view direct stream.'}
                  </p>
                </div>

                <div className="w-full space-y-2 bg-slate-900/90 border border-slate-800 p-3 rounded-lg text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    Camera Wi-Fi URL / IP:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      defaultValue={cameraStreamUrl}
                      onChange={(e) => setInlineCameraIpInput(e.target.value)}
                      placeholder="http://10.185.112.106:81/stream"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-sky-400"
                    />
                    <button
                      onClick={async () => {
                        const target = inlineCameraIpInput || cameraStreamUrl;
                        await setCameraStreamUrl(target);
                      }}
                      disabled={isUpdatingCameraUrl}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      {isUpdatingCameraUrl ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                      Connect
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {[':81/stream', ':80/stream', '/stream', '/cam.mjpg'].map((path) => (
                      <button
                        key={path}
                        onClick={async () => {
                          const host = extractCameraHost(inlineCameraIpInput || cameraStreamUrl);
                          const fullUrl = `http://${host}${path}`;
                          await setCameraStreamUrl(fullUrl);
                        }}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 transition-colors cursor-pointer border border-slate-700/60"
                      >
                        {path}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFeedMode('direct');
                      setDirectFeedError(false);
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Radio size={13} /> View Direct Wi-Fi Feed
                  </button>
                  <button
                    onClick={() => setShowWifiModal(true)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Wifi size={13} /> Advanced Setup
                  </button>
                </div>
              </div>
            )}

            {/* Crosshair Overlay */}
            {crosshair && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-24 h-24 border border-white/30 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]" />
                </div>
                <div className="absolute w-12 h-[1px] bg-white/25" />
                <div className="absolute h-12 w-[1px] bg-white/25" />
              </div>
            )}

            {/* Top Bar: Camera connection badge, Feed mode toggle, Wi-Fi Setup & telemetry */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
                {!aiBoxes && (
                  <div className="bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300">
                    AI BOXES: HIDDEN
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 rounded shadow-lg text-[10px] font-mono text-white">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      feedMode === 'webcam'
                        ? webcamActive
                          ? 'bg-purple-400 shadow-[0_0_8px_#c084fc] animate-pulse'
                          : 'bg-amber-400'
                        : feedMode === 'direct'
                        ? directFeedError
                          ? 'bg-amber-400'
                          : 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                        : backendOnline && cameraStatus.connected
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-bold tracking-wider uppercase">
                    {feedMode === 'webcam'
                      ? webcamActive
                        ? 'Laptop Camera Feed (AI Tracking Active)'
                        : 'Laptop Camera Initializing...'
                      : feedMode === 'direct'
                      ? `Direct Wi-Fi Cam (${extractCameraHost(cameraStreamUrl)})`
                      : backendOnline && cameraStatus.connected
                      ? `AI Vision Feed (${cameraStatus.type || 'Wi-Fi'})`
                      : backendOnline
                      ? 'Camera Standby'
                      : 'Backend Offline'}
                  </span>
                </div>

                {/* 3-Way Feed Mode Switcher: OpenCV AI Vision | XIAO Direct Cam | Laptop Webcam */}
                <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-md p-0.5 shadow-md text-[10px] font-mono font-bold">
                  <button
                    onClick={() => setFeedMode('ai')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                      feedMode === 'ai'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to AI Vision Stream with OpenCV Person Detection & Live Bounding Boxes"
                  >
                    <Cpu size={11} className={feedMode === 'ai' ? 'text-white' : 'text-sky-400'} />
                    <span>OpenCV AI Vision</span>
                  </button>
                  <button
                    onClick={() => {
                      setFeedMode('direct');
                      setDirectFeedError(false);
                    }}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                      feedMode === 'direct'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to Direct Wi-Fi Camera Stream from XIAO ESP32-S3 (Lowest Latency)"
                  >
                    <Radio size={11} />
                    <span>XIAO Cam</span>
                  </button>
                  <button
                    onClick={() => setFeedMode('webcam')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                      feedMode === 'webcam'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to Laptop Integrated Camera with Local Bounding Box Tracking"
                  >
                    <Laptop size={11} />
                    <span>Webcam</span>
                  </button>
                </div>

                {/* Wi-Fi Camera Setup Button */}
                <button
                  onClick={() => setShowWifiModal(true)}
                  className="bg-slate-900/90 hover:bg-[#162347] text-sky-300 hover:text-white border border-sky-500/40 rounded-md px-2 py-1 shadow-md text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Configure Wi-Fi Camera IP / Stream URL"
                >
                  <Wifi size={12} className="text-sky-400" />
                  <span className="hidden sm:inline">Wi-Fi Cam Setup</span>
                </button>

                {/* Camera Hardware & AI Settings Drawer Toggle */}
                <button
                  onClick={() => setShowCamSettings((s) => !s)}
                  className={`border rounded-md px-2 py-1 shadow-md text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    showCamSettings
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-900/90 hover:bg-[#162347] text-emerald-300 hover:text-white border-emerald-500/40'
                  }`}
                  title="Configure Camera Settings (XIAO ESP32-S3) & AI Sensitivity"
                >
                  <Settings size={12} className={showCamSettings ? 'text-white' : 'text-emerald-400'} />
                  <span className="hidden sm:inline">Cam Settings</span>
                </button>

                {detectionApi.xiaoStatus && (
                  <div
                    className={`hidden sm:flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border px-2 py-1 rounded shadow-lg text-[9px] font-mono ${
                      detectionApi.xiaoStatus.connected
                        ? 'border-emerald-500/40 text-emerald-300'
                        : 'border-slate-700/60 text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        detectionApi.xiaoStatus.connected ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                    <span>
                      XIAO: {detectionApi.xiaoStatus.connected ? `Connected (${detectionApi.xiaoStatus.port || 'USB'})` : 'Standby'}
                    </span>
                  </div>
                )}

                {/* Live Dual Thruster Motor Movement & Direction Indicator */}
                <div
                  className={`flex items-center gap-1.5 backdrop-blur-md border px-2.5 py-1 rounded shadow-lg text-[10px] font-mono transition-all ${
                    motorTelemetry.motion.state.includes('FORWARD')
                      ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300'
                      : motorTelemetry.motion.state.includes('REVERSE')
                      ? 'bg-amber-950/85 border-amber-500/50 text-amber-300'
                      : motorTelemetry.motion.state.includes('SPIN')
                      ? 'bg-cyan-950/85 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-900/85 border-slate-700/60 text-slate-400'
                  }`}
                  title={`Dual Thruster Propulsion (Left: ${motorTelemetry.motion.left.status} | Right: ${motorTelemetry.motion.right.status})`}
                >
                  <Navigation
                    size={11}
                    className={`transition-transform duration-200 ${
                      motorTelemetry.motion.state.includes('FORWARD RIGHT') ? 'rotate-45 text-emerald-400' :
                      motorTelemetry.motion.state.includes('FORWARD LEFT') ? '-rotate-45 text-emerald-400' :
                      motorTelemetry.motion.state.includes('FORWARD') ? 'text-emerald-400' :
                      motorTelemetry.motion.state.includes('REVERSE') ? 'rotate-180 text-amber-400' :
                      motorTelemetry.motion.state.includes('SPIN RIGHT') ? 'rotate-90 text-cyan-400' :
                      motorTelemetry.motion.state.includes('SPIN LEFT') ? '-rotate-90 text-cyan-400' : 'text-slate-500'
                    }`}
                  />
                  <span className="font-bold uppercase tracking-wider text-[9px] text-white">
                    {motorTelemetry.motion.state}
                  </span>
                  {motorTelemetry.motion.state !== 'STOP' && (
                    <span className="text-[9px] font-mono opacity-85 text-sky-300">
                      L:{motorTelemetry.motion.left.percent}% R:{motorTelemetry.motion.right.percent}%
                    </span>
                  )}
                </div>
              </div>

              {backendOnline && cameraStatus.connected && (
                <div className="flex flex-col items-end gap-1.5 pointer-events-none">
                  {/* Resolution & FPS badges */}
                  <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 rounded shadow-lg text-[10px] font-mono text-slate-300">
                    {cameraStatus.resolution && (
                      <>
                        <span className="text-cyan-400 font-bold">
                          {cameraStatus.resolution.width}×{cameraStatus.resolution.height}
                        </span>
                        <span className="text-slate-600">|</span>
                      </>
                    )}
                    <span className="text-emerald-400 font-bold">
                      {cameraStatus.streamFps ? `${cameraStatus.streamFps} FPS` : 'LIVE'}
                    </span>
                    {cameraStatus.inferenceTimeMs !== undefined && cameraStatus.inferenceTimeMs > 0 && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span className="text-amber-400">{cameraStatus.inferenceTimeMs.toFixed(1)} ms</span>
                      </>
                    )}
                  </div>
                  {/* Detector label */}
                  <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 rounded shadow-lg text-[10px] font-mono text-slate-300">
                    <span>HOG+SVM</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-400 font-bold">PEOPLE DETECTOR</span>
                  </div>
                </div>
              )}
              {backendOnline && !cameraStatus.connected && (
                <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 rounded shadow-lg text-[10px] font-mono text-slate-300">
                  <span>OpenCV HOG+SVM</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-400 font-bold">PEOPLE DETECTOR</span>
                </div>
              )}
            </div>

            {/* Mode Switcher row — bottom-right HUD */}
            {backendOnline && cameraStatus.connected && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 pointer-events-auto">
                {(['fast', 'balanced', 'accurate'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setHogMode(m)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border transition-all ${
                      currentMode === m
                        ? m === 'fast'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : m === 'balanced'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-slate-900/70 border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {m === 'fast' ? '⚡ Fast' : m === 'balanced' ? '⚖️ Balanced' : '🎯 Accurate'}
                  </button>
                ))}
              </div>
            )}

            {/* Camera Settings & AI Sensitivity Drawer */}
            {showCamSettings && (
              <div className="absolute top-12 left-2.5 z-40 w-84 max-w-[90vw] max-h-[calc(100%-60px)] overflow-y-auto bg-[#101217]/95 border border-[#262c3d] rounded-lg shadow-2xl backdrop-blur-md p-3 space-y-3 pointer-events-auto">
                <div className="flex items-center justify-between pb-2 border-b border-[#212634]">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200 uppercase">
                    <Settings size={13} className="text-emerald-400" />
                    <span>Camera &amp; AI Settings</span>
                  </div>
                  <button
                    onClick={() => setShowCamSettings(false)}
                    className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* AI Confidence Threshold */}
                <div>
                  <h4 className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>AI Confidence Threshold</span>
                    <span className="text-emerald-400 font-bold">{localThreshold}%</span>
                  </h4>
                  <input
                    type="range"
                    min={10}
                    max={95}
                    value={localThreshold}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLocalThreshold(val);
                      detectionApi.setConfidenceThreshold(val / 100);
                    }}
                    className="w-full accent-emerald-500 h-1.5 rounded cursor-pointer bg-[#242938]"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                    <span>10% (High Recall)</span>
                    <span>95% (High Precision)</span>
                  </div>
                </div>

                {/* Remote Camera Controls via USB Serial (Seeed Studio XIAO ESP32-S3 Sense) */}
                <div className="pt-2 border-t border-[#1f2432]">
                  <CameraSettingsPanel
                    xiaoStatus={detectionApi.xiaoStatus}
                    cameraSettings={detectionApi.cameraSettings}
                    settingFeedback={detectionApi.settingFeedback}
                    isUpdatingSetting={detectionApi.isUpdatingSetting}
                    onUpdateSetting={detectionApi.updateCameraSetting}
                  />
                </div>
              </div>
            )}

            {/* Prominent High-Visibility Alert Banner when Person Detected */}
            {isPersonDetected && (
              <div className="absolute top-12 left-3 right-3 bg-rose-950/95 border-2 border-rose-500 text-white p-2.5 rounded-md shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2 z-30 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🚨</span>
                  <div>
                    <div className="text-xs font-mono font-black tracking-widest text-rose-200 uppercase flex items-center gap-2">
                      <span>PERSON DETECTED</span>
                      <span className="text-[9px] bg-rose-800 text-rose-200 border border-rose-400 px-1.5 py-0.2 rounded font-sans font-bold">
                        TARGET LOCKED
                      </span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-amber-400 shrink-0" />
                      <span>TARGET GPS: {baseLocation[0].toFixed(6)}° N, {baseLocation[1].toFixed(6)}° E</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <div className="bg-rose-900/80 px-2 py-1 rounded border border-rose-500/50 text-[11px]">
                    People: <strong className="text-white">{effectivePersonCount}</strong>
                  </div>
                  <div className="bg-rose-900/80 px-2 py-1 rounded border border-rose-500/50 text-[11px]">
                    Score: <strong className="text-emerald-300">{effectiveConfidence.toFixed(2)}</strong>
                  </div>
                  {(activeIncident || manifestPersons[0]) && (
                    <button
                      onClick={() => {
                        const inc = activeIncident || manifestPersons[0]?.incident;
                        if (inc) {
                          onInspectIncident(inc, manifestPersons[0]?.personId);
                        }
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md active:scale-95"
                      title="Inspect detected person with AI analysis"
                    >
                      <Eye size={12} />
                      <span>Inspect</span>
                    </button>
                  )}
                  {onTrackPerson && (
                    <button
                      onClick={() => onTrackPerson(baseLocation)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md active:scale-95"
                      title="View Target Location on Tactical Map"
                    >
                      <Navigation size={11} />
                      <span>View Map</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Rescue Incident Card Overlay when an Incident is Captured */}
            {activeIncident && (
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-[#162347]/95 border-2 border-emerald-500/70 text-white p-3 rounded shadow-2xl backdrop-blur-md flex flex-col gap-2 z-40 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Rescue Incident Captured ({activeIncident.time})</span>
                  </div>
                  <button
                    onClick={dismissActiveIncident}
                    className="text-white/50 hover:text-white p-0.5"
                    title="Dismiss alert card"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex gap-3 items-center">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded overflow-hidden bg-black border border-white/20 shrink-0 relative cursor-pointer" onClick={() => onInspectIncident(activeIncident)}>
                    <img
                      src={`${apiBaseUrl}${activeIncident.imageUrl}`}
                      alt="Captured Incident"
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-0 right-0 bg-black/80 text-[9px] font-mono px-1 text-emerald-300 font-bold">
                      {activeIncident.highestConfidence.toFixed(2)}
                    </div>
                  </div>

                  {/* Incident Info & AI Description */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">
                        {activeIncident.personCount} Person(s)
                      </span>
                      <span className="text-[9px] font-mono text-[#BED6EE] bg-white/10 px-1.5 rounded">
                        {activeIncident.id}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1">
                      <MapPin size={11} className="text-amber-400 shrink-0" />
                      <span>GPS: {baseLocation[0].toFixed(6)}° N, {baseLocation[1].toFixed(6)}° E</span>
                    </div>
                    <p className="text-[11px] font-sans text-white/90 line-clamp-2 leading-tight">
                      {activeIncident.description}
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono">
                  <span className="text-[#BED6EE]/70 text-[9px]">
                    {activeIncident.descriptionStatus === 'completed'
                      ? '✓ Gemini Observation Ready'
                      : activeIncident.descriptionStatus === 'pending'
                      ? '⏳ Analyzing Scene...'
                      : 'AI Description Unavailable'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onTrackPerson && (
                      <button
                        onClick={() => onTrackPerson(baseLocation)}
                        className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white font-bold px-2 py-1 rounded transition-colors shadow-sm"
                        title="Show on Map"
                      >
                        <Navigation size={11} /> Map
                      </button>
                    )}
                    <button
                      onClick={() => onInspectIncident(activeIncident)}
                      className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2.5 py-1 rounded transition-colors shadow-sm"
                    >
                      <Eye size={12} /> View Image
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Telemetry & Status Bar */}
          <div className="bg-[#14161f] border-t border-[#232733] px-3.5 py-1.5 text-xs font-mono text-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 uppercase tracking-wider text-[9px]">Status:</span>
                {isPersonDetected ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    🚨 Person Detected ({effectivePersonCount})
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    No person detected
                  </span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-slate-400 uppercase tracking-wider text-[9px]">Detection Score:</span>
                <span className="font-bold text-white">
                  {isPersonDetected ? effectiveConfidence.toFixed(2) : '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 font-bold text-sky-400">
                <Laptop size={11} /> PC GPS: <strong className="text-white font-mono">{baseLocation[0].toFixed(4)}°, {baseLocation[1].toFixed(4)}°</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">
                {feedMode === 'webcam' ? 'LAPTOP WEBCAM ACTIVE' : 'AI VISION ACTIVE'}
              </span>
            </div>
          </div>
          {/* Wi-Fi Camera Setup Modal */}
          <WifiCameraModal
            isOpen={showWifiModal}
            onClose={() => setShowWifiModal(false)}
            onSaveUrl={async (url) => {
              const success = await detectionApi.setCameraStreamUrl(url);
              setDirectFeedError(false);
              return success;
            }}
            activeStreamUrl={detectionApi.cameraStreamUrl}
            activeFeedMode={detectionApi.feedMode}
            onSelectFeedMode={(mode) => {
              detectionApi.setFeedMode(mode);
              setDirectFeedError(false);
            }}
            backendOnline={backendOnline}
            cameraConnected={cameraStatus.connected}
            isUpdating={detectionApi.isUpdatingCameraUrl}
          />
        </div>
      );
    }

    case 'map':
      return (
        <div className="h-full w-full relative z-0 isolate">
          {/* Live Tactical Coordination HUD */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Left: Vessel GY-NEO8M GPS & Base Station PC GPS */}
            <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
              {/* Robot Location (Hardware GY-NEO8M GPS) with Quick Center & Manual Input */}
              <div className={`backdrop-blur-md px-2.5 py-1 rounded-md shadow-md border text-[11px] font-mono flex items-center gap-2 transition-all ${
                isPersonDetectedAtRobot
                  ? 'bg-rose-950/95 text-white border-rose-500 ring-1 ring-rose-400'
                  : 'bg-[#162347]/95 text-[#FAF7F2] border-cyan-400/60'
              }`}>
                <button
                  onClick={() => {
                    if (robotLocation && onTrackPerson) onTrackPerson(robotLocation);
                  }}
                  className="flex items-center gap-1.5 font-bold hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Click to Center Map on Robot Vessel (GY-NEO8M GPS)"
                >
                  <Navigation size={13} className={isPersonDetectedAtRobot ? 'text-rose-400 animate-bounce' : 'text-cyan-400'} />
                  <span className={isPersonDetectedAtRobot ? 'text-rose-400' : 'text-cyan-300'}>GY-NEO8M GPS:</span>
                  <span className="font-bold text-white">
                    {robotLocation ? `${robotLocation[0].toFixed(6)}°, ${robotLocation[1].toFixed(6)}°` : 'Awaiting Fix'}
                  </span>
                </button>

                {/* Manual Coordinate Entry for GY-NEO8M GPS */}
                <button
                  onClick={() => {
                    const current = robotLocation || [4.220219, 100.671688];
                    const input = window.prompt(
                      'Manually key in Robot GY-NEO8M GPS Coordinates (Latitude, Longitude):',
                      `${current[0].toFixed(6)}, ${current[1].toFixed(6)}`
                    );
                    if (input) {
                      const parts = input.split(',').map((p) => parseFloat(p.trim()));
                      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        setRobotLocationDirect([parts[0], parts[1]]);
                        if (onTrackPerson) onTrackPerson([parts[0], parts[1]]);
                      } else {
                        alert('Invalid format. Please enter as: 4.220219, 100.671688');
                      }
                    }
                  }}
                  className="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 hover:text-white px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 border border-cyan-500/30 transition-all cursor-pointer"
                  title="Manually key in Robot coordinates (magnitude)"
                >
                  <Edit3 size={10} />
                  <span>Manual</span>
                </button>

                {hardwareGps?.isValid && (
                  <span className="text-[9px] px-1 py-0.2 rounded font-sans font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {hardwareGps.satellites} Sats
                  </span>
                )}

                <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold uppercase tracking-wider ${
                  isPersonDetectedAtRobot
                    ? 'bg-rose-600 text-white border border-rose-400 animate-pulse'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {isPersonDetectedAtRobot ? '🚨 TARGET' : `${robotSpeed} km/h • ${robotHeading}°`}
                </span>
              </div>

              {/* Base Station PC GPS */}
              <div className="bg-[#162347]/95 text-[#FAF7F2] backdrop-blur-md px-2.5 py-1 rounded-md shadow-md border border-sky-400/60 text-[11px] font-mono flex items-center gap-1.5">
                <button
                  onClick={async () => {
                    const newLoc = await refreshComputerLocation();
                    const target = newLoc || baseLocation;
                    if (onTrackPerson) onTrackPerson(target);
                  }}
                  className="flex items-center gap-1 font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                  title="Click to Center on Ground Station / PC GPS"
                >
                  <Laptop size={13} className="text-sky-300" />
                  <span>PC GPS:</span>
                  <span className="font-bold text-white">
                    {baseLocation[0].toFixed(5)}°, {baseLocation[1].toFixed(5)}°
                  </span>
                </button>

                <button
                  onClick={() => {
                    const input = window.prompt('Set Computer GPS Coordinates (lat, lng):', `${baseLocation[0]}, ${baseLocation[1]}`);
                    if (input) {
                      const parts = input.split(',').map((p) => parseFloat(p.trim()));
                      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        setManualComputerLocation([parts[0], parts[1]]);
                        if (onTrackPerson) onTrackPerson([parts[0], parts[1]]);
                      } else {
                        alert('Invalid format. Please enter as: 1.8642, 103.1142');
                      }
                    }
                  }}
                  className="bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 hover:text-white px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 border border-sky-500/30 transition-all cursor-pointer"
                  title="Manually Set / Calibrate Computer Coordinates"
                >
                  <Edit3 size={10} />
                </button>
              </div>

              {/* Target GPS Coordination Badge (Only if target is detected) */}
              {(manifestPersons.some(p => p.location !== null) || (detectionStatus.personDetected && robotLocation)) && (
                <div className="bg-rose-950/90 text-white backdrop-blur-md px-2.5 py-1 rounded-md shadow-md border border-rose-500/60 text-[10px] font-mono flex items-center gap-1.5 animate-pulse">
                  <MapPin size={12} className="text-rose-400" />
                  <span className="font-bold text-rose-300">TARGET:</span>
                  <span className="font-bold text-white">
                    {manifestPersons[0]?.location
                      ? `${manifestPersons[0].location[0].toFixed(5)}°, ${manifestPersons[0].location[1].toFixed(5)}°`
                      : robotLocation
                      ? `${robotLocation[0].toFixed(5)}°, ${robotLocation[1].toFixed(5)}°`
                      : 'Locked'}
                  </span>
                  {(manifestPersons.length > 0 || detectionApi.activeIncident) && (
                    <button
                      onClick={() => {
                        const inc = detectionApi.activeIncident || manifestPersons[0]?.incident;
                        if (inc) onInspectIncident(inc, manifestPersons[0]?.personId);
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white px-1.5 py-0.2 rounded text-[9px] font-bold cursor-pointer transition-all"
                    >
                      Inspect
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Map Layer Dropbox (<select>) & Maximize Map Control */}
            <div className="pointer-events-auto flex items-center gap-2">
              {/* Map Layer Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#162347]/95 backdrop-blur-md text-slate-200 border border-slate-700/80 rounded-md px-2.5 py-1 shadow-md text-[10px] font-mono">
                <Layers size={12} className="text-cyan-400" />
                <label htmlFor="tactical-map-layer" className="text-slate-400 font-bold uppercase text-[9px]">Map:</label>
                <select
                  id="tactical-map-layer"
                  value={mapTileSource}
                  onChange={(e) => setMapTileSource(e.target.value as any)}
                  className="bg-[#0f172a] text-cyan-300 font-bold border border-slate-700 rounded px-2 py-0.5 text-[10px] font-mono outline-none cursor-pointer focus:border-cyan-400"
                >
                  <option value="google">Google Maps (Street)</option>
                  <option value="google-hybrid">Google Hybrid (Satellite)</option>
                  <option value="carto">CARTO Voyager</option>
                  <option value="osm">OpenStreetMap</option>
                </select>
              </div>

              {onMaximizeMap && (
                <button
                  onClick={onMaximizeMap}
                  className="bg-[#162347]/95 backdrop-blur-md hover:bg-[#1f2f5c] text-white border border-slate-700/80 px-2.5 py-1 rounded-md shadow-md flex items-center gap-1 text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95"
                  title={isMapMaximized ? "Restore split layout" : "Make map bigger (full workspace)"}
                >
                  {isMapMaximized ? <Minimize2 size={12} className="text-cyan-400" /> : <Maximize2 size={12} className="text-cyan-400" />}
                  <span>{isMapMaximized ? 'Split' : 'Full Map'}</span>
                </button>
              )}
            </div>
          </div>

          <MapContainer
            center={focusedLocation || baseLocation}
            zoom={15}
            minZoom={4}
            maxZoom={20}
            preferCanvas={true}
            scrollWheelZoom={true}
            className="w-full h-full bg-[#0F172A]"
          >
            <MapResizerAndController center={focusedLocation} computerLocation={baseLocation} />

            {mapTileSource === 'google' && (
              <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                subdomains={['0', '1', '2', '3']}
                maxZoom={20}
                minZoom={10}
                keepBuffer={8}
                updateWhenZooming={false}
              />
            )}

            {mapTileSource === 'google-hybrid' && (
              <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                subdomains={['0', '1', '2', '3']}
                maxZoom={20}
                minZoom={10}
                keepBuffer={8}
                updateWhenZooming={false}
              />
            )}

            {mapTileSource === 'carto' && (
              <TileLayer
                attribution='&copy; CARTO &copy; OpenStreetMap contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                subdomains="abcd"
                maxZoom={18}
                minZoom={10}
                keepBuffer={8}
                updateWhenZooming={false}
              />
            )}

            {mapTileSource === 'osm' && (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={18}
                minZoom={10}
                keepBuffer={8}
                updateWhenZooming={false}
              />
            )}

            <MapClickHandler onMapClick={(lat, lng) => setWaypoint([lat, lng])} />

            {/* Operator Ground Control PC Marker */}
            {baseLocation && (
              <Marker position={baseLocation} icon={computerIcon}>
                <Popup>
                  <div className="font-mono text-xs space-y-1.5 min-w-[210px]">
                    <div className="border-b pb-1 font-bold text-sky-700 flex items-center gap-1.5">
                      <span>💻</span> OPERATOR GROUND CONTROL (PC)
                    </div>
                    <div className="bg-sky-50 border border-sky-200/80 p-2 rounded space-y-1">
                      <div className="text-[10px] text-sky-800 font-sans font-bold uppercase tracking-wider">
                        Computer Live GPS
                      </div>
                      <div className="text-[#162347] font-bold">
                        LAT: <span className="text-sky-700">{baseLocation[0].toFixed(6)}° N</span>
                      </div>
                      <div className="text-[#162347] font-bold">
                        LNG: <span className="text-sky-700">{baseLocation[1].toFixed(6)}° E</span>
                      </div>
                      {computerAccuracy && (
                        <div className="text-[10px] text-slate-500 font-sans">
                          Device Precision: ±{computerAccuracy}m
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Ground Control Station Active • Targets co-located
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Real-Time Live Detected Person Marker (active while camera detects a person and robot location is detected) */}
            {detectionStatus.personDetected && robotLocation && (
              <Fragment key="live-person-marker">
                <Circle
                  center={robotLocation}
                  radius={22}
                  pathOptions={{
                    color: '#EF4444',
                    fillColor: '#EF4444',
                    fillOpacity: 0.35,
                    weight: 2,
                    dashArray: '4 4',
                  }}
                />
                <Marker position={robotLocation} icon={livePersonIcon}>
                  <Popup>
                    <div className="font-mono text-xs space-y-1.5 min-w-[220px]">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-bold text-rose-600 flex items-center gap-1">
                          🚨 LIVE TARGET DETECTED
                        </span>
                        <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                          ACTIVE
                        </span>
                      </div>

                      <div className="bg-rose-50 border border-rose-200 p-2 rounded space-y-1 text-[11px]">
                        <div className="text-rose-800 font-sans text-[10px] uppercase font-bold tracking-wider">
                          Target GPS Coordination (Live)
                        </div>
                        <div className="text-[#162347] font-bold">
                          LAT: <span className="text-rose-600 font-mono">{robotLocation[0].toFixed(6)}° N</span>
                        </div>
                        <div className="text-[#162347] font-bold">
                          LNG: <span className="text-rose-600 font-mono">{robotLocation[1].toFixed(6)}° E</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans italic">
                          (Co-located at FloodScout-01 Vessel)
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-600 flex items-center justify-between pt-0.5">
                        <span>People in frame: <strong className="text-rose-600">{detectionStatus.personCount}</strong></span>
                        <span>Score: <strong className="text-emerald-700">{(detectionStatus.highestConfidence).toFixed(2)}</strong></span>
                      </div>

                      {(detectionApi.activeIncident || manifestPersons[0]) && (
                        <button
                          onClick={() => {
                            const inc = detectionApi.activeIncident || manifestPersons[0]?.incident;
                            if (inc) onInspectIncident(inc, manifestPersons[0]?.personId);
                          }}
                          className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-mono font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-98"
                        >
                          <Eye size={13} />
                          <span>Inspect Live Target</span>
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </Fragment>
            )}

            {/* AI Camera Detected Persons (Recorded Manifest) */}
            {manifestPersons.map(p => (
              p.location && (
                <Fragment key={`person-marker-${p.personId}`}>
                  <Circle
                    center={p.location}
                    radius={18}
                    pathOptions={{
                      color: '#EF4444',
                      fillColor: '#EF4444',
                      fillOpacity: 0.25,
                      weight: 1.5,
                    }}
                  />
                  <Marker position={p.location} icon={getVictimMarkerIcon('Detected')}>
                    <Popup>
                      <div className="font-mono text-xs space-y-1.5 min-w-[220px]">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-bold text-rose-600 flex items-center gap-1">
                            🚨 PERSON DETECTED
                          </span>
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            #{p.personId}
                          </span>
                        </div>

                        <div className="bg-rose-50 border border-rose-200 p-2 rounded space-y-1 text-[11px]">
                          <div className="text-rose-800 font-sans text-[10px] uppercase font-bold tracking-wider">
                            Target GPS Coordination
                          </div>
                          <div className="text-[#162347] font-bold">
                            LAT: <span className="text-rose-600 font-mono">{p.location[0].toFixed(6)}° N</span>
                          </div>
                          <div className="text-[#162347] font-bold">
                            LNG: <span className="text-rose-600 font-mono">{p.location[1].toFixed(6)}° E</span>
                          </div>
                        </div>

                        {p.cropUrl && (
                          <div className="rounded overflow-hidden border border-slate-200 shadow-xs">
                            <img
                              src={`${detectionApi.apiBaseUrl}${p.cropUrl}`}
                              alt={p.label}
                              className="w-full h-24 object-cover"
                            />
                          </div>
                        )}

                        <div className="text-[10px] text-slate-600 flex items-center justify-between pt-0.5">
                          <span>Confidence: <strong className="text-emerald-700">{(p.score).toFixed(1)}%</strong></span>
                          <span className="text-slate-400">{p.time}</span>
                        </div>

                        <button
                          onClick={() => onInspectIncident(p.incident, p.personId)}
                          className="w-full mt-2 bg-[#162347] hover:bg-[#24355E] text-white text-[11px] font-mono font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-98"
                        >
                          <Eye size={13} className="text-emerald-400" />
                          <span>Inspect Person #{p.personId}</span>
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </Fragment>
              )
            ))}

            {/* Context Victims (Simulated / Initial) */}
            {victims.map(v => (
              v.location && (
                <Marker key={v.id} position={v.location} icon={getVictimMarkerIcon(v.status)}>
                  <Popup>
                    <div className="font-mono text-xs space-y-1">
                      <strong className="text-rose-600">🚨 {v.id} ({v.status})</strong>
                      <div className="text-[10px] text-slate-600">
                        GPS: {v.location[0].toFixed(6)}°, {v.location[1].toFixed(6)}°
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}

            {/* Pulsing Alert Zone around Robot when Person is Detected */}
            {isPersonDetectedAtRobot && robotLocation && (
              <Circle
                center={robotLocation}
                radius={24}
                pathOptions={{
                  color: '#EF4444',
                  fillColor: '#EF4444',
                  fillOpacity: 0.35,
                  weight: 2,
                  dashArray: '4 4',
                }}
              />
            )}

            {/* 2. Robot Vessel Marker (Only rendered when real robot GPS is detected) */}
            {robotLocation && (
              <Marker
                position={robotLocation}
                icon={getRobotIcon(isPersonDetectedAtRobot)}
                eventHandlers={{
                  click: () => {
                    if (isPersonDetectedAtRobot) {
                      onShowVictimManifest?.();
                    }
                  },
                }}
              >
                <Popup>
                  <div className="font-mono text-xs space-y-1.5 min-w-[220px]">
                    <div className={`border-b pb-1 font-bold flex items-center justify-between ${
                      isPersonDetectedAtRobot ? 'text-rose-600' : 'text-cyan-700'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        {isPersonDetectedAtRobot ? '🚨 2. PERSON DETECTED AT ROBOT!' : '🤖 2. FLOODSCOUT-01 (ROBOT)'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isPersonDetectedAtRobot
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                      }`}>
                        {isPersonDetectedAtRobot ? 'ALERT' : 'LIVE'}
                      </span>
                    </div>

                    <div className={`p-2 rounded space-y-1 ${
                      isPersonDetectedAtRobot
                        ? 'bg-rose-50 border border-rose-200'
                        : 'bg-cyan-50 border border-cyan-200'
                    }`}>
                      <div className={`text-[10px] font-sans font-bold uppercase tracking-wider ${
                        isPersonDetectedAtRobot ? 'text-rose-800' : 'text-cyan-900'
                      }`}>
                        {isPersonDetectedAtRobot ? 'Victim Flagged at Coordinates' : 'Live Real-Time Telemetry'}
                      </div>
                      <div className="text-[#162347] font-bold">
                        LAT: <span className={isPersonDetectedAtRobot ? 'text-rose-600 font-mono' : 'text-cyan-700 font-mono'}>
                          {robotLocation[0].toFixed(6)}° N
                        </span>
                      </div>
                      <div className="text-[#162347] font-bold">
                        LNG: <span className={isPersonDetectedAtRobot ? 'text-rose-600 font-mono' : 'text-cyan-700 font-mono'}>
                          {robotLocation[1].toFixed(6)}° E
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 flex justify-between pt-0.5">
                        <span>Speed: {robotSpeed} km/h</span>
                        <span>Heading: {robotHeading}°</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-sans">
                      Bat: {batteryLevel}% • Link: {connectionStatus} • Depth: {waterDepth}m
                    </div>

                    {isPersonDetectedAtRobot && (
                      <button
                        onClick={() => onShowVictimManifest?.()}
                        className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-mono font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-98"
                      >
                        <Target size={13} />
                        <span>Open Victim Manifest</span>
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {waypoint && <Circle center={waypoint} radius={20} pathOptions={{ color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.4 }} />}
          </MapContainer>
        </div>
      );

    case 'navigation':
      return (
        <div className="h-full overflow-y-auto p-4 flex flex-col items-center min-h-0 bg-[#12141a] text-slate-200 select-none">
          <div className="m-auto flex flex-col items-center gap-4 w-full max-w-xs py-2">
            {/* Camera Pan/Tilt Servo Control Header */}
            <div className="w-full text-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center justify-center gap-1.5">
                <Compass size={12} className="text-emerald-400" /> Camera Pan &amp; Tilt Arm
              </span>
              <span className="text-[9px] text-slate-500 font-sans block mt-0.5">
                Aim water-level camera (GPIO 18 Pan • GPIO 19 Tilt)
              </span>
            </div>

            {/* D-Pad for Camera Servos */}
            <div className="grid grid-cols-3 gap-2 w-40">
              <div />
              <button
                onClick={() => panTilt.sendCommand('up')}
                disabled={panTilt.isProcessing}
                className="h-10 rounded bg-[#1a1e2a] hover:bg-emerald-600 text-slate-200 hover:text-white border border-[#272e40] flex items-center justify-center transition-all active:scale-95 shadow-xs disabled:opacity-75 cursor-pointer select-none"
                title="Tilt Camera Up (+10°)"
              >
                <ArrowUp size={18} />
              </button>
              <div />

              <button
                onClick={() => panTilt.sendCommand('left')}
                disabled={panTilt.isProcessing}
                className="h-10 rounded bg-[#1a1e2a] hover:bg-emerald-600 text-slate-200 hover:text-white border border-[#272e40] flex items-center justify-center transition-all active:scale-95 shadow-xs disabled:opacity-75 cursor-pointer select-none"
                title="Pan Camera Left (-10°)"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={(e) => {
                  setOperatingMode('MANUAL');
                  if (e.shiftKey) {
                    panTilt.sendCommand('center');
                  } else {
                    panTilt.sendCommand('stop');
                  }
                }}
                onDoubleClick={() => panTilt.sendCommand('center')}
                disabled={panTilt.isProcessing}
                className="h-10 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Hold Camera Position (Double-click to Center 90°/90°)"
              >
                STOP
              </button>
              <button
                onClick={() => panTilt.sendCommand('right')}
                disabled={panTilt.isProcessing}
                className="h-10 rounded bg-[#1a1e2a] hover:bg-emerald-600 text-slate-200 hover:text-white border border-[#272e40] flex items-center justify-center transition-all active:scale-95 shadow-xs disabled:opacity-75 cursor-pointer select-none"
                title="Pan Camera Right (+10°)"
              >
                <ArrowRight size={18} />
              </button>

              <div />
              <button
                onClick={() => panTilt.sendCommand('down')}
                disabled={panTilt.isProcessing}
                className="h-10 rounded bg-[#1a1e2a] hover:bg-emerald-600 text-slate-200 hover:text-white border border-[#272e40] flex items-center justify-center transition-all active:scale-95 shadow-xs disabled:opacity-75 cursor-pointer select-none"
                title="Tilt Camera Down (-10°)"
              >
                <ArrowDown size={18} />
              </button>
              <div />
            </div>

            {/* ESP32 Wi-Fi Pan/Tilt Connection Status & Center Reset */}
            <div className="w-full flex items-center justify-between px-3 py-1.5 rounded bg-[#171a23] border border-[#242938] font-mono text-[10px]">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Compass size={12} className="text-emerald-400" />
                <span className="font-semibold uppercase tracking-wider text-[9px] text-slate-400">Pan/Tilt</span>
                <button
                  type="button"
                  onClick={() => {
                    const input = window.prompt(
                      `Enter ESP32 IP address or URL:\n(e.g., 192.168.0.50 or http://192.168.0.50)`,
                      panTilt.esp32Url
                    );
                    if (input && input.trim()) {
                      panTilt.setEsp32Url(input.trim());
                      panTilt.fetchStatus();
                    }
                  }}
                  className="flex items-center gap-1 cursor-pointer focus:outline-none"
                  title={`ESP32 URL: ${panTilt.esp32Url} (Click to change IP)`}
                >
                  {panTilt.connected ? (
                    <span className="font-bold text-xs text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-emerald-900 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ESP32: Online
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-amber-900 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      ESP32: Offline
                      <Wifi size={10} className="text-amber-400 ml-0.5" />
                    </span>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {panTilt.isProcessing && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" title="Sending command..." />
                )}
                {panTilt.connected ? (
                  <button
                    type="button"
                    onClick={() => panTilt.sendCommand('center')}
                    className="px-2 py-0.5 rounded bg-[#202534] hover:bg-[#2b3346] text-white text-[9px] font-bold transition-all active:scale-95 cursor-pointer border border-[#2e374c]"
                    title="Reset Sonar to Neutral / Center"
                  >
                    CENTER
                  </button>
                ) : (
                  <span className="text-[9px] text-slate-500 font-mono italic">
                    Offline
                  </span>
                )}
              </div>
            </div>

            {/* Graceful Pan/Tilt Error Message */}
            {panTilt.error && (
              <div
                onClick={() => {
                  const input = window.prompt(
                    `Enter ESP32 IP address or URL:\n(e.g., 192.168.0.50 or http://192.168.0.50)`,
                    panTilt.esp32Url
                  );
                  if (input && input.trim()) {
                    panTilt.setEsp32Url(input.trim());
                    panTilt.fetchStatus();
                  }
                }}
                className="w-full text-center text-[10px] font-mono text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded px-2 py-1 animate-fadeIn cursor-pointer hover:bg-amber-900/50 transition-colors"
                title="Click to configure ESP32 IP address"
              >
                <span>{panTilt.error} <span className="underline font-semibold ml-1">(Click to set IP)</span></span>
              </div>
            )}

            {/* Dual Thruster & Motor Movement Telemetry */}
            <MotorTelemetryCard />
          </div>
        </div>
      );

    case 'victims': {
      const hasEntries = victimSortBy === 'person' ? manifestPersons.length > 0 : incidentsByTime.length > 0;

      return (
        <div className="h-full overflow-y-auto p-3 space-y-3 bg-[#101217] text-slate-200 select-none">
          {/* Header & Arrangement Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#212634]">
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-rose-400" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Victim Manifest ({victimSortBy === 'person' ? manifestPersons.length : incidentsByTime.length})
              </span>
            </div>

            {/* Arrangement Selector: By Person vs By TIME */}
            <div className="flex items-center gap-1 bg-[#171a24] p-0.5 rounded border border-[#262c3d] text-[10px] font-mono font-bold">
              <span className="text-[9px] text-slate-500 px-1 uppercase flex items-center gap-1">
                <ArrowUpDown size={10} /> Sort:
              </span>
              <button
                onClick={() => setVictimSortBy('person')}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  victimSortBy === 'person'
                    ? 'bg-[#252b3d] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-[#1f2433]'
                }`}
                title="Arrange by Person ID"
              >
                By Person
              </button>
              <button
                onClick={() => setVictimSortBy('time')}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  victimSortBy === 'time'
                    ? 'bg-[#252b3d] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-[#1f2433]'
                }`}
                title="Arrange by Time"
              >
                By Time
              </button>
            </div>
          </div>

          {/* Manifest Content */}
          {hasEntries ? (
            <div className="space-y-2.5">
              {/* ── VIEW 1: BY PERSON ── */}
              {victimSortBy === 'person' &&
                manifestPersons.map((v) => (
                  <div
                    key={v.personId}
                    className="p-3 rounded bg-[#161822] border border-[#242938] hover:border-emerald-500/50 shadow-xs transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      {/* Left: Cropped Picture + Person ID Info */}
                      <div className="flex items-center gap-3">
                        {v.cropUrl ? (
                          <div
                            onClick={() => onInspectIncident(v.incident, v.personId)}
                            className="w-14 h-14 rounded overflow-hidden bg-black shrink-0 border border-slate-700 shadow-xs cursor-pointer hover:border-emerald-400 transition-all group relative"
                            title={`Inspect ${v.label}`}
                          >
                            <img
                              src={`${detectionApi.apiBaseUrl}${v.cropUrl}`}
                              alt={v.label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={12} />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#202534] border border-[#2f374c] text-slate-200 font-mono font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                            #{v.personId}
                          </div>
                        )}

                        <div>
                          <div className="font-mono font-bold text-sm text-slate-100 flex items-center gap-1.5">
                            <span>{v.label}</span>
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                              Score: {v.score.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{v.incident.id}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-slate-300 font-semibold">
                              <Clock size={10} /> {v.time}
                            </span>
                            <span className="text-[9px] bg-sky-950 text-sky-300 border border-sky-600/40 px-1.5 py-0.5 rounded font-bold font-mono">
                              {v.captureCount} {v.captureCount === 1 ? 'photo' : 'photos'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Inspect Button */}
                      <button
                        onClick={() => onInspectIncident(v.incident, v.personId)}
                        className="bg-[#202534] hover:bg-[#2b3246] text-white border border-[#333d54] px-2.5 py-1.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </div>

                    {/* Person GPS Coordination & Track on Map */}
                    <div className="flex items-center justify-between text-[11px] font-mono bg-[#211417] border border-rose-500/30 px-2.5 py-1 rounded text-rose-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <MapPin size={12} className="text-rose-400 animate-pulse shrink-0" />
                        <span>
                          {v.location ? `GPS: ${v.location[0].toFixed(6)}° N, ${v.location[1].toFixed(6)}° E` : 'GPS: No Location Detected'}
                        </span>
                      </div>
                      {v.location && onTrackPerson && (
                        <button
                          onClick={() => onTrackPerson(v.location!)}
                          className="bg-[#2c181c] hover:bg-[#3d1f25] border border-rose-500/40 text-rose-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                          title="Locate person on Tactical Map"
                        >
                          <Navigation size={10} /> Track on Map
                        </button>
                      )}
                    </div>

                    {v.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-tight bg-[#11131a] p-2 rounded border border-[#212634] font-sans">
                        {v.description}
                      </p>
                    )}
                  </div>
                ))}

              {/* ── VIEW 2: BY TIME ── */}
              {victimSortBy === 'time' &&
                incidentsByTime.map((inc, incIdx) => {
                  const personList = inc.personDetails && inc.personDetails.length > 0
                    ? inc.personDetails
                    : (inc.personImages || []).map((url, idx) => {
                        const m = url.match(/person_(\d+)/);
                        const pId = m ? parseInt(m[1]) : idx + 1;
                        return { id: pId, label: `Person #${pId}`, imageUrl: url, score: inc.highestConfidence };
                      });
                  const incLocation = getPersonGps(incIdx + 1, baseLocation);

                  return (
                    <div
                      key={inc.id}
                      className="p-3.5 rounded bg-[#161822] border border-[#242938] hover:border-emerald-500/50 shadow-xs transition-all space-y-2.5"
                    >
                      {/* Incident Header: INC-... and Time */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-100">{inc.id}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-rose-950 text-rose-300 border border-rose-500/30">
                            {inc.personCount} Person{inc.personCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 font-semibold">
                          <Clock size={12} className="text-slate-500" /> {inc.time}
                        </div>
                      </div>

                      {/* Incident GPS Coordination */}
                      <div className="flex items-center justify-between text-[11px] font-mono bg-[#211417] border border-rose-500/30 px-2.5 py-1 rounded text-rose-300">
                        <div className="flex items-center gap-1.5 font-bold">
                          <MapPin size={12} className="text-rose-400 animate-pulse shrink-0" />
                          <span>
                            {incLocation ? `GPS: ${incLocation[0].toFixed(6)}° N, ${incLocation[1].toFixed(6)}° E` : 'GPS: No Location Detected'}
                          </span>
                        </div>
                        {incLocation && onTrackPerson && (
                          <button
                            onClick={() => onTrackPerson(incLocation)}
                            className="bg-[#2c181c] hover:bg-[#3d1f25] border border-rose-500/40 text-rose-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                            title="Locate incident on Tactical Map"
                          >
                            <Navigation size={10} /> Track on Map
                          </button>
                        )}
                      </div>

                      {/* Original Scene Image */}
                      {inc.originalImageUrl && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono font-semibold uppercase text-slate-400 flex items-center gap-1">
                            <Eye size={11} className="text-sky-400" /> Original Capture:
                          </div>
                          <div
                            onClick={() => onInspectIncident(inc)}
                            className="w-full rounded overflow-hidden border border-[#2a3042] bg-black cursor-pointer hover:border-emerald-400 transition-all group relative"
                            style={{ maxHeight: '140px' }}
                          >
                            <img
                              src={`${detectionApi.apiBaseUrl}${inc.originalImageUrl}`}
                              alt={`${inc.id} original`}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                              style={{ maxHeight: '140px', objectFit: 'cover' }}
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={16} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cropped Pictures Row by Time */}
                      {personList.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-mono font-semibold uppercase text-slate-400 flex items-center gap-1">
                            <User size={11} className="text-emerald-400" /> Cropped Persons:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {personList.map((p, idx) => (
                              <div
                                key={idx}
                                onClick={() => onInspectIncident(inc, p.id)}
                                className="flex items-center gap-2 p-1.5 rounded bg-[#12141c] border border-[#242a3a] hover:border-emerald-400 cursor-pointer transition-all group"
                              >
                                <div className="w-12 h-12 rounded overflow-hidden bg-black shrink-0 border border-slate-700">
                                  <img
                                    src={`${detectionApi.apiBaseUrl}${p.imageUrl}`}
                                    alt={p.label}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                                <div className="font-mono pr-1">
                                  <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1">
                                    <span>{p.label}</span>
                                    {(p as any).isReturning && (
                                      <span className="text-[8px] bg-amber-950 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                        Returning
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-emerald-400 font-semibold">
                                    Score: {p.score !== undefined ? p.score.toFixed(2) : inc.highestConfidence.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Description */}
                      {inc.description && (
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-tight bg-[#11131a] p-2 rounded border border-[#212634] font-sans">
                          {inc.description}
                        </p>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#202534] text-[10px] font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${
                            inc.descriptionStatus === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : inc.descriptionStatus === 'pending'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {inc.descriptionStatus === 'completed'
                            ? 'AI Observation Ready'
                            : inc.descriptionStatus === 'pending'
                            ? 'Analyzing Scene...'
                            : 'AI Offline'}
                        </span>
                        <button
                          onClick={() => onInspectIncident(inc)}
                          className="bg-[#202534] hover:bg-[#2b3246] border border-[#333d54] text-white px-2.5 py-1 rounded text-[10px] flex items-center gap-1 font-bold transition-colors cursor-pointer"
                        >
                          <Eye size={12} /> Inspect Incident
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            /* Clean Empty State */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 my-auto">
              <div className="w-12 h-12 rounded-full bg-[#1b202c] border border-[#272e40] flex items-center justify-center text-slate-400">
                <Users size={24} />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  No Victims Currently Detected
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed font-mono">
                  OpenCV HOG + SVM person detector is monitoring the stream. Detected persons will appear here in real-time.
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'status':
      return (
        <RescueLocationAnalysis
          robotLocation={robotLocation}
          robotHeading={robotHeading}
          robotSpeed={robotSpeed}
          waterDepth={waterDepth}
          batteryLevel={batteryLevel}
          connectionStatus={connectionStatus}
          operatingMode={operatingMode}
          signalDbm={signalDbm}
          activeMission={activeMission}
          trajectory={trajectory}
          victims={victims}
          manifestPersons={manifestPersons}
          detectionStatus={detectionStatus}
          baseLocation={baseLocation}
          onSelectLocation={onTrackPerson}
          onInspectIncident={onInspectIncident}
          onShowVictimManifest={onShowVictimManifest}
        />
      );

    case 'log': {
      const { history, detectionStatus, backendOnline, cameraStatus } = detectionApi;
      const filteredHistory = logFilter === 'victims'
        ? (history || []).filter((h) => h.type === 'person_detected')
        : (history || []);
      const victimCountInHistory = (history || []).filter((h) => h.type === 'person_detected').length;
      const isLiveVictimDetected = Boolean(
        detectionStatus.personDetected &&
        (detectionStatus.personCount && detectionStatus.personCount > 0)
      );

      return (
        <div className="h-full flex flex-col bg-[#0f131c] font-mono text-xs select-none">
          {/* Header Controls */}
          <div className="p-2.5 pb-2 border-b border-[#212738] bg-[#141824] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-sky-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                Live Mission & OpenCV Log
              </span>
              {isLiveVictimDetected ? (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white animate-pulse flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  VICTIM DETECTED ({detectionStatus.personCount})
                </span>
              ) : backendOnline ? (
                <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CV Active
                </span>
              ) : (
                <span className="text-[9px] text-amber-400 bg-amber-950/80 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  Connecting...
                </span>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#1a2030] p-0.5 rounded border border-[#2b334a] text-[10px]">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  logFilter === 'all' ? 'bg-[#293248] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({(history || []).length})
              </button>
              <button
                onClick={() => setLogFilter('victims')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  logFilter === 'victims' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-rose-300'
                }`}
              >
                <span>Victims</span>
                <span className="px-1 rounded bg-black/30 text-[9px]">{victimCountInHistory}</span>
              </button>
            </div>
          </div>

          {/* Real-time Target Acquisition Banner when person is actively detected in frame */}
          {isLiveVictimDetected && (
            <div className="m-2.5 mb-1 p-2.5 rounded bg-rose-950/90 border border-rose-500/80 text-rose-100 flex items-center justify-between shadow-lg animate-pulse shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-600/40 border border-rose-400 flex items-center justify-center text-rose-200 shrink-0">
                  <Target size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div>
                  <div className="font-bold text-[11px] text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Target Lock: Victim in Sights</span>
                    <span className="bg-rose-600 text-white px-1.5 py-0.2 rounded text-[9px] font-bold">
                      {detectionStatus.personCount} Person{detectionStatus.personCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-[10px] text-rose-300/80 font-mono mt-0.5">
                    Decision Score: {detectionStatus.highestConfidence.toFixed(2)} • OpenCV HOG+SVM Active Tracking
                  </div>
                </div>
              </div>
              {baseLocation && onTrackPerson && (
                <button
                  onClick={() => onTrackPerson(baseLocation)}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Navigation size={10} /> Map
                </button>
              )}
            </div>
          )}

          {/* Scrollable Event Feed */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((log) => {
                const isVictim = log.type === 'person_detected';
                return (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded border transition-all ${
                      isVictim
                        ? 'bg-[#1e141a] border-rose-500/40 hover:border-rose-400 shadow-sm'
                        : 'bg-[#131620] border-[#222838] hover:border-[#2f3850]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                          <Clock size={10} className="text-slate-500" />
                          {log.time}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            isVictim
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isVictim ? '🚨 VICTIM DETECTED' : '✓ ZONE CLEAR'}
                        </span>
                      </div>
                      {log.confidence > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400 font-mono">
                          Score: {log.confidence.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className={`mt-1 text-[11px] leading-relaxed font-sans ${isVictim ? 'text-rose-100 font-medium' : 'text-slate-300'}`}>
                      {log.message}
                    </div>
                    {isVictim && baseLocation && onTrackPerson && (
                      <div className="mt-1.5 pt-1.5 border-t border-rose-500/20 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>GPS: {baseLocation[0].toFixed(5)}°N, {baseLocation[1].toFixed(5)}°E</span>
                        <button
                          onClick={() => onTrackPerson(baseLocation)}
                          className="text-rose-300 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <Navigation size={9} /> Plot Target
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-400">
                <div className="w-10 h-10 rounded-full bg-[#181d2a] border border-[#252c3e] flex items-center justify-center text-slate-400">
                  <Cpu size={18} className="text-sky-400" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  OpenCV Detector Standby
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs font-mono">
                  OpenCV HOG+SVM is analyzing camera frames at ~{cameraStatus.detectorFps || 55} FPS. New victim encounters will stream here live.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'sensors':
      return <ObstacleSensorSection />;
  }
}

function LayoutRenderer({
  node,
  dropIndicator,
  onClose,
  detectionApi,
  panTilt,
  onInspectIncident,
  focusedLocation,
  onTrackPerson,
  onMaximize,
  isMaximized,
  onShowVictimManifest,
  isMissionActive,
  onToggleMission,
  isRecording,
  recordingSeconds,
  onToggleRecording,
  isStudioMode,
  onToggleStudioMode,
  activeSceneId,
  onSelectScene,
  onOpenSettings,
}: {
  node: LayoutNode | null;
  dropIndicator: { panelId: PanelId; position: 'top' | 'bottom' | 'left' | 'right' } | null;
  onClose: (id: PanelId) => void;
  detectionApi: ReturnType<typeof useDetectionApi>;
  panTilt: UsePanTiltReturn;
  onInspectIncident: (inc: RescueIncident, personId?: number) => void;
  focusedLocation?: [number, number] | null;
  onTrackPerson?: (loc: [number, number]) => void;
  onMaximize: (id: PanelId) => void;
  isMaximized: (id: PanelId) => boolean;
  onShowVictimManifest?: () => void;
  isMissionActive?: boolean;
  onToggleMission?: () => void;
  isRecording?: boolean;
  recordingSeconds?: number;
  onToggleRecording?: () => void;
  isStudioMode?: boolean;
  onToggleStudioMode?: () => void;
  activeSceneId?: string;
  onSelectScene?: (scene: SceneItem) => void;
  onOpenSettings?: () => void;
}) {
  if (!node) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 bg-[#0d0f14]">
        <Target size={48} className="mb-4 opacity-40 text-slate-600" />
        <p className="font-mono text-base font-bold text-slate-400">NO DOCKS ACTIVE</p>
        <p className="text-xs font-mono uppercase tracking-widest mt-1 text-slate-600">Select a dock from the top bar or Docks menu</p>
      </div>
    );
  }

  if (node.type === 'panel') {
    return (
      <div className="h-full w-full overflow-hidden flex flex-col min-h-0 min-w-0">
        <SortablePanel
          id={node.id}
          onClose={() => onClose(node.id)}
          onMaximize={() => onMaximize(node.id)}
          isMaximized={isMaximized(node.id)}
          dropPosition={dropIndicator?.panelId === node.id ? dropIndicator.position : null}
        >
          <PanelContent
            id={node.id}
            detectionApi={detectionApi}
            panTilt={panTilt}
            onInspectIncident={onInspectIncident}
            focusedLocation={focusedLocation}
            onTrackPerson={onTrackPerson}
            onMaximizeMap={() => onMaximize('map')}
            isMapMaximized={isMaximized('map')}
            onShowVictimManifest={onShowVictimManifest}
          />
        </SortablePanel>
      </div>
    );
  }

  // Group node — pass orientation (not direction) as required by react-resizable-panels v4
  return (
    <PanelGroup
      orientation={node.direction}
      className="h-full w-full min-h-0 min-w-0"
    >
      {node.children.flatMap((child, index) => {
        const defaultSize = node.children.length > 0 ? Math.round(100 / node.children.length) : 50;

        const childEl = (
          <Panel
            key={child.type === 'panel' ? child.id : child.id}
            defaultSize={defaultSize}
            minSize={15}
            className="h-full w-full flex flex-col overflow-hidden min-h-0 min-w-0"
          >
            {child.type === 'panel' ? (
              <SortablePanel
                id={child.id}
                onClose={() => onClose(child.id)}
                onMaximize={() => onMaximize(child.id)}
                isMaximized={isMaximized(child.id)}
                dropPosition={dropIndicator?.panelId === child.id ? dropIndicator.position : null}
              >
                <PanelContent
                  id={child.id}
                  detectionApi={detectionApi}
                  panTilt={panTilt}
                  onInspectIncident={onInspectIncident}
                  focusedLocation={focusedLocation}
                  onTrackPerson={onTrackPerson}
                  onMaximizeMap={() => onMaximize('map')}
                  isMapMaximized={isMaximized('map')}
                  onShowVictimManifest={onShowVictimManifest}
                />
              </SortablePanel>
            ) : (
              <LayoutRenderer
                node={child}
                dropIndicator={dropIndicator}
                onClose={onClose}
                detectionApi={detectionApi}
                panTilt={panTilt}
                onInspectIncident={onInspectIncident}
                focusedLocation={focusedLocation}
                onTrackPerson={onTrackPerson}
                onMaximize={onMaximize}
                isMaximized={isMaximized}
                onShowVictimManifest={onShowVictimManifest}
                isMissionActive={isMissionActive}
                onToggleMission={onToggleMission}
                isRecording={isRecording}
                recordingSeconds={recordingSeconds}
                onToggleRecording={onToggleRecording}
                isStudioMode={isStudioMode}
                onToggleStudioMode={onToggleStudioMode}
                activeSceneId={activeSceneId}
                onSelectScene={onSelectScene}
                onOpenSettings={onOpenSettings}
              />
            )}
          </Panel>
        );
        if (index === 0) return [childEl];
        return [<ResizeHandle key={`rh-${node.id}-${index}`} orientation={node.direction} />, childEl];
      })}
    </PanelGroup>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { robotOnline, moveRobot, emergencyStop, robotLocation, computerLocation, batteryLevel } = useRescue();
  const detectionApi = useDetectionApi();
  const panTilt = usePanTilt();
  const [inspectedIncident, setInspectedIncident] = useState<RescueIncident | null>(null);
  const [inspectedPersonId, setInspectedPersonId] = useState<number | null>(null);
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [previousLayout, setPreviousLayout] = useState<LayoutNode | null>(null);

  // Broadcast & Mission State
  const [isMissionActive, setIsMissionActive] = useState<boolean>(true);
  const [missionUptime, setMissionUptime] = useState<number>(312);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isStudioMode, setIsStudioMode] = useState<boolean>(false);
  const [activeSceneId, setActiveSceneId] = useState<string>('sc-1');

  useEffect(() => {
    let recTimer: any;
    if (isRecording) {
      recTimer = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(recTimer);
  }, [isRecording]);

  useEffect(() => {
    let missionTimer: any;
    if (isMissionActive) {
      missionTimer = setInterval(() => setMissionUptime(s => s + 1), 1000);
    }
    return () => clearInterval(missionTimer);
  }, [isMissionActive]);

  const handleSelectLayoutPreset = useCallback((preset: 'obsStudio' | 'studioMode' | 'tacticalQuad' | 'aiVision' | 'mapFocus') => {
    if (preset === 'studioMode') {
      setIsStudioMode(true);
      return;
    }
    setIsStudioMode(false);
    if (preset === 'obsStudio') setLayout(DEFAULT_OBS_LAYOUT);
    else if (preset === 'tacticalQuad') setLayout(TACTICAL_QUAD_LAYOUT);
    else if (preset === 'aiVision') setLayout(AI_FOCUS_LAYOUT);
    else if (preset === 'mapFocus') setLayout(MAP_FOCUS_LAYOUT);
  }, []);

  const handleSelectScene = useCallback((scene: SceneItem) => {
    setActiveSceneId(scene.id);
    if (scene.preset === 'studioMode') {
      setIsStudioMode(true);
    } else {
      setIsStudioMode(false);
      if (scene.preset === 'obsStudio') setLayout(DEFAULT_OBS_LAYOUT);
      else if (scene.preset === 'tacticalQuad') setLayout(TACTICAL_QUAD_LAYOUT);
      else if (scene.preset === 'aiVision') setLayout(AI_FOCUS_LAYOUT);
      else if (scene.preset === 'mapFocus') setLayout(MAP_FOCUS_LAYOUT);
      else if (scene.preset === 'sonarSweep') {
        setLayout({
          type: 'group',
          id: 'sonar-sweep-group',
          direction: 'horizontal',
          children: [
            { type: 'panel', id: 'sensors' },
            { type: 'panel', id: 'camera' },
            { type: 'panel', id: 'navigation' },
          ],
        });
      }
    }
  }, []);

  const handleExportManifest = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      robotLocation,
      computerLocation,
      incidents: detectionApi.incidents,
      status: 'MISSION_ACTIVE',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floodscout_mission_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [robotLocation, computerLocation, detectionApi.incidents]);

  const handleCopyGps = useCallback(() => {
    const coords = robotLocation
      ? `${robotLocation[0].toFixed(6)}, ${robotLocation[1].toFixed(6)}`
      : computerLocation
      ? `${computerLocation[0].toFixed(6)}, ${computerLocation[1].toFixed(6)}`
      : '1.8642, 103.1142';
    navigator.clipboard.writeText(coords);
  }, [robotLocation, computerLocation]);

  // Connection & Server Settings Modal
  const [showConnectionModal, setShowConnectionModal] = useState<boolean>(false);
  const [backendInput, setBackendInput] = useState<string>(() => detectionApi.apiBaseUrl);
  const [esp32Input, setEsp32Input] = useState<string>(() => panTilt.esp32Url);
  const [connSavedMsg, setConnSavedMsg] = useState<string | null>(null);

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (backendInput.trim()) {
      detectionApi.setBackendUrl(backendInput.trim());
    }
    if (esp32Input.trim()) {
      panTilt.setEsp32Url(esp32Input.trim());
    }
    setConnSavedMsg('Settings saved! Reconnecting...');
    setTimeout(() => {
      detectionApi.refresh();
      panTilt.fetchStatus();
      setConnSavedMsg(null);
      setShowConnectionModal(false);
    }, 800);
  };

  const handleInspectIncident = useCallback((inc: RescueIncident, personId?: number) => {
    setInspectedIncident(inc);
    setInspectedPersonId(personId ?? null);
  }, []);

  const handleTrackPerson = useCallback((loc: [number, number]) => {
    setFocusedLocation(loc);
    setLayout((prev) => {
      if (!prev) return { type: 'panel', id: 'map' };
      if (!hasPanel(prev, 'map')) {
        return addDockPanel(prev, 'map');
      }
      return prev;
    });
  }, []);

  const handleShowVictimManifest = useCallback(() => {
    setLayout((prev) => {
      if (!prev) return { type: 'panel', id: 'victims' };
      if (!hasPanel(prev, 'victims')) {
        return addDockPanel(prev, 'victims');
      }
      return prev;
    });
  }, []);

  const [layout, setLayout] = useState<LayoutNode | null>(() => DEFAULT_OBS_LAYOUT);

  const handleMaximizePanel = useCallback((id: PanelId) => {
    setLayout((prev) => {
      // If already maximized to this single panel, restore previous layout (or default camera + map)
      if (prev && prev.type === 'panel' && prev.id === id) {
        if (previousLayout) return previousLayout;
        return {
          type: 'group',
          id: 'root-group',
          direction: 'horizontal',
          children: [
            { type: 'panel', id: 'camera' },
            { type: 'panel', id: 'map' },
          ],
        };
      }
      setPreviousLayout(prev);
      return { type: 'panel', id };
    });
  }, [previousLayout]);

  const isPanelMaximized = useCallback((id: PanelId) => {
    return layout?.type === 'panel' && layout.id === id;
  }, [layout]);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  // Track what is being dragged: panel grip OR dock button
  const [activeDrag, setActiveDrag] = useState<{ id: string; panelId: PanelId } | null>(null);
  // Track which panel the drag is hovering over + drop position
  const [dropIndicator, setDropIndicator] = useState<{ panelId: PanelId; position: 'top' | 'bottom' | 'left' | 'right' } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);



  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        moveRobot(0, 0.0003, 0);
        panTilt.sendCommand('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        moveRobot(0, -0.0003, 180);
        panTilt.sendCommand('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        moveRobot(-0.0003, 0, 270);
        panTilt.sendCommand('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        moveRobot(0.0003, 0, 90);
        panTilt.sendCommand('RIGHT');
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        panTilt.sendCommand('CENTER');
      } else if (e.code === 'Space') {
        e.preventDefault();
        emergencyStop();
        panTilt.sendCommand('STOP');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveRobot, emergencyStop, panTilt]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const togglePanel = useCallback((id: PanelId) => {
    setLayout(prev => {
      if (!prev) return { type: 'panel', id };
      if (hasPanel(prev, id)) {
        return removeNode(prev, id);
      }
      // Smart dock insertion: 1st addition -> 1/2 & 1/2; 2nd addition -> 1/2 left, 1/4 right-top, 1/4 right-bottom
      return addDockPanel(prev, id);
    });
  }, []);

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as string;
    const panelId = id.startsWith('dock-')
      ? (e.active.data.current?.panelId as PanelId)
      : (id as PanelId);
    setActiveDrag({ id, panelId });
  };

  const handleDragOver = (e: DragOverEvent) => {
    const overId = e.over?.id as PanelId | undefined;
    if (!overId || !PANEL_DEFS.find(p => p.id === overId)) {
      setDropIndicator(null);
      return;
    }
    // Detect 4 drop zones using accurate current cursor position
    const overRect = e.over?.rect;
    if (overRect && e.activatorEvent) {
      const activator = e.activatorEvent as MouseEvent | PointerEvent | TouchEvent;
      let clientX = 0;
      let clientY = 0;
      if ('clientX' in activator) {
        clientX = activator.clientX + (e.delta?.x || 0);
        clientY = activator.clientY + (e.delta?.y || 0);
      } else if ('touches' in activator && activator.touches.length > 0) {
        clientX = activator.touches[0].clientX + (e.delta?.x || 0);
        clientY = activator.touches[0].clientY + (e.delta?.y || 0);
      }

      const xPercent = Math.max(0, Math.min(1, (clientX - overRect.left) / overRect.width));
      const yPercent = Math.max(0, Math.min(1, (clientY - overRect.top) / overRect.height));
      
      const distTop = yPercent;
      const distBottom = 1 - yPercent;
      const distLeft = xPercent;
      const distRight = 1 - xPercent;
      
      const minDist = Math.min(distTop, distBottom, distLeft, distRight);
      let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
      if (minDist === distBottom) position = 'bottom';
      else if (minDist === distLeft) position = 'left';
      else if (minDist === distRight) position = 'right';
      
      setDropIndicator({ panelId: overId, position });
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { over } = e;
    const currentDrag = activeDrag;
    const currentIndicator = dropIndicator;
    setActiveDrag(null);
    setDropIndicator(null);
    if (!currentDrag) return;

    const panelId = currentDrag.panelId;
    const overId = over?.id as PanelId | undefined;
    if (!overId || !currentIndicator) return;

    setLayout(prev => {
      // First remove the panel if it's already in the tree (for moving)
      let nextTree = removeNode(prev, panelId);
      if (!nextTree) return { type: 'panel', id: panelId };
      // Then insert it at the new drop location
      return insertNode(nextTree, overId, panelId, currentIndicator.position);
    });
  };

  const activeDragDef = activeDrag ? PANEL_DEFS.find(p => p.id === activeDrag.panelId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
    <div className="h-screen flex flex-col bg-[#0c0d12] text-slate-200 font-sans overflow-hidden obs-theme select-none">

      {/* OBS Top Menu Bar */}
      <ObsTopMenu
        isStudioMode={isStudioMode}
        onToggleStudioMode={() => setIsStudioMode(m => !m)}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        isMissionActive={isMissionActive}
        timeString={time}
        activePanels={PANEL_DEFS.filter(p => hasPanel(layout, p.id)).map(p => p.id)}
        onTogglePanel={togglePanel}
        onOpenSettings={() => setShowConnectionModal(true)}
        onSelectLayoutPreset={handleSelectLayoutPreset}
        onResetLayout={() => setLayout(DEFAULT_OBS_LAYOUT)}
        onExportManifest={handleExportManifest}
        onCenterPanTilt={() => panTilt.sendCommand('CENTER')}
        onCopyGps={handleCopyGps}
      />
      {/* Main Mission Control Workspace */}
      {/* Workspace */}
      <main className="flex-1 overflow-hidden p-1 min-h-0 relative bg-[#090a0e]">
        {isStudioMode ? (
          <div className="absolute inset-1">
            <ObsStudioModeView
              previewContent={
                <div className="h-full w-full relative">
                  <PanelContent
                    id="map"
                    detectionApi={detectionApi}
                    panTilt={panTilt}
                    onInspectIncident={handleInspectIncident}
                    focusedLocation={focusedLocation}
                    onTrackPerson={handleTrackPerson}
                    onShowVictimManifest={handleShowVictimManifest}
                  />
                </div>
              }
              programContent={
                <div className="h-full w-full relative">
                  <PanelContent
                    id="camera"
                    detectionApi={detectionApi}
                    panTilt={panTilt}
                    onInspectIncident={handleInspectIncident}
                    focusedLocation={focusedLocation}
                    onTrackPerson={handleTrackPerson}
                    onShowVictimManifest={handleShowVictimManifest}
                  />
                </div>
              }
              onQuickSwap={() => {}}
            />
          </div>
        ) : (
          <SortableContext items={PANEL_DEFS.filter(p => hasPanel(layout, p.id)).map(p => p.id)} strategy={rectSortingStrategy}>
            <div className="absolute inset-1">
              <LayoutRenderer
                node={layout}
                dropIndicator={dropIndicator}
                onClose={(id) => setLayout(prev => removeNode(prev, id))}
                detectionApi={detectionApi}
                panTilt={panTilt}
                onInspectIncident={handleInspectIncident}
                focusedLocation={focusedLocation}
                onTrackPerson={handleTrackPerson}
                onMaximize={handleMaximizePanel}
                isMaximized={isPanelMaximized}
                onShowVictimManifest={handleShowVictimManifest}
                isMissionActive={isMissionActive}
                onToggleMission={() => setIsMissionActive(a => !a)}
                isRecording={isRecording}
                recordingSeconds={recordingSeconds}
                onToggleRecording={() => {
                  if (!isRecording) setRecordingSeconds(0);
                  setIsRecording(r => !r);
                }}
                isStudioMode={isStudioMode}
                onToggleStudioMode={() => setIsStudioMode(m => !m)}
                activeSceneId={activeSceneId}
                onSelectScene={handleSelectScene}
                onOpenSettings={() => setShowConnectionModal(true)}
              />
            </div>
          </SortableContext>
        )}
      </main>

      {/* OBS Canonical Status Bar */}
      <ObsStatusBar
        isMissionActive={isMissionActive}
        missionUptimeSeconds={missionUptime}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        esp32Connected={panTilt.connected}
        backendOnline={detectionApi.backendOnline}
        robotOnline={robotOnline}
        robotLocation={robotLocation}
        baseLocation={computerLocation || undefined}
        batteryLevel={batteryLevel}
      />

      {/* Incident Inspector Modal */}
      {inspectedIncident && (
        <IncidentModal
          incident={inspectedIncident}
          targetPersonId={inspectedPersonId}
          allIncidents={detectionApi.incidents}
          apiBaseUrl={detectionApi.apiBaseUrl}
          onClose={() => {
            setInspectedIncident(null);
            setInspectedPersonId(null);
          }}
        />
      )}

      {/* Connection & HTTPS Backend Settings Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162347] text-[#FAF7F2] border border-[#24355E] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#24355E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-[#BED6EE]" />
                <h3 className="font-bold text-sm tracking-wider uppercase text-white">Connection &amp; Backend Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectionModal(false)}
                className="text-[#BED6EE] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConnection} className="p-5 space-y-4 text-xs">
              {/* Alert message if saved */}
              {connSavedMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 font-mono">
                  <Check size={14} /> {connSavedMsg}
                </div>
              )}

              {/* Mobile HTTPS Note */}
              <div className="p-3 rounded-lg bg-[#0284C7]/15 border border-[#0284C7]/30 text-[#BED6EE] space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Globe size={14} className="text-[#BED6EE]" /> Mobile Phone / HTTPS Notice
                </div>
                <p className="leading-relaxed text-[11px]">
                  When opening on a mobile phone over HTTPS (e.g. Vercel), mobile browsers block plain <code className="text-amber-300 font-mono">http://</code> backends. Run Cloudflare Tunnel on your laptop to get a secure HTTPS link:
                </p>
                <div className="font-mono bg-black/40 text-emerald-300 px-2.5 py-1.5 rounded select-all text-[11px] border border-white/5">
                  cloudflared tunnel --url http://localhost:8000
                </div>
              </div>

              {/* AI Backend URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-white uppercase tracking-wider text-[11px]">
                    AI Detection Backend URL (HTTPS / HTTP)
                  </label>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                    detectionApi.backendOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {detectionApi.backendOnline ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <input
                  type="text"
                  value={backendInput}
                  onChange={(e) => setBackendInput(e.target.value)}
                  placeholder="e.g. https://xxx.trycloudflare.com or http://localhost:8000"
                  className="w-full bg-[#0E172C] border border-[#24355E] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#BED6EE]"
                />
                <p className="text-[10px] text-white/50">
                  Current: <code className="text-[#BED6EE] font-mono">{detectionApi.apiBaseUrl}</code>
                </p>
              </div>

              {/* ESP32 URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-white uppercase tracking-wider text-[11px]">
                    ESP32 Pan/Tilt Wi-Fi URL
                  </label>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                    panTilt.connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {panTilt.connected ? 'ESP32 ONLINE' : 'ESP32 OFFLINE'}
                  </span>
                </div>
                <input
                  type="text"
                  value={esp32Input}
                  onChange={(e) => setEsp32Input(e.target.value)}
                  placeholder="e.g. http://10.185.112.106"
                  className="w-full bg-[#0E172C] border border-[#24355E] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#BED6EE]"
                />
                <p className="text-[10px] text-white/50">
                  Current: <code className="text-[#BED6EE] font-mono">{panTilt.esp32Url}</code> (proxied securely on HTTPS)
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectionModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#24355E] hover:bg-white/5 text-white/70 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0284C7]/80 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-[#0284C7]/20 cursor-pointer"
                >
                  <RefreshCw size={13} /> Save &amp; Reconnect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drag ghost overlay */}
      <DragOverlay>
        {activeDragDef && (
          <div className="bg-white border-2 border-[#162347] rounded-sm shadow-2xl px-4 py-2 flex items-center gap-2 opacity-90 rotate-2 pointer-events-none">
            <GripVertical size={14} className="text-[#162347]/50" />
            <activeDragDef.icon size={14} className="text-[#162347]" />
            <span className="text-xs font-bold tracking-wider uppercase text-[#162347]">{activeDragDef.label}</span>
          </div>
        )}
      </DragOverlay>

    </div>
    </DndContext>
  );
}
