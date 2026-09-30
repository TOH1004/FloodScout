import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders, CheckCircle2, AlertCircle, RefreshCw,
  Sun, Focus, Eye, Cpu, Compass
} from 'lucide-react';
import type { XiaoSerialStatus, CameraHardwareSettings, SettingFeedback } from '../hooks/useDetectionApi';

interface CameraSettingsPanelProps {
  xiaoStatus: XiaoSerialStatus;
  cameraSettings: CameraHardwareSettings;
  settingFeedback: SettingFeedback | null;
  isUpdatingSetting: boolean;
  onUpdateSetting: (setting: keyof CameraHardwareSettings, value: number) => Promise<boolean>;
}

// ESP32 Standard Resolutions (Framesizes)
const RESOLUTIONS = [
  { val: 0, label: 'QQVGA (160x120)' },
  { val: 1, label: 'QCIF (176x144)' },
  { val: 2, label: 'HQVGA (240x176)' },
  { val: 3, label: '240x240' },
  { val: 4, label: 'QVGA (320x240)' },
  { val: 5, label: 'CIF (400x296)' },
  { val: 6, label: 'HVGA (480x320)' },
  { val: 7, label: 'VGA (640x480)' },
  { val: 8, label: 'SVGA (800x600)' },
  { val: 9, label: 'XGA (1024x768)' },
  { val: 10, label: 'HD (1280x720)' },
  { val: 11, label: 'SXGA (1280x1024)' },
  { val: 12, label: 'UXGA (1600x1200)' },
];

// ESP32 Special Effects
const SPECIAL_EFFECTS = [
  { val: 0, label: 'No Effect' },
  { val: 1, label: 'Negative' },
  { val: 2, label: 'Grayscale' },
  { val: 3, label: 'Red Tint' },
  { val: 4, label: 'Green Tint' },
  { val: 5, label: 'Blue Tint' },
  { val: 6, label: 'Sepia' },
];

// White Balance Modes
const WB_MODES = [
  { val: 0, label: 'Auto' },
  { val: 1, label: 'Sunny' },
  { val: 2, label: 'Cloudy' },
  { val: 3, label: 'Office' },
  { val: 4, label: 'Home' },
];

