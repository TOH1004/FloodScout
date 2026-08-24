import { useState } from 'react';
import { 
  Users, 
  Search, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles
} from 'lucide-react';
import { useRescue } from '../context/RescueContext';
import type { Victim, VictimStatus, PriorityLevel } from '../context/RescueContext';

export default function Victims() {
  const { victims, updateVictimStatus, simulateVictimDetection } = useRescue();
  const [statusFilter, setStatusFilter] = useState<'All' | VictimStatus>('All');
  const [priorityFilter] = useState<'All' | PriorityLevel>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVictim, setSelectedVictim] = useState<Victim | null>(null);

  const filteredVictims = victims.filter((v) => {
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || v.priority === priorityFilter;
    const matchesSearch = 
      v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.notes && v.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const getNextStatus = (current: VictimStatus): VictimStatus => {
    switch (current) {
      case 'Detected': return 'Verified';
      case 'Verified': return 'Rescue Assigned';
      case 'Rescue Assigned': return 'Rescued';
      default: return 'Rescued';
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#070D1B] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#243452] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#00F0FF] text-xs font-mono mb-1">
            <Users size={14} />
            <span>INCIDENT VICTIMS TRIAGE &amp; TRACKING</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Detected Victims Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-normal">
            Verify AI-flagged silhouettes, assign rescue response boats, and confirm extraction lifecycle.
          </p>
        </div>

        <button
          onClick={simulateVictimDetection}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs font-mono tracking-wide uppercase transition-all shadow-lg shadow-rose-600/30"
        >
          <Sparkles size={15} />
          <span>Simulate Detection</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-[#131D31] border border-[#243452] p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search victim ID, zone, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0F1D] border border-[#243452] pl-9 pr-4 py-2 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] font-mono"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0A0F1D] p-1 rounded-xl border border-[#243452] text-xs font-mono">
          {(['All', 'Detected', 'Verified', 'Rescue Assigned', 'Rescued'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                statusFilter === st ? 'bg-[#00F0FF] text-[#070D1B]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

      </div>

      {/* Victims Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVictims.map((victim) => (
          <div
            key={victim.id}
            className={`glass-panel rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl flex flex-col justify-between ${
              victim.status === 'Rescued'
                ? 'border-emerald-500/40 bg-emerald-950/10'
                : victim.priority === 'Critical'
                ? 'border-rose-500/40 bg-rose-950/10'
                : 'border-[#243452]'
            }`}
          >
            {/* Camera Snapshot Thumbnail */}
            <div className="relative aspect-[16/9] bg-slate-950 overflow-hidden">
              <img
                src={victim.image}
                alt={`Victim ${victim.id}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />

              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs bg-[#0A0F1D]/90 text-white px-2 py-0.5 rounded border border-[#243452]">
                  {victim.id}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    victim.priority === 'Critical'
                      ? 'bg-rose-500 text-white'
                      : victim.priority === 'High'
                      ? 'bg-amber-500 text-[#070D1B]'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {victim.priority}
                </span>
              </div>

              <div className="absolute top-2 right-2 bg-emerald-500/90 text-[#070D1B] font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow">
                {victim.confidence}% CONFIDENCE
              </div>

              <div className="absolute bottom-2 left-2 right-2 bg-[#0A0F1D]/80 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 flex justify-between">
                <span>{victim.time}</span>
                <span>Depth: {victim.waterDepthAtLocation}m</span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 space-y-3">
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  {victim.peopleCount} Person(s) Detected
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                  <MapPin size={12} className="text-rose-400" />
                  {victim.zone}
                </p>
              </div>

              {victim.notes && (
                <p className="text-xs text-slate-300 bg-[#0A0F1D] p-2.5 rounded-lg border border-[#243452]/60 leading-relaxed font-normal">
                  {victim.notes}
                </p>
              )}

              {/* Status Lifecycle Step Bar */}
              <div className="pt-2 border-t border-[#243452]/60">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                  <span>LIFECYCLE STATUS:</span>
                  <span className="font-bold text-[#00F0FF] uppercase">{victim.status}</span>
                </div>

                <div className="grid grid-cols-4 gap-1 h-1.5 bg-[#0A0F1D] rounded-full overflow-hidden">
                  <div className={`h-full ${['Detected', 'Verified', 'Rescue Assigned', 'Rescued'].includes(victim.status) ? 'bg-[#00F0FF]' : 'bg-slate-800'}`}></div>
                  <div className={`h-full ${['Verified', 'Rescue Assigned', 'Rescued'].includes(victim.status) ? 'bg-[#00F0FF]' : 'bg-slate-800'}`}></div>
                  <div className={`h-full ${['Rescue Assigned', 'Rescued'].includes(victim.status) ? 'bg-[#00F0FF]' : 'bg-slate-800'}`}></div>
                  <div className={`h-full ${victim.status === 'Rescued' ? 'bg-emerald-400' : 'bg-slate-800'}`}></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedVictim(victim)}
                  className="text-xs font-mono text-slate-400 hover:text-white underline"
                >
                  View Dossier
                </button>

                {victim.status !== 'Rescued' ? (
                  <button
                    onClick={() => updateVictimStatus(victim.id, getNextStatus(victim.status))}
                    className="flex items-center gap-1.5 bg-[#00F0FF] hover:bg-[#38BDF8] text-[#070D1B] font-bold text-xs font-mono px-3.5 py-1.5 rounded-lg transition-all shadow"
                  >
                    <span>Advance to {getNextStatus(victim.status)}</span>
                    <ArrowRight size={12} />
                  </button>
                ) : (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 size={13} /> Rescued Safe
                  </span>
                )}
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Victim Detailed Dossier Modal */}
      {selectedVictim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050914]/85 backdrop-blur-sm">
          <div className="bg-[#131D31] border border-[#243452] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#243452] pb-3">
              <h3 className="font-display font-bold text-lg text-white">
                VICTIM DOSSIER: {selectedVictim.id}
              </h3>
              <button
                onClick={() => setSelectedVictim(null)}
                className="text-xs font-mono bg-[#0A0F1D] px-3 py-1 rounded-lg text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="aspect-[16/9] rounded-xl overflow-hidden bg-black">
              <img src={selectedVictim.image} alt={selectedVictim.id} className="w-full h-full object-cover" />
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div><strong>Zone:</strong> {selectedVictim.zone}</div>
              <div><strong>GPS Coordinates:</strong> {selectedVictim.location[0]}°N, {selectedVictim.location[1]}°E</div>
              <div><strong>Water Depth:</strong> {selectedVictim.waterDepthAtLocation} meters</div>
              <div><strong>AI Confidence:</strong> {selectedVictim.confidence}%</div>
              <div><strong>Assigned Response Unit:</strong> {selectedVictim.assignedUnit || 'Unassigned'}</div>
              <div><strong>Notes:</strong> {selectedVictim.notes}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
