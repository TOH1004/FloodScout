
interface TrackTileProps {
  label: string;
  isVertical?: boolean;
}

export function TrackTile({ label, isVertical = false }: TrackTileProps) {
  return (
    <div
      className={`bg-[#F6F0DC] text-[#162347] border border-[#162347] flex items-center justify-center font-writing text-[10px] font-bold tracking-wide uppercase select-none px-2 py-1 shadow-xs ${
        isVertical ? 'writing-vertical-lr rotate-180 min-h-[40px]' : 'min-w-[55px] h-7'
      }`}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}

interface MilestoneCircleProps {
  num: string;
  color?: string;
  label?: string;
}

export function MilestoneCircle({ num, color = 'bg-[#162347] text-white', label }: MilestoneCircleProps) {
  return (
    <div className="relative flex flex-col items-center justify-center shrink-0 z-20">
      <div
        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-[#162347] ${color} shadow-xs flex items-center justify-center font-writing font-bold text-xs sm:text-sm tracking-tight`}
      >
        {num}
      </div>
      {label && (
        <span className="absolute -bottom-4 text-[8px] font-mono uppercase tracking-widest text-[#162347]/60 font-bold whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * 3D-styled token sitting on the track
 */
export function TrackToken({ color = 'bg-amber-400', shape = 'cylinder' }: { color?: string; shape?: 'cylinder' | 'cube' | 'pill' }) {
  if (shape === 'pill') {
    return (
      <div className={`w-5 h-3 rounded-full ${color} border border-[#162347] shadow-xs transform -rotate-12 shrink-0`} />
    );
  }
  if (shape === 'cube') {
    return (
      <div className={`w-4 h-4 rounded-xs ${color} border border-[#162347] shadow-xs transform rotate-45 shrink-0`} />
    );
  }
  return (
    <div className={`w-4.5 h-4.5 rounded-full ${color} border border-[#162347] shadow-xs shrink-0 flex items-center justify-center`}>
      <div className="w-1.5 h-1.5 rounded-full bg-black/25" />
    </div>
  );
}

/**
 * Direct snake track connector between image process cards (Right side curve)
 */
export function TrackConnectorRight() {
  return (
    <div className="w-full flex items-center justify-end pr-6 sm:pr-12 -my-2.5 z-10 select-none pointer-events-none">
      <svg width="140" height="70" viewBox="0 0 140 70" fill="none">
        <path
          d="M 10 10 C 110 10, 130 25, 130 35 C 130 45, 110 60, 10 60"
          stroke="#162347"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <path
          d="M 10 10 C 110 10, 130 25, 130 35 C 130 45, 110 60, 10 60"
          stroke="#F6F0DC"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d="M 10 10 C 110 10, 130 25, 130 35 C 130 45, 110 60, 10 60"
          stroke="#162347"
          strokeWidth="1.2"
          strokeDasharray="3 4"
        />
      </svg>
    </div>
  );
}

/**
 * Direct snake track connector between image process cards (Left side curve)
 */
export function TrackConnectorLeft() {
  return (
    <div className="w-full flex items-center justify-start pl-6 sm:pr-12 -my-2.5 z-10 select-none pointer-events-none">
      <svg width="140" height="70" viewBox="0 0 140 70" fill="none">
        <path
          d="M 130 10 C 30 10, 10 25, 10 35 C 10 45, 30 60, 130 60"
          stroke="#162347"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <path
          d="M 130 10 C 30 10, 10 25, 10 35 C 10 45, 30 60, 130 60"
          stroke="#F6F0DC"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d="M 130 10 C 30 10, 10 25, 10 35 C 10 45, 30 60, 130 60"
          stroke="#162347"
          strokeWidth="1.2"
          strokeDasharray="3 4"
        />
      </svg>
    </div>
  );
}
