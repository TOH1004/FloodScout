import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  Camera, 
  Bell, 
  Save,
  CheckCircle2
} from 'lucide-react';
import { useRescue } from '../context/RescueContext';

export default function Settings() {
  const { confidenceThreshold, setConfidenceThreshold, soundEnabled, setSoundEnabled } = useRescue();
  const [saved, setSaved] = useState(false);
  const [streamResolution, setStreamResolution] = useState('1080p 60FPS');
  const [radioLink, setRadioLink] = useState('5.8GHz COFDM + LoRa Redundant');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#070D1B] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#243452] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#00F0FF] text-xs font-mono mb-1">
            <SettingsIcon size={14} />
            <span>PLATFORM CONFIGURATION</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            System &amp; AI Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-normal">
            Calibrate YOLOv8 person detection confidence, camera stream bitrate, and failsafe modes.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-mono">
            <CheckCircle2 size={14} />
            <span>Settings Saved to Robot EEPROM</span>
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* AI Person Detection Calibration */}
        <div className="glass-panel p-6 rounded-2xl border border-[#243452] space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2 border-b border-[#243452] pb-3">
            <Cpu size={18} className="text-[#00F0FF]" />
            AI COMPUTER VISION SETTINGS
          </h3>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>PERSON DETECTION THRESHOLD</span>
                <span className="text-[#00F0FF] font-bold">{confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="98"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-[#00F0FF] bg-[#0A0F1D] h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Higher threshold prevents false positives from floating debris.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">AI MODEL PROFILE</label>
              <select className="w-full bg-[#0A0F1D] border border-[#243452] p-2.5 rounded-lg text-white">
                <option>YOLOv8-Rescue Custom (Half-Submerged Human Silhouette)</option>
                <option>YOLOv8-Thermal (Night Contrast Optimized)</option>
                <option>YOLOv8-Standard (General Flood Hazards)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Camera & Video Stream Settings */}
        <div className="glass-panel p-6 rounded-2xl border border-[#243452] space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2 border-b border-[#243452] pb-3">
            <Camera size={18} className="text-[#00F0FF]" />
            VIDEO FEED &amp; TELEMETRY LINK
          </h3>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-slate-300 mb-1">STREAM QUALITY</label>
              <select
                value={streamResolution}
                onChange={(e) => setStreamResolution(e.target.value)}
                className="w-full bg-[#0A0F1D] border border-[#243452] p-2.5 rounded-lg text-white"
              >
                <option>1080p 60FPS (High Bandwidth / Low Latency)</option>
                <option>720p 30FPS (Optimized for Weak Signal)</option>
                <option>480p Low-Bitrate Emergency Stream</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">RADIO TRANSMISSION PROTOCOL</label>
              <select
                value={radioLink}
                onChange={(e) => setRadioLink(e.target.value)}
                className="w-full bg-[#0A0F1D] border border-[#243452] p-2.5 rounded-lg text-white"
              >
                <option>5.8GHz COFDM + LoRa Redundant</option>
                <option>4G/5G Cellular Direct Bonding</option>
                <option>Local Wi-Fi Mesh Network (AP Mode)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alerts & Audio */}
        <div className="glass-panel p-6 rounded-2xl border border-[#243452] space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2 border-b border-[#243452] pb-3">
            <Bell size={18} className="text-[#00F0FF]" />
            ALERT SOUNDS &amp; NOTIFICATIONS
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <label className="flex items-center gap-3 p-3 bg-[#0A0F1D] rounded-xl border border-[#243452] cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="accent-[#00F0FF] rounded"
              />
              <div>
                <span className="text-white font-bold block">Victim Detection Audio Chime</span>
                <span className="text-slate-400 text-[10px]">Play tactical sound tone when AI detects a human</span>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="lg:col-span-2 flex justify-end pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#00F0FF] hover:bg-[#38BDF8] text-[#070D1B] font-bold px-8 py-3 rounded-xl text-xs font-mono tracking-wider uppercase shadow-lg shadow-[#00F0FF]/20"
          >
            <Save size={16} />
            <span>Save Configuration</span>
          </button>
        </div>

      </form>

    </div>
  );
}
