import {
  ArrowUp,
  ArrowDown,
  RotateCw,
  RotateCcw,
  Zap,
  Activity,
  Radio,
  Anchor,
} from 'lucide-react';
import { useMotorTelemetry } from '../hooks/useMotorTelemetry';

export function MotorTelemetryCard() {
  const { motion } = useMotorTelemetry();

  const getMotionColor = (state: string) => {
    if (state.includes('FORWARD')) return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
    if (state.includes('REVERSE')) return 'text-amber-400 bg-amber-950/40 border-amber-500/40';
    if (state.includes('SPIN')) return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40';
    return 'text-slate-400 bg-slate-900 border-slate-700/50';
  };

  const getMotionIcon = (state: string) => {
    if (state.includes('FORWARD RIGHT')) return <ArrowUp size={18} className="rotate-45 text-emerald-400" />;
    if (state.includes('FORWARD LEFT')) return <ArrowUp size={18} className="-rotate-45 text-emerald-400" />;
    if (state.includes('FORWARD')) return <ArrowUp size={18} className="text-emerald-400" />;
    if (state.includes('REVERSE RIGHT')) return <ArrowDown size={18} className="-rotate-45 text-amber-400" />;
    if (state.includes('REVERSE LEFT')) return <ArrowDown size={18} className="rotate-45 text-amber-400" />;
    if (state.includes('REVERSE')) return <ArrowDown size={18} className="text-amber-400" />;
    if (state.includes('SPIN RIGHT')) return <RotateCw size={18} className="text-cyan-400" />;
    if (state.includes('SPIN LEFT')) return <RotateCcw size={18} className="text-cyan-400" />;
    return <Anchor size={18} className="text-slate-400" />;
  };

  const renderThrustBar = (label: string, pin: number, motor: { us: number; percent: number; dir: string; status: string }) => {
    const isFwd = motor.dir === 'FWD';
    const isRev = motor.dir === 'REV';

    return (
      <div className="flex-1 bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <Zap size={12} className={isFwd ? 'text-emerald-400' : isRev ? 'text-amber-400' : 'text-slate-500'} />
            {label} <span className="text-[9px] text-slate-500">(Pin {pin})</span>
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isFwd
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : isRev
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {motor.dir} {motor.percent}%
          </span>
        </div>

        {/* Bi-directional Thrust Progress Bar */}
        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 relative">
          {/* Reverse Half (Left) */}
          <div className="w-1/2 h-full flex justify-end bg-slate-900/50">
            {isRev && (
              <div
                className="h-full bg-amber-500 transition-all duration-150 rounded-l-full"
                style={{ width: `${motor.percent}%` }}
              />
            )}
          </div>
          {/* Neutral Divider Line */}
          <div className="w-0.5 h-full bg-slate-700 z-10" />
          {/* Forward Half (Right) */}
          <div className="w-1/2 h-full flex justify-start bg-slate-900/50">
            {isFwd && (
              <div
                className="h-full bg-emerald-500 transition-all duration-150 rounded-r-full"
                style={{ width: `${motor.percent}%` }}
              />
            )}
          </div>
        </div>

        {/* Pulse width readout */}
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>Pulse: <strong className="text-white">{motor.us} µs</strong></span>
          <span className="text-[9px] text-slate-500">1000–2000µs</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 text-slate-200">
          <Activity size={14} className="text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Dual Thruster Propulsion Output</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {motion.rcConnected ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 font-bold">
              <Radio size={10} className="animate-pulse" /> RC Remote Active
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/40">
              RC Idle / Standby
            </span>
          )}
        </div>
      </div>

      {/* Main Motion Direction Display */}
      <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${getMotionColor(motion.state)}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-center">
            {getMotionIcon(motion.state)}
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
              Current Motion
            </span>
            <span className="text-base font-black tracking-wide text-white">
              {motion.state}
            </span>
          </div>
        </div>

        {/* Differential Thrust Balance Cue */}
        <div className="text-right">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
            Thrust Balance
          </span>
          <span className="text-xs font-bold text-sky-300">
            {motion.left.us === motion.right.us
              ? 'Balanced'
              : motion.left.us > motion.right.us
              ? 'Starboard (Turn Right)'
              : 'Port (Turn Left)'}
          </span>
        </div>
      </div>

      {/* Left and Right Thruster Real-Time Output Bars */}
      <div className="flex gap-2">
        {renderThrustBar('Left Thruster', 21, motion.left)}
        {renderThrustBar('Right Thruster', 16, motion.right)}
      </div>
    </div>
  );
}
