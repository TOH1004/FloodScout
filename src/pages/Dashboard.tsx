import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Clock, Compass, MapPin, ArrowUp, ArrowDown, ArrowRight,
  Camera, X, Cpu, Target, FileText,
  GripVertical, Eye, User, Users, ArrowUpDown,
  Navigation, Laptop, Maximize2, Minimize2, Wifi, Settings, Check, RefreshCw, Globe, Edit3, Radio,
  History as HistoryIcon, AlertTriangle, Radar, Layers, ChevronDown
} from 'lucide-react';
import { useDetectionApi, type RescueIncident } from '../hooks/useDetectionApi';
import { RescueLocationAnalysis } from '../components/RescueLocationAnalysis';
import { ObstacleSensorSection } from '../components/ObstacleSensorSection';
import { usePanTilt, type UsePanTiltReturn } from '../hooks/usePanTilt';
import { IncidentModal } from '../components/IncidentModal';
import { CameraSettingsPanel } from '../components/CameraSettingsPanel';
import { WifiCameraModal } from '../components/WifiCameraModal';
import { extractCameraHost } from '../config/camera';
import FloodScoutLogo from '../components/common/FloodScoutLogo';
import { useMotorTelemetry } from '../hooks/useMotorTelemetry';
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
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
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRescue } from '../context/RescueContext';
import type { VictimStatus } from '../context/RescueContext';
import { type LayoutNode, type PanelId, removeNode, insertNode, hasPanel, addDockPanel, DEFAULT_MISSION_LAYOUT } from '../utils/layoutTree';
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

