import { useState, useEffect, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Clock, Compass, MapPin, ArrowUp, ArrowDown, ArrowRight,
  Camera, X, Activity, Cpu, Target, FileText,
  GripVertical, AlertTriangle, VideoOff, Eye, User, Users, ArrowUpDown,
  Navigation, Laptop, Maximize2, Minimize2, Wifi
} from 'lucide-react';
import { useDetectionApi, type RescueIncident } from '../hooks/useDetectionApi';
import { usePanTilt, type UsePanTiltReturn } from '../hooks/usePanTilt';
import { IncidentModal } from '../components/IncidentModal';
import { CameraSettingsPanel } from '../components/CameraSettingsPanel';
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
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
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRescue } from '../context/RescueContext';
import type { VictimStatus } from '../context/RescueContext';
import { type LayoutNode, type PanelId, removeNode, insertNode, hasPanel, getFirstPanelId } from '../utils/layoutTree';
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

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapResizerAndController({ center }: { center?: [number, number] | null }) {
  const map = useMap();

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

  return null;
}

function LocateControl({ target }: { target: [number, number] }) {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '55px', marginRight: '10px', zIndex: 999 }}>
      <div className="leaflet-control">
        <button
          onClick={(e) => {
            e.stopPropagation();
            map.invalidateSize({ animate: false });
            map.panTo(target, { animate: true, duration: 0.35 });
          }}
          className="bg-white/95 backdrop-blur-md hover:bg-sky-50 text-sky-800 border-2 border-sky-400 rounded-md px-2.5 py-1.5 shadow-md flex items-center gap-1.5 transition-all cursor-pointer font-mono font-bold text-xs active:scale-95 group pointer-events-auto"
          title="Center and Locate Ground Control Computer"
        >
          <Laptop size={14} className="text-sky-600 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Locate PC</span>
        </button>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PanelDef { id: PanelId; label: string; icon: React.ElementType }

