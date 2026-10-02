import { Laptop, Zap } from 'lucide-react';

interface ObsStatusBarProps {
  isMissionActive: boolean;
  missionUptimeSeconds: number;
  isRecording: boolean;
  recordingSeconds: number;
  cpuPercent?: number;
  fps?: number;
  bitrateKbps?: number;
  droppedFramesPercent?: number;
  esp32Connected: boolean;
  backendOnline: boolean;
  robotOnline?: boolean;
  robotLocation?: [number, number] | null;
  baseLocation?: [number, number];
  batteryLevel?: number;
}

export function ObsStatusBar({
  isMissionActive,
  missionUptimeSeconds,
  isRecording,
  recordingSeconds,
  cpuPercent = 14.2,
  fps = 30.0,
  bitrateKbps = 4250,
  droppedFramesPercent = 0.0,
  esp32Connected,
  backendOnline,
  robotOnline = true,
  robotLocation,
  baseLocation,
  batteryLevel = 92,
}: ObsStatusBarProps) {
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <footer className="bg-[#101217] border-t border-[#1f2430] px-3 py-1 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 select-none shrink-0 z-[1000] gap-y-1">
      {/* Left: LIVE & REC Indicators */}
      <div className="flex items-center gap-4">
        {/* LIVE Stream duration */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isMissionActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="font-bold text-slate-300">LIVE:</span>
          <span className={isMissionActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
            {isMissionActive ? formatTime(missionUptimeSeconds) : '00:00:00'}
          </span>
        </div>

        {/* REC Recording duration */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isRecording ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e] obs-rec-indicator' : 'bg-slate-600'
            }`}
          />
          <span className="font-bold text-slate-300">REC:</span>
          <span className={isRecording ? 'text-rose-400 font-bold' : 'text-slate-500'}>
            {isRecording ? formatTime(recordingSeconds) : '00:00:00'}
          </span>
        </div>

        {/* Hardware Status */}
        <div className="hidden sm:flex items-center gap-2 border-l border-slate-700/60 pl-3">
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className={backendOnline ? 'text-emerald-300' : 'text-slate-500'}>
              AI BACKEND {backendOnline ? 'OK' : 'OFFLINE'}
            </span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${esp32Connected ? 'bg-emerald-400' : 'bg-amber-500'}`} />
            <span className={esp32Connected ? 'text-emerald-300' : 'text-slate-500'}>
              ESP32 {esp32Connected ? 'LINK' : 'STANDBY'}
            </span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${robotOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className={robotOnline ? 'text-emerald-300' : 'text-rose-400'}>
              USV-01 {robotOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </span>
        </div>
      </div>

      {/* Center: Live Frame and Bitrate Telemetry */}
      <div className="hidden md:flex items-center gap-4 text-slate-400">
        <div>
          <span>CPU: </span>
          <strong className="text-slate-200">{cpuPercent.toFixed(1)}%</strong>
          <span>, </span>
          <strong className="text-emerald-400">{fps.toFixed(2)} fps</strong>
        </div>
        <span>•</span>
        <div>
          <span>BITRATE: </span>
          <strong className="text-cyan-400">{bitrateKbps} kbps</strong>
        </div>
        <span>•</span>
        <div>
          <span>DROPPED FRAMES: </span>
          <strong className="text-slate-300">0 ({droppedFramesPercent.toFixed(1)}%)</strong>
        </div>
      </div>

      {/* Right: GPS Coordinates and Battery */}
      <div className="flex items-center gap-3">
        {baseLocation && (
          <div className="hidden xl:flex items-center gap-1 text-[10px] text-slate-400">
            <Laptop size={11} className="text-sky-400" />
            <span>PC GPS:</span>
            <strong className="text-slate-200">{baseLocation[0].toFixed(4)}°, {baseLocation[1].toFixed(4)}°</strong>
          </div>
        )}

        {robotLocation && (
          <div className="flex items-center gap-1 text-[10px] text-slate-300">
            <span className="text-cyan-400 font-bold">USV-01:</span>
            <strong className="text-white">{robotLocation[0].toFixed(4)}°, {robotLocation[1].toFixed(4)}°</strong>
          </div>
        )}

        <div className="flex items-center gap-1 bg-[#1a1e28] px-2 py-0.5 rounded border border-[#2a3040] text-slate-300 text-[10px]">
          <Zap size={11} className="text-emerald-400" />
          <span>BAT: <strong className="text-emerald-400">{batteryLevel}%</strong></span>
        </div>
      </div>
    </footer>
  );
}
