import React, { useState } from 'react';
import { X, Camera, Eye, Sparkles, CheckCircle2, AlertTriangle, Layers, User } from 'lucide-react';
import type { RescueIncident } from '../hooks/useDetectionApi';

interface IncidentModalProps {
  incident: RescueIncident | null;
  apiBaseUrl: string;
  onClose: () => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({ incident, apiBaseUrl, onClose }) => {
  const [activeTab, setActiveTab] = useState<'annotated' | 'original' | 'crops'>('annotated');
  const [selectedCropIndex, setSelectedCropIndex] = useState<number>(0);

  if (!incident) return null;

  const fullAnnotatedUrl = `${apiBaseUrl}${incident.imageUrl}`;
  const fullOriginalUrl = `${apiBaseUrl}${incident.originalImageUrl}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-[#162347] border border-[#24355E] text-[#FAF7F2] rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0F1830] px-5 py-3.5 border-b border-[#24355E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold text-white tracking-wider uppercase">
                  {incident.id}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase">
                  {incident.personCount} Person(s) Detected
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#BED6EE]/70">
                Captured at {incident.time} • Real-time Search &amp; Rescue Target
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#162347] px-5 py-2.5 border-b border-[#24355E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setActiveTab('annotated')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                activeTab === 'annotated'
                  ? 'bg-emerald-500 text-white font-bold'
                  : 'bg-[#0F1830] text-[#BED6EE] hover:bg-white/10'
              }`}
            >
              <Eye size={14} /> YOLO Annotated Frame
            </button>
            <button
              onClick={() => setActiveTab('original')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                activeTab === 'original'
                  ? 'bg-emerald-500 text-white font-bold'
                  : 'bg-[#0F1830] text-[#BED6EE] hover:bg-white/10'
              }`}
            >
              <Camera size={14} /> Original Scene
            </button>
            {incident.personImages && incident.personImages.length > 0 && (
              <button
                onClick={() => setActiveTab('crops')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  activeTab === 'crops'
                    ? 'bg-emerald-500 text-white font-bold'
                    : 'bg-[#0F1830] text-[#BED6EE] hover:bg-white/10'
                }`}
              >
                <User size={14} /> Person Crops ({incident.personImages.length})
              </button>
            )}
          </div>

          <div className="font-mono text-xs text-[#BED6EE] flex items-center gap-3">
            <span>
              Highest Conf:{' '}
              <strong className="text-emerald-300">
                {Math.round(incident.highestConfidence * 100)}%
              </strong>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-h-0 bg-slate-950">
          {/* Main Visual Display */}
          <div className="relative flex-1 min-h-[300px] max-h-[440px] bg-black rounded border border-white/10 flex items-center justify-center overflow-hidden">
            {activeTab === 'annotated' && (
              <img
                src={fullAnnotatedUrl}
                alt="Annotated Frame"
                className="w-full h-full object-contain"
              />
            )}
            {activeTab === 'original' && (
              <img
                src={fullOriginalUrl}
                alt="Original Scene Frame"
                className="w-full h-full object-contain"
              />
            )}
            {activeTab === 'crops' && incident.personImages && (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-4 p-4">
                {/* Active Selected Crop */}
                <div className="flex-1 flex items-center justify-center bg-slate-900 rounded p-2 h-full max-h-[380px]">
                  <img
                    src={`${apiBaseUrl}${incident.personImages[selectedCropIndex] || incident.personImages[0]}`}
                    alt={`Person Crop ${selectedCropIndex + 1}`}
                    className="max-h-full object-contain rounded shadow-lg border border-emerald-400"
                  />
                </div>
                {/* Crop Thumbnails Selector */}
                {incident.personImages.length > 1 && (
                  <div className="flex md:flex-col gap-2 overflow-auto max-h-full">
                    {incident.personImages.map((cropUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCropIndex(idx)}
                        className={`w-16 h-16 rounded border-2 overflow-hidden bg-slate-900 transition-all ${
                          selectedCropIndex === idx
                            ? 'border-emerald-400 scale-105 shadow-md'
                            : 'border-white/20 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={`${apiBaseUrl}${cropUrl}`}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Observation Section */}
          <div className="bg-[#162347] border border-[#24355E] rounded p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FAF7F2]">
                  Gemini Vision AI Scene Analysis
                </h4>
              </div>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                  incident.descriptionStatus === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : incident.descriptionStatus === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                }`}
              >
                {incident.descriptionStatus === 'completed'
                  ? 'Factual Observation'
                  : incident.descriptionStatus === 'pending'
                  ? 'Processing AI Vision...'
                  : 'AI Offline'}
              </span>
            </div>

            <p className="text-sm font-sans text-white/90 leading-relaxed pl-6 border-l-2 border-emerald-400">
              {incident.description}
            </p>
            <p className="text-[10px] font-mono text-[#BED6EE]/50 pl-6">
              * Observation generated from observable surroundings &amp; attire. No subjective attributes inferred.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0F1830] px-5 py-3 border-t border-[#24355E] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-[#BED6EE]/60">
            Incident ID: <strong className="text-white">{incident.id}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