const PANEL_DEFS: PanelDef[] = [
  { id: 'camera',     label: 'Water-Level Camera', icon: Camera },
  { id: 'map',        label: 'Tactical Map',        icon: MapPin },
  { id: 'navigation', label: 'Navigation',          icon: Compass },
  { id: 'victims',    label: 'Victim Manifest',     icon: Target },
  { id: 'status',     label: 'Robot Status',        icon: Activity },
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
          ? 'bg-[#162347] text-white shadow'
          : 'bg-[#FAF7F2] text-[#162347]/60 hover:bg-[#E6DFD5] border border-[#E6DFD5]'
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
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#162347] z-50 rounded-t-sm pointer-events-none" />
      )}
      {dropPosition === 'bottom' && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#162347] z-50 rounded-b-sm pointer-events-none" />
      )}
      {dropPosition === 'left' && (
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#162347] z-50 rounded-l-sm pointer-events-none" />
      )}
      {dropPosition === 'right' && (
        <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-[#162347] z-50 rounded-r-sm pointer-events-none" />
      )}
      <div className="bg-[#FAF7F2] px-3 py-2 border-b border-[#E6DFD5] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 text-[#162347]">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-[#162347]/40 hover:text-[#162347] touch-none p-0.5"
            title="Drag to reorder"
          >
            <GripVertical size={15} />
          </button>
          <def.icon size={13} />
          <h3 className="font-editorial-serif text-sm font-bold tracking-widest uppercase">{def.label}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="text-[#162347]/40 hover:text-[#162347] transition-colors p-1 cursor-pointer"
              title={isMaximized ? "Restore split layout" : "Maximize panel full width"}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
          <button onClick={onClose} className="text-[#162347]/40 hover:text-rose-600 transition-colors p-1 cursor-pointer">
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
      className={`group relative flex items-center justify-center bg-[#E6DFD5] hover:bg-[#BED6EE] data-[separator=active]:bg-[#162347] transition-colors duration-150 shrink-0 select-none ${
        orientation === 'horizontal'
          ? 'w-2.5 h-full cursor-col-resize'
          : 'h-2.5 w-full cursor-row-resize'
      }`}
    >
      <div className={`flex items-center justify-center gap-0.5 pointer-events-none ${
        orientation === 'horizontal' ? 'flex-col' : 'flex-row'
      }`}>
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#162347]/30 group-hover:bg-[#162347]/70 group-data-[separator=active]:bg-white transition-colors" />
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
}: {
  id: PanelId;
  detectionApi: ReturnType<typeof useDetectionApi>;
  panTilt: UsePanTiltReturn;
  onInspectIncident: (inc: RescueIncident, personId?: number) => void;
  focusedLocation?: [number, number] | null;
  onTrackPerson?: (loc: [number, number]) => void;
  onMaximizeMap?: () => void;
  isMapMaximized?: boolean;
}) {
  const {
    waterDepth, robotSpeed, computerLocation, computerAccuracy, operatingMode,
    activeMission, victims, batteryLevel, connectionStatus,
    setOperatingMode, moveRobot,
  } = useRescue();

  const { detectionStatus } = detectionApi;

  const [aiBoxes, setAiBoxes] = useState(true);
  const [crosshair, setCrosshair] = useState(true);
  const [throttle, setThrottle] = useState(50);
  const [waypoint, setWaypoint] = useState<[number, number] | null>(null);
  const [localThreshold, setLocalThreshold] = useState(50);
  const [victimSortBy, setVictimSortBy] = useState<'person' | 'time'>('person');
  const [mapTileSource, setMapTileSource] = useState<'google' | 'google-hybrid' | 'carto' | 'osm'>('google');

  // Johor, Malaysia Geographic Boundaries (Segamat to Tanjung Piai, Muar to Mersing + coastal buffer)
  const JOHOR_BOUNDS: [[number, number], [number, number]] = [
    [1.10, 101.90], // South-West (Kukup / Pontian / Muar / Straits)
    [3.15, 104.70], // North-East (Segamat / Mersing / Endau / South China Sea)
  ];

  const floodZone: [number, number][] = [
    [1.5650, 103.6320], [1.5670, 103.6430], [1.5560, 103.6460], [1.5520, 103.6350],
  ];

  // GPS coordination for detected persons (aligned with Ground Control Computer in Johor)
  const baseLocation: [number, number] = computerLocation || [1.5588, 103.6375];

  const getPersonGps = (personId: number, base: [number, number]): [number, number] => {
    // Both computer and detected person location are aligned (same coordinates)
    if (personId <= 1) {
      return [
        parseFloat(base[0].toFixed(6)),
        parseFloat(base[1].toFixed(6)),
      ];
    }
    // Subtle micro-spread (~3 meters) for multiple targets so markers don't overlap completely
    const angle = ((personId - 1) * 72) * (Math.PI / 180);
    const dist = 0.00003;
    return [
      parseFloat((base[0] + Math.sin(angle) * dist).toFixed(6)),
      parseFloat((base[1] + Math.cos(angle) * dist).toFixed(6)),
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
    location: [number, number];
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
      const { backendOnline, cameraStatus, detectionStatus, videoFeedUrl, activeIncident, dismissActiveIncident, apiBaseUrl, setHogMode } = detectionApi;
      const currentMode = cameraStatus.mode ?? 'fast';

      return (
        <div className="relative h-full bg-slate-950 flex flex-col overflow-hidden select-none">
          {/* Main Video Viewport */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {backendOnline && cameraStatus.connected ? (
              <img
                src={videoFeedUrl}
                alt="FloodScout Live Stream"
                className="w-full h-full object-contain"
              />
            ) : !backendOnline ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-amber-300 uppercase tracking-wider">
                    AI Vision Backend Offline
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Start the Python computer-vision backend to begin USB camera streaming and OpenCV person detection.
                  </p>
                </div>
                <div className="font-mono text-[11px] bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-slate-300">
                  cd backend && python main.py
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <VideoOff size={24} />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-rose-300 uppercase tracking-wider">
                    Camera Unavailable
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    USB Camera index {cameraStatus.camera_index} could not be opened. Verify that your camera is plugged in and not in use by another app.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  Status: USB Index #{cameraStatus.camera_index} Disconnected
                </span>
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

            {/* Top Bar: Camera connection badge, XIAO serial badge & HUD status */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 rounded shadow-lg text-[10px] font-mono text-white">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      backendOnline && cameraStatus.connected
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-bold tracking-wider uppercase">
                    {backendOnline && cameraStatus.connected
                      ? `Camera Connected (USB #${cameraStatus.camera_index})`
                      : backendOnline
                      ? 'Camera Disconnected'
                      : 'Backend Offline'}
                  </span>
                </div>
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
                      XIAO: {detectionApi.xiaoStatus.connected ? `Connected (${detectionApi.xiaoStatus.port || 'USB'})` : 'Disconnected'}
                    </span>
                  </div>
                )}
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
          <div className="bg-[#162347] border-t border-[#24355E] px-3.5 py-2 text-xs font-mono text-[#FAF7F2] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-[#BED6EE] uppercase tracking-wider text-[9px]">Status:</span>
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
                <span className="text-[#BED6EE] uppercase tracking-wider text-[9px]">Detection Score:</span>
                <span className="font-bold text-white">
                  {detectionStatus.personDetected ? detectionStatus.highestConfidence.toFixed(2) : '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-[#BED6EE]">
              <span className="flex items-center gap-1 font-bold text-sky-300">
                <Laptop size={11} /> PC GPS: <strong className="text-white font-mono">{baseLocation[0].toFixed(4)}°, {baseLocation[1].toFixed(4)}°</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-300 font-bold">AI VISION ACTIVE</span>
            </div>
          </div>
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
                onClick={() => {
                  if (onTrackPerson) onTrackPerson(baseLocation);
                }}
                className="bg-[#162347]/95 hover:bg-[#1f2f5c] text-[#FAF7F2] backdrop-blur-md px-3 py-1.5 rounded-md shadow-md border border-sky-400/60 text-[11px] font-mono flex items-center gap-2 transition-all cursor-pointer active:scale-95 group"
                title="Click to Center Tactical Map on Computer Ground Control"
              >
                <span className="text-sky-400 flex items-center gap-1 font-bold">
                  <Laptop size={14} className="text-sky-300 group-hover:scale-110 transition-transform" />
                  PC GPS:
                </span>
                <span className="font-bold text-white">
                  {baseLocation[0].toFixed(6)}°, {baseLocation[1].toFixed(6)}°
                </span>
                {computerAccuracy && (
                  <span className="text-[9px] text-sky-200/80 bg-sky-900/60 px-1 py-0.2 rounded font-sans">
                    ±{computerAccuracy}m
                  </span>
                )}
                <span className="text-[9px] bg-sky-500 text-white font-sans font-bold px-1.5 py-0.5 rounded shadow-xs ml-0.5">
                  Locate
                </span>
              </button>

              {/* Target GPS Coordination (Co-located with PC for now) */}
              <div className="bg-[#162347]/95 text-[#FAF7F2] backdrop-blur-md px-3 py-1.5 rounded-md shadow-md border border-rose-500/60 text-[11px] font-mono flex items-center gap-2">
                <span className="text-rose-400 flex items-center gap-1 font-bold">
                  <MapPin size={13} className="text-rose-400 animate-bounce" />
                  TARGET GPS:
                </span>
                <span className="font-bold text-white">
                  {baseLocation[0].toFixed(6)}°, {baseLocation[1].toFixed(6)}°
                </span>
                <span className="font-bold text-rose-300 bg-rose-950/70 border border-rose-500/40 px-1.5 py-0.5 rounded text-[10px]">
                  {manifestPersons.length > 0
                    ? `${manifestPersons.length} detected`
                    : detectionStatus.personDetected
                    ? 'Target Active'
                    : 'Monitoring'}
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
            </div>

            {/* Free OSM / CARTO Tile Switcher & Maximize Map Control */}
            <div className="pointer-events-auto flex items-center gap-2">
              {onMaximizeMap && (
                <button
                  onClick={onMaximizeMap}
                  className="bg-white/95 backdrop-blur-md hover:bg-sky-50 text-[#162347] border border-slate-300 px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5 text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 group"
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

              <div className="bg-white/95 backdrop-blur-md p-1 rounded-md shadow-md border border-slate-200 flex items-center gap-1 text-[10px] font-mono font-bold">
                <span className="text-[9px] text-[#162347]/70 font-sans px-1 font-bold uppercase tracking-wider">
                  Johor, MY
                </span>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => setMapTileSource('google')}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    mapTileSource === 'google'
                      ? 'bg-[#162347] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Google Maps Road / Street Layer"
                >
                  Google Maps
                </button>
                <button
                  onClick={() => setMapTileSource('google-hybrid')}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    mapTileSource === 'google-hybrid'
                      ? 'bg-[#162347] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Google Maps Hybrid (Satellite Imagery + Street Labels)"
                >
                  Google Hybrid
                </button>
                <button
                  onClick={() => setMapTileSource('carto')}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    mapTileSource === 'carto'
                      ? 'bg-[#162347] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Tactical Voyager Layer (Fast Cloudflare Edge CDN)"
                >
                  CARTO
                </button>
                <button
                  onClick={() => setMapTileSource('osm')}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    mapTileSource === 'osm'
                      ? 'bg-[#162347] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Direct OpenStreetMap Tile Layer"
                >
                  OSM
                </button>
              </div>
            </div>
          </div>

          <MapContainer
            center={focusedLocation || baseLocation}
            zoom={14}
            minZoom={10}
            maxZoom={20}
            maxBounds={JOHOR_BOUNDS}
            maxBoundsViscosity={0.5}
            preferCanvas={true}
            scrollWheelZoom={true}
            className="w-full h-full bg-[#0F172A]"
          >
            <MapResizerAndController center={focusedLocation} />
            <LocateControl target={baseLocation} />

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
            <Polygon positions={floodZone} pathOptions={{ color: '#0284C7', fillColor: '#BED6EE', fillOpacity: 0.35, weight: 1.5, dashArray: '4 4' }} />

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

            {/* Real-Time Live Detected Person Marker (active while camera detects a person) */}
            {detectionStatus.personDetected && (
              <Fragment key="live-person-marker">
                <Circle
                  center={baseLocation}
                  radius={22}
                  pathOptions={{
                    color: '#EF4444',
                    fillColor: '#EF4444',
                    fillOpacity: 0.35,
                    weight: 2,
                    dashArray: '4 4',
                  }}
                />
                <Marker position={baseLocation} icon={livePersonIcon}>
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
                          LAT: <span className="text-rose-600 font-mono">{baseLocation[0].toFixed(6)}° N</span>
                        </div>
                        <div className="text-[#162347] font-bold">
                          LNG: <span className="text-rose-600 font-mono">{baseLocation[1].toFixed(6)}° E</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans italic">
                          (Co-located with Ground Control Computer)
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
            ))}

            {/* Context Victims (Simulated / Initial) */}
            {victims.map(v => (
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
            ))}

            {waypoint && <Circle center={waypoint} radius={20} pathOptions={{ color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.4 }} />}
          </MapContainer>
        </div>
      );

    case 'navigation':
      return (
        <div className="h-full overflow-y-auto p-4 flex flex-col items-center min-h-0">
          <div className="m-auto flex flex-col items-center gap-4 w-full max-w-xs py-2">
            {/* D-Pad */}
            <div className="grid grid-cols-3 gap-2 w-40">
              <div />
              <button
                onMouseDown={() => {
                  moveRobot(0, 0.0003, 0);
                  panTilt.sendCommand('up');
                }}
                onMouseUp={() => panTilt.sendCommand('stop')}
                onMouseLeave={() => panTilt.sendCommand('stop')}
                onTouchStart={(e) => {
                  e.preventDefault();
                  moveRobot(0, 0.0003, 0);
                  panTilt.sendCommand('up');
                }}
                onTouchEnd={() => panTilt.sendCommand('stop')}
                onClick={() => {
                  moveRobot(0, 0.0003, 0);
                  panTilt.sendCommand('up');
                }}
                disabled={panTilt.isProcessing}
                className="h-10 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Forward / Tilt Up"
              >
                <ArrowUp size={18} />
              </button>
              <div />

              <button
                onMouseDown={() => {
                  moveRobot(-0.0003, 0, 270);
                  panTilt.sendCommand('left');
                }}
                onMouseUp={() => panTilt.sendCommand('stop')}
                onMouseLeave={() => panTilt.sendCommand('stop')}
                onTouchStart={(e) => {
                  e.preventDefault();
                  moveRobot(-0.0003, 0, 270);
                  panTilt.sendCommand('left');
                }}
                onTouchEnd={() => panTilt.sendCommand('stop')}
                onClick={() => {
                  moveRobot(-0.0003, 0, 270);
                  panTilt.sendCommand('left');
                }}
                disabled={panTilt.isProcessing}
                className="h-10 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Port (Left) / Pan Left"
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
                className="h-10 rounded bg-[#162347] text-[#FAF7F2] font-mono text-[10px] font-bold active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Hold Position / Stop (Double-click or Shift-click to Center)"
              >
                STOP
              </button>
              <button
                onMouseDown={() => {
                  moveRobot(0.0003, 0, 90);
                  panTilt.sendCommand('right');
                }}
                onMouseUp={() => panTilt.sendCommand('stop')}
                onMouseLeave={() => panTilt.sendCommand('stop')}
                onTouchStart={(e) => {
                  e.preventDefault();
                  moveRobot(0.0003, 0, 90);
                  panTilt.sendCommand('right');
                }}
                onTouchEnd={() => panTilt.sendCommand('stop')}
                onClick={() => {
                  moveRobot(0.0003, 0, 90);
                  panTilt.sendCommand('right');
                }}
                disabled={panTilt.isProcessing}
                className="h-10 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Starboard (Right) / Pan Right"
              >
                <ArrowRight size={18} />
              </button>

              <div />
              <button
                onMouseDown={() => {
                  moveRobot(0, -0.0003, 180);
                  panTilt.sendCommand('down');
                }}
                onMouseUp={() => panTilt.sendCommand('stop')}
                onMouseLeave={() => panTilt.sendCommand('stop')}
                onTouchStart={(e) => {
                  e.preventDefault();
                  moveRobot(0, -0.0003, 180);
                  panTilt.sendCommand('down');
                }}
                onTouchEnd={() => panTilt.sendCommand('stop')}
                onClick={() => {
                  moveRobot(0, -0.0003, 180);
                  panTilt.sendCommand('down');
                }}
                disabled={panTilt.isProcessing}
                className="h-10 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm disabled:opacity-75 cursor-pointer select-none"
                title="Reverse / Tilt Down"
              >
                <ArrowDown size={18} />
              </button>
              <div />
            </div>

            {/* ESP32 Wi-Fi Pan/Tilt Connection Status & Center Reset */}
            <div className="w-full flex items-center justify-between px-3 py-1.5 rounded bg-[#FAF7F2] border border-[#E6DFD5] font-mono text-[10px]">
              <div className="flex items-center gap-1.5 text-[#162347]">
                <Compass size={12} className="text-[#162347]" />
                <span className="font-semibold uppercase tracking-wider text-[9px] text-[#162347]/70">Pan/Tilt</span>
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
                    <span className="font-bold text-xs text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-emerald-200/80 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ESP32: Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-amber-200 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      ESP32: Offline
                      <Wifi size={10} className="text-amber-700/80 ml-0.5" />
                    </span>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {panTilt.isProcessing && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" title="Sending command..." />
                )}
                {panTilt.connected ? (
                  <button
                    type="button"
                    onClick={() => panTilt.sendCommand('center')}
                    className="px-2 py-0.5 rounded bg-[#162347] hover:bg-[#243452] text-white text-[9px] font-bold transition-all active:scale-95 cursor-pointer"
                    title="Reset Sonar to Neutral / Center"
                  >
                    CENTER
                  </button>
                ) : (
                  <span className="text-[9px] text-slate-400 font-mono italic">
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
                className="w-full text-center text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 animate-fadeIn cursor-pointer hover:bg-amber-100 transition-colors"
                title="Click to configure ESP32 IP address"
              >
                <span>{panTilt.error} <span className="underline font-semibold ml-1">(Click to set IP)</span></span>
              </div>
            )}

            {/* Thruster Slider */}
            <div className="w-full">
              <div className="flex justify-between text-[10px] font-mono text-[#162347] mb-1">
                <span className="tracking-wider uppercase font-semibold">THRUSTER PWM</span>
                <span className="font-bold">{throttle}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={throttle}
                onChange={e => setThrottle(+e.target.value)}
                className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
              />
            </div>

            {/* Mode Selectors */}
            <div className="grid grid-cols-2 gap-1.5 w-full">
              {(['MANUAL', 'AUTO_SEARCH', 'RETURN_TO_BASE', 'EMERGENCY_STOP'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setOperatingMode(mode)}
                  className={`px-2 py-1.5 rounded text-[9px] font-mono font-bold uppercase transition-all ${
                    operatingMode === mode
                      ? (mode === 'EMERGENCY_STOP' ? 'bg-rose-700 text-white shadow' : 'bg-[#162347] text-white shadow')
                      : 'bg-[#FAF7F2] text-[#162347]/70 hover:bg-[#E6DFD5] border border-[#E6DFD5]'
                  }`}
                >
                  {mode.replace(/_/g, ' ')}
                </button>
              ))}
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
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#162347]">
                Victim Manifest ({victimSortBy === 'person' ? manifestPersons.length : incidentsByTime.length})
              </span>
            </div>

            {/* Arrangement Selector: By Person vs By TIME */}
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-0.5 rounded border border-[#E6DFD5] text-[10px] font-mono font-bold">
              <span className="text-[9px] text-[#162347]/50 px-1 uppercase flex items-center gap-1">
                <ArrowUpDown size={10} /> Sort:
              </span>
              <button
                onClick={() => setVictimSortBy('person')}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  victimSortBy === 'person'
                    ? 'bg-[#162347] text-white shadow-xs'
                    : 'text-[#162347]/70 hover:text-[#162347] hover:bg-[#E6DFD5]'
                }`}
                title="Arrange by Person ID (highest number like Person #8 on top with cropped photo)"
              >
                By Person
              </button>
              <button
                onClick={() => setVictimSortBy('time')}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  victimSortBy === 'time'
                    ? 'bg-[#162347] text-white shadow-xs'
                    : 'text-[#162347]/70 hover:text-[#162347] hover:bg-[#E6DFD5]'
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
                          <div className="w-12 h-12 rounded-full bg-[#162347] text-[#FAF7F2] font-mono font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                            #{v.personId}
                          </div>
                        )}

                        <div>
                          <div className="font-mono font-bold text-sm text-[#162347] flex items-center gap-1.5">
                            <span>{v.label}</span>
                            <span className="text-[9px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                              Score: {v.score.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[#162347]/60 flex items-center gap-1.5 mt-0.5">
                            <span>{v.incident.id}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-[#162347]/80 font-semibold">
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
                        className="bg-[#162347] hover:bg-[#24355E] text-white px-2.5 py-1.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </div>

                    {/* Person GPS Coordination & Track on Map */}
                    <div className="flex items-center justify-between text-[11px] font-mono bg-rose-50 border border-rose-200/80 px-2.5 py-1.5 rounded text-rose-800">
                      <div className="flex items-center gap-1.5 font-bold">
                        <MapPin size={12} className="text-rose-600 animate-pulse shrink-0" />
                        <span>GPS: {v.location[0].toFixed(6)}° N, {v.location[1].toFixed(6)}° E</span>
                      </div>
                      {onTrackPerson && (
                        <button
                          onClick={() => onTrackPerson(v.location)}
                          className="bg-[#162347] hover:bg-[#24355E] text-[#FAF7F2] text-[10px] font-mono font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                          title="Locate person on Tactical Map"
                        >
                          <Navigation size={10} /> Track on Map
                        </button>
                      )}
                    </div>

                    {v.description && (
                      <p className="text-[11px] text-[#162347]/80 line-clamp-2 leading-tight bg-slate-50 p-2 rounded border border-slate-100 font-sans">
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
                          <span className="font-mono font-bold text-sm text-[#162347]">{inc.id}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                            {inc.personCount} Person{inc.personCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-[#162347]/70 font-semibold">
                          <Clock size={12} className="text-[#162347]/60" /> {inc.time}
                        </div>
                      </div>

                      {/* Incident GPS Coordination */}
                      <div className="flex items-center justify-between text-[11px] font-mono bg-rose-50 border border-rose-200/80 px-2.5 py-1.5 rounded text-rose-800">
                        <div className="flex items-center gap-1.5 font-bold">
                          <MapPin size={12} className="text-rose-600 animate-pulse shrink-0" />
                          <span>GPS: {incLocation[0].toFixed(6)}° N, {incLocation[1].toFixed(6)}° E</span>
                        </div>
                        {onTrackPerson && (
                          <button
                            onClick={() => onTrackPerson(incLocation)}
                            className="bg-[#162347] hover:bg-[#24355E] text-[#FAF7F2] text-[10px] font-mono font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                            title="Locate incident on Tactical Map"
                          >
                            <Navigation size={10} /> Track on Map
                          </button>
                        )}
                      </div>

                      {/* Original Scene Image (INC-... full frame) */}
                      {inc.originalImageUrl && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono font-semibold uppercase text-[#162347]/70 flex items-center gap-1">
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
                          <div className="text-[10px] font-mono font-semibold uppercase text-[#162347]/70 flex items-center gap-1">
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
                                  <div className="text-[11px] font-bold text-[#162347] flex items-center gap-1">
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
                        <p className="text-[11px] text-[#162347]/80 line-clamp-2 leading-tight bg-slate-50 p-2 rounded border border-slate-100 font-sans">
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
                          className="bg-[#162347] hover:bg-[#24355E] text-white px-2.5 py-1 rounded text-[10px] flex items-center gap-1 font-bold transition-colors cursor-pointer"
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
              <div className="w-12 h-12 rounded-full bg-[#162347]/5 border border-[#162347]/15 flex items-center justify-center text-[#162347]/60">
                <Users size={24} />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold text-[#162347] uppercase tracking-wider">
                  No Victims Currently Detected
                </h4>
                <p className="text-[11px] text-[#162347]/60 mt-1 max-w-xs leading-relaxed">
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
        <div className="h-full overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
          {[
            { label: 'Robot Link',   value: connectionStatus },
            { label: 'Battery',      value: `${batteryLevel}%` },
            { label: 'Water Depth',  value: `${waterDepth} m` },
            { label: 'Speed',        value: `${robotSpeed} km/h` },
            { label: 'Mode',         value: operatingMode.replace(/_/g, ' ') },
            { label: 'Mission Time', value: `${Math.floor(activeMission.durationSeconds / 60)}m ${activeMission.durationSeconds % 60}s` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#FAF7F2] border border-[#E6DFD5] p-3 rounded shadow-sm">
              <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#162347]/60 mb-0.5">{label}</div>
              <div className="font-editorial-serif font-bold text-lg text-[#162347] leading-tight">{value}</div>
            </div>
          ))}
        </div>
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
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-[#162347] mb-2 flex items-center justify-between">
              <span>AI Detection Sensitivity</span>
              <span className="font-mono text-emerald-700 font-bold">{localThreshold}%</span>
            </h4>
            <input
              type="range"
              min={10}
              max={95}
              value={localThreshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[9px] font-mono text-[#162347]/60 mt-1">
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
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-[#162347] mb-2">HUD Overlays</h4>
            <div className="space-y-2 font-mono text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={aiBoxes} onChange={e => setAiBoxes(e.target.checked)} className="accent-[#162347] w-4 h-4" />
                AI Bounding Boxes
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={crosshair} onChange={e => setCrosshair(e.target.checked)} className="accent-[#162347] w-4 h-4" />
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
        <div className="h-full overflow-y-auto p-3 bg-[#162347] font-mono text-xs space-y-2">
          <div className="text-[10px] text-[#BED6EE] uppercase tracking-widest font-bold pb-2 border-b border-white/10 flex items-center justify-between">
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
}) {
  if (!node) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-[#162347]/40">
        <Target size={48} className="mb-4 opacity-50" />
        <p className="font-editorial-serif text-xl">No panels active</p>
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
        const isMap = child.type === 'panel' && child.id === 'map';
        const isCamera = child.type === 'panel' && child.id === 'camera';
        const defaultSize = isMap ? 65 : isCamera ? 35 : undefined;

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

  const handleInspectIncident = useCallback((inc: RescueIncident, personId?: number) => {
    setInspectedIncident(inc);
    setInspectedPersonId(personId ?? null);
  }, []);

  const handleTrackPerson = useCallback((loc: [number, number]) => {
    setFocusedLocation(loc);
    setLayout((prev) => {
      if (!prev) return { type: 'panel', id: 'map' };
      if (!hasPanel(prev, 'map')) {
        return insertNode(prev, getFirstPanelId(prev), 'map', 'right');
      }
      return prev;
    });
  }, []);

  const [layout, setLayout] = useState<LayoutNode | null>({ type: 'panel', id: 'camera' });

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
      // If adding from dock by clicking, split side-by-side to the right
      return insertNode(prev, getFirstPanelId(prev), id, 'right');
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
    <div className="h-screen flex flex-col bg-[#FAF7F2] text-[#162347] font-sans overflow-hidden">

      {/* Header */}
      <header className="bg-[#162347] text-[#FAF7F2] border-b border-[#24355E] px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 z-[999]">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[#BED6EE] hover:text-white bg-white/10 px-3.5 py-1.5 rounded-full transition-colors">
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="border-l border-white/20 pl-4 flex items-baseline">
            <span className="font-script text-2xl font-bold tracking-tight text-white">FloodScout</span>
            <span className="ml-3 text-[11px] tracking-[0.25em] text-[#BED6EE] uppercase font-semibold hidden sm:inline">
              Operations Command &amp; Control
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* AI Vision Status Indicator */}
          <div className={`hidden md:flex items-center gap-2 text-[11px] font-mono px-3 py-1 rounded-full border ${
            detectionApi.backendOnline && detectionApi.cameraStatus.connected
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : detectionApi.backendOnline
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${detectionApi.backendOnline && detectionApi.cameraStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {detectionApi.backendOnline && detectionApi.cameraStatus.connected
              ? 'AI VISION: ACTIVE'
              : detectionApi.backendOnline
              ? 'CAM DISCONNECTED'
              : 'AI BACKEND: OFFLINE'}
          </div>

          <div className={`flex items-center gap-2 text-[11px] font-mono px-3 py-1 rounded-full border ${robotOnline ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
            <span className={`w-2 h-2 rounded-full ${robotOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {robotOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="font-mono text-[#BED6EE] flex items-center gap-1.5 text-xs">
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