export const CameraSettingsPanel: React.FC<CameraSettingsPanelProps> = ({
  xiaoStatus,
  cameraSettings,
  settingFeedback,
  isUpdatingSetting,
  onUpdateSetting,
}) => {
  const [localSettings, setLocalSettings] = useState<CameraHardwareSettings>(cameraSettings);
  const debounceTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const isDragging = useRef<boolean>(false);
  const [customXclk, setCustomXclk] = useState<number>(cameraSettings.xclk || 20);

  // Sync with real hardware state reported by XIAO when not dragging
  useEffect(() => {
    if (!isDragging.current) {
      setLocalSettings(cameraSettings);
      setCustomXclk(cameraSettings.xclk || 20);
    }
  }, [cameraSettings]);

  // Cleanup pending debounce timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(t => clearTimeout(t));
    };
  }, []);

  const handleSliderChange = (setting: keyof CameraHardwareSettings, val: number) => {
    isDragging.current = true;
    setLocalSettings(prev => ({ ...prev, [setting]: val }));

    if (debounceTimers.current[setting]) {
      clearTimeout(debounceTimers.current[setting]);
    }

    // Debounce serial writes by 250ms
    debounceTimers.current[setting] = setTimeout(() => {
      isDragging.current = false;
      onUpdateSetting(setting, val);
    }, 250);
  };

  const handleSelectOrToggle = (setting: keyof CameraHardwareSettings, val: number) => {
    setLocalSettings(prev => ({ ...prev, [setting]: val }));
    onUpdateSetting(setting, val);
  };

  const handleToggle = (setting: keyof CameraHardwareSettings) => {
    const nextVal = localSettings[setting] === 1 ? 0 : 1;
    handleSelectOrToggle(setting, nextVal);
  };

  const isConnected = xiaoStatus.connected;

  return (
    <div className="space-y-4 select-none">
      {/* Header and Live USB Connection Status */}
      <div className="flex items-center justify-between pb-1 border-b border-[#E6DFD5]">
        <h4 className="text-[11px] font-bold tracking-widest uppercase text-[#162347] flex items-center gap-1.5">
          <Sliders size={13} className="text-[#162347]" />
          <span>Camera Hardware Registers</span>
        </h4>
        <span
          className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold border flex items-center gap-1 ${
            isConnected
              ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
              : 'text-rose-800 bg-rose-100 border-rose-300'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-600 animate-pulse' : 'bg-rose-500'
            }`}
          />
          {isConnected ? `Connected (${xiaoStatus.port || 'USB'})` : 'XIAO: Disconnected'}
        </span>
      </div>

      {/* Disconnection Warning */}
      {!isConnected && (
        <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle size={13} className="text-amber-700 shrink-0" />
            <span>USB Serial Disconnected</span>
          </div>
          <p className="text-[9px] text-amber-800/90 leading-relaxed font-sans">
            Connect your XIAO ESP32-S3 Sense via USB. If the Arduino IDE Serial Monitor is currently open, close it so FloodScout can bind to COM4.
          </p>
        </div>
      )}

      {/* Real-time Hardware Command Feedback */}
      {settingFeedback && Date.now() - settingFeedback.timestamp < 3500 && (
        <div
          className={`p-2 rounded text-[10px] font-mono flex items-center justify-between border transition-all ${
            settingFeedback.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {settingFeedback.success ? (
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={13} className="text-rose-600 shrink-0" />
            )}
            <span>{settingFeedback.message}</span>
          </div>
          {isUpdatingSetting && (
            <RefreshCw size={11} className="animate-spin text-slate-500" />
          )}
        </div>
      )}

      {/* Controls Container (active only when hardware is connected) */}
      <div className={`space-y-4 ${!isConnected ? 'opacity-50 pointer-events-none' : ''}`}>

        {/* ── 1. CLOCK & RESOLUTION ───────────────────────────────────────── */}
        <div className="bg-[#FAF7F2] p-3 rounded border border-[#E6DFD5] space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#162347] flex items-center gap-1">
            <Cpu size={12} />
            <span>Clock & Resolution</span>
          </div>

          {/* XCLK MHz */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">XCLK MHz</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={5}
                  max={40}
                  value={customXclk}
                  onChange={(e) => setCustomXclk(parseInt(e.target.value, 10) || 20)}
                  className="w-14 bg-white border border-[#E6DFD5] text-center font-bold text-xs py-0.5 rounded"
                />
                <button
                  type="button"
                  onClick={() => onUpdateSetting('xclk', customXclk)}
                  className="bg-[#162347] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase hover:bg-[#24355E] active:scale-95"
                >
                  Set
                </button>
              </div>
            </div>
          </div>

          {/* Resolution / Framesize */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">Resolution</span>
              <span className="text-[9px] text-[#162347]/60">
                {RESOLUTIONS.find(r => r.val === localSettings.framesize)?.label || 'QVGA'}
              </span>
            </div>
            <select
              value={localSettings.framesize}
              onChange={(e) => handleSelectOrToggle('framesize', parseInt(e.target.value, 10))}
              className="w-full bg-white border border-[#E6DFD5] text-xs font-mono font-semibold py-1.5 px-2 rounded cursor-pointer text-[#162347]"
            >
              {RESOLUTIONS.map(r => (
                <option key={r.val} value={r.val}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Quality Slider (4 to 63) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">JPEG Quality</span>
              <span className="bg-white border border-[#E6DFD5] px-2 py-0.5 rounded font-bold text-xs">
                {localSettings.quality}
              </span>
            </div>
            <input
              type="range"
              min={4}
              max={63}
              step={1}
              value={localSettings.quality}
              onChange={(e) => handleSliderChange('quality', parseInt(e.target.value, 10))}
              className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[8px] font-mono text-[#162347]/60">
              <span>4 (Highest)</span>
              <span>63 (Lowest)</span>
            </div>
          </div>
        </div>

        {/* ── 2. IMAGE ADJUSTMENTS ────────────────────────────────────────── */}
        <div className="bg-[#FAF7F2] p-3 rounded border border-[#E6DFD5] space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#162347] flex items-center gap-1">
            <Sun size={12} />
            <span>Image Adjustments</span>
          </div>

          {/* Brightness (-3 to 3) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">Brightness</span>
              <span className="bg-white border border-[#E6DFD5] px-1.5 py-0.5 rounded font-bold text-xs">
                {localSettings.brightness > 0 ? `+${localSettings.brightness}` : localSettings.brightness}
              </span>
            </div>
            <input
              type="range"
              min={-3}
              max={3}
              step={1}
              value={localSettings.brightness}
              onChange={(e) => handleSliderChange('brightness', parseInt(e.target.value, 10))}
              className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[8px] font-mono text-[#162347]/60 px-0.5">
              <span>-3</span>
              <span>0</span>
              <span>+3</span>
            </div>
          </div>

          {/* Contrast (-3 to 3) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">Contrast</span>
              <span className="bg-white border border-[#E6DFD5] px-1.5 py-0.5 rounded font-bold text-xs">
                {localSettings.contrast > 0 ? `+${localSettings.contrast}` : localSettings.contrast}
              </span>
            </div>
            <input
              type="range"
              min={-3}
              max={3}
              step={1}
              value={localSettings.contrast}
              onChange={(e) => handleSliderChange('contrast', parseInt(e.target.value, 10))}
              className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[8px] font-mono text-[#162347]/60 px-0.5">
              <span>-3</span>
              <span>0</span>
              <span>+3</span>
            </div>
          </div>

          {/* Saturation (-4 to 4) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">Saturation</span>
              <span className="bg-white border border-[#E6DFD5] px-1.5 py-0.5 rounded font-bold text-xs">
                {localSettings.saturation > 0 ? `+${localSettings.saturation}` : localSettings.saturation}
              </span>
            </div>
            <input
              type="range"
              min={-4}
              max={4}
              step={1}
              value={localSettings.saturation}
              onChange={(e) => handleSliderChange('saturation', parseInt(e.target.value, 10))}
              className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[8px] font-mono text-[#162347]/60 px-0.5">
              <span>-4</span>
              <span>0</span>
              <span>+4</span>
            </div>
          </div>

          {/* Sharpness (-3 to 3) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">Sharpness</span>
              <span className="bg-white border border-[#E6DFD5] px-1.5 py-0.5 rounded font-bold text-xs">
                {localSettings.sharpness > 0 ? `+${localSettings.sharpness}` : localSettings.sharpness}
              </span>
            </div>
            <input
              type="range"
              min={-3}
              max={3}
              step={1}
              value={localSettings.sharpness}
              onChange={(e) => handleSliderChange('sharpness', parseInt(e.target.value, 10))}
              className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[8px] font-mono text-[#162347]/60 px-0.5">
              <span>-3</span>
              <span>0</span>
              <span>+3</span>
            </div>
          </div>

          {/* De-Noise (Auto / 0 to 8) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">De-Noise</span>
              <span className="bg-white border border-[#E6DFD5] px-1.5 py-0.5 rounded font-bold text-xs">
                {localSettings.denoise === 0 ? 'Auto / Off' : localSettings.denoise}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={localSettings.denoise}
              onChange={(e) => handleSliderChange('denoise', parseInt(e.target.value, 10))}
              className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[8px] font-mono text-[#162347]/60 px-0.5">
              <span>Auto (0)</span>
              <span>4</span>
              <span>8</span>
            </div>
          </div>

          {/* Exposure Level (-5 to 5) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">Exposure Level</span>
              <span className="bg-white border border-[#E6DFD5] px-1.5 py-0.5 rounded font-bold text-xs">
                {localSettings.ae_level > 0 ? `+${localSettings.ae_level}` : localSettings.ae_level}
              </span>
            </div>
            <input
              type="range"
              min={-5}
              max={5}
              step={1}
              value={localSettings.ae_level}
              onChange={(e) => handleSliderChange('ae_level', parseInt(e.target.value, 10))}
              className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[8px] font-mono text-[#162347]/60 px-0.5">
              <span>-5</span>
              <span>0</span>
              <span>+5</span>
            </div>
          </div>

          {/* Gainceiling (0 to 511) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">Gainceiling</span>
              <span className="bg-white border border-[#E6DFD5] px-1.5 py-0.5 rounded font-bold text-xs">
                {localSettings.gainceiling}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={511}
              step={1}
              value={localSettings.gainceiling}
              onChange={(e) => handleSliderChange('gainceiling', parseInt(e.target.value, 10))}
              className="w-full accent-[#162347] h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[8px] font-mono text-[#162347]/60 px-0.5">
              <span>0</span>
              <span>256</span>
              <span>511</span>
            </div>
          </div>

          {/* Special Effect */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">Special Effect</span>
            </div>
            <select
              value={localSettings.special_effect}
              onChange={(e) => handleSelectOrToggle('special_effect', parseInt(e.target.value, 10))}
              className="w-full bg-white border border-[#E6DFD5] text-xs font-mono font-semibold py-1.5 px-2 rounded cursor-pointer text-[#162347]"
            >
              {SPECIAL_EFFECTS.map(eff => (
                <option key={eff.val} value={eff.val}>{eff.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 3. AUTO EXPOSURE & WHITE BALANCE ───────────────────────────── */}
        <div className="bg-[#FAF7F2] p-3 rounded border border-[#E6DFD5] space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#162347] flex items-center gap-1">
            <Eye size={12} />
            <span>AWB, AEC & Gain</span>
          </div>

          {/* Manual AWB Mode */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#162347]">
              <span className="font-semibold uppercase">Manual AWB / Mode</span>
            </div>
            <select
              value={localSettings.wb_mode}
              onChange={(e) => handleSelectOrToggle('wb_mode', parseInt(e.target.value, 10))}
              className="w-full bg-white border border-[#E6DFD5] text-xs font-mono font-semibold py-1.5 px-2 rounded cursor-pointer text-[#162347]"
            >
              {WB_MODES.map(wb => (
                <option key={wb.val} value={wb.val}>{wb.label}</option>
              ))}
            </select>
          </div>

          {/* 2-Column Toggles for AWB, AEC, AGC */}
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            {/* AWB Enable */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#162347]">AWB Enable</span>
              <button
                type="button"
                onClick={() => handleToggle('awb')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  localSettings.awb === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                {localSettings.awb === 1 ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Advanced AWB */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#162347]">Advanced AWB</span>
              <button
                type="button"
                onClick={() => handleToggle('awb_gain')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  localSettings.awb_gain === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                {localSettings.awb_gain === 1 ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* AEC Enable */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#162347]">AEC Enable</span>
              <button
                type="button"
                onClick={() => handleToggle('aec')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  localSettings.aec === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                {localSettings.aec === 1 ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Night Mode */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#162347]">Night Mode</span>
              <button
                type="button"
                onClick={() => handleToggle('aec2')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  localSettings.aec2 === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                {localSettings.aec2 === 1 ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* AGC */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex items-center justify-between col-span-2">
              <span className="text-[10px] font-bold text-[#162347]">AGC (Auto Gain Control)</span>
              <button
                type="button"
                onClick={() => handleToggle('agc')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  localSettings.agc === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                {localSettings.agc === 1 ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. SENSOR CORRECTIONS & OPTICS ─────────────────────────────── */}
        <div className="bg-[#FAF7F2] p-3 rounded border border-[#E6DFD5] space-y-2">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#162347] flex items-center gap-1">
            <Focus size={12} />
            <span>Optics & Correction</span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            {/* GMA Enable */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#162347]">GMA Enable</span>
              <button
                type="button"
                onClick={() => handleToggle('raw_gma')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  localSettings.raw_gma === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                {localSettings.raw_gma === 1 ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Lens Correction */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#162347]">Lens Correction</span>
              <button
                type="button"
                onClick={() => handleToggle('lenc')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  localSettings.lenc === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                {localSettings.lenc === 1 ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* BPC */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#162347]">BPC</span>
              <button
                type="button"
                onClick={() => handleToggle('bpc')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  localSettings.bpc === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                {localSettings.bpc === 1 ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* WPC */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#162347]">WPC</span>
              <button
                type="button"
                onClick={() => handleToggle('wpc')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  localSettings.wpc === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                {localSettings.wpc === 1 ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 5. ORIENTATION & DIAGNOSTICS ─────────────────────────────────── */}
        <div className="bg-[#FAF7F2] p-3 rounded border border-[#E6DFD5] space-y-2">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#162347] flex items-center gap-1">
            <Compass size={12} />
            <span>Orientation & Diagnostics</span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            {/* H-Mirror */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex flex-col items-center justify-center gap-1.5 text-center">
              <span className="text-[10px] font-bold text-[#162347]">H-Mirror</span>
              <button
                type="button"
                onClick={() => handleToggle('hmirror')}
                className={`w-full py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                  localSettings.hmirror === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                [ {localSettings.hmirror === 1 ? 'ON' : 'OFF'} ]
              </button>
            </div>

            {/* V-Flip */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex flex-col items-center justify-center gap-1.5 text-center">
              <span className="text-[10px] font-bold text-[#162347]">V-Flip</span>
              <button
                type="button"
                onClick={() => handleToggle('vflip')}
                className={`w-full py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                  localSettings.vflip === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                [ {localSettings.vflip === 1 ? 'ON' : 'OFF'} ]
              </button>
            </div>

            {/* Color Bar */}
            <div className="bg-white p-2 rounded border border-[#E6DFD5] flex flex-col items-center justify-center gap-1.5 text-center">
              <span className="text-[10px] font-bold text-[#162347]">Color Bar</span>
              <button
                type="button"
                onClick={() => handleToggle('colorbar')}
                className={`w-full py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                  localSettings.colorbar === 1 ? 'bg-[#162347] text-white border-[#162347]' : 'bg-[#FAF7F2] text-[#162347] border-[#E6DFD5]'
                }`}
              >
                [ {localSettings.colorbar === 1 ? 'ON' : 'OFF'} ]
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
