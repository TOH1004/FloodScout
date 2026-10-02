import React, { useState, useMemo, useEffect } from 'react';
import { X, Camera, Eye, Sparkles, User, Clock, Images, CheckCircle2 } from 'lucide-react';
import type { RescueIncident, PersonDetail } from '../hooks/useDetectionApi';

interface CaptureEntry {
  personId: number;
  label: string;
  imageUrl: string;
  score: number;
  incidentId: string;
  incidentTime: string;
  incidentTimestamp: string;
}

interface IncidentModalProps {
  incident: RescueIncident | null;
  targetPersonId?: number | null;
  allIncidents?: RescueIncident[];
  apiBaseUrl: string;
  onClose: () => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  incident,
  targetPersonId = null,
  allIncidents = [],
  apiBaseUrl,
  onClose,
}) => {
  // If targetPersonId is specified (inspecting a person card), default directly to 'crops'
  const [activeTab, setActiveTab] = useState<'annotated' | 'original' | 'crops'>(
    targetPersonId !== null && targetPersonId !== undefined ? 'crops' : 'annotated'
  );
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(targetPersonId);
  const [selectedCaptureIndex, setSelectedCaptureIndex] = useState<number>(0);

  // Sync state when props change
  useEffect(() => {
    if (targetPersonId !== null && targetPersonId !== undefined) {
      setSelectedPersonId(targetPersonId);
      setActiveTab('crops');
      setSelectedCaptureIndex(0);
    } else {
      setSelectedPersonId(null);
    }
  }, [targetPersonId, incident?.id]);

  // ── Aggregate ALL captures for each person across ALL incidents ───────────────
  const allCapturesByPerson = useMemo<Map<number, CaptureEntry[]>>(() => {
    const map = new Map<number, CaptureEntry[]>();

    const processIncident = (inc: RescueIncident) => {
      if (inc.personDetails && inc.personDetails.length > 0) {
        inc.personDetails.forEach((p: PersonDetail) => {
          if (!p.imageUrl) return;
          const entry: CaptureEntry = {
            personId: p.id,
            label: p.label || `Person #${p.id}`,
            imageUrl: p.imageUrl,
            score: p.score ?? inc.highestConfidence,
            incidentId: inc.id,
            incidentTime: inc.time,
            incidentTimestamp: inc.timestamp,
          };
          if (!map.has(p.id)) map.set(p.id, []);
          if (!map.get(p.id)!.some((e) => e.imageUrl === p.imageUrl)) {
            map.get(p.id)!.push(entry);
          }
        });
      } else if (inc.personImages && inc.personImages.length > 0) {
        inc.personImages.forEach((url, idx) => {
          const m = url.match(/person_(\d+)/);
          const pid = m ? parseInt(m[1]) : idx + 1;
          const entry: CaptureEntry = {
            personId: pid,
            label: `Person #${pid}`,
            imageUrl: url,
            score: inc.highestConfidence,
            incidentId: inc.id,
            incidentTime: inc.time,
            incidentTimestamp: inc.timestamp,
          };
          if (!map.has(pid)) map.set(pid, []);
          if (!map.get(pid)!.some((e) => e.imageUrl === url)) {
            map.get(pid)!.push(entry);
          }
        });
      }
    };

    // Sort all incidents newest-first so captures are in chronological reverse order
    const sortedAll = [...allIncidents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    sortedAll.forEach(processIncident);

    // If current incident is not yet in allIncidents, also process it
    if (incident && !sortedAll.some((i) => i.id === incident.id)) {
      processIncident(incident);
    }

    // Sort each person's captures newest first
    map.forEach((entries) =>
      entries.sort(
        (a, b) =>
          new Date(b.incidentTimestamp).getTime() - new Date(a.incidentTimestamp).getTime()
      )
    );

    return map;
  }, [incident, allIncidents]);

  // Find latest incident for targetPersonId if applicable (keeps scene view up-to-date)
  const displayIncident = useMemo(() => {
    if (!incident) return null;
    if (targetPersonId === null || targetPersonId === undefined) return incident;

    const matching = allIncidents.find((inc) =>
      inc.personDetails?.some((p) => p.id === targetPersonId) ||
      inc.personImages?.some((url) => url.includes(`person_${targetPersonId}.jpg`))
    );
    return matching || incident;
  }, [incident, targetPersonId, allIncidents]);

  // Determine available person IDs for this view
  const availablePersonIds = useMemo<number[]>(() => {
    // If inspecting a specific person, ONLY that person is available
    if (targetPersonId !== null && targetPersonId !== undefined) {
      return [targetPersonId];
    }

    if (!displayIncident) return [];

    // If inspecting an incident, show only persons from this incident
    if (displayIncident.personDetails && displayIncident.personDetails.length > 0) {
      return Array.from(new Set(displayIncident.personDetails.map((p) => p.id)));
    }
    const ids = (displayIncident.personImages || []).map((url, idx) => {
      const m = url.match(/person_(\d+)/);
      return m ? parseInt(m[1]) : idx + 1;
    });
    return Array.from(new Set(ids));
  }, [targetPersonId, displayIncident]);

  const activePid = selectedPersonId ?? availablePersonIds[0] ?? null;
  const activeCaptures = activePid !== null ? (allCapturesByPerson.get(activePid) ?? []) : [];
  const safeIndex = Math.min(selectedCaptureIndex, Math.max(0, activeCaptures.length - 1));
  const activeCapture = activeCaptures[safeIndex] ?? null;

  if (!displayIncident) return null;

  const fullAnnotatedUrl = `${apiBaseUrl}${displayIncident.imageUrl}`;
  const fullOriginalUrl = `${apiBaseUrl}${displayIncident.originalImageUrl}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none animate-fadeIn">
      <div className="bg-[#162347] border border-[#24355E] text-[#FAF7F2] rounded-xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0F1830] px-5 py-3 border-b border-[#24355E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold text-white tracking-wider uppercase">
                  {targetPersonId !== null && targetPersonId !== undefined
                    ? `Person #${targetPersonId} — Capture Inspector`
                    : displayIncident.id}
                </h3>
                {targetPersonId !== null && targetPersonId !== undefined ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                    {activeCaptures.length} Total Photo{activeCaptures.length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase">
                    {displayIncident.personCount} Person(s) Detected
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-[#BED6EE]/70">
                {targetPersonId !== null && targetPersonId !== undefined
                  ? `Showing all captured angles & sessions for Person #${targetPersonId}`
                  : `Captured at ${displayIncident.time} • Real-time Search & Rescue Target`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#162347] px-5 py-2.5 border-b border-[#24355E] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs">
            {/* All Captures Tab */}
            <button
              onClick={() => {
                setActiveTab('crops');
                setSelectedCaptureIndex(0);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
                activeTab === 'crops'
                  ? 'bg-emerald-500 text-white font-bold shadow-xs'
                  : 'bg-[#0F1830] text-[#BED6EE] hover:bg-white/10'
              }`}
            >
              <Images size={14} />
              {targetPersonId !== null && targetPersonId !== undefined
                ? `Person #${targetPersonId} Photos (${activeCaptures.length})`
                : `All Captures (${activeCaptures.length})`}
            </button>

            {/* Annotated Frame Tab */}
            <button
              onClick={() => setActiveTab('annotated')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
                activeTab === 'annotated'
                  ? 'bg-emerald-500 text-white font-bold shadow-xs'
                  : 'bg-[#0F1830] text-[#BED6EE] hover:bg-white/10'
              }`}
            >
              <Eye size={14} /> Annotated Frame (HOG+SVM)
            </button>

            {/* Original Scene Tab */}
            <button
              onClick={() => setActiveTab('original')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
                activeTab === 'original'
                  ? 'bg-emerald-500 text-white font-bold shadow-xs'
                  : 'bg-[#0F1830] text-[#BED6EE] hover:bg-white/10'
              }`}
            >
              <Camera size={14} /> Original Scene
            </button>
          </div>

          <div className="font-mono text-xs text-[#BED6EE] flex items-center gap-3">
            <span>
              Latest Score:{' '}
              <strong className="text-emerald-300">
                {activeCapture ? activeCapture.score.toFixed(2) : displayIncident.highestConfidence.toFixed(2)}
              </strong>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 bg-slate-950">
          {/* TAB 1: ALL CAPTURES (PERSON ONLY) */}
          {activeTab === 'crops' && (
            <div className="flex-1 min-h-0 flex flex-col bg-slate-900 rounded-lg border border-white/10 p-3.5 space-y-3">
              {/* Header inside Captures: Person Label + Total count + multi-person switcher if applicable */}
              <div className="flex items-center justify-between shrink-0 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white bg-emerald-600 px-2.5 py-1 rounded flex items-center gap-1.5 uppercase shadow-xs">
                    <User size={13} /> Person #{activePid}
                  </span>
                  <span className="font-mono text-[11px] text-[#BED6EE]/80 bg-white/10 px-2.5 py-0.5 rounded">
                    {activeCaptures.length} total capture{activeCaptures.length !== 1 ? 's' : ''} across all sessions
                  </span>
                </div>

                {/* If multiple persons in an incident (from By Time view), show simple selector pills */}
                {availablePersonIds.length > 1 && (
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded border border-white/10">
                    <span className="text-[10px] font-mono text-white/50 px-1">Switch:</span>
                    {availablePersonIds.map((pid) => (
                      <button
                        key={pid}
                        onClick={() => {
                          setSelectedPersonId(pid);
                          setSelectedCaptureIndex(0);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                          activePid === pid
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Person #{pid}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {activeCaptures.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-white/40 italic text-sm py-12">
                  No capture images found for Person #{activePid}.
                </div>
              ) : (
                <>
                  {/* Active Large Image Display */}
                  {activeCapture && (
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-black/60 rounded-lg p-2.5 border border-white/5 relative">
                      <div className="relative max-h-[280px] w-full flex items-center justify-center overflow-hidden">
                        <img
                          src={`${apiBaseUrl}${activeCapture.imageUrl}`}
                          alt={activeCapture.label}
                          className="max-h-[270px] w-auto max-w-full object-contain rounded-md shadow-2xl border-2 border-emerald-400"
                        />
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-400" />
                          <span>Photo {safeIndex + 1} of {activeCaptures.length}</span>
                        </div>
                      </div>

                      {/* Capture Metadata Bar */}
                      <div className="w-full max-w-md flex items-center justify-between mt-2 px-2 py-1 bg-slate-800/80 rounded border border-white/10 text-[11px] font-mono text-[#BED6EE]">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} className="text-emerald-400" />
                          <strong className="text-white">{activeCapture.incidentTime}</strong>
                          <span className="text-white/40">({activeCapture.incidentId})</span>
                        </span>
                        <span className="font-bold text-emerald-400">
                          Score: {activeCapture.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Filmstrip Gallery: All captures of Person #N */}
                  <div className="shrink-0 pt-2 border-t border-white/10 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-[#BED6EE]/60 font-semibold tracking-wider flex items-center justify-between">
                      <span>All Captured Photos ({activeCaptures.length}) — click to inspect:</span>
                      <span className="text-emerald-400 font-normal">Newest on left</span>
                    </div>

                    <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5">
                      {activeCaptures.map((cap, idx) => {
                        const isSelected = safeIndex === idx;
                        return (
                          <button
                            key={`${cap.incidentId}-${idx}`}
                            onClick={() => setSelectedCaptureIndex(idx)}
                            title={`${cap.incidentId} at ${cap.incidentTime} (Score: ${cap.score.toFixed(2)})`}
                            className={`flex flex-col items-center p-1.5 rounded-lg border-2 bg-slate-950 shrink-0 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-emerald-400 ring-2 ring-emerald-400/30 bg-emerald-950/40 shadow-lg scale-102'
                                : 'border-white/15 opacity-70 hover:opacity-100 hover:border-white/40'
                            }`}
                          >
                            <div className="w-16 h-16 rounded overflow-hidden bg-black border border-slate-700 relative">
                              <img
                                src={`${apiBaseUrl}${cap.imageUrl}`}
                                alt={cap.label}
                                className="w-full h-full object-cover"
                              />
                              {idx === 0 && (
                                <span className="absolute top-0.5 right-0.5 bg-emerald-500 text-black text-[8px] font-mono font-bold px-1 rounded">
                                  Latest
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-white/80 mt-1 font-semibold">
                              {cap.incidentTime}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: ANNOTATED FRAME */}
          {activeTab === 'annotated' && (
            <div className="flex-1 min-h-[320px] max-h-[480px] bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
              <img
                src={fullAnnotatedUrl}
                alt="Annotated Frame"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* TAB 3: ORIGINAL SCENE */}
          {activeTab === 'original' && (
            <div className="flex-1 min-h-[320px] max-h-[480px] bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
              <img
                src={fullOriginalUrl}
                alt="Original Scene Frame"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* AI Observation Section */}
          <div className="bg-[#162347] border border-[#24355E] rounded-lg p-3.5 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-emerald-400" />
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FAF7F2]">
                  Gemini Vision AI Scene Analysis
                </h4>
              </div>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                  displayIncident.descriptionStatus === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : displayIncident.descriptionStatus === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                }`}
              >
                {displayIncident.descriptionStatus === 'completed'
                  ? 'Factual Observation'
                  : displayIncident.descriptionStatus === 'pending'
                  ? 'Processing AI Vision...'
                  : 'AI Offline'}
              </span>
            </div>
            {displayIncident.description ? (
              <p className="text-xs font-sans text-white/90 leading-relaxed pl-5 border-l-2 border-emerald-400">
                {displayIncident.description}
              </p>
            ) : (
              <p className="text-xs font-sans text-white/50 italic pl-5">
                No visual description available for this incident.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0F1830] px-5 py-2.5 border-t border-[#24355E] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-[#BED6EE]/60">
            Incident ID: <strong className="text-white">{displayIncident.id}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

