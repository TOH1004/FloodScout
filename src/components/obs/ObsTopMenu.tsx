import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Columns,
  Clock,
  Settings,
  ChevronDown,
  Check,
  RefreshCw,
  HelpCircle,
  Download,
  Copy,
  Compass
} from 'lucide-react';
import type { PanelId } from '../../utils/layoutTree';

interface ObsTopMenuProps {
  isStudioMode: boolean;
  onToggleStudioMode: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  isMissionActive: boolean;
  timeString: string;
  activePanels: PanelId[];
  onTogglePanel: (id: PanelId) => void;
  onOpenSettings: () => void;
  onSelectLayoutPreset: (preset: 'obsStudio' | 'studioMode' | 'tacticalQuad' | 'aiVision' | 'mapFocus') => void;
  onResetLayout: () => void;
  onExportManifest: () => void;
  onCenterPanTilt: () => void;
  onCopyGps: () => void;
}

export function ObsTopMenu({
  isStudioMode,
  onToggleStudioMode,
  isRecording,
  recordingSeconds,
  isMissionActive,
  timeString,
  activePanels,
  onTogglePanel,
  onOpenSettings,
  onSelectLayoutPreset,
  onResetLayout,
  onExportManifest,
  onCenterPanTilt,
  onCopyGps,
}: ObsTopMenuProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState('USV-01 FloodScout Alpha');
  const [selectedSceneCol, setSelectedSceneCol] = useState('Flood Rescue Operations');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const formatRec = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleDropdown = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const DOCK_LIST: { id: PanelId; label: string }[] = [
    { id: 'camera', label: 'LIVE RECONNAISSANCE' },
    { id: 'map', label: 'TACTICAL MAP' },
    { id: 'navigation', label: 'CAMERA CONTROL (SG90)' },
    { id: 'victims', label: 'TARGET INFORMATION' },
    { id: 'status', label: 'SYSTEM & PROPULSION STATUS' },
    { id: 'sensors', label: 'FRONT RANGE SENSOR (HC-SR04)' },
    { id: 'log', label: 'MISSION & DETECTION HISTORY' },
  ];

  return (
    <div ref={menuRef} className="bg-[#161922] text-slate-200 border-b border-[#262b3a] shrink-0 select-none z-[1000] relative">
      {/* Top Application Bar */}
      <div className="px-3 py-1 flex items-center justify-between text-xs border-b border-[#1f2430]">
        {/* Left: Window branding and Dropdown Menus */}
        <div className="flex items-center gap-1">
          {/* Logo / Home back */}
          <Link
            to="/"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-[11px] font-bold mr-1"
            title="Return to FloodScout Web Home"
          >
            <ArrowLeft size={12} />
            <span className="font-mono text-emerald-400 font-bold">FloodScout</span>
            <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">GCS Control</span>
          </Link>

          {/* Menus: File */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('file')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono hover:bg-[#252a38] transition-colors cursor-pointer ${
                openMenu === 'file' ? 'bg-[#252a38] text-white' : 'text-slate-300'
              }`}
            >
              File
            </button>
            {openMenu === 'file' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-[#1b1f2b] border border-[#2e3547] rounded shadow-2xl py-1 z-50 text-xs font-mono">
                <button
                  onClick={() => {
                    onExportManifest();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Download size={12} /> Export Manifest</span>
                  <span className="text-[9px] text-slate-500">GeoJSON</span>
                </button>
                <button
                  onClick={() => {
                    onResetLayout();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] flex items-center gap-2 text-slate-200 cursor-pointer"
                >
                  <RefreshCw size={12} /> Save / Reset UI Layout
                </button>
                <div className="border-t border-[#262b3a] my-1" />
                <button
                  onClick={() => {
                    onOpenSettings();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] flex items-center gap-2 text-slate-200 cursor-pointer"
                >
                  <Settings size={12} /> Connection Settings...
                </button>
                <Link
                  to="/"
                  className="block px-3 py-1.5 hover:bg-[#252b39] text-slate-400 hover:text-white"
                >
                  Exit to Website
                </Link>
              </div>
            )}
          </div>

          {/* Menus: Edit */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('edit')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono hover:bg-[#252a38] transition-colors cursor-pointer ${
                openMenu === 'edit' ? 'bg-[#252a38] text-white' : 'text-slate-300'
              }`}
            >
              Edit
            </button>
            {openMenu === 'edit' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#1b1f2b] border border-[#2e3547] rounded shadow-2xl py-1 z-50 text-xs font-mono">
                <button
                  onClick={() => {
                    onCenterPanTilt();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Compass size={12} /> Center Camera (90°/90°)</span>
                  <span className="text-[9px] text-slate-500">Key: C</span>
                </button>
                <button
                  onClick={() => {
                    onCopyGps();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] flex items-center gap-2 text-slate-200 cursor-pointer"
                >
                  <Copy size={12} /> Copy Active Coordinates
                </button>
              </div>
            )}
          </div>

          {/* Menus: View */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('view')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono hover:bg-[#252a38] transition-colors cursor-pointer ${
                openMenu === 'view' ? 'bg-[#252a38] text-white' : 'text-slate-300'
              }`}
            >
              View
            </button>
            {openMenu === 'view' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#1b1f2b] border border-[#2e3547] rounded shadow-2xl py-1 z-50 text-xs font-mono">
                <button
                  onClick={() => {
                    onToggleStudioMode();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Columns size={12} /> Studio Mode (Preview/Program)</span>
                  {isStudioMode && <Check size={12} className="text-emerald-400" />}
                </button>
                <div className="border-t border-[#262b3a] my-1" />
                <div className="px-3 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Preset Layouts
                </div>
                <button
                  onClick={() => {
                    onSelectLayoutPreset('obsStudio');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] text-slate-300 hover:text-white cursor-pointer"
                >
                  Standard Mission Console (Dual View + Docks)
                </button>
                <button
                  onClick={() => {
                    onSelectLayoutPreset('tacticalQuad');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] text-slate-300 hover:text-white cursor-pointer"
                >
                  Tactical Quad-View
                </button>
                <button
                  onClick={() => {
                    onSelectLayoutPreset('aiVision');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] text-slate-300 hover:text-white cursor-pointer"
                >
                  AI Vision Target Focus
                </button>
                <button
                  onClick={() => {
                    onSelectLayoutPreset('mapFocus');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] text-slate-300 hover:text-white cursor-pointer"
                >
                  Tactical Map Focus
                </button>
              </div>
            )}
          </div>

          {/* Menus: Docks */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('docks')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono hover:bg-[#252a38] transition-colors cursor-pointer flex items-center gap-1 ${
                openMenu === 'docks' ? 'bg-[#252a38] text-white' : 'text-slate-300'
              }`}
            >
              <span>Docks</span>
              <ChevronDown size={10} />
            </button>
            {openMenu === 'docks' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#1b1f2b] border border-[#2e3547] rounded shadow-2xl py-1 z-50 text-xs font-mono max-h-84 overflow-y-auto">
                <button
                  onClick={() => {
                    onResetLayout();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] text-amber-300 flex items-center gap-1.5 cursor-pointer font-bold border-b border-[#262b3a]"
                >
                  <RefreshCw size={12} /> Reset to Default Designated Docks
                </button>
                <div className="px-3 pt-2 pb-1 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Toggle Docks
                </div>
                {DOCK_LIST.map((dock) => {
                  const isActive = activePanels.includes(dock.id);
                  return (
                    <button
                      key={dock.id}
                      onClick={() => onTogglePanel(dock.id)}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] flex items-center justify-between text-slate-200 cursor-pointer"
                    >
                      <span>{dock.label}</span>
                      {isActive && <Check size={12} className="text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Menus: Profile */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('profile')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono hover:bg-[#252a38] transition-colors cursor-pointer ${
                openMenu === 'profile' ? 'bg-[#252a38] text-white' : 'text-slate-300'
              }`}
            >
              Profile
            </button>
            {openMenu === 'profile' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#1b1f2b] border border-[#2e3547] rounded shadow-2xl py-1 z-50 text-xs font-mono">
                {['USV-01 FloodScout Alpha', 'Scout Drone-Bravo', 'Ground Control HQ Relay'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedProfile(p);
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] flex items-center justify-between text-slate-200 cursor-pointer"
                  >
                    <span>{p}</span>
                    {selectedProfile === p && <Check size={12} className="text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menus: Scene Collection */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('sceneCol')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono hover:bg-[#252a38] transition-colors cursor-pointer hidden md:inline-block ${
                openMenu === 'sceneCol' ? 'bg-[#252a38] text-white' : 'text-slate-300'
              }`}
            >
              Scene Collection
            </button>
            {openMenu === 'sceneCol' && (
              <div className="absolute top-full left-0 mt-1 w-60 bg-[#1b1f2b] border border-[#2e3547] rounded shadow-2xl py-1 z-50 text-xs font-mono">
                {['Flood Rescue Operations', 'Night Recon & Sonar', 'Autonomous GPS Patrol'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSelectedSceneCol(s);
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#252b39] flex items-center justify-between text-slate-200 cursor-pointer"
                  >
                    <span>{s}</span>
                    {selectedSceneCol === s && <Check size={12} className="text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menus: Help */}
          <div className="relative">
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="px-2 py-0.5 rounded text-[11px] font-mono hover:bg-[#252a38] text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <HelpCircle size={11} />
              <span>Help</span>
            </button>
          </div>
        </div>

        {/* Right: Telemetry Badges & Studio Tally */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          {/* LIVE Tally */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
            isMissionActive
              ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
              : 'bg-[#1e222d] border border-slate-700 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isMissionActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>LIVE: {isMissionActive ? 'STREAMING' : 'READY'}</span>
          </div>

          {/* REC Tally */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
            isRecording
              ? 'bg-rose-950 border border-rose-500 text-rose-300'
              : 'bg-[#1e222d] border border-slate-700 text-slate-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 obs-rec-indicator' : 'bg-slate-600'}`} />
            <span>REC: {isRecording ? formatRec(recordingSeconds) : '00:00:00'}</span>
          </div>

          {/* CPU / FPS */}
          <div className="hidden lg:flex items-center gap-2 text-slate-400 text-[10px] bg-[#1a1d26] px-2 py-0.5 rounded border border-[#282d3d]">
            <span>CPU: <strong className="text-slate-200">14.2%</strong></span>
            <span>|</span>
            <span>FPS: <strong className="text-emerald-400">30.0</strong></span>
            <span>|</span>
            <span>KBPS: <strong className="text-cyan-400">4200</strong></span>
          </div>

          {/* Dual Monitor Button */}
          <button
            onClick={onToggleStudioMode}
            className={`px-2.5 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 border transition-all cursor-pointer ${
              isStudioMode
                ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                : 'bg-[#1e2330] hover:bg-[#282f42] text-slate-300 border-[#2f374c]'
            }`}
            title="Toggle Dual Monitor Mode (Side-by-side Preview & Program)"
          >
            <Columns size={12} />
            <span className="hidden sm:inline">Dual Monitor</span>
          </button>

          {/* Connection Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1 rounded bg-[#1e2330] hover:bg-[#282f42] text-slate-300 hover:text-white border border-[#2f374c] transition-colors cursor-pointer"
            title="Configure Backend & ESP32 connection"
          >
            <Settings size={12} />
          </button>

          {/* Clock */}
          <div className="flex items-center gap-1 text-slate-400 text-[10px] pl-1">
            <Clock size={11} />
            <span>{timeString}</span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#181b24] text-slate-200 border border-[#2d3447] rounded-lg shadow-2xl w-full max-w-md p-4 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#2d3447] pb-2">
              <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                <HelpCircle size={15} /> Keyboard Shortcuts &amp; Controls
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Thrust Forward / Tilt Up</span>
                <span className="bg-[#242938] px-2 py-0.5 rounded text-sky-300 font-bold">W or ↑</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Thrust Reverse / Tilt Down</span>
                <span className="bg-[#242938] px-2 py-0.5 rounded text-sky-300 font-bold">S or ↓</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Port Turn / Pan Left</span>
                <span className="bg-[#242938] px-2 py-0.5 rounded text-sky-300 font-bold">A or ←</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Starboard Turn / Pan Right</span>
                <span className="bg-[#242938] px-2 py-0.5 rounded text-sky-300 font-bold">D or →</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Center Pan/Tilt Gimbal (90°/90°)</span>
                <span className="bg-[#242938] px-2 py-0.5 rounded text-sky-300 font-bold">C</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-rose-300 font-bold">EMERGENCY STOP</span>
                <span className="bg-rose-900/60 border border-rose-500 px-2 py-0.5 rounded text-white font-bold">SPACE</span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
