import { useState } from 'react';
import { 
  History as HistoryIcon, 
  ShieldCheck, 
  Search
} from 'lucide-react';

interface PastMission {
  id: string;
  date: string;
  location: string;
  duration: string;
  robot: string;
  victimsDetected: number;
  victimsRescued: number;
  distanceKm: number;
  status: 'Completed' | 'Aborted';
  notes: string;
}

export default function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMission, setSelectedMission] = useState<PastMission | null>(null);

  const pastMissions: PastMission[] = [
    {
      id: 'MISSION-023',
      date: '2026-08-20',
      location: 'Taman Sri Muda Sector 1 & 2',
      duration: '1h 42m',
      robot: 'FloodScout-01',
      victimsDetected: 6,
      victimsRescued: 6,
      distanceKm: 4.8,
      status: 'Completed',
      notes: 'Successfully mapped submerged street level, detected 6 victims on 2 balcony structures.',
    },
    {
      id: 'MISSION-022',
      date: '2026-08-14',
      location: 'Kampung Sungai Buloh Estuary',
      duration: '2h 15m',
      robot: 'FloodScout-01',
      victimsDetected: 8,
      victimsRescued: 8,
      distanceKm: 6.2,
      status: 'Completed',
      notes: 'Night operation using Thermal FLIR optics. Zero casualties reported.',
    },
    {
      id: 'MISSION-021',
      date: '2026-07-29',
      location: 'Klang Port Lowland Industrial Basin',
      duration: '48m',
      robot: 'FloodScout-02',
      victimsDetected: 2,
      victimsRescued: 2,
      distanceKm: 2.1,
      status: 'Completed',
      notes: 'Rapid deployment after flash thunderstorm surge.',
    }
  ];

  const filteredMissions = pastMissions.filter((m) =>
    m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#070D1B] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#243452] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#00F0FF] text-xs font-mono mb-1">
            <HistoryIcon size={14} />
            <span>OPERATIONAL ARCHIVE</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Mission History &amp; Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-normal">
            Review past disaster responses, victim statistics, trajectory logs, and official records.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search mission ID or zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131D31] border border-[#243452] pl-9 pr-4 py-2 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-[#243452] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-[#0A0F1D] border-b border-[#243452] text-slate-400 uppercase text-[10px]">
                <th className="py-4 px-6">Mission ID &amp; Date</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Duration / Distance</th>
                <th className="py-4 px-6">Victims (Found/Rescued)</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243452]/60">
              {filteredMissions.map((m) => (
                <tr key={m.id} className="hover:bg-[#131D31]/80 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-white text-sm">{m.id}</div>
                    <div className="text-[10px] text-slate-400">{m.date}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-slate-200">{m.location}</div>
                    <div className="text-[10px] text-slate-400">Unit: {m.robot}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-slate-200">{m.duration}</div>
                    <div className="text-[10px] text-[#00F0FF]">{m.distanceKm} km traveled</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-emerald-400 font-bold text-sm">{m.victimsRescued}</span>
                    <span className="text-slate-400"> / {m.victimsDetected} Victims</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      <ShieldCheck size={11} /> {m.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => setSelectedMission(m)}
                      className="bg-[#1A263D] hover:bg-[#00F0FF] hover:text-[#070D1B] text-slate-300 px-3 py-1.5 rounded-lg border border-[#243452] transition-colors"
                    >
                      Debrief Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Mission Modal */}
      {selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050914]/85 backdrop-blur-sm">
          <div className="bg-[#131D31] border border-[#243452] rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#243452] pb-3">
              <h3 className="font-display font-bold text-lg text-white">
                MISSION REPORT: {selectedMission.id}
              </h3>
              <button
                onClick={() => setSelectedMission(null)}
                className="text-xs font-mono bg-[#0A0F1D] px-3 py-1 rounded-lg text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono text-slate-300">
              <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452] space-y-1.5">
                <div><strong>Location:</strong> {selectedMission.location}</div>
                <div><strong>Date:</strong> {selectedMission.date}</div>
                <div><strong>Duration:</strong> {selectedMission.duration}</div>
                <div><strong>Distance Surveyed:</strong> {selectedMission.distanceKm} km</div>
                <div><strong>Victims Rescued:</strong> {selectedMission.victimsRescued} / {selectedMission.victimsDetected}</div>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1">Debrief Summary:</h4>
                <p className="bg-[#0A0F1D] p-3 rounded-lg border border-[#243452] text-slate-300 leading-relaxed font-normal">
                  {selectedMission.notes}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
