import { useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';

interface ObsStudioModeViewProps {
  previewContent: React.ReactNode;
  programContent: React.ReactNode;
  onQuickSwap?: () => void;
  onCut?: () => void;
  onFade?: () => void;
}

export function ObsStudioModeView({
  previewContent,
  programContent,
  onQuickSwap,
  onCut,
  onFade,
}: ObsStudioModeViewProps) {
  const [tBarPosition, setTBarPosition] = useState(0); // 0 (preview) to 100 (program)
  const [fadeActive, setFadeActive] = useState(false);

  const handleCutClick = () => {
    if (onCut) onCut();
    else if (onQuickSwap) onQuickSwap();
  };

  const handleFadeClick = () => {
    setFadeActive(true);
    setTimeout(() => {
      if (onFade) onFade();
      else if (onQuickSwap) onQuickSwap();
      setFadeActive(false);
    }, 280);
  };

  return (
    <div className="h-full w-full bg-[#0a0b0e] flex flex-col md:flex-row items-stretch overflow-hidden select-none p-2 gap-2">
      {/* ─── 1. PREVIEW MONITOR (Left) ─── */}
      <div className="flex-1 flex flex-col bg-[#13151c] border-2 border-emerald-600/70 rounded overflow-hidden min-h-0 min-w-0 shadow-lg relative">
        {/* Preview Broadcast Header */}
        <div className="bg-[#1b221d] border-b border-emerald-500/40 px-3 py-1.5 flex items-center justify-between text-xs font-mono shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-bold uppercase tracking-widest text-emerald-300 text-[11px]">
              PREVIEW
            </span>
            <span className="text-[10px] text-emerald-500/80 font-sans hidden sm:inline">
              [ STAGING &amp; TACTICAL RADAR ]
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
            NEXT TAKE
          </span>
        </div>

        {/* Preview Viewport Content */}
        <div className="flex-1 overflow-hidden relative min-h-0">
          {previewContent}
          {/* Safe-area broadcast guides */}
          <div className="obs-safe-area pointer-events-none" />
        </div>
      </div>

      {/* ─── 2. CENTRAL TRANSITION DECK (OBS Studio Transitions & T-Bar) ─── */}
      <div className="w-full md:w-36 bg-[#161821] border border-[#262b3a] rounded p-2 flex md:flex-col items-center justify-center gap-2 shrink-0 shadow-md">
        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 text-center hidden md:block">
          Transitions
        </div>

        {/* CUT Button */}
        <button
          onClick={handleCutClick}
          className="flex-1 md:flex-none w-full py-2 px-2 rounded bg-[#202534] hover:bg-[#2b3246] active:scale-95 text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#333c52] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
          title="Instant Cut Transition"
        >
          <ArrowRight size={13} className="text-emerald-400" />
          <span>Cut</span>
        </button>

        {/* FADE Button */}
        <button
          onClick={handleFadeClick}
          disabled={fadeActive}
          className={`flex-1 md:flex-none w-full py-2 px-2 rounded font-mono font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95 ${
            fadeActive
              ? 'bg-amber-600 text-white border-amber-400 animate-pulse'
              : 'bg-[#202534] hover:bg-[#2b3246] text-white border-[#333c52]'
          }`}
          title="Smooth 300ms Cross-Fade Transition"
        >
          <RefreshCw size={13} className={`text-amber-400 ${fadeActive ? 'animate-spin' : ''}`} />
          <span>Fade</span>
        </button>

        {/* SWAP Button */}
        <button
          onClick={onQuickSwap}
          className="flex-1 md:flex-none w-full py-1.5 px-2 rounded bg-[#1c202a] hover:bg-[#252b39] text-sky-300 hover:text-white font-mono text-[10px] font-bold uppercase tracking-wider border border-[#2b3140] transition-colors cursor-pointer flex items-center justify-center gap-1"
          title="Quick Swap Preview & Program"
        >
          <span>Swap ⇄</span>
        </button>

        {/* T-Bar Crossfader */}
        <div className="hidden md:flex flex-col items-center gap-1 w-full pt-2 border-t border-[#262b3a]">
          <span className="text-[8px] font-mono text-slate-500 uppercase">T-Bar</span>
          <div className="h-28 flex items-center justify-center py-1">
            <input
              type="range"
              min={0}
              max={100}
              value={tBarPosition}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTBarPosition(val);
                if (val >= 98 && onQuickSwap) {
                  onQuickSwap();
                  setTBarPosition(0);
                }
              }}
              className="accent-rose-500 h-28 -rotate-90 w-24 cursor-pointer"
            />
          </div>
          <span className="text-[8px] font-mono text-slate-400">{tBarPosition}%</span>
        </div>
      </div>

      {/* ─── 3. PROGRAM MONITOR (Right) ─── */}
      <div className="flex-1 flex flex-col bg-[#13151c] border-2 border-rose-600 rounded overflow-hidden min-h-0 min-w-0 shadow-2xl relative">
        {/* Program Broadcast Header */}
        <div className="bg-[#241316] border-b border-rose-500/50 px-3 py-1.5 flex items-center justify-between text-xs font-mono shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 obs-rec-indicator" />
            <span className="font-bold uppercase tracking-widest text-rose-300 text-[11px]">
              PROGRAM
            </span>
            <span className="text-[10px] text-rose-400/80 font-sans hidden sm:inline">
              [ LIVE MASTER BROADCAST OUT ]
            </span>
          </div>
          <span className="text-[10px] text-rose-300 font-bold bg-rose-950 px-2 py-0.5 rounded border border-rose-500/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            ON AIR
          </span>
        </div>

        {/* Program Viewport Content */}
        <div className="flex-1 overflow-hidden relative min-h-0">
          {programContent}
          {/* Safe-area broadcast guides */}
          <div className="obs-safe-area pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
