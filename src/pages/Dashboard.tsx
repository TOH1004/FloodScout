import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Clock, Compass, MapPin, ArrowUp, ArrowDown, ArrowRight,
  Camera, Sparkles, X, Activity, Cpu, Target, FileText,
  Layout, Columns, LayoutDashboard, LayoutGrid, GripVertical
} from 'lucide-react';
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
export type PanelId = 'camera' | 'map' | 'navigation' | 'victims' | 'status' | 'controls' | 'log';
type LayoutMode = 'auto' | 'split' | 'focus-left' | 'quad';

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
}: { id: PanelId; children: React.ReactNode; onClose: () => void; dropPosition?: 'before' | 'after' | null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };
  const def = PANEL_DEFS.find(p => p.id === id)!;
  return (
    <div
      ref={setNodeRef}
      style={style as React.CSSProperties}
      className="bg-white border border-[#E6DFD5] rounded-sm shadow-md flex flex-col overflow-hidden h-full min-h-0 relative"
    >
      {/* Drop-before indicator */}
      {dropPosition === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#162347] z-50 rounded-t-sm pointer-events-none" />
      )}
      {/* Drop-after indicator */}
      {dropPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#162347] z-50 rounded-b-sm pointer-events-none" />
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
// direction='horizontal' = column divider (sits between columns, needs full HEIGHT)
// direction='vertical'   = row divider    (sits between rows,    needs full WIDTH)
function ResizeHandle({ direction = 'horizontal' }: { direction?: 'horizontal' | 'vertical' }) {
  return (
    <PanelResizeHandle
      className={`group relative flex items-center justify-center bg-[#E6DFD5] hover:bg-[#BED6EE] data-[resize-handle-active]:bg-[#162347] transition-colors duration-150 ${
        direction === 'horizontal'
          ? 'w-2 h-full cursor-col-resize'
          : 'h-2 w-full cursor-row-resize'
      }`}
    >
      <div className={`flex items-center justify-center gap-0.5 pointer-events-none ${
        direction === 'horizontal' ? 'flex-col' : 'flex-row'
      }`}>
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#162347]/30 group-hover:bg-[#162347]/70 group-data-[resize-handle-active]:bg-white transition-colors" />
        ))}
      </div>
    </PanelResizeHandle>
  );
}

