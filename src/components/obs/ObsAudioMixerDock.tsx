import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sliders, Radio, Zap, Radar, Battery } from 'lucide-react';

interface AudioMixerProps {
  signalDbm?: number;
  obstacleDistanceM?: number;
  leftMotorPercent?: number;
  rightMotorPercent?: number;
  batteryLevel?: number;
}

export function ObsAudioMixerDock({
  signalDbm = -65,
  obstacleDistanceM = 2.4,
  leftMotorPercent = 0,
  rightMotorPercent = 0,
  batteryLevel = 92,
}: AudioMixerProps) {
  // Track mute and volume fader for each channel
  const [channels, setChannels] = useState<{ [key: string]: { volume: number; isMuted: boolean } }>({
    rf: { volume: 85, isMuted: false },
    sonar: { volume: 75, isMuted: false },
    motorL: { volume: 90, isMuted: false },
    motorR: { volume: 90, isMuted: false },
    battery: { volume: 100, isMuted: false },
  });

  // Animated micro-jitter to simulate real broadcast peak meters
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => (t + 1) % 100), 120);
    return () => clearInterval(interval);
  }, []);

  const toggleMute = (key: string) => {
    setChannels((prev) => ({
      ...prev,
      [key]: { ...prev[key], isMuted: !prev[key].isMuted },
    }));
  };

  const handleVolumeChange = (key: string, val: number) => {
    setChannels((prev) => ({
      ...prev,
      [key]: { ...prev[key], volume: val },
    }));
  };

  // Compute live dB and meter percentage for each channel
  const getChannelMetrics = (key: string) => {
    const ch = channels[key] || { volume: 80, isMuted: false };
    if (ch.isMuted) return { db: -60, percent: 0, level: 'low' };

    let rawPercent = 0;
    const jitter = ((tick * 13) % 7) - 3; // subtle ±3% fluctuation

    if (key === 'rf') {
      // RF Link: -90dBm (0%) to -30dBm (100%)
      const clamped = Math.max(-90, Math.min(-30, signalDbm));
      rawPercent = ((clamped + 90) / 60) * 100;
    } else if (key === 'sonar') {
      // Sonar echo: closer obstacle = higher pulse echo amplitude
      const echoStrength = Math.max(10, Math.min(100, (1 - obstacleDistanceM / 4.5) * 100));
      rawPercent = echoStrength;
    } else if (key === 'motorL') {
      rawPercent = leftMotorPercent > 0 ? leftMotorPercent : 8;
    } else if (key === 'motorR') {
      rawPercent = rightMotorPercent > 0 ? rightMotorPercent : 8;
    } else if (key === 'battery') {
      rawPercent = batteryLevel;
    }

    const scaledPercent = Math.max(0, Math.min(100, (rawPercent * (ch.volume / 100)) + jitter));
    // Approximate dB scale from -60dB to 0dB
    const db = scaledPercent <= 1 ? -60 : parseFloat((-60 + (scaledPercent / 100) * 60).toFixed(1));

    let level: 'green' | 'yellow' | 'red' = 'green';
    if (scaledPercent > 85) level = 'red';
    else if (scaledPercent > 60) level = 'yellow';

    return { db, percent: scaledPercent, level };
  };

  const channelDefs = [
    { key: 'rf', label: 'RF Telemetry Link', icon: Radio, sub: `${signalDbm} dBm` },
    { key: 'sonar', label: 'JSN-SR04T Waterproof Sonar', icon: Radar, sub: `${obstacleDistanceM.toFixed(2)}m` },
    { key: 'motorL', label: 'Port Thruster (Cytron L)', icon: Zap, sub: `PWM ${leftMotorPercent}%` },
    { key: 'motorR', label: 'Starboard Thruster (Cytron R)', icon: Zap, sub: `PWM ${rightMotorPercent}%` },
    { key: 'battery', label: 'Battery Main Rail', icon: Battery, sub: `${batteryLevel}% (12.4V)` },
  ];

  return (
    <div className="h-full bg-[#12141a] text-slate-300 font-sans p-3 flex flex-col overflow-y-auto select-none space-y-3 min-h-0">
      <div className="flex items-center justify-between border-b border-[#232733] pb-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
          <Sliders size={13} className="text-emerald-400" />
          <span>Telemetry &amp; Link Levels</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded">
          60 FPS PEAK
        </span>
      </div>

      {/* Mixer Channel Strips */}
      <div className="flex-1 space-y-3 min-h-0 overflow-y-auto pr-1">
        {channelDefs.map((def) => {
          const ch = channels[def.key];
          const metrics = getChannelMetrics(def.key);
          const Icon = def.icon;

          return (
            <div
              key={def.key}
              className="bg-[#171a23] border border-[#232733] hover:border-[#343b4d] rounded p-2.5 space-y-2 transition-colors"
            >
              {/* Channel Label & Status */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Icon size={13} className={ch.isMuted ? 'text-slate-600' : 'text-sky-400'} />
                  <span className={`font-bold text-[11px] ${ch.isMuted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {def.label}
                  </span>
                  <span className="text-[9px] text-slate-500 font-sans">({def.sub})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      ch.isMuted
                        ? 'text-slate-600'
                        : metrics.level === 'red'
                        ? 'text-rose-400 font-black'
                        : metrics.level === 'yellow'
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }`}
                  >
                    {ch.isMuted ? '-INF dB' : `${metrics.db > 0 ? '+' : ''}${metrics.db} dB`}
                  </span>

                  {/* Mute Button */}
                  <button
                    onClick={() => toggleMute(def.key)}
                    className={`p-1 rounded transition-all cursor-pointer ${
                      ch.isMuted
                        ? 'bg-rose-950 text-rose-300 border border-rose-600'
                        : 'bg-[#202431] hover:bg-[#2b3042] text-slate-400 hover:text-white border border-[#2e3447]'
                    }`}
                    title={ch.isMuted ? 'Unmute Channel' : 'Mute Channel'}
                  >
                    {ch.isMuted ? <VolumeX size={12} className="text-rose-400" /> : <Volume2 size={12} />}
                  </button>
                </div>
              </div>

              {/* OBS LED VU Peak Meter Bar */}
              <div className="space-y-1">
                <div className="h-3 w-full bg-[#0c0d12] rounded-xs border border-[#262b3a] p-[1.5px] overflow-hidden flex relative">
                  {/* Background grid marks for -40, -20, -10, 0 dB */}
                  <div className="absolute inset-0 flex justify-between px-1 pointer-events-none z-10 opacity-30">
                    <span className="border-r border-slate-600 h-full w-[1px]" style={{ left: '20%' }} />
                    <span className="border-r border-slate-600 h-full w-[1px]" style={{ left: '50%' }} />
                    <span className="border-r border-slate-600 h-full w-[1px]" style={{ left: '75%' }} />
                    <span className="border-r border-slate-600 h-full w-[1px]" style={{ left: '90%' }} />
                  </div>

                  {/* Active Peak Meter */}
                  <div
                    className={`h-full rounded-xs transition-all duration-75 ${
                      ch.isMuted ? 'w-0' : 'obs-vu-gradient'
                    }`}
                    style={{ width: `${metrics.percent}%` }}
                  />
                </div>

                {/* dB Markings */}
                <div className="flex justify-between text-[8px] font-mono text-slate-500 px-0.5 select-none">
                  <span>-INF</span>
                  <span>-40</span>
                  <span>-20</span>
                  <span>-10</span>
                  <span>-5</span>
                  <span className="text-rose-400 font-bold">0dB</span>
                </div>
              </div>

              {/* Channel Volume Fader */}
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={ch.volume}
                  onChange={(e) => handleVolumeChange(def.key, Number(e.target.value))}
                  disabled={ch.isMuted}
                  className="w-full accent-emerald-500 h-1 rounded cursor-pointer bg-[#242938]"
                />
                <span className="text-[9px] font-mono text-slate-400 shrink-0 w-8 text-right">
                  {ch.volume}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