function LocateControl({
  target,
  onLocate,
  isLocating,
}: {
  target: [number, number];
  onLocate?: () => Promise<[number, number] | null> | void;
  isLocating?: boolean;
}) {
  const map = useMap();
  return (
    <div className="leaflet-bottom leaflet-left" style={{ marginBottom: '20px', marginLeft: '10px', zIndex: 999 }}>
      <div className="leaflet-control">
        <button
          onClick={async (e) => {
            e.stopPropagation();
            let dest = target;
            if (onLocate) {
              const res = await onLocate();
              if (res && Array.isArray(res)) dest = res;
            }
            map.invalidateSize({ animate: false });
            map.flyTo(dest, 16, { duration: 0.75 });
          }}
          className="bg-white/95 backdrop-blur-md hover:bg-sky-50 text-sky-800 border-2 border-sky-400 rounded-md px-2.5 py-1.5 shadow-md flex items-center gap-1.5 transition-all cursor-pointer font-mono font-bold text-xs active:scale-95 group pointer-events-auto"
          title="Center and Locate Ground Control Computer"
        >
          <Laptop size={14} className={`text-sky-600 group-hover:scale-110 transition-transform ${isLocating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Locate PC'}</span>
        </button>
      </div>
    </div>
  );
}

function TileSelectorControl({
  mapTileSource,
  setMapTileSource,
}: {
  mapTileSource: 'google' | 'google-hybrid' | 'osm';
  setMapTileSource: (src: 'google' | 'google-hybrid' | 'osm') => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const tileLabels: Record<'google' | 'google-hybrid' | 'osm', string> = {
    google: 'Google Maps',
    'google-hybrid': 'Google Hybrid',
    osm: 'OSM',
  };

  return (
    <div
      ref={containerRef}
      className="leaflet-top leaflet-right pointer-events-auto"
      style={{ marginTop: '55px', marginRight: '10px', zIndex: 999 }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="leaflet-control relative">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="bg-white/95 backdrop-blur-md hover:bg-sky-50 text-[#183451] border border-slate-300 rounded-md px-2.5 py-1.5 shadow-md flex items-center gap-1.5 transition-all cursor-pointer font-mono font-bold text-xs active:scale-95 group pointer-events-auto"
          title="Select Map Tile Layer"
        >
          <Layers size={14} className="text-sky-600 group-hover:scale-110 transition-transform" />
          <span>{tileLabels[mapTileSource]}</span>
          <ChevronDown
            size={12}
            className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-white/95 backdrop-blur-md rounded-md shadow-lg border border-slate-200 py-1 text-xs font-mono font-bold z-[1000] flex flex-col overflow-hidden">
            {(['google', 'google-hybrid', 'osm'] as const).map((source) => (
              <button
                key={source}
                onClick={() => {
                  setMapTileSource(source);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                  mapTileSource === source
                    ? 'bg-[#183451] text-white'
                    : 'text-slate-700 hover:bg-sky-50'
                }`}
              >
                <span>{tileLabels[source]}</span>
                {mapTileSource === source && <Check size={12} className="text-white" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Types ────────────────────────────────────────────────────────────────────
interface PanelDef { id: PanelId; label: string; icon: React.ElementType }

const PANEL_DEFS: PanelDef[] = [
  { id: 'camera',     label: 'Water-Level Camera', icon: Camera },
  { id: 'map',        label: 'Tactical Map',        icon: MapPin },
  { id: 'sensors',    label: 'Obstacle Sensor',     icon: Radar },
  { id: 'navigation', label: 'Navigation',          icon: Compass },
  { id: 'victims',    label: 'Victim Manifest',     icon: Target },
  { id: 'status',     label: 'History',             icon: HistoryIcon },
  { id: 'controls',   label: 'Controls',            icon: Cpu },
  { id: 'log',        label: 'Detection Log',       icon: FileText },
];

// ─── Dock Button (draggable from the feature dock into the workspace) ──────────────
function DockButton({
  def, isActive, onToggle,
}: { def: PanelDef; isActive: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `dock-${def.id}`,
    data: { panelId: def.id, fromDock: true },
  });
  return (
    <button
      ref={setNodeRef}
      onClick={onToggle}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: isDragging ? 'grabbing' : 'grab' }}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-all select-none ${
        isActive
          ? 'bg-[#183451] text-white shadow'
          : 'bg-[#F3ECDE] text-[#183451]/60 hover:bg-[#E6DFD5] border border-[#E6DFD5]'
      }`}
    >
      <def.icon size={12} /> {def.label}
    </button>
  );
}

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
      className="bg-white border border-[#E6DFD5] rounded-sm shadow-md flex flex-col overflow-hidden h-full w-full min-h-0 relative flex-1"
    >
      {/* Drop indicators for the 4 zones */}
      {dropPosition === 'top' && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#183451] z-50 rounded-t-sm pointer-events-none" />
      )}
      {dropPosition === 'bottom' && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#183451] z-50 rounded-b-sm pointer-events-none" />
      )}
      {dropPosition === 'left' && (
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#183451] z-50 rounded-l-sm pointer-events-none" />
      )}
      {dropPosition === 'right' && (
        <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-[#183451] z-50 rounded-r-sm pointer-events-none" />
      )}
      <div className="bg-[#F3ECDE] px-3 py-2 border-b border-[#E6DFD5] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 text-[#183451]">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-[#183451]/40 hover:text-[#183451] touch-none p-0.5"
            title="Drag to reorder"
          >
            <GripVertical size={15} />
          </button>
          <def.icon size={13} />
          <h3 className="font-sans text-xs font-bold tracking-widest uppercase text-[#183451]">{def.label}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="text-[#183451]/40 hover:text-[#183451] transition-colors p-1 cursor-pointer"
              title={isMaximized ? "Restore split layout" : "Maximize panel full width"}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
          <button onClick={onClose} className="text-[#183451]/40 hover:text-rose-600 transition-colors p-1 cursor-pointer">
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative min-h-0">{children}</div>
    </div>
  );
}

// ─── Resize Handle ────────────────────────────────────────────────────────────
// orientation='horizontal' = column divider (sits between columns, needs full HEIGHT)
// orientation='vertical'   = row divider    (sits between rows,    needs full WIDTH)
function ResizeHandle({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <PanelResizeHandle
      className={`group relative flex items-center justify-center bg-[#E6DFD5] hover:bg-[#D4AF83] data-[separator=active]:bg-[#183451] transition-colors duration-150 shrink-0 select-none ${
        orientation === 'horizontal'
          ? 'w-2.5 h-full cursor-col-resize'
          : 'h-2.5 w-full cursor-row-resize'
      }`}
    >
      <div className={`flex items-center justify-center gap-0.5 pointer-events-none ${
        orientation === 'horizontal' ? 'flex-col' : 'flex-row'
      }`}>
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#183451]/30 group-hover:bg-[#183451]/70 group-data-[separator=active]:bg-white transition-colors" />
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
    locationStatus, locationSource, locationError,
    refreshComputerLocation, setManualComputerLocation,
    setOperatingMode,
    robotLocation, robotHeading, trajectory, signalDbm,
    hardwareGps,
  } = useRescue();

  const { detectionStatus } = detectionApi;
  const isPersonDetectedAtRobot = Boolean(
    detectionStatus.personDetected ||
    (detectionStatus.personCount && detectionStatus.personCount > 0)
  );

  const motorTelemetry = useMotorTelemetry();

  const [aiBoxes, setAiBoxes] = useState(true);
  const [crosshair, setCrosshair] = useState(true);
  const [localThreshold, setLocalThreshold] = useState(50);
  const [victimSortBy, setVictimSortBy] = useState<'person' | 'time'>('person');
  const [mapTileSource, setMapTileSource] = useState<'google' | 'google-hybrid' | 'osm'>('google');
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [directFeedError, setDirectFeedError] = useState(false);
  const [inlineCameraIpInput, setInlineCameraIpInput] = useState('');
  // Freeze the GPS position the moment a person is first detected so the marker stays fixed
  const [frozenDetectionLocation, setFrozenDetectionLocation] = useState<[number, number] | null>(null);
  const prevPersonDetected = useRef(false);
  useEffect(() => {
    const detected = Boolean(detectionStatus.personDetected || (detectionStatus.personCount && detectionStatus.personCount > 0));
    if (detected && !prevPersonDetected.current && robotLocation) {
      // Snapshot robot position at the first moment a person is seen
      setFrozenDetectionLocation([robotLocation[0], robotLocation[1]]);
    }
    if (!detected && prevPersonDetected.current) {
      // Keep the frozen pin visible — do NOT clear it so the last detection stays on the map
    }
    prevPersonDetected.current = detected;
  }, [detectionStatus.personDetected, detectionStatus.personCount, robotLocation]);

  // Reset stream error when URL or mode changes so the new feed can attempt connection
  useEffect(() => {
    setDirectFeedError(false);
  }, [detectionApi.cameraStreamUrl, detectionApi.feedMode]);

  // GPS coordination for Operator Ground Control Station (PC)
  const isComputerJohorMock = computerLocation && Math.abs(computerLocation[0] - 1.5588) < 0.005 && Math.abs(computerLocation[1] - 103.6375) < 0.005;
  const baseLocation: [number, number] = (!isComputerJohorMock && computerLocation) || robotLocation || [1.8642, 103.1142];

  const getPersonGps = (personId: number, _base: [number, number]): [number, number] | null => {
    // Use frozenDetectionLocation so the marker is anchored at the detection spot, not live robot
    const anchor = frozenDetectionLocation || robotLocation;
    if (!anchor) return null;
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

      return (
        <div className="relative h-full bg-slate-950 flex flex-col overflow-hidden select-none">
          {/* Main Video Viewport */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {feedMode === 'direct' ? (
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
                      className="px-3 py-1.5 rounded bg-[#183451] hover:bg-[#1d3a5f] text-white text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
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
                      placeholder="http://10.133.81.149:81/stream"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-sky-400"
                    />
                    <button
                      onClick={async () => {
                        const target = inlineCameraIpInput || cameraStreamUrl;
                        await setCameraStreamUrl(target);
                      }}
                      disabled={isUpdatingCameraUrl}
                      className="bg-[#183451] hover:bg-[#1d3a5f] text-white px-3 py-1.5 rounded text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
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
                <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 rounded shadow-lg text-[10px] font-mono text-white">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      feedMode === 'direct'
                        ? directFeedError
                          ? 'bg-amber-400'
                          : 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                        : backendOnline && cameraStatus.connected
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-bold tracking-wider uppercase">
                    {feedMode === 'direct'
                      ? `Direct Wi-Fi Cam (${extractCameraHost(cameraStreamUrl)})`
                      : backendOnline && cameraStatus.connected
                      ? `AI Vision Feed (${cameraStatus.type || 'Wi-Fi'})`
                      : backendOnline
                      ? 'Camera Standby'
                      : 'Backend Offline'}
                  </span>
                </div>

                {/* Feed Mode Switcher (AI vs Direct Wi-Fi) */}
                <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-md p-0.5 shadow-md text-[10px] font-mono font-bold">
                  <button
                    onClick={() => setFeedMode('ai')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                      feedMode === 'ai'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to AI Vision Stream with Person Detection Bounding Boxes"
                  >
                    <Cpu size={11} />
                    <span>AI Feed</span>
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
                    title="Switch to Direct Wi-Fi Camera Stream (Lowest Latency)"
                  >
                    <Radio size={11} />
                    <span>Direct Wi-Fi</span>
                  </button>
                </div>

                {/* Wi-Fi Camera Setup Button */}
                <button
                  onClick={() => setShowWifiModal(true)}
                  className="bg-slate-900/90 hover:bg-[#183451] text-sky-300 hover:text-white border border-sky-500/40 rounded-md px-2 py-1 shadow-md text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Configure Wi-Fi Camera IP / Stream URL"
                >
                  <Wifi size={12} className="text-sky-400" />
                  <span className="hidden sm:inline">Wi-Fi Cam Setup</span>
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

            {/* Prominent High-Visibility Alert Banner when Person Detected */}
            {detectionStatus.personDetected && (
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
                    People: <strong className="text-white">{detectionStatus.personCount}</strong>
                  </div>
                  <div className="bg-rose-900/80 px-2 py-1 rounded border border-rose-500/50 text-[11px]">
                    Score: <strong className="text-emerald-300">{detectionStatus.highestConfidence.toFixed(2)}</strong>
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
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-[#183451]/95 border-2 border-emerald-500/70 text-white p-3 rounded shadow-2xl backdrop-blur-md flex flex-col gap-2 z-40 animate-fadeIn">
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
                      <span className="text-[9px] font-mono text-white bg-white/10 px-1.5 rounded">
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
                  <span className="text-white/80 text-[9px]">
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
                        className="flex items-center gap-1 bg-[#183451] hover:bg-[#1d3a5f] text-white font-bold px-2 py-1 rounded transition-colors shadow-sm"
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
          <div className="bg-[#183451] border-t border-[#1d3a5f] px-3.5 py-2 text-xs font-mono text-[#F3ECDE] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-white uppercase tracking-wider text-[9px]">Status:</span>
                {detectionStatus.personDetected ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    🚨 Person Detected ({detectionStatus.personCount})
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    No person detected
                  </span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-white uppercase tracking-wider text-[9px]">Detection Score:</span>
                <span className="font-bold text-white">
                  {detectionStatus.personDetected ? detectionStatus.highestConfidence.toFixed(2) : '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-white">
              <span className="flex items-center gap-1 font-bold text-sky-300">
                <Laptop size={11} /> PC GPS: <strong className="text-white font-mono">{baseLocation[0].toFixed(4)}°, {baseLocation[1].toFixed(4)}°</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-300 font-bold">AI VISION ACTIVE</span>
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
          <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
              {/* Computer / Ground Control Coordination + Quick Locate Button */}
              <button
                onClick={async () => {
                  const newLoc = await refreshComputerLocation();
                  const target = newLoc || baseLocation;
                  if (onTrackPerson) onTrackPerson(target);
                }}
                className="bg-[#183451]/95 hover:bg-[#1f2f5c] text-[#F3ECDE] backdrop-blur-md px-3 py-1.5 rounded-md shadow-md border border-sky-400/60 text-[11px] font-mono flex items-center gap-2 transition-all cursor-pointer active:scale-95 group"
                title={locationError ? `${locationError} - Click to refresh GPS / IP detection` : 'Click to Refresh & Center Tactical Map on Computer Ground Control'}
              >
                <span className="text-sky-400 flex items-center gap-1 font-bold">
                  {locationStatus === 'locating' ? (
                    <RefreshCw size={13} className="text-sky-300 animate-spin" />
                  ) : (
                    <Laptop size={14} className="text-sky-300 group-hover:scale-110 transition-transform" />
                  )}
                  PC GPS:
                </span>
                <span className="font-bold text-white">
                  PC
                </span>
                {/* Source Badge */}
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold uppercase tracking-wider ${
                  locationSource === 'gps'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : locationSource === 'wifi'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : locationSource === 'ip'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : locationSource === 'manual'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                }`}>
                  {locationSource === 'ip' ? 'IP Net' : locationSource}
                </span>
                {computerAccuracy && (
                  <span className="text-[9px] text-sky-200/80 bg-sky-900/60 px-1 py-0.2 rounded font-sans">
                    ±{computerAccuracy}m
                  </span>
                )}
                <span className="text-[9px] bg-sky-500 hover:bg-sky-400 text-white font-sans font-bold px-1.5 py-0.5 rounded shadow-xs ml-0.5 flex items-center gap-1">
                  {locationStatus === 'locating' ? 'Locating...' : 'Locate'}
                </span>
              </button>

              {/* Set Manual GPS Button */}
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
                className="bg-[#183451]/80 hover:bg-[#1f2f5c] text-sky-300 hover:text-white px-2 py-1.5 rounded-md border border-sky-500/40 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                title="Manually Set / Calibrate Computer Coordinates"
              >
                <Edit3 size={11} /> Manual
              </button>

              {/* Robot Location Coordination & Quick Locate */}
              <button
                onClick={() => {
                  if (robotLocation && onTrackPerson) onTrackPerson(robotLocation);
                  else if (baseLocation && onTrackPerson) onTrackPerson(baseLocation);
                }}
                className={`backdrop-blur-md px-3 py-1.5 rounded-md shadow-md border text-[11px] font-mono flex items-center gap-2 transition-all cursor-pointer active:scale-95 group ${
                  isPersonDetectedAtRobot
                    ? 'bg-rose-950/95 hover:bg-rose-900 text-white border-rose-500 ring-1 ring-rose-400 animate-pulse'
                    : 'bg-[#183451]/95 hover:bg-[#1f2f5c] text-[#F3ECDE] border-cyan-400/60'
                }`}
                title={isPersonDetectedAtRobot ? "🚨 Person detected at robot position! Click to center map" : "Click to Center Tactical Map on Robot"}
              >
                <span className={`flex items-center gap-1 font-bold ${
                  isPersonDetectedAtRobot ? 'text-rose-400' : 'text-cyan-400'
                }`}>
                  {isPersonDetectedAtRobot ? (
                    <AlertTriangle size={13} className="text-rose-400 animate-bounce" />
                  ) : (
                    <Navigation size={13} className="text-cyan-300 group-hover:scale-110 transition-transform" />
                  )}
                  ROBOT GPS:
                </span>
                <span className="font-bold text-white">
                  {robotLocation ? 'Active' : 'No Signal / Awaiting Fix'}
                </span>
                {hardwareGps?.isValid && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-sans font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {hardwareGps.satellites} Sats • {hardwareGps.port || 'COM5'}
                  </span>
                )}
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold uppercase tracking-wider ${
                  isPersonDetectedAtRobot
                    ? 'bg-rose-600 text-white border border-rose-400'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {isPersonDetectedAtRobot ? '🚨 TARGET DETECTED' : `${robotSpeed} km/h • ${robotHeading}°`}
                </span>
                {isPersonDetectedAtRobot && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowVictimManifest?.();
                    }}
                    className="text-[9px] bg-rose-600 hover:bg-rose-500 text-white font-sans font-bold px-1.5 py-0.5 rounded shadow-xs ml-0.5 flex items-center gap-1 cursor-pointer"
                    title="Open Victim Manifest"
                  >
                    Manifest
                  </span>
                )}
                <span className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded shadow-xs ml-0.5 flex items-center gap-1 ${
                  isPersonDetectedAtRobot ? 'bg-rose-700 hover:bg-rose-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}>
                  Locate
                </span>
              </button>

              {/* Live Thruster Motion Status on Tactical Map */}
              <div
                className={`bg-[#183451]/95 backdrop-blur-md px-2.5 py-1.5 rounded-md shadow-md border text-[10px] font-mono flex items-center gap-1.5 transition-all ${
                  motorTelemetry.motion.state.includes('FORWARD')
                    ? 'border-emerald-500/60 text-emerald-300'
                    : motorTelemetry.motion.state.includes('REVERSE')
                    ? 'border-amber-500/60 text-amber-300'
                    : motorTelemetry.motion.state.includes('SPIN')
                    ? 'border-cyan-500/60 text-cyan-300'
                    : 'border-slate-600/60 text-slate-400'
                }`}
                title={`Vessel Thruster Status (Left: ${motorTelemetry.motion.left.status} | Right: ${motorTelemetry.motion.right.status})`}
              >
                <Compass
                  size={12}
                  className={`text-sky-400 ${motorTelemetry.motion.state !== 'STOP' ? 'animate-spin' : ''}`}
                />
                <span className="font-bold text-white uppercase tracking-wider text-[9px]">
                  {motorTelemetry.motion.state}
                </span>
                {motorTelemetry.motion.state !== 'STOP' && (
                  <span className="text-[9px] text-sky-300">
                    L:{motorTelemetry.motion.left.percent}% R:{motorTelemetry.motion.right.percent}%
                  </span>
                )}
              </div>

              {/* Target GPS Coordination (Only if target is detected) */}
              {(manifestPersons.some(p => p.location !== null) || (detectionStatus.personDetected && robotLocation)) && (
                <div className="bg-[#183451]/95 text-[#F3ECDE] backdrop-blur-md px-3 py-1.5 rounded-md shadow-md border border-rose-500/60 text-[11px] font-mono flex items-center gap-2">
                  <span className="text-rose-400 flex items-center gap-1 font-bold">
                    <MapPin size={13} className="text-rose-400 animate-bounce" />
                    TARGET GPS:
                  </span>
                  <span className="font-bold text-white">
                    {manifestPersons.filter(p => p.location !== null).length > 0
                      ? `${manifestPersons.filter(p => p.location !== null).length} detected`
                      : 'Target Active'}
                  </span>
                  {(manifestPersons.length > 0 || detectionApi.activeIncident) && (
                    <button
                      onClick={() => {
                        const inc = detectionApi.activeIncident || manifestPersons[0]?.incident;
                        if (inc) {
                          onInspectIncident(inc, manifestPersons[0]?.personId);
                        }
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                      title="Inspect detected person with AI analysis"
                    >
                      <Eye size={11} />
                      <span>Inspect</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Maximize Map Control */}
            <div className="pointer-events-auto flex items-center gap-2">
              {onMaximizeMap && (
                <button
                  onClick={onMaximizeMap}
                  className="bg-white/95 backdrop-blur-md hover:bg-sky-50 text-[#183451] border border-slate-300 px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5 text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 group"
                  title={isMapMaximized ? "Restore split layout" : "Make map bigger (full workspace)"}
                >
                  {isMapMaximized ? (
                    <Minimize2 size={12} className="text-sky-600 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Maximize2 size={12} className="text-sky-600 group-hover:scale-110 transition-transform" />
                  )}
                  <span>{isMapMaximized ? 'Split View' : 'Full Map'}</span>
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
            <LocateControl
              target={baseLocation}
              onLocate={async () => {
                const loc = await refreshComputerLocation();
                return loc || baseLocation;
              }}
              isLocating={locationStatus === 'locating'}
            />
            <TileSelectorControl
              mapTileSource={mapTileSource}
              setMapTileSource={setMapTileSource}
            />

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

            {/* Operator Ground Control PC Marker */}
            {baseLocation && (
              <Marker position={baseLocation} icon={computerIcon}>
                <Popup>
                  <div className="font-mono text-xs space-y-1.5 min-w-[180px]">
                    <div className="border-b pb-1 font-bold text-sky-700 flex items-center gap-1.5">
                      <span>💻</span> OPERATOR GROUND CONTROL (PC)
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Ground Control Station Active
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Real-Time Live Detected Person Marker — pinned to the FROZEN snapshot location */}
            {(detectionStatus.personDetected || frozenDetectionLocation) && (frozenDetectionLocation || robotLocation) && (
              <Fragment key="live-person-marker">
                <Marker position={(frozenDetectionLocation || robotLocation)!} icon={livePersonIcon}>
                  <Popup>
                    <div className="font-mono text-xs space-y-1.5 min-w-[200px]">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-bold text-rose-600 flex items-center gap-1">
                          🚨 PERSON DETECTED
                        </span>
                        <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          FIXED
                        </span>
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
                          <span>Inspect Target</span>
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
                  <Marker position={p.location} icon={getVictimMarkerIcon('Detected')}>
                    <Popup>
                      <div className="font-mono text-xs space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-bold text-rose-600 flex items-center gap-1">
                            🚨 PERSON DETECTED
                          </span>
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            #{p.personId}
                          </span>
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
                          className="w-full mt-2 bg-[#183451] hover:bg-[#1d3a5f] text-white text-[11px] font-mono font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-98"
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
                        {isPersonDetectedAtRobot ? 'Person Detected — Marker Frozen' : 'Live Real-Time Telemetry'}
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

          </MapContainer>
        </div>
      );

    case 'navigation':
      return (
        <div className="h-full overflow-y-auto p-4 flex flex-col items-center min-h-0">
          <div className="m-auto flex flex-col items-center gap-4 w-full max-w-xs py-2">
            {/* Camera Pan/Tilt Servo Control Header */}
            <div className="w-full text-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#183451]/70 flex items-center justify-center gap-1.5">
                <Compass size={12} className="text-[#183451]" /> Camera Pan &amp; Tilt Arm
              </span>
              <span className="text-[9px] text-slate-500 font-sans block">
                Aim water-level camera (GPIO 18 Pan • GPIO 19 Tilt)
              </span>
            </div>

            {/* D-Pad for Camera Servos */}
            <div className="grid grid-cols-3 gap-3 w-48">
              <div />
              <button
                onClick={() => panTilt.sendCommand('up')}
                disabled={panTilt.isProcessing}
                style={{ touchAction: 'manipulation' }}
                className="h-14 rounded-lg bg-[#F3ECDE] hover:bg-[#183451] text-[#183451] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Tilt Camera Up (+10°)"
              >
                <ArrowUp size={22} />
              </button>
              <div />

              <button
                onClick={() => panTilt.sendCommand('left')}
                disabled={panTilt.isProcessing}
                style={{ touchAction: 'manipulation' }}
                className="h-14 rounded-lg bg-[#F3ECDE] hover:bg-[#183451] text-[#183451] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Pan Camera Left (-10°)"
              >
                <ArrowLeft size={22} />
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
                style={{ touchAction: 'manipulation' }}
                className="h-14 rounded-lg bg-[#183451] text-[#F3ECDE] font-mono text-[11px] font-bold active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Hold Camera Position (Double-click to Center 90°/90°)"
              >
                STOP
              </button>
              <button
                onClick={() => panTilt.sendCommand('right')}
                disabled={panTilt.isProcessing}
                style={{ touchAction: 'manipulation' }}
                className="h-14 rounded-lg bg-[#F3ECDE] hover:bg-[#183451] text-[#183451] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Pan Camera Right (+10°)"
              >
                <ArrowRight size={22} />
              </button>

              <div />
              <button
                onClick={() => panTilt.sendCommand('down')}
                disabled={panTilt.isProcessing}
                style={{ touchAction: 'manipulation' }}
                className="h-14 rounded-lg bg-[#F3ECDE] hover:bg-[#183451] text-[#183451] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Tilt Camera Down (-10°)"
              >
                <ArrowDown size={22} />
              </button>
              <div />
            </div>

          </div>
        </div>
      );

    case 'victims': {
      const hasEntries = victimSortBy === 'person' ? manifestPersons.length > 0 : incidentsByTime.length > 0;

      return (
        <div className="h-full overflow-y-auto p-4 space-y-3">
          {/* Header & Arrangement Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E6DFD5]">
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-rose-600" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#183451]">
                Victim Manifest ({victimSortBy === 'person' ? manifestPersons.length : incidentsByTime.length})
              </span>
            </div>

            {/* Arrangement Selector: By Person vs By TIME */}
            <div className="flex items-center gap-1 bg-[#F3ECDE] p-0.5 rounded border border-[#E6DFD5] text-[10px] font-mono font-bold">
              <span className="text-[9px] text-[#183451]/50 px-1 uppercase flex items-center gap-1">
                <ArrowUpDown size={10} /> Sort:
              </span>
              <button
                onClick={() => setVictimSortBy('person')}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  victimSortBy === 'person'
                    ? 'bg-[#183451] text-white shadow-xs'
                    : 'text-[#183451]/70 hover:text-[#183451] hover:bg-[#E6DFD5]'
                }`}
                title="Arrange by Person ID (highest number like Person #8 on top with cropped photo)"
              >
                By Person
              </button>
              <button
                onClick={() => setVictimSortBy('time')}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  victimSortBy === 'time'
                    ? 'bg-[#183451] text-white shadow-xs'
                    : 'text-[#183451]/70 hover:text-[#183451] hover:bg-[#E6DFD5]'
                }`}
                title="Arrange by Time (original incident INC-... on top with cropped pictures)"
              >
                By Time
              </button>
            </div>
          </div>

          {/* Manifest Content */}
          {hasEntries ? (
            <div className="space-y-3">
              {/* ── VIEW 1: BY PERSON (Person #8 on top with cropped picture) ── */}
              {victimSortBy === 'person' &&
                manifestPersons.map((v) => (
                  <div
                    key={v.personId}
                    className="p-3 rounded bg-white border border-[#E6DFD5] hover:border-emerald-400 shadow-xs transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      {/* Left: Cropped Picture + Person ID Info */}
                      <div className="flex items-center gap-3">
                        {v.cropUrl ? (
                          <div
                            onClick={() => onInspectIncident(v.incident, v.personId)}
                            className="w-14 h-14 rounded-md overflow-hidden bg-black shrink-0 border border-slate-300 shadow-xs cursor-pointer hover:border-emerald-500 transition-all group relative"
                            title={`Inspect ${v.label}`}
                          >
                            <img
                              src={`${detectionApi.apiBaseUrl}${v.cropUrl}`}
                              alt={v.label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={12} />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#183451] text-[#F3ECDE] font-mono font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                            #{v.personId}
                          </div>
                        )}

                        <div>
                          <div className="font-mono font-bold text-sm text-[#183451] flex items-center gap-1.5">
                            <span>{v.label}</span>
                            <span className="text-[9px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                              Score: {v.score.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[#183451]/60 flex items-center gap-1.5 mt-0.5">
                            <span>{v.incident.id}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-[#183451]/80 font-semibold">
                              <Clock size={10} /> {v.time}
                            </span>
                            <span className="text-[9px] bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.5 rounded font-bold font-mono">
                              {v.captureCount} {v.captureCount === 1 ? 'photo' : 'photos'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Inspect Button */}
                      <button
                        onClick={() => onInspectIncident(v.incident, v.personId)}
                        className="bg-[#183451] hover:bg-[#1d3a5f] text-white px-2.5 py-1.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </div>

                    {/* Person GPS Coordination & Track on Map */}
                    <div className="flex items-center justify-between text-[11px] font-mono bg-rose-50 border border-rose-200/80 px-2.5 py-1.5 rounded text-rose-800">
                      <div className="flex items-center gap-1.5 font-bold">
                        <MapPin size={12} className="text-rose-600 animate-pulse shrink-0" />
                        <span>
                          {v.location ? `GPS: ${v.location[0].toFixed(6)}° N, ${v.location[1].toFixed(6)}° E` : 'GPS: No Location Detected'}
                        </span>
                      </div>
                      {v.location && onTrackPerson && (
                        <button
                          onClick={() => onTrackPerson(v.location!)}
                          className="bg-[#183451] hover:bg-[#1d3a5f] text-[#F3ECDE] text-[10px] font-mono font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                          title="Locate person on Tactical Map"
                        >
                          <Navigation size={10} /> Track on Map
                        </button>
                      )}
                    </div>

                    {v.description && (
                      <p className="text-[11px] text-[#183451]/80 line-clamp-2 leading-tight bg-slate-50 p-2 rounded border border-slate-100 font-sans">
                        {v.description}
                      </p>
                    )}
                  </div>
                ))}

              {/* ── VIEW 2: BY TIME (Original INC-... with cropped pictures by time) ── */}
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
                      className="p-3.5 rounded bg-white border border-[#E6DFD5] hover:border-emerald-400 shadow-xs transition-all space-y-3"
                    >
                      {/* Incident Header: INC-... and Time */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#183451]">{inc.id}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                            {inc.personCount} Person{inc.personCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-[#183451]/70 font-semibold">
                          <Clock size={12} className="text-[#183451]/60" /> {inc.time}
                        </div>
                      </div>

                      {/* Incident GPS Coordination */}
                      <div className="flex items-center justify-between text-[11px] font-mono bg-rose-50 border border-rose-200/80 px-2.5 py-1.5 rounded text-rose-800">
                        <div className="flex items-center gap-1.5 font-bold">
                          <MapPin size={12} className="text-rose-600 animate-pulse shrink-0" />
                          <span>
                            {incLocation ? `GPS: ${incLocation[0].toFixed(6)}° N, ${incLocation[1].toFixed(6)}° E` : 'GPS: No Location Detected'}
                          </span>
                        </div>
                        {incLocation && onTrackPerson && (
                          <button
                            onClick={() => onTrackPerson(incLocation)}
                            className="bg-[#183451] hover:bg-[#1d3a5f] text-[#F3ECDE] text-[10px] font-mono font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                            title="Locate incident on Tactical Map"
                          >
                            <Navigation size={10} /> Track on Map
                          </button>
                        )}
                      </div>

                      {/* Original Scene Image (INC-... full frame) */}
                      {inc.originalImageUrl && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono font-semibold uppercase text-[#183451]/70 flex items-center gap-1">
                            <Eye size={11} className="text-blue-500" /> Original Capture:
                          </div>
                          <div
                            onClick={() => onInspectIncident(inc)}
                            className="w-full rounded-md overflow-hidden border border-slate-200 bg-black cursor-pointer hover:border-emerald-400 transition-all group relative"
                            style={{ maxHeight: '140px' }}
                          >
                            <img
                              src={`${detectionApi.apiBaseUrl}${inc.originalImageUrl}`}
                              alt={`${inc.id} original`}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                              style={{ maxHeight: '140px', objectFit: 'cover' }}
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={16} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cropped Pictures Row by Time */}
                      {personList.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-mono font-semibold uppercase text-[#183451]/70 flex items-center gap-1">
                            <User size={11} className="text-emerald-600" /> Cropped Persons:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {personList.map((p, idx) => (
                              <div
                                key={idx}
                                onClick={() => onInspectIncident(inc, p.id)}
                                className="flex items-center gap-2 p-1.5 rounded bg-slate-50 border border-slate-200 hover:border-emerald-400 cursor-pointer transition-all group"
                              >
                                <div className="w-12 h-12 rounded overflow-hidden bg-black shrink-0 border border-slate-300">
                                  <img
                                    src={`${detectionApi.apiBaseUrl}${p.imageUrl}`}
                                    alt={p.label}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                                <div className="font-mono pr-1">
                                  <div className="text-[11px] font-bold text-[#183451] flex items-center gap-1">
                                    <span>{p.label}</span>
                                    {(p as any).isReturning && (
                                      <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                        Returning
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-emerald-700 font-semibold">
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
                        <p className="text-[11px] text-[#183451]/80 line-clamp-2 leading-tight bg-slate-50 p-2 rounded border border-slate-100 font-sans">
                          {inc.description}
                        </p>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#E6DFD5] text-[10px] font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${
                            inc.descriptionStatus === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inc.descriptionStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-slate-100 text-slate-700'
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
                          className="bg-[#183451] hover:bg-[#1d3a5f] text-white px-2.5 py-1 rounded text-[10px] flex items-center gap-1 font-bold transition-colors cursor-pointer"
                        >
                          <Eye size={12} /> Inspect Incident
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            /* Clean Empty State when no real victims have been detected */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 my-auto">
              <div className="w-12 h-12 rounded-full bg-[#183451]/5 border border-[#183451]/15 flex items-center justify-center text-[#183451]/60">
                <Users size={24} />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold text-[#183451] uppercase tracking-wider">
                  No Victims Currently Detected
                </h4>
                <p className="text-[11px] text-[#183451]/60 mt-1 max-w-xs leading-relaxed">
                  OpenCV HOG + SVM person detector is actively monitoring the live video stream. Detected persons (Person #1, Person #2) will appear here in real-time.
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

    case 'controls': {
      const { setConfidenceThreshold } = detectionApi;

      const handleThresholdChange = (val: number) => {
        setLocalThreshold(val);
        setConfidenceThreshold(val / 100);
      };

      return (
        <div className="h-full overflow-y-auto p-4 space-y-5">
          {/* AI Detection Controls */}
          <div>
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-[#183451] mb-2 flex items-center justify-between">
              <span>AI Detection Sensitivity</span>
              <span className="font-mono text-emerald-700 font-bold">{localThreshold}%</span>
            </h4>
            <input
              type="range"
              min={10}
              max={95}
              value={localThreshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="w-full accent-[#183451] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[9px] font-mono text-[#183451]/60 mt-1">
              <span>More Sensitive (10%)</span>
              <span>Higher Precision (95%)</span>
            </div>
          </div>

          {/* Remote Camera Controls via USB Serial (Seeed Studio XIAO ESP32-S3 Sense) */}
          <div className="pt-2 border-t border-[#E6DFD5]">
            <CameraSettingsPanel
              xiaoStatus={detectionApi.xiaoStatus}
              cameraSettings={detectionApi.cameraSettings}
              settingFeedback={detectionApi.settingFeedback}
              isUpdatingSetting={detectionApi.isUpdatingSetting}
              onUpdateSetting={detectionApi.updateCameraSetting}
            />
          </div>

          {/* HUD Overlays */}
          <div className="pt-2 border-t border-[#E6DFD5]">
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-[#183451] mb-2">HUD Overlays</h4>
            <div className="space-y-2 font-mono text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={aiBoxes} onChange={e => setAiBoxes(e.target.checked)} className="accent-[#183451] w-4 h-4" />
                AI Bounding Boxes
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={crosshair} onChange={e => setCrosshair(e.target.checked)} className="accent-[#183451] w-4 h-4" />
                Center Reticle
              </label>
            </div>
          </div>
        </div>
      );
    }

    case 'log': {
      const { history } = detectionApi;

      return (
        <div className="h-full overflow-y-auto p-3 bg-[#183451] font-mono text-xs space-y-2">
          <div className="text-[10px] text-white uppercase tracking-widest font-bold pb-2 border-b border-white/10 flex items-center justify-between">
            <span>Detection History</span>
            <span className="text-[9px] text-emerald-400">● Live Feed</span>
          </div>

          {history && history.length > 0 ? (
            history.map((log) => (
              <div key={log.id} className="border-b border-white/10 pb-2 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-[10px]">{log.time}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        log.type === 'person_detected'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {log.type === 'person_detected' ? 'Person detected' : 'No person'}
                    </span>
                  </div>
                  <div className="text-white/90 text-[11px]">{log.message}</div>
                </div>
                {log.confidence > 0 && (
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-emerald-400">
                      Score: {log.confidence.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-white/40 italic py-6 text-center text-xs">
              No detection events recorded yet.
            </div>
          )}
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
}) {
  if (!node) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-[#183451]/40">
        <Target size={48} className="mb-4 opacity-50" />
        <p className="font-sans text-xl font-bold text-[#183451]">No panels active</p>
        <p className="text-xs font-mono uppercase tracking-widest mt-2">Select a feature from the dock above</p>
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
        const defaultSize = child.size ?? (node.children.length > 0 ? Math.round(100 / node.children.length) : 50);

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
  const { robotOnline, moveRobot, emergencyStop } = useRescue();
  const detectionApi = useDetectionApi();
  const panTilt = usePanTilt();
  const [inspectedIncident, setInspectedIncident] = useState<RescueIncident | null>(null);
  const [inspectedPersonId, setInspectedPersonId] = useState<number | null>(null);
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [previousLayout, setPreviousLayout] = useState<LayoutNode | null>(null);

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

  const [layout, setLayout] = useState<LayoutNode | null>(DEFAULT_MISSION_LAYOUT);

  const handleMaximizePanel = useCallback((id: PanelId) => {
    setLayout((prev) => {
      // If already maximized to this single panel, restore previous layout (or default mission layout)
      if (prev && prev.type === 'panel' && prev.id === id) {
        if (previousLayout) return previousLayout;
        return DEFAULT_MISSION_LAYOUT;
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
    // Mouse: require 8px movement before drag starts — clicks fire instantly
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Touch: require 250ms hold before drag starts — taps always fire onClick
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
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
    <div className="h-screen flex flex-col bg-[#F3ECDE] text-[#183451] font-sans overflow-hidden">

      {/* Header */}
      <header className="bg-[#183451] text-[#F3ECDE] border-b border-[#1d3a5f] px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 z-[999]">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-white hover:text-white bg-white/10 px-3.5 py-1.5 rounded-full transition-colors">
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="border-l border-white/20 pl-4 flex items-center gap-2.5">
            <FloodScoutLogo className="w-7 h-7" />
            <span className="font-extrabold text-white tracking-widest text-lg uppercase font-sans">FloodScout</span>
            <span className="ml-3 text-[11px] tracking-[0.25em] text-white/80 uppercase font-semibold hidden sm:inline">
              Operations Command &amp; Control
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* AI Vision Status Indicator (Clickable to configure AI Backend / ESP32 URLs) */}
          <button
            type="button"
            onClick={() => {
              setBackendInput(detectionApi.apiBaseUrl);
              setEsp32Input(panTilt.esp32Url);
              setShowConnectionModal(true);
            }}
            className={`flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full border transition-all hover:opacity-90 active:scale-95 cursor-pointer ${
              detectionApi.backendOnline && detectionApi.cameraStatus.connected
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : detectionApi.backendOnline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
            }`}
            title="Configure AI Backend & ESP32 connection URLs"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${detectionApi.backendOnline && detectionApi.cameraStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="hidden sm:inline">
              {detectionApi.backendOnline && detectionApi.cameraStatus.connected
                ? 'AI VISION: ACTIVE'
                : detectionApi.backendOnline
                ? 'CAM DISCONNECTED'
                : 'AI BACKEND: OFFLINE'}
            </span>
            <span className="sm:hidden font-bold">
              {detectionApi.backendOnline ? 'AI: ON' : 'AI: OFF'}
            </span>
            <Settings size={12} className="opacity-75 ml-0.5" />
          </button>

          <div className={`flex items-center gap-2 text-[11px] font-mono px-3 py-1 rounded-full border ${robotOnline ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
            <span className={`w-2 h-2 rounded-full ${robotOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {robotOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="font-mono text-white flex items-center gap-1.5 text-xs">
            <Clock size={13} /> {time}
          </div>
        </div>
      </header>

      {/* Feature Dock + Layout Selector
           Dock buttons are DRAGGABLE — drag them into the workspace to add/reorder panels */}
      <div className="bg-white border-b border-[#E6DFD5] px-4 py-2.5 flex items-center justify-between shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {PANEL_DEFS.map(p => (
            <DockButton
              key={p.id}
              def={p}
              isActive={hasPanel(layout, p.id)}
              onToggle={() => togglePanel(p.id)}
            />
          ))}
        </div>
      </div>

      {/* Workspace */}
      <main className="flex-1 overflow-hidden p-3 min-h-0 relative">
        <SortableContext items={PANEL_DEFS.filter(p => hasPanel(layout, p.id)).map(p => p.id)} strategy={rectSortingStrategy}>
          <div className="absolute inset-3">
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
            />
          </div>
        </SortableContext>
      </main>

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
          <div className="bg-[#183451] text-[#F3ECDE] border border-[#1d3a5f] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1d3a5f] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-white" />
                <h3 className="font-bold text-sm tracking-wider uppercase text-white">Connection &amp; Backend Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectionModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
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
              <div className="p-3 rounded-lg bg-[#0284C7]/15 border border-[#0284C7]/30 text-white space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Globe size={14} className="text-white" /> Mobile Phone / HTTPS Notice
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
                  className="w-full bg-[#0E172C] border border-[#1d3a5f] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/40"
                />
                <p className="text-[10px] text-white/50">
                  Current: <code className="text-white font-mono">{detectionApi.apiBaseUrl}</code>
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
                  placeholder="e.g. http://10.133.81.149"
                  className="w-full bg-[#0E172C] border border-[#1d3a5f] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/40"
                />
                <p className="text-[10px] text-white/50">
                  Current: <code className="text-white font-mono">{panTilt.esp32Url}</code> (proxied securely on HTTPS)
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectionModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#1d3a5f] hover:bg-white/5 text-white/70 transition-colors cursor-pointer"
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
          <div className="bg-white border-2 border-[#183451] rounded-sm shadow-2xl px-4 py-2 flex items-center gap-2 opacity-90 rotate-2 pointer-events-none">
            <GripVertical size={14} className="text-[#183451]/50" />
            <activeDragDef.icon size={14} className="text-[#183451]" />
            <span className="text-xs font-bold tracking-wider uppercase text-[#183451]">{activeDragDef.label}</span>
          </div>
        )}
      </DragOverlay>

    </div>
    </DndContext>
  );
}
