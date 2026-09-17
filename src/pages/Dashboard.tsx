import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Clock, Compass, MapPin, ArrowUp, ArrowDown, ArrowRight,
  Camera, Sparkles, X, Activity, Cpu, Target, FileText,
  Layout, Columns, LayoutDashboard, LayoutGrid, GripVertical,
  AlertTriangle, VideoOff, Eye, Image as ImageIcon
} from 'lucide-react';
import { useDetectionApi, type RescueIncident } from '../hooks/useDetectionApi';
import { IncidentModal } from '../components/IncidentModal';
import {
  DndContext,
  closestCenter,
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
  arrayMove,
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
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRescue } from '../context/RescueContext';
import type { VictimStatus } from '../context/RescueContext';
import { type LayoutNode, type PanelId, removeNode, insertNode, hasPanel, getFirstPanelId } from '../utils/layoutTree';
export type { PanelId, LayoutNode };

// ─── Map Icons ────────────────────────────────────────────────────────────────
const robotIcon = L.divIcon({
  className: 'custom-robot-marker',
  html: `<div style="width:28px;height:28px;background:#162347;border:3px solid #FAF7F2;border-radius:50%;box-shadow:0 0 12px rgba(22,35,71,.6);display:flex;align-items:center;justify-content:center;font-size:11px;color:#FAF7F2">🚤</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});
const getVictimMarkerIcon = (status: VictimStatus) => {
  const color = status === 'Rescued' ? '#10B981' : status === 'Rescue Assigned' ? '#0284C7' : status === 'Verified' ? '#F59E0B' : '#EF4444';
  return L.divIcon({
    className: 'custom-victim-marker',
    html: `<div style="width:24px;height:24px;background:${color};border:2px solid #FAF7F2;border-radius:50%;box-shadow:0 0 10px ${color};display:flex;align-items:center;justify-content:center;font-size:10px">${status === 'Rescued' ? '✅' : '👤'}</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  });
};
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
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
  id, children, onClose, dropPosition,
}: { id: PanelId; children: React.ReactNode; onClose: () => void; dropPosition?: 'top' | 'bottom' | 'left' | 'right' | null }) {
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
        <button onClick={onClose} className="text-[#162347]/40 hover:text-rose-600 transition-colors p-1">
          <X size={15} />
        </button>
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
  onInspectIncident,
}: {
  id: PanelId;
  detectionApi: ReturnType<typeof useDetectionApi>;
  onInspectIncident: (inc: RescueIncident) => void;
}) {
  const {
    waterDepth, robotSpeed, robotLocation, robotHeading, operatingMode, trajectory,
    cameraMode, activeMission, victims, detectionLogs, batteryLevel, connectionStatus,
    setCameraMode, setOperatingMode, moveRobot, updateVictimStatus, simulateVictimDetection,
  } = useRescue();

  const [aiBoxes, setAiBoxes] = useState(true);
  const [crosshair, setCrosshair] = useState(true);
  const [throttle, setThrottle] = useState(50);
  const [waypoint, setWaypoint] = useState<[number, number] | null>(null);
  const [localThreshold, setLocalThreshold] = useState(50);
  const [brightnessVal] = useState(50);

  const floodZone: [number, number][] = [
    [3.0450, 101.5250], [3.0460, 101.5320], [3.0390, 101.5330], [3.0380, 101.5255],
  ];

  switch (id) {
    case 'camera': {
      const { backendOnline, cameraStatus, detectionStatus, videoFeedUrl, activeIncident, dismissActiveIncident, apiBaseUrl } = detectionApi;

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
                    Start the Python computer-vision backend to begin USB camera streaming and YOLO detection.
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

            {/* Top Bar: Camera connection badge & HUD status */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
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

              {backendOnline && (
                <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 rounded shadow-lg text-[10px] font-mono text-slate-300">
                  <span>YOLO11n</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-400 font-bold">COCO: PERSON</span>
                </div>
              )}
            </div>

            {/* Prominent High-Visibility Alert Banner when Person Detected */}
            {detectionStatus.personDetected && (
              <div className="absolute top-12 left-3 right-3 bg-rose-950/90 border-2 border-rose-500 text-white px-3 py-2 rounded shadow-2xl backdrop-blur-md flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🚨</span>
                  <div>
                    <div className="text-xs font-mono font-black tracking-widest text-rose-200 uppercase">
                      PERSON DETECTED
                    </div>
                    <div className="text-[10px] font-mono text-rose-300">
                      Operator intervention recommended
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="bg-rose-900/80 px-2 py-0.5 rounded border border-rose-500/50">
                    People: <strong className="text-white">{detectionStatus.personCount}</strong>
                  </div>
                  <div className="bg-rose-900/80 px-2 py-0.5 rounded border border-rose-500/50">
                    Conf: <strong className="text-emerald-300">{Math.round(detectionStatus.highestConfidence * 100)}%</strong>
                  </div>
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
                      {Math.round(activeIncident.highestConfidence * 100)}%
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
                  <button
                    onClick={() => onInspectIncident(activeIncident)}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2.5 py-1 rounded transition-colors shadow-sm"
                  >
                    <Eye size={12} /> View Image
                  </button>
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
                <span className="text-[#BED6EE] uppercase tracking-wider text-[9px]">Confidence:</span>
                <span className="font-bold text-white">
                  {detectionStatus.personDetected ? `${Math.round(detectionStatus.highestConfidence * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-[#BED6EE]">
              <span>SONAR: <strong className="text-white">{waterDepth}m</strong></span>
              <span>•</span>
              <span>BRG: <strong className="text-white">{robotHeading}°</strong></span>
              <span>•</span>
              <span className="text-emerald-300 font-bold">AI ACTIVE</span>
            </div>
          </div>
        </div>
      );
    }

    case 'map':
      return (
        <div className="h-full w-full relative z-0 isolate">
          <MapContainer center={robotLocation} zoom={16} scrollWheelZoom className="w-full h-full">
            <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <MapClickHandler onMapClick={(lat, lng) => setWaypoint([lat, lng])} />
            <Polygon positions={floodZone} pathOptions={{ color: '#0284C7', fillColor: '#BED6EE', fillOpacity: 0.35, weight: 1.5, dashArray: '4 4' }} />
            <Polyline positions={trajectory} pathOptions={{ color: '#162347', weight: 3, opacity: 0.85 }} />
            <Marker position={robotLocation} icon={robotIcon}>
              <Popup><div className="font-mono text-xs"><strong>FLOODSCOUT-01</strong><br />Mode: {operatingMode}<br />Speed: {robotSpeed} km/h</div></Popup>
            </Marker>
            {victims.map(v => (
              <Marker key={v.id} position={v.location} icon={getVictimMarkerIcon(v.status)}>
                <Popup><div className="font-mono text-xs"><strong>{v.id}</strong><br />{v.status}</div></Popup>
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
                onClick={() => moveRobot(0, 0.0003, 0)}
                className="h-10 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm"
                title="Forward"
              >
                <ArrowUp size={18} />
              </button>
              <div />

              <button
                onClick={() => moveRobot(-0.0003, 0, 270)}
                className="h-10 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm"
                title="Port (Left)"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={() => setOperatingMode('MANUAL')}
                className="h-10 rounded bg-[#162347] text-[#FAF7F2] font-mono text-[10px] font-bold active:scale-95 shadow-sm"
                title="Hold Position"
              >
                STOP
              </button>
              <button
                onClick={() => moveRobot(0.0003, 0, 90)}
                className="h-10 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm"
                title="Starboard (Right)"
              >
                <ArrowRight size={18} />
              </button>

              <div />
              <button
                onClick={() => moveRobot(0, -0.0003, 180)}
                className="h-10 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95 shadow-sm"
                title="Reverse"
              >
                <ArrowDown size={18} />
              </button>
              <div />
            </div>

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

    case 'victims':
      return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {/* Live Captured Rescue Incidents */}
          {detectionApi.incidents && detectionApi.incidents.length > 0 && (
            <div className="space-y-2 pb-3 border-b border-[#E6DFD5]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#162347] flex items-center gap-1.5">
                  <Camera size={13} className="text-rose-600" />
                  Captured Incidents ({detectionApi.incidents.length})
                </span>
                <span className="text-[9px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                  ● Vision Log
                </span>
              </div>

              <div className="space-y-2">
                {detectionApi.incidents.map(inc => (
                  <div key={inc.id} className="p-3 rounded bg-white border border-[#E6DFD5] shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#162347]">{inc.id}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                          {inc.personCount} Person(s)
                        </span>
                      </div>
                      <span className="text-[10px] text-[#162347]/60 font-mono">{inc.time}</span>
                    </div>

                    <div className="flex gap-2.5 items-center">
                      <div
                        className="w-14 h-14 rounded overflow-hidden bg-black border border-slate-200 shrink-0 cursor-pointer relative group"
                        onClick={() => onInspectIncident(inc)}
                      >
                        <img
                          src={`${detectionApi.apiBaseUrl}${inc.imageUrl}`}
                          alt={inc.id}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Eye size={14} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 text-xs space-y-0.5">
                        <div className="font-semibold text-[#162347] text-[11px] flex items-center justify-between">
                          <span>Highest Conf: <strong className="text-emerald-600">{Math.round(inc.highestConfidence * 100)}%</strong></span>
                        </div>
                        <p className="text-[11px] text-[#162347]/80 line-clamp-2 leading-tight">
                          {inc.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-[#E6DFD5] text-[10px] font-mono">
                      <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${
                        inc.descriptionStatus === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inc.descriptionStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {inc.descriptionStatus === 'completed' ? 'AI Observation Ready' : inc.descriptionStatus === 'pending' ? 'Analyzing...' : 'AI Offline'}
                      </span>
                      <button
                        onClick={() => onInspectIncident(inc)}
                        className="bg-[#162347] hover:bg-[#24355E] text-white px-2.5 py-1 rounded text-[10px] flex items-center gap-1 font-bold transition-colors"
                      >
                        <Eye size={12} /> Inspect Images
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simulated / Field Victim Manifest */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#162347]/70 mb-2">
              Field Deployments &amp; Manifest
            </div>
            {victims.map(v => (
              <div key={v.id} className="p-3 rounded bg-[#FAF7F2] border border-[#E6DFD5] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#162347]">{v.id}</span>
                    <span className={`text-[9px] font-mono px-1.5 rounded font-bold uppercase ${v.priority === 'Critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{v.priority}</span>
                  </div>
                  <span className="text-[10px] text-[#162347]/60 font-mono">{v.time}</span>
                </div>
                <p className="text-[#162347]/80 leading-snug">{v.zone} — <strong>{v.peopleCount} Person(s)</strong></p>
                <div className="flex items-center justify-between pt-2 border-t border-[#E6DFD5]">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#162347]/70">{v.status}</span>
                  {v.status !== 'Rescued' ? (
                    <button onClick={() => {
                      const next: Record<VictimStatus, VictimStatus> = { Detected: 'Verified', Verified: 'Rescue Assigned', 'Rescue Assigned': 'Rescued', Rescued: 'Rescued' };
                      updateVictimStatus(v.id, next[v.status]);
                    }} className="bg-[#162347] text-[#FAF7F2] text-[10px] font-mono px-3 py-1 rounded-full">
                      {v.status === 'Detected' ? 'Verify' : v.status === 'Verified' ? 'Assign Boat' : 'Mark Rescued'}
                    </button>
                  ) : <span className="text-[10px] font-mono text-emerald-700 font-bold">✓ Rescued</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

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

          {/* Camera Brightness Control (Architecture Prepared for ESP32-CAM) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[10px] font-bold tracking-widest uppercase text-[#162347]">
                Camera Control
              </h4>
              <span className="text-[9px] font-mono text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded font-semibold">
                Available when ESP32-CAM is connected
              </span>
            </div>
            <div className="space-y-1 opacity-60">
              <div className="flex justify-between text-[10px] font-mono text-[#162347]">
                <span className="uppercase font-semibold">Brightness</span>
                <span>{brightnessVal}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={brightnessVal}
                disabled
                className="w-full accent-slate-400 h-1.5 rounded cursor-not-allowed bg-[#E6DFD5]"
              />
              <p className="text-[9px] text-[#162347]/50 italic">
                Hardware sensor exposure/brightness is locked for USB webcams.
              </p>
            </div>
          </div>

          {/* Camera Mode */}
          <div>
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-[#162347] mb-2">Camera Mode</h4>
            <div className="flex flex-col gap-1.5 font-mono text-xs">
              {(['optical', 'ai', 'thermal'] as const).map(m => (
                <button key={m} onClick={() => setCameraMode(m)}
                  className={`px-4 py-2 text-left rounded border text-xs ${cameraMode === m ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] border-[#E6DFD5] text-[#162347]'}`}>
                  {m === 'optical' ? 'Optical (Standard)' : m === 'ai' ? 'AI Vision Enhanced' : 'Thermal FLIR'}
                </button>
              ))}
            </div>
          </div>

          {/* HUD Overlays */}
          <div>
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

          {/* Demo Simulation Action */}
          <div className="pt-3 border-t border-[#E6DFD5]">
            <button onClick={simulateVictimDetection} className="w-full bg-[#162347] text-white px-4 py-2.5 rounded text-[10px] tracking-widest uppercase font-bold flex items-center justify-center gap-2 active:scale-98 transition-transform">
              <Sparkles size={13} /> Simulate Victim Incident (Demo)
            </button>
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
                    <span className="text-[11px] font-bold text-emerald-400">{log.confidence}%</span>
                  </div>
                )}
              </div>
            ))
          ) : detectionLogs && detectionLogs.length > 0 ? (
            detectionLogs.map((log) => (
              <div key={log.id} className="border-b border-emerald-900/40 pb-2">
                <div className="flex justify-between text-emerald-600 mb-0.5">
                  <span>[{log.time}]</span><span>CONF: {log.confidence}%</span>
                </div>
                <div className="text-emerald-300">{log.message}</div>
              </div>
            ))
          ) : (
            <div className="text-emerald-700 italic py-4 text-center">
              No detections logged.
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
  onInspectIncident,
}: {
  node: LayoutNode | null;
  dropIndicator: { panelId: PanelId; position: 'top' | 'bottom' | 'left' | 'right' } | null;
  onClose: (id: PanelId) => void;
  detectionApi: ReturnType<typeof useDetectionApi>;
  onInspectIncident: (inc: RescueIncident) => void;
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
        <SortablePanel id={node.id} onClose={() => onClose(node.id)} dropPosition={dropIndicator?.panelId === node.id ? dropIndicator.position : null}>
          <PanelContent id={node.id} detectionApi={detectionApi} onInspectIncident={onInspectIncident} />
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
        const childEl = (
          <Panel
            key={child.type === 'panel' ? child.id : child.id}
            minSize={10}
            className="h-full w-full flex flex-col overflow-hidden min-h-0 min-w-0"
          >
            {child.type === 'panel' ? (
              <SortablePanel id={child.id} onClose={() => onClose(child.id)} dropPosition={dropIndicator?.panelId === child.id ? dropIndicator.position : null}>
                <PanelContent id={child.id} detectionApi={detectionApi} onInspectIncident={onInspectIncident} />
              </SortablePanel>
            ) : (
              <LayoutRenderer node={child} dropIndicator={dropIndicator} onClose={onClose} detectionApi={detectionApi} onInspectIncident={onInspectIncident} />
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
  const [inspectedIncident, setInspectedIncident] = useState<RescueIncident | null>(null);

  const [layout, setLayout] = useState<LayoutNode | null>({ type: 'panel', id: 'camera' });
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
      if (['ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); moveRobot(0, 0.0003, 0); }
      else if (['ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); moveRobot(0, -0.0003, 180); }
      else if (['ArrowLeft', 'KeyA'].includes(e.code)) { e.preventDefault(); moveRobot(-0.0003, 0, 270); }
      else if (['ArrowRight', 'KeyD'].includes(e.code)) { e.preventDefault(); moveRobot(0.0003, 0, 90); }
      else if (e.code === 'Space') { e.preventDefault(); emergencyStop(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveRobot, emergencyStop]);

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
    const currentDrag = activeDrag;
    const currentIndicator = dropIndicator;
    setActiveDrag(null);
    setDropIndicator(null);
    if (!currentDrag) return;

    const { active, over } = e;
    const activeId = active.id as string;
    const overId = over?.id as PanelId | undefined;
    const panelId = currentDrag.panelId;

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
          <div className="border-l border-white/20 pl-4">
            <span className="font-script text-3xl text-white">FloodScout</span>
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
              onInspectIncident={setInspectedIncident}
            />
          </div>
        </SortableContext>
      </main>

      {/* Incident Inspector Modal */}
      {inspectedIncident && (
        <IncidentModal
          incident={inspectedIncident}
          apiBaseUrl={detectionApi.apiBaseUrl}
          onClose={() => setInspectedIncident(null)}
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
