import { useState } from 'react';
import { Dice5, Trophy, Sparkles, AlertTriangle, ArrowUpRight, ArrowDownRight, RotateCcw } from 'lucide-react';
import { playStorySound } from '../../utils/storySound';

interface TileData {
  num: number;
  label: string;
  type: 'normal' | 'ladder-start' | 'ladder-end' | 'snake-start' | 'snake-end' | 'milestone' | 'goal';
  target?: number;
  message?: string;
  milestoneId?: string;
}

const TILES: TileData[] = [
  { num: 1, label: '01. Draft Idea', type: 'milestone', milestoneId: 'step-01', message: 'Initial sketch on paper: "Can we make this work?"' },
  { num: 2, label: 'Design Review', type: 'normal', message: 'Refining the hull shape & thruster concept.' },
  { num: 3, label: '⚠️ Roadblock Snake', type: 'snake-start', target: 1, message: 'Components mismatched on paper vs reality! Slide back to Step 1.' },
  { num: 4, label: '02. First Build', type: 'milestone', milestoneId: 'step-02', message: 'First team assembly meeting. Stuck on hardware.' },
  
  { num: 8, label: 'New Components', type: 'ladder-end', message: 'Clarified system! Practical hardware ordered.' },
  { num: 7, label: 'Swapping Parts', type: 'normal', message: 'Replacing impractical ideas with working alternatives.' },
  { num: 6, label: 'Reviewing Problems', type: 'normal', message: 'Analyzing realistic constraints with mentor.' },
  { num: 5, label: '🪜 Mentor Ladder', type: 'ladder-start', target: 8, milestoneId: 'step-03', message: 'Consulted our mentor! Climbed the ladder to clear architecture!' },

  { num: 9, label: '04. Build & Test', type: 'milestone', milestoneId: 'step-04', message: 'Wiring, firmware, sonar, sensors, and dashboard.' },
  { num: 10, label: 'Debug Crucible', type: 'normal', message: 'Fixing failed test cases and tuning motor thrusters.' },
  { num: 11, label: '⚠️ Water Leak Snake', type: 'snake-start', target: 9, message: 'Seal breached during bench test! Slide back to re-waterproof.' },
  { num: 12, label: '🪜 Edge AI Ladder', type: 'ladder-start', target: 14, message: 'YOLO detection runs at 30 FPS! Jump ahead to vision demos!' },

  { num: 16, label: '🚀 FloodScout Ready!', type: 'goal', milestoneId: 'step-future', message: 'Working autonomous rescue prototype completed!' },
  { num: 15, label: '06. Full System', type: 'milestone', milestoneId: 'step-06', message: 'Sensors, camera, motors, and dashboard unified.' },
  { num: 14, label: 'Indoor CV Demo', type: 'ladder-end', message: 'Indoor live vision and victim identification tested.' },
  { num: 13, label: '05. Seaside Demo', type: 'milestone', milestoneId: 'step-05', message: 'Real ocean water testing at the beach coast!' },
];

interface InteractiveSnakeBoardProps {
  onSelectMilestone?: (milestoneId: string) => void;
  soundEnabled?: boolean;
}