// ─── Panel Content Renderer ───────────────────────────────────────────────────
function PanelContent({ id }: { id: PanelId }) {
  const {
    waterDepth, robotSpeed, robotLocation, robotHeading, operatingMode, trajectory,
    cameraMode, activeMission, victims, detectionLogs, batteryLevel, connectionStatus,
    setCameraMode, setOperatingMode, moveRobot, updateVictimStatus, simulateVictimDetection,
  } = useRescue();

  const [aiBoxes, setAiBoxes] = useState(true);
  const [crosshair, setCrosshair] = useState(true);
  const [throttle, setThrottle] = useState(50);
  const [waypoint, setWaypoint] = useState<[number, number] | null>(null);

  const floodZone: [number, number][] = [
    [3.0450, 101.5250], [3.0460, 101.5320], [3.0390, 101.5330], [3.0380, 101.5255],
  ];

  switch (id) {
    case 'camera':
      return (
        <div className="relative h-full bg-slate-900">
          <img
            src={cameraMode === 'thermal'
              ? 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?q=80&w=1200&auto=format&fit=crop'
              : 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=1200&auto=format&fit=crop'}
            alt="Live Feed"
            className={`w-full h-full object-cover transition-all duration-500 ${cameraMode === 'thermal' ? 'filter invert hue-rotate-180 contrast-150' : ''}`}
          />
          {crosshair && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-24 h-24 border border-white/40 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          )}
          {aiBoxes && cameraMode !== 'optical' && (
            <div className="absolute top-1/4 right-1/4 w-36 h-48 border-2 border-emerald-400 bg-emerald-400/20">
              <div className="bg-emerald-500 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 absolute -top-5 left-0 shadow">
                PERSON DETECTED (96.4%)
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3 bg-[#162347]/90 backdrop-blur-sm px-3 py-1.5 rounded-sm text-[10px] font-mono text-[#FAF7F2] flex justify-between">
            <span>SONAR: {waterDepth}m | BRG: {robotHeading}°</span>
            <span className="text-emerald-300">AI ACTIVE</span>
          </div>
        </div>
      );

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
        <div className="h-full flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 w-44">
            <div /><button onClick={() => moveRobot(0, 0.0003, 0)} className="h-12 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95"><ArrowUp size={20} /></button><div />
            <button onClick={() => moveRobot(-0.0003, 0, 270)} className="h-12 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95"><ArrowLeft size={20} /></button>
            <button onClick={() => setOperatingMode('MANUAL')} className="h-12 rounded bg-[#162347] text-[#FAF7F2] font-mono text-[10px] font-bold">STOP</button>
            <button onClick={() => moveRobot(0.0003, 0, 90)} className="h-12 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95"><ArrowRight size={20} /></button>
            <div /><button onClick={() => moveRobot(0, -0.0003, 180)} className="h-12 rounded bg-[#FAF7F2] hover:bg-[#162347] text-[#162347] hover:text-white border border-[#E6DFD5] flex items-center justify-center transition-all active:scale-95"><ArrowDown size={20} /></button><div />
          </div>
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs font-mono text-[#162347] mb-1"><span>THRUSTER PWM</span><span className="font-bold">{throttle}%</span></div>
            <input type="range" min={0} max={100} value={throttle} onChange={e => setThrottle(+e.target.value)} className="w-full accent-[#162347] h-2 rounded cursor-pointer" />
          </div>
          <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
            {(['MANUAL', 'AUTO_SEARCH', 'RETURN_TO_BASE', 'EMERGENCY_STOP'] as const).map(mode => (
              <button key={mode} onClick={() => setOperatingMode(mode)}
                className={`px-2 py-1.5 rounded text-[9px] font-mono font-bold uppercase transition-all ${operatingMode === mode ? (mode === 'EMERGENCY_STOP' ? 'bg-rose-700 text-white' : 'bg-[#162347] text-white') : 'bg-[#FAF7F2] text-[#162347]/70 border border-[#E6DFD5]'}`}>
                {mode.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      );

    case 'victims':
      return (
        <div className="h-full overflow-y-auto p-4 space-y-3">
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

    case 'controls':
      return (
        <div className="h-full overflow-y-auto p-4 space-y-5">
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
          <div className="pt-3 border-t border-[#E6DFD5]">
            <button onClick={simulateVictimDetection} className="w-full bg-[#162347] text-white px-4 py-2.5 rounded text-[10px] tracking-widest uppercase font-bold flex items-center justify-center gap-2">
              <Sparkles size={13} /> Simulate AI Detection
            </button>
          </div>
        </div>
      );

    case 'log':
      return (
        <div className="h-full overflow-y-auto p-3 bg-[#162347] font-mono text-xs space-y-2">
          {detectionLogs.map(log => (
            <div key={log.id} className="border-b border-emerald-900/40 pb-2">
              <div className="flex justify-between text-emerald-600 mb-0.5">
                <span>[{log.time}]</span><span>CONF: {log.confidence}%</span>
              </div>
              <div className="text-emerald-300">{log.message}</div>
            </div>
          ))}
          {detectionLogs.length === 0 && <div className="text-emerald-700 italic">No detections logged.</div>}
        </div>
      );
  }
}

// ─── Resizable Layout Renderer ────────────────────────────────────────────────
// CRITICAL: Panel and Separator must be DIRECT children of PanelGroup (Group).
// No wrapper divs allowed between Group and its Panel/Separator children.

type DropIndicator = { panelId: PanelId; position: 'before' | 'after' } | null;

function buildRowGroup(row: PanelId[], onClose: (id: PanelId) => void, dropIndicator: DropIndicator) {
  if (row.length === 1) {
    return (
      <Panel key={row[0]} minSize={10} style={{ overflow: 'hidden' }}>
        <SortablePanel id={row[0]} onClose={() => onClose(row[0])} dropPosition={dropIndicator?.panelId === row[0] ? dropIndicator.position : null}>
          <PanelContent id={row[0]} />
        </SortablePanel>
      </Panel>
    );
  }
  // Multiple panels in a row — wrap in a Panel containing a horizontal PanelGroup
  return (
    // This Panel acts as a row container; must be display:flex so the inner PanelGroup can flex:1
    <Panel key={row.join('-')} minSize={10} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* flex:1 + minHeight:0 lets this PanelGroup fill the row Panel's allocated height */}
      <PanelGroup direction="horizontal" style={{ flex: 1, minHeight: 0 }}>
        {row.flatMap((pid, ci) => {
          const panelEl = (
            <Panel key={pid} minSize={10} style={{ overflow: 'hidden' }}>
              <SortablePanel id={pid} onClose={() => onClose(pid)} dropPosition={dropIndicator?.panelId === pid ? dropIndicator.position : null}>
                <PanelContent id={pid} />
              </SortablePanel>
            </Panel>
          );
          if (ci === 0) return [panelEl];
          return [<ResizeHandle key={`h-${pid}`} direction="horizontal" />, panelEl];
        })}
      </PanelGroup>
    </Panel>
  );
}

function ResizableLayout({
  panels,
  layoutMode,
  dropIndicator,
  onClose,
}: {
  panels: PanelId[];
  layoutMode: LayoutMode;
  dropIndicator: DropIndicator;
  onClose: (id: PanelId) => void;
}) {
  if (panels.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#162347]/40">
        <Target size={48} className="mb-4 opacity-50" />
        <p className="font-editorial-serif text-xl">No panels active</p>
        <p className="text-xs font-mono uppercase tracking-widest mt-2">Select a feature from the dock above</p>
      </div>
    );
  }

  if (panels.length === 1) {
    return (
      <div className="h-full overflow-hidden">
        <SortablePanel id={panels[0]} onClose={() => onClose(panels[0])} dropPosition={dropIndicator?.panelId === panels[0] ? dropIndicator.position : null}>
          <PanelContent id={panels[0]} />
        </SortablePanel>
      </div>
    );
  }

  // ── Focus-Left: large master (left 2/3), stacked panels (right 1/3) ──
  if (layoutMode === 'focus-left') {
    const [master, ...rest] = panels;
    if (rest.length === 0) {
      return (
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <SortablePanel id={master} onClose={() => onClose(master)} dropPosition={dropIndicator?.panelId === master ? dropIndicator.position : null}>
            <PanelContent id={master} />
          </SortablePanel>
        </div>
      );
    }
    return (
      <PanelGroup direction="horizontal" style={{ height: '100%' }}>
        <Panel defaultSize={65} minSize={20} style={{ overflow: 'hidden' }}>
          <SortablePanel id={master} onClose={() => onClose(master)} dropPosition={dropIndicator?.panelId === master ? dropIndicator.position : null}>
            <PanelContent id={master} />
          </SortablePanel>
        </Panel>
        <ResizeHandle direction="horizontal" />
        {/* Right column — vertical stack; Panel must be flex so inner PanelGroup fills it */}
        <Panel defaultSize={35} minSize={15} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PanelGroup direction="vertical" style={{ flex: 1, minHeight: 0 }}>
            {rest.flatMap((pid, i) => {
              const panelEl = (
                <Panel key={pid} minSize={10} style={{ overflow: 'hidden' }}>
                  <SortablePanel id={pid} onClose={() => onClose(pid)} dropPosition={dropIndicator?.panelId === pid ? dropIndicator.position : null}>
                    <PanelContent id={pid} />
                  </SortablePanel>
                </Panel>
              );
              if (i === 0) return [panelEl];
              return [<ResizeHandle key={`v-${pid}`} direction="vertical" />, panelEl];
            })}
          </PanelGroup>
        </Panel>
      </PanelGroup>
    );
  }

  // ── Grid layouts (Split, Quad, Auto) ──
  // Auto: for 3 panels use 3 columns (flat, no nesting). For others, use 2-col rows.
  const colCount =
    layoutMode === 'split' ? Math.min(panels.length, 2) :
    layoutMode === 'quad'  ? 2 :
    panels.length === 3    ? 3 :   // ← flat 3-col avoids nested PanelGroup height issues
    panels.length <= 2     ? 2 :
    panels.length <= 4     ? 2 : 3;

  const rows: PanelId[][] = [];
  for (let i = 0; i < panels.length; i += colCount) {
    rows.push(panels.slice(i, i + colCount));
  }

  // Single row — flat horizontal split (most reliable, no nesting)
  if (rows.length === 1) {
    return (
      <PanelGroup direction="horizontal" style={{ height: '100%' }}>
        {rows[0].flatMap((pid, ci) => {
          const panelEl = (
            <Panel key={pid} minSize={10} style={{ overflow: 'hidden' }}>
              <SortablePanel id={pid} onClose={() => onClose(pid)} dropPosition={dropIndicator?.panelId === pid ? dropIndicator.position : null}>
                <PanelContent id={pid} />
              </SortablePanel>
            </Panel>
          );
          if (ci === 0) return [panelEl];
          return [<ResizeHandle key={`h-${pid}`} direction="horizontal" />, panelEl];
        })}
      </PanelGroup>
    );
  }

  // Multiple rows — outer vertical PanelGroup (buildRowGroup handles nested horizontal groups)
  return (
    <PanelGroup direction="vertical" style={{ height: '100%' }}>
      {rows.flatMap((row, ri) => {
        const rowEl = buildRowGroup(row, onClose, dropIndicator);
        if (ri === 0) return [rowEl];
        return [<ResizeHandle key={`vr-${ri}`} direction="vertical" />, rowEl];
      })}
    </PanelGroup>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { robotOnline, moveRobot, emergencyStop } = useRescue();

  const [panels, setPanels] = useState<PanelId[]>(['camera']);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto');
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  // Track what is being dragged: panel grip OR dock button
  const [activeDrag, setActiveDrag] = useState<{ id: string; panelId: PanelId } | null>(null);
  // Track which panel the drag is hovering over + which half (top/bottom)
  const [dropIndicator, setDropIndicator] = useState<{ panelId: PanelId; position: 'before' | 'after' } | null>(null);

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
    setPanels(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
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
    // Detect top/bottom half using pointer position vs panel rect
    const overRect = e.over?.rect;
    if (overRect && e.activatorEvent instanceof PointerEvent) {
      const pointerY = (e.activatorEvent as PointerEvent).clientY;
      // Re-read latest pointer from the event delta
      const midY = overRect.top + overRect.height / 2;
      const position = pointerY > midY ? 'after' : 'before';
      setDropIndicator({ panelId: overId, position });
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const currentDrag = activeDrag;
    setActiveDrag(null);
    setDropIndicator(null);
    if (!currentDrag) return;

    const { active, over } = e;
    const activeId = active.id as string;
    const overId = over?.id as PanelId | undefined;
    const isFromDock = activeId.startsWith('dock-');
    const panelId = currentDrag.panelId;

    if (isFromDock) {
      // Drag from dock → add to workspace at the drop position
      setPanels(prev => {
        if (prev.includes(panelId)) {
          // Already visible — just reorder to after the target
          if (!overId || !prev.includes(overId)) return prev;
          const from = prev.indexOf(panelId);
          const to = prev.indexOf(overId);
          const insertAt = dropIndicator?.position === 'before' ? to : to + 1;
          const adjusted = from < insertAt ? insertAt - 1 : insertAt;
          return arrayMove(prev, from, Math.max(0, Math.min(adjusted, prev.length - 1)));
        }
        // Not yet in workspace — insert at the right spot
        if (!overId || !prev.includes(overId)) return [...prev, panelId];
        const overIdx = prev.indexOf(overId);
        const insertAt = dropIndicator?.position === 'before' ? overIdx : overIdx + 1;
        const next = [...prev];
        next.splice(insertAt, 0, panelId);
        return next;
      });
      return;
    }

    // Drag from panel grip → reorder
    if (overId && activeId !== overId) {
      setPanels(prev => {
        const from = prev.indexOf(panelId);
        const to = prev.indexOf(overId);
        if (from === -1 || to === -1) return prev;
        const insertAt = dropIndicator?.position === 'before' ? to : to + 1;
        const adjusted = from < insertAt ? insertAt - 1 : insertAt;
        return arrayMove(prev, from, Math.max(0, Math.min(adjusted, prev.length - 1)));
      });
    }
  };

  const layoutButtons = [
    { mode: 'auto' as const,       icon: Layout,          title: 'Auto Flow' },
    { mode: 'split' as const,      icon: Columns,         title: '50/50 Split' },
    { mode: 'focus-left' as const, icon: LayoutDashboard, title: 'Focus Stack' },
    { mode: 'quad' as const,       icon: LayoutGrid,      title: 'Quad Grid' },
  ];

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
        <div className="flex items-center gap-4">
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
              isActive={panels.includes(p.id)}
              onToggle={() => togglePanel(p.id)}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 pl-4 border-l border-[#E6DFD5] ml-3 shrink-0">
          <span className="text-[9px] uppercase tracking-widest font-bold text-[#162347]/40 mr-1 hidden lg:block">Layout</span>
          {layoutButtons.map(({ mode, icon: Icon, title }) => (
            <button
              key={mode}
              onClick={() => setLayoutMode(mode)}
              title={title}
              className={`p-1.5 rounded transition-all ${layoutMode === mode ? 'bg-[#162347] text-white' : 'text-[#162347]/40 hover:bg-[#E6DFD5] hover:text-[#162347]'}`}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <main className="flex-1 overflow-hidden p-3 min-h-0">
        <SortableContext items={panels} strategy={rectSortingStrategy}>
          <div className="h-full">
            <ResizableLayout
              panels={panels}
              layoutMode={layoutMode}
              dropIndicator={dropIndicator}
              onClose={(id) => setPanels(prev => prev.filter(p => p !== id))}
            />
          </div>
        </SortableContext>
      </main>

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
