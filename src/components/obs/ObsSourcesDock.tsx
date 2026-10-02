import { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Settings, Plus, Minus, ArrowUp, ArrowDown, Layers, Camera, Cpu, Radar, MapPin, Target, Zap } from 'lucide-react';

export interface SourceItem {
  id: string;
  name: string;
  type: 'camera' | 'ai' | 'radar' | 'gps' | 'reticle' | 'thrusters';
  isVisible: boolean;
  isLocked: boolean;
  icon: React.ElementType;
}

const DEFAULT_SOURCES: SourceItem[] = [
  { id: 'src-cam', name: 'USV Optical Feed (ESP32 / Laptop)', type: 'camera', isVisible: true, isLocked: true, icon: Camera },
  { id: 'src-ai', name: 'AI Victim Detection Bounding Boxes', type: 'ai', isVisible: true, isLocked: false, icon: Cpu },
  { id: 'src-radar', name: 'Dual JSN-SR04T Obstacle Sonar', type: 'radar', isVisible: true, isLocked: false, icon: Radar },
  { id: 'src-gps', name: 'GY-NEO6MV2 Geotagging Overlay', type: 'gps', isVisible: true, isLocked: true, icon: MapPin },
  { id: 'src-reticle', name: 'Search Alignment Reticle HUD', type: 'reticle', isVisible: true, isLocked: false, icon: Target },
  { id: 'src-thrusters', name: 'Cytron Dual Thruster Drive', type: 'thrusters', isVisible: true, isLocked: false, icon: Zap },
];

interface ObsSourcesDockProps {
  onToggleAiBoxes?: (visible: boolean) => void;
  onToggleCrosshair?: (visible: boolean) => void;
  onOpenProperties?: () => void;
}

export function ObsSourcesDock({ onToggleAiBoxes, onToggleCrosshair, onOpenProperties }: ObsSourcesDockProps) {
  const [sources, setSources] = useState<SourceItem[]>(DEFAULT_SOURCES);
  const [selectedId, setSelectedId] = useState<string>('src-cam');

  const toggleVisibility = (id: string) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextVis = !s.isVisible;
        if (id === 'src-ai' && onToggleAiBoxes) onToggleAiBoxes(nextVis);
        if (id === 'src-reticle' && onToggleCrosshair) onToggleCrosshair(nextVis);
        return { ...s, isVisible: nextVis };
      })
    );
  };

  const toggleLock = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isLocked: !s.isLocked } : s))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...sources];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setSources(next);
  };

  const handleMoveDown = (index: number) => {
    if (index === sources.length - 1) return;
    const next = [...sources];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setSources(next);
  };

  const selectedIndex = sources.findIndex((s) => s.id === selectedId);

  return (
    <div className="h-full bg-[#12141a] text-slate-300 font-sans p-3 flex flex-col justify-between select-none min-h-0">
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between border-b border-[#232733] pb-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            <Layers size={13} className="text-emerald-400" />
            <span>Vision & Sensor Layers</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {sources.filter((s) => s.isVisible).length}/{sources.length} ACTIVE
          </span>
        </div>

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto mt-2 space-y-1 pr-0.5">
          {sources.map((src) => {
            const isSelected = src.id === selectedId;
            const Icon = src.icon;

            return (
              <div
                key={src.id}
                onClick={() => setSelectedId(src.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-all border text-xs font-mono select-none ${
                  isSelected
                    ? 'bg-[#1e2330] border-sky-500/50 text-white font-bold'
                    : 'bg-[#161821] hover:bg-[#1a1e29] border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon size={12} className={src.isVisible ? 'text-sky-400 shrink-0' : 'text-slate-600 shrink-0'} />
                  <span className={`truncate text-[11px] ${!src.isVisible ? 'text-slate-600 line-through' : ''}`}>
                    {src.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {/* Eye Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisibility(src.id);
                    }}
                    className={`p-1 rounded hover:bg-white/10 transition-colors ${
                      src.isVisible ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                    title={src.isVisible ? 'Hide Source' : 'Show Source'}
                  >
                    {src.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>

                  {/* Lock Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(src.id);
                    }}
                    className={`p-1 rounded hover:bg-white/10 transition-colors ${
                      src.isLocked ? 'text-amber-400' : 'text-slate-600'
                    }`}
                    title={src.isLocked ? 'Unlock Source' : 'Lock Source'}
                  >
                    {src.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OBS Sources Toolbar */}
      <div className="pt-2 border-t border-[#232733] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const count = sources.length + 1;
              setSources([
                ...sources,
                {
                  id: `src-custom-${Date.now()}`,
                  name: `Custom Overlay Layer ${count}`,
                  type: 'reticle',
                  isVisible: true,
                  isLocked: false,
                  icon: Layers,
                },
              ]);
            }}
            className="p-1 rounded bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer"
            title="Add Source"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={() => {
              if (sources.length <= 1) return;
              setSources(sources.filter((s) => s.id !== selectedId));
            }}
            disabled={sources.length <= 1}
            className="p-1 rounded bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer disabled:opacity-40"
            title="Remove Selected Source"
          >
            <Minus size={13} />
          </button>
          {onOpenProperties && (
            <button
              onClick={onOpenProperties}
              className="p-1 rounded bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer"
              title="Source Properties"
            >
              <Settings size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleMoveUp(selectedIndex)}
            disabled={selectedIndex <= 0}
            className="p-1 rounded bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer disabled:opacity-40"
            title="Move Layer Up"
          >
            <ArrowUp size={13} />
          </button>
          <button
            onClick={() => handleMoveDown(selectedIndex)}
            disabled={selectedIndex < 0 || selectedIndex >= sources.length - 1}
            className="p-1 rounded bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer disabled:opacity-40"
            title="Move Layer Down"
          >
            <ArrowDown size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
