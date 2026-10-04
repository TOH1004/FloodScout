import { Link } from 'react-router-dom';
import { useRescue } from '../context/RescueContext';
import type { VictimStatus } from '../context/RescueContext';

export default function Rescue() {
  const { victims, updateVictimStatus, simulateVictimDetection } = useRescue();

  const getNextStatus = (current: VictimStatus): VictimStatus => {
    switch (current) {
      case 'Detected': return 'Verified';
      case 'Verified': return 'Rescue Assigned';
      case 'Rescue Assigned': return 'Rescued';
      default: return 'Rescued';
    }
  };

  return (
    <div className="w-full bg-[#F3ECDE] text-[#183451] py-16 sm:py-24 px-6 sm:px-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-[11px] font-bold tracking-[0.35em] text-[#183451]/70 uppercase block mb-2">
          REAL-TIME INCIDENT TRIAGE
        </span>
        <h1 className="font-script text-4xl sm:text-5xl md:text-6xl text-[#183451] font-bold tracking-tight mb-4">
          Victim Radar
        </h1>
        <p className="font-editorial-serif text-lg tracking-[0.15em] text-[#183451]/80 uppercase">
          Live AI Person Flags &amp; Dispatch Progression
        </p>
        <div className="w-16 h-[1px] bg-[#183451]/30 mx-auto mt-4"></div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center max-w-5xl mx-auto mb-10 pb-4 border-b border-[#E6DFD5]">
        <div className="text-xs text-[#183451]/70 font-mono">
          Showing {victims.length} incident records ({victims.filter(v => v.status !== 'Rescued').length} active)
        </div>
        <button
          onClick={simulateVictimDetection}
          className="bg-[#183451] text-[#F3ECDE] hover:bg-[#0E172E] px-6 py-2 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase transition-all shadow-sm"
        >
          Simulate Detection
        </button>
      </div>

      {/* Victim Dossier Cards */}
      <div className="space-y-16 max-w-5xl mx-auto">
        {victims.map((victim, idx) => (
          <div 
            key={victim.id} 
            className={`flex flex-col ${idx % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-12 border-b border-[#E6DFD5] pb-16`}
          >
            <div className="w-full md:w-1/2 aspect-[16/10] overflow-hidden border border-[#E6DFD5] shadow-md bg-white">
              <img
                src={victim.image}
                alt={victim.id}
                className="w-full h-full object-cover img-zoom"
              />
            </div>
            
            <div className="w-full md:w-1/2 flex flex-col items-start text-left space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#183451]/60">
                  {victim.id} &nbsp;|&nbsp; {victim.time}
                </span>
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    victim.priority === 'Critical'
                      ? 'bg-rose-100 text-rose-800'
                      : victim.priority === 'High'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {victim.priority} Priority
                </span>
              </div>

              <h3 className="font-editorial-serif text-xl sm:text-2xl font-bold tracking-wide text-[#183451]">
                {victim.zone}
              </h3>

              <p className="text-xs sm:text-sm text-[#183451]/80 leading-relaxed font-normal">
                {victim.notes} — <strong>{victim.peopleCount} Person(s)</strong> flagged with <strong>{victim.confidence}% AI Confidence</strong> at a water depth of <strong>{victim.waterDepthAtLocation} meters</strong>.
              </p>

              <div className="text-xs text-[#183451]/70 font-mono">
                Assigned: {victim.assignedUnit || 'Awaiting Boat Allocation'}
              </div>

              <div className="pt-2 flex items-center gap-3">
                {victim.status !== 'Rescued' ? (
                  <button
                    onClick={() => updateVictimStatus(victim.id, getNextStatus(victim.status))}
                    className="border border-[#183451] text-[#183451] hover:bg-[#183451] hover:text-[#F3ECDE] px-6 py-2 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase transition-all"
                  >
                    Advance to {getNextStatus(victim.status)}
                  </button>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ✓ Extraction Confirmed
                  </span>
                )}

                <Link
                  to="/dashboard"
                  className="text-xs text-[#183451]/70 hover:text-[#183451] underline underline-offset-4"
                >
                  Track on Map
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
