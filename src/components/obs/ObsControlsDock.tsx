import { Columns, Sliders, AlertOctagon, Settings, Home, Wifi, Camera, Laptop } from 'lucide-react';
import type { CameraFeedMode } from '../../config/camera';

interface ObsControlsDockProps {
  isMissionActive: boolean;
  onToggleMission: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  onToggleRecording: () => void;
  isStudioMode: boolean;
  onToggleStudioMode: () => void;
  feedMode: CameraFeedMode;
  onToggleFeedMode: () => void;
  onSelectFeedMode?: (mode: CameraFeedMode) => void;
  onEmergencyStop: () => void;
  onOpenSettings: () => void;
  onOpenWifiSetup: () => void;
}

export function ObsControlsDock({
  isMissionActive,
  onToggleMission,
  isRecording,
  recordingSeconds,
  onToggleRecording,
  isStudioMode,
  onToggleStudioMode,
  feedMode,
  onToggleFeedMode: _onToggleFeedMode,
  onSelectFeedMode,
  onEmergencyStop,
  onOpenSettings,
  onOpenWifiSetup,
}: ObsControlsDockProps) {
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full bg-[#12141a] text-slate-200 font-sans p-3 flex flex-col justify-between select-none min-h-0">
      <div className="border-b border-[#232733] pb-2 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
          <Sliders size={13} className="text-emerald-400" />
          <span>Mission Operations Deck</span>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {/* Primary Action Buttons */}
      <div className="flex-1 my-2 flex flex-col justify-around gap-1.5 min-h-0">
        {/* Start / Stop Mission (Streaming) */}
        <button
          onClick={onToggleMission}
          className={`w-full py-2 px-3 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-md active:scale-98 ${
            isMissionActive
              ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/80 text-rose-200 ring-1 ring-rose-500/50'
              : 'bg-emerald-900/40 hover:bg-emerald-800/60 border-emerald-500/50 text-emerald-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isMissionActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
          <span>{isMissionActive ? 'Stop Mission' : 'Start Mission'}</span>
        </button>

        {/* Start / Stop Recording */}
        <button
          onClick={onToggleRecording}
          className={`w-full py-2 px-3 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-md active:scale-98 ${
            isRecording
              ? 'bg-rose-900 hover:bg-rose-800 border-rose-400 text-white shadow-rose-950/50 ring-1 ring-rose-400'
              : 'bg-[#1c202a] hover:bg-[#252b39] border-[#2b3140] text-slate-300 hover:text-white'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-rose-500'}`} />
          <span>{isRecording ? `REC: ${formatTime(recordingSeconds)}` : 'Start Telemetry REC'}</span>
        </button>

        {/* Dual Console Mode Toggle */}
        <button
          onClick={onToggleStudioMode}
          className={`w-full py-2 px-3 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-xs active:scale-98 ${
            isStudioMode
              ? 'bg-sky-950/80 hover:bg-sky-900 border-sky-400 text-sky-200 ring-1 ring-sky-400/50'
              : 'bg-[#1c202a] hover:bg-[#252b39] border-[#2b3140] text-slate-300 hover:text-white'
          }`}
        >
          <Columns size={13} className={isStudioMode ? 'text-sky-300' : 'text-slate-400'} />
          <span>Dual Console ({isStudioMode ? 'ACTIVE' : 'OFF'})</span>
        </button>

        {/* Camera Source Selector: XIAO CAM / LAPTOP CAM / AI VISION */}
        <div className="w-full bg-[#171a23] border border-[#262b3a] rounded p-1.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold uppercase">
            <span className="flex items-center gap-1">
              <Camera size={11} className="text-emerald-400" />
              Camera Feed Source:
            </span>
            <span className="text-emerald-400">
              {feedMode === 'direct' ? 'XIAO Direct' : feedMode === 'webcam' ? 'Laptop Cam' : 'AI Stream'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => onSelectFeedMode?.('direct')}
              className={`py-1 px-1.5 rounded text-[9px] font-mono font-bold tracking-tight text-center border transition-all cursor-pointer ${
                feedMode === 'direct'
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-xs'
                  : 'bg-[#12141a] border-[#282e3f] text-slate-400 hover:text-white hover:bg-[#1a1e28]'
              }`}
              title="XIAO ESP32-S3 Sense Direct Wi-Fi stream"
            >
              XIAO Cam
            </button>
            <button
              onClick={() => onSelectFeedMode?.('webcam')}
              className={`py-1 px-1.5 rounded text-[9px] font-mono font-bold tracking-tight text-center border transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
                feedMode === 'webcam'
                  ? 'bg-purple-600 border-purple-400 text-white shadow-xs'
                  : 'bg-[#12141a] border-[#282e3f] text-slate-400 hover:text-white hover:bg-[#1a1e28]'
              }`}
              title="Laptop integrated camera / webcam with live person detection demonstration"
            >
              <Laptop size={10} />
              Laptop
            </button>
            <button
              onClick={() => onSelectFeedMode?.('ai')}
              className={`py-1 px-1.5 rounded text-[9px] font-mono font-bold tracking-tight text-center border transition-all cursor-pointer ${
                feedMode === 'ai'
                  ? 'bg-sky-600 border-sky-400 text-white shadow-xs'
                  : 'bg-[#12141a] border-[#282e3f] text-slate-400 hover:text-white hover:bg-[#1a1e28]'
              }`}
              title="AI Vision stream with YOLO/HOG detection overlays"
            >
              AI Stream
            </button>
          </div>
        </div>

        {/* Wi-Fi Camera Setup */}
        <button
          onClick={onOpenWifiSetup}
          className="w-full py-1.5 px-3 rounded font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border bg-[#171a23] hover:bg-[#202431] border-[#262b3a] text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Wifi size={12} className="text-sky-400" />
          <span>Configure XIAO / ESP32 IP</span>
        </button>

        {/* Emergency Stop Button */}
        <button
          onClick={onEmergencyStop}
          className="w-full py-2 px-3 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all active:scale-95 cursor-pointer border border-rose-400/80"
          title="Emergency Stop Motors & Hold Position (HotKey: SPACE)"
        >
          <AlertOctagon size={14} />
          <span>EMERGENCY STOP (SPACE)</span>
        </button>
      </div>

      {/* Secondary Bottom Controls */}
      <div className="pt-2 border-t border-[#232733] flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenSettings}
          className="flex-1 py-1.5 px-2 rounded font-mono text-[10px] font-bold uppercase tracking-wider bg-[#1c202a] hover:bg-[#252b39] text-slate-300 hover:text-white border border-[#2b3140] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Settings size={12} />
          <span>Settings</span>
        </button>
        <a
          href="/"
          className="py-1.5 px-3 rounded font-mono text-[10px] font-bold uppercase tracking-wider bg-[#1c202a] hover:bg-[#252b39] text-slate-400 hover:text-white border border-[#2b3140] transition-colors flex items-center justify-center gap-1"
          title="Return to Public Website"
        >
          <Home size={12} />
          <span>Exit</span>
        </a>
      </div>
    </div>
  );
}
