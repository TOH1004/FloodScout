import { useState } from 'react';
import { Film, Plus, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import type { PanelId } from '../../utils/layoutTree';

export interface SceneItem {
  id: string;
  name: string;
  preset: 'obsStudio' | 'studioMode' | 'tacticalQuad' | 'aiVision' | 'mapFocus' | 'sonarSweep';
  activePanels: PanelId[];
  isLocked?: boolean;
}

const DEFAULT_SCENES: SceneItem[] = [
  {
    id: 'sc-1',
    name: '1. Narrow Alleyway Recon (Cam + Map)',
    preset: 'obsStudio',
    activePanels: ['camera', 'map', 'navigation', 'sensors'],
  },
  {
    id: 'sc-2',
    name: '2. Porch & Occluded Structure Search',
    preset: 'aiVision',
    activePanels: ['camera', 'victims', 'log'],
  },
  {
    id: 'sc-3',
    name: '3. Dual Sonar Collision Avoidance',
    preset: 'sonarSweep',
    activePanels: ['sensors', 'camera', 'navigation'],
  },
  {
    id: 'sc-4',
    name: '4. Tactical GIS Geotagging & Manifest',
    preset: 'mapFocus',
    activePanels: ['map', 'camera', 'victims', 'sensors'],
  },
  {
    id: 'sc-5',
    name: '5. Manual Dual-Thruster Piloting',
    preset: 'obsStudio',
    activePanels: ['navigation', 'camera', 'sensors'],
  },
  {
    id: 'sc-6',
    name: '6. Hardware Telemetry & Diagnostics',
    preset: 'tacticalQuad',
    activePanels: ['status', 'log', 'sensors', 'victims'],
  },
];

interface ObsScenesDockProps {
  activeSceneId: string;
  onSelectScene: (scene: SceneItem) => void;
}

export function ObsScenesDock({ activeSceneId, onSelectScene }: ObsScenesDockProps) {
  const [scenes, setScenes] = useState<SceneItem[]>(DEFAULT_SCENES);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...scenes];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setScenes(next);
  };

  const handleMoveDown = (index: number) => {
    if (index === scenes.length - 1) return;
    const next = [...scenes];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setScenes(next);
  };

  const handleAddScene = () => {
    const num = scenes.length + 1;
    const newScene: SceneItem = {
      id: `sc-${Date.now()}`,
      name: `${num}. Custom Scene ${num}`,
      preset: 'obsStudio',
      activePanels: ['camera', 'map', 'navigation'],
    };
    setScenes([...scenes, newScene]);
    onSelectScene(newScene);
  };

  const handleRemoveScene = (id: string) => {
    if (scenes.length <= 1) return;
    const filtered = scenes.filter((s) => s.id !== id);
    setScenes(filtered);
    if (activeSceneId === id) {
      onSelectScene(filtered[0]);
    }
  };

  const activeIndex = scenes.findIndex((s) => s.id === activeSceneId);

  return (
    <div className="h-full bg-[#12141a] text-slate-300 font-sans p-3 flex flex-col justify-between select-none min-h-0">
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between border-b border-[#232733] pb-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            <Film size={13} className="text-emerald-400" />
            <span>Recon Profiles</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {scenes.length} PRESETS
          </span>
        </div>

        {/* Scene List */}
        <div className="flex-1 overflow-y-auto mt-2 space-y-1 pr-0.5">
          {scenes.map((scene) => {
            const isActive = scene.id === activeSceneId;
            return (
              <div
                key={scene.id}
                onClick={() => onSelectScene(scene)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-all border text-xs font-mono select-none ${
                  isActive
                    ? 'bg-[#1e2330] border-emerald-500/60 text-white font-bold shadow-xs'
                    : 'bg-[#161821] hover:bg-[#1a1e29] border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className="truncate">{scene.name}</span>
                </div>

                {isActive && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded font-sans uppercase font-bold shrink-0">
                    PROGRAM
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* OBS Scenes Toolbar */}
      <div className="pt-2 border-t border-[#232733] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddScene}
            className="p-1 rounded bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer"
            title="Add New Scene"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={() => handleRemoveScene(activeSceneId)}
            disabled={scenes.length <= 1}
            className="p-1 rounded bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer disabled:opacity-40"
            title="Delete Selected Scene"
          >
            <Minus size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleMoveUp(activeIndex)}
            disabled={activeIndex <= 0}
            className="p-1 rounded bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer disabled:opacity-40"
            title="Move Scene Up"
          >
            <ArrowUp size={13} />
          </button>
          <button
            onClick={() => handleMoveDown(activeIndex)}
            disabled={activeIndex < 0 || activeIndex >= scenes.length - 1}
            className="p-1 rounded bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer disabled:opacity-40"
            title="Move Scene Down"
          >
            <ArrowDown size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