export default function InteractiveSnakeBoard({
  onSelectMilestone,
  soundEnabled = true,
}: InteractiveSnakeBoardProps) {
  const [currentTile, setCurrentTile] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [gameLog, setGameLog] = useState<string>('Roll the dice to advance FloodScout through the engineering journey!');
  const [hasWon, setHasWon] = useState(false);

  const rollDice = () => {
    if (rolling) return;
    setRolling(true);
    if (soundEnabled) playStorySound('dice');

    const roll = Math.floor(Math.random() * 4) + 1; // 1 to 4 steps
    setLastRoll(roll);

    setTimeout(() => {
      setRolling(false);
      let nextPos = currentTile + roll;
      if (nextPos > 16) nextPos = 16;

      const tileInfo = TILES.find((t) => t.num === nextPos);

      if (tileInfo?.type === 'ladder-start' && tileInfo.target) {
        if (soundEnabled) playStorySound('ladder');
        setCurrentTile(tileInfo.target);
        setGameLog(`🪜 LADDER CLIMB! ${tileInfo.message}`);
        if (tileInfo.milestoneId && onSelectMilestone) onSelectMilestone(tileInfo.milestoneId);
      } else if (tileInfo?.type === 'snake-start' && tileInfo.target) {
        if (soundEnabled) playStorySound('snake');
        setCurrentTile(tileInfo.target);
        setGameLog(`🐍 SNAKE HIT! ${tileInfo.message}`);
      } else {
        if (soundEnabled) playStorySound('step');
        setCurrentTile(nextPos);
        setGameLog(tileInfo?.message || `Moved to Tile ${nextPos}`);
        if (tileInfo?.milestoneId && onSelectMilestone) {
          onSelectMilestone(tileInfo.milestoneId);
        }
      }

      if (nextPos === 16 || tileInfo?.target === 16) {
        setHasWon(true);
        if (soundEnabled) playStorySound('cheer');
      }
    }, 600);
  };

  const resetGame = () => {
    setCurrentTile(1);
    setLastRoll(null);
    setHasWon(false);
    setGameLog('Reset to Start. Roll the dice to begin the journey!');
    if (soundEnabled) playStorySound('click');
  };

  return (
    <div className="bg-[#FAF7F2] border border-[#E6DFD5] rounded-3xl p-6 md:p-8 shadow-md">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E6DFD5]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-[#162347]/70 uppercase mb-1">
            <Sparkles size={14} className="text-amber-500" />
            <span>Interactive Board Game Mode</span>
          </div>
          <h3 className="font-comic font-bold italic text-2xl text-[#162347]">
            The FloodScout Snakes &amp; Ladders Journey
          </h3>
          <p className="font-comic text-xs sm:text-sm text-[#162347]/70 mt-0.5">
            Roll the dice to navigate from paper sketches to seaside water tests! Watch out for component roadblocks and climb mentor ladders.
          </p>
        </div>

        {/* Dice Controller */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={rollDice}
            disabled={rolling || hasWon}
            className={`px-5 py-3 rounded-2xl font-comic font-bold text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 ${
              hasWon
                ? 'bg-emerald-600 text-white cursor-default'
                : rolling
                ? 'bg-[#BED6EE] text-[#162347] animate-pulse'
                : 'bg-[#162347] text-[#FAF7F2] hover:bg-[#0E172E] hover:shadow-lg'
            }`}
          >
            <Dice5 size={20} className={rolling ? 'animate-spin' : ''} />
            <span>{rolling ? 'Rolling...' : hasWon ? 'Mission Complete! 🎉' : 'Roll Dice (🎲)'}</span>
            {lastRoll && !rolling && (
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-mono font-bold">
                +{lastRoll}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={resetGame}
            title="Reset Board"
            className="p-3 rounded-2xl bg-white border border-[#E6DFD5] text-[#162347] hover:bg-[#F0ECE4] transition-colors shadow-xs"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Game Board Grid (4x4) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {TILES.map((tile) => {
          const isCurrent = currentTile === tile.num;
          const isLadder = tile.type.startsWith('ladder');
          const isSnake = tile.type.startsWith('snake');
          const isGoal = tile.type === 'goal';

          return (
            <div
              key={tile.num}
              onClick={() => {
                setCurrentTile(tile.num);
                setGameLog(tile.message || `Tile ${tile.num}`);
                if (tile.milestoneId && onSelectMilestone) onSelectMilestone(tile.milestoneId);
                if (soundEnabled) playStorySound('click');
              }}
              className={`relative rounded-2xl p-4 transition-all duration-300 cursor-pointer min-h-[105px] flex flex-col justify-between border-2 ${
                isCurrent
                  ? 'bg-amber-100/80 border-amber-500 shadow-lg scale-[1.03] ring-4 ring-amber-400/30'
                  : isGoal
                  ? 'bg-emerald-50 border-emerald-400 hover:bg-emerald-100/70'
                  : isLadder
                  ? 'bg-blue-50/70 border-blue-300 hover:bg-blue-100/60'
                  : isSnake
                  ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-100/60'
                  : 'bg-white border-[#E6DFD5] hover:border-[#162347]/40 hover:shadow-sm'
              }`}
            >
              {/* Tile Header */}
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-[#162347]/10 text-[#162347] font-mono font-bold text-xs flex items-center justify-center">
                  {tile.num}
                </span>

                {isLadder && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-comic">
                    <ArrowUpRight size={12} /> Ladder
                  </span>
                )}
                {isSnake && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-comic">
                    <ArrowDownRight size={12} /> Snake
                  </span>
                )}
                {isGoal && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-comic">
                    <Trophy size={12} /> Summit
                  </span>
                )}
              </div>

              {/* Title & Info */}
              <div className="my-1.5">
                <h4 className="font-comic font-bold text-xs sm:text-sm text-[#162347] leading-snug">
                  {tile.label}
                </h4>
              </div>

              {/* Pawn Indicator */}
              {isCurrent && (
                <div className="absolute -top-3 -right-2 bg-[#162347] text-[#FAF7F2] px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 animate-bounce">
                  <span>🤖 Scout Here</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Game Feed / Status Bar */}
      <div className="bg-white rounded-2xl border border-[#E6DFD5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#BED6EE]/40 flex items-center justify-center shrink-0">
            {currentTile === 16 ? (
              <Trophy size={20} className="text-emerald-700" />
            ) : (
              <AlertTriangle size={20} className="text-[#162347]" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#162347]/60 block">
              Current Status (Tile {currentTile} of 16)
            </span>
            <p className="font-comic text-xs sm:text-sm font-bold text-[#162347]">
              {gameLog}
            </p>
          </div>
        </div>

        {hasWon && (
          <div className="shrink-0 bg-emerald-100 text-emerald-900 border border-emerald-300 px-4 py-2 rounded-xl text-xs font-comic font-bold flex items-center gap-2">
            <Trophy size={16} />
            <span>Success: Real-world demo ready!</span>
          </div>
        )}
      </div>
    </div>
  );
}
