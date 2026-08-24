import { useState } from 'react';
import { 
  Waves, 
  CheckCircle, 
  MapPin, 
  FileText, 
  Plus, 
  Printer
} from 'lucide-react';
import { useRescue } from '../context/RescueContext';

export default function Missions() {
  const { activeMission, victims, completeMission, startNewMission } = useRescue();
  const [newMissionModal, setNewMissionModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newZone, setNewZone] = useState('Sector C - Lowland Riverbank');

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleCreateMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    startNewMission(newTitle, newZone);
    setNewMissionModal(false);
    setNewTitle('');
  };

  const detectedCount = victims.length;
  const rescuedCount = victims.filter((v) => v.status === 'Rescued').length;
  const pendingCount = detectedCount - rescuedCount;

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#070D1B] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#243452] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#00F0FF] text-xs font-mono mb-1">
            <Waves size={14} />
            <span>OPERATIONAL MISSION COMMAND</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Rescue Missions &amp; Deployments
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-normal">
            Manage active flood search zones, track coverage progress, and generate rescue debriefs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setReportModal(true)}
            className="flex items-center gap-2 bg-[#131D31] hover:bg-[#1A263D] text-slate-200 border border-[#243452] px-4 py-2.5 rounded-xl text-xs font-mono transition-all"
          >
            <FileText size={14} className="text-[#00F0FF]" />
            <span>Generate Report</span>
          </button>

          <button
            onClick={() => setNewMissionModal(true)}
            className="flex items-center gap-2 bg-[#00F0FF] hover:bg-[#38BDF8] text-[#070D1B] font-bold px-4 py-2.5 rounded-xl text-xs font-mono tracking-wide uppercase transition-all shadow-lg shadow-[#00F0FF]/20"
          >
            <Plus size={16} />
            <span>New Mission</span>
          </button>
        </div>
      </div>

      {/* Active Mission Showcase Card */}
      <div className="glass-panel-glow rounded-2xl p-6 sm:p-8 border border-[#00F0FF]/30 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#243452]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 px-2.5 py-1 rounded">
                {activeMission.id}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                MISSION {activeMission.status}
              </span>
            </div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white">
              {activeMission.title}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5">
              <MapPin size={13} className="text-rose-400" />
              {activeMission.zone}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeMission.status === 'ACTIVE' && (
              <button
                onClick={completeMission}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all"
              >
                <CheckCircle size={15} />
                <span>Complete Mission</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Mission Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">MISSION DURATION</span>
            <span className="font-mono font-bold text-xl text-white">
              {formatDuration(activeMission.durationSeconds)}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 block mt-1">Started {activeMission.startTime}</span>
          </div>

          <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">TOTAL DISTANCE</span>
            <span className="font-mono font-bold text-xl text-[#00F0FF]">
              {activeMission.distanceTravelledKm} km
            </span>
            <span className="text-[10px] font-mono text-slate-400 block mt-1">Robot: {activeMission.robotName}</span>
          </div>

          <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">AREA COVERED</span>
            <span className="font-mono font-bold text-xl text-amber-400">
              {activeMission.areaSurveyedSqM.toLocaleString()} m²
            </span>
            <span className="text-[10px] font-mono text-slate-400 block mt-1">Grid search 74% done</span>
          </div>

          <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">VICTIMS DETECTED / RESCUED</span>
            <span className="font-mono font-bold text-xl text-rose-400">
              {detectedCount} <span className="text-slate-400 text-sm font-normal">/</span> {rescuedCount}
            </span>
            <span className="text-[10px] font-mono text-rose-300 block mt-1">{pendingCount} rescues ongoing</span>
          </div>
        </div>
      </div>

      {/* Deploy New Mission Modal */}
      {newMissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050914]/80 backdrop-blur-sm">
          <div className="bg-[#131D31] border border-[#00F0FF]/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-display font-bold text-lg text-white">Create New Search Mission</h3>
            <form onSubmit={handleCreateMission} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">MISSION TITLE / INCIDENT NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Taman Sri Muda Zone 4 Search"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0A0F1D] border border-[#243452] p-2.5 rounded-lg text-white focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">FLOOD SECTOR / TARGET ZONE</label>
                <select
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  className="w-full bg-[#0A0F1D] border border-[#243452] p-2.5 rounded-lg text-white focus:outline-none focus:border-[#00F0FF]"
                >
                  <option>Sector A - Upstream Residential</option>
                  <option>Sector B - Submerged Commercial Center</option>
                  <option>Sector C - Lowland Riverbank</option>
                  <option>Sector D - Industrial Park Highway</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setNewMissionModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#1A263D] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#00F0FF] text-[#070D1B] font-bold"
                >
                  Deploy Mission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mission Debrief Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050914]/85 backdrop-blur-sm">
          <div className="bg-[#131D31] border border-[#243452] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#243452] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">MISSION DEBRIEF REPORT</h3>
                  <p className="text-xs font-mono text-[#00F0FF]">{activeMission.id} — OFFICIAL RESCUE SUMMARY</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-[#0A0F1D] border border-[#243452] text-slate-300 rounded-lg hover:text-white"
                  title="Print Report"
                >
                  <Printer size={15} />
                </button>
                <button
                  onClick={() => setReportModal(false)}
                  className="text-xs font-mono bg-[#1A263D] px-3 py-1.5 rounded-lg text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono text-slate-300">
              <div className="grid grid-cols-2 gap-4 bg-[#0A0F1D] p-4 rounded-xl border border-[#243452]">
                <div>
                  <span className="text-slate-500 block">OPERATION:</span>
                  <span className="font-bold text-white text-sm">{activeMission.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">SEARCH SECTOR:</span>
                  <span className="font-bold text-white text-sm">{activeMission.zone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TOTAL TRAVELED:</span>
                  <span className="text-[#00F0FF] font-bold text-sm">{activeMission.distanceTravelledKm} km</span>
                </div>
                <div>
                  <span className="text-slate-500 block">SURVEY AREA:</span>
                  <span className="text-amber-400 font-bold text-sm">{activeMission.areaSurveyedSqM} m²</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-2">DETECTED VICTIM MANIFEST</h4>
                <div className="space-y-2">
                  {victims.map((v) => (
                    <div key={v.id} className="p-3 bg-[#0A0F1D] rounded-lg border border-[#243452] flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white">{v.id}</span> — {v.zone} ({v.peopleCount} person)
                        <div className="text-[10px] text-slate-400">Confidence: {v.confidence}% | Depth: {v.waterDepthAtLocation}m</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 uppercase">
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
