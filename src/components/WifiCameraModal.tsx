import React, { useState } from 'react';
import {
  Wifi, Check, RefreshCw, X, Radio,
  AlertCircle, CheckCircle2, Cpu
} from 'lucide-react';
import {
  getCameraStreamUrl,
  setCameraStreamUrl,
  getCameraFeedMode,
  setCameraFeedMode,
  normalizeCameraStreamUrl,
  extractCameraHost,
  DEFAULT_CAMERA_IP,
  type CameraFeedMode,
} from '../config/camera';
import { setEsp32BaseUrl } from '../config/esp32';

interface WifiCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveUrl: (url: string) => Promise<boolean>;
  activeStreamUrl: string;
  activeFeedMode: CameraFeedMode;
  onSelectFeedMode: (mode: CameraFeedMode) => void;
  backendOnline: boolean;
  cameraConnected: boolean;
  isUpdating?: boolean;
}

const PRESET_PATHS = [
  { label: 'ESP32-CAM (:81/stream)', path: ':81/stream', desc: 'Standard CameraWebServer.ino (Active)' },
  { label: 'Standard (:80/stream)', path: ':80/stream', desc: 'Port 80 stream' },
  { label: 'Root Stream (/stream)', path: '/stream', desc: 'Direct /stream endpoint' },
];

export const WifiCameraModal: React.FC<WifiCameraModalProps> = ({
  isOpen,
  onClose,
  onSaveUrl,
  activeStreamUrl,
  activeFeedMode,
  onSelectFeedMode,
  backendOnline,
  cameraConnected,
  isUpdating = false,
}) => {
  const [inputUrl, setInputUrl] = useState(() => {
    const raw = activeStreamUrl || getCameraStreamUrl();
    return normalizeCameraStreamUrl(raw);
  });
  const [feedMode, setFeedMode] = useState<CameraFeedMode>(() => activeFeedMode || getCameraFeedMode());
  const [syncPanTilt, setSyncPanTilt] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (presetPath: string) => {
    try {
      const currentHost = extractCameraHost(inputUrl) || DEFAULT_CAMERA_IP;
      setInputUrl(`http://${currentHost}${presetPath}`);
    } catch {
      setInputUrl(`http://${DEFAULT_CAMERA_IP}${presetPath}`);
    }
  };

  const handleTestPing = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection to camera...');
    const targetUrl = normalizeCameraStreamUrl(inputUrl);
    const host = extractCameraHost(targetUrl);

    // Guard against entering the operator PC's own IP address
    const pcHostnames = ['localhost', '127.0.0.1', '10.185.112.238', window.location.hostname];
    if (host && pcHostnames.includes(host)) {
      setTestStatus('failed');
      setTestMessage(`⚠️ ${host} is this computer! The ESP32 camera has its own separate IP address on the Wi-Fi hotspot.`);
      return;
    }

    const startTime = Date.now();
    try {
      // 1. First test if a snapshot frame can be loaded from the camera
      const snapshotUrl = host ? `http://${host}/capture?t=${Date.now()}` : targetUrl;
      const canLoadFrame = await new Promise<boolean>((resolve) => {
        const testImg = new Image();
        const timer = setTimeout(() => {
          testImg.src = '';
          resolve(false);
        }, 3000);

        testImg.onload = () => {
          clearTimeout(timer);
          resolve(true);
        };
        testImg.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };
        testImg.src = snapshotUrl;
      });

      if (canLoadFrame) {
        const elapsed = Date.now() - startTime;
        setTestStatus('success');
        setTestMessage(`Camera stream verified! (~${elapsed}ms response)`);
        return;
      }

      // 2. Fallback: try fetching camera web UI on port 80
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const checkUrl = host ? `http://${host}/` : targetUrl;
      await fetch(checkUrl, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      setTestStatus('success');
      setTestMessage(`Camera web server responded (~${elapsed}ms). Ready to stream.`);
    } catch (e: unknown) {
      const err = e as Error;
      setTestStatus('failed');
      if (err.name === 'AbortError') {
        setTestMessage('Connection timed out (>3s). Check if camera is powered on and connected to hotspot.');
      } else {
        setTestMessage(`Could not connect to ${host || targetUrl}. Verify camera IP address.`);
      }
    }
  };

  const handleSave = async () => {
    const normalized = normalizeCameraStreamUrl(inputUrl);
    setCameraStreamUrl(normalized);
    setCameraFeedMode(feedMode);
    onSelectFeedMode(feedMode);

    if (syncPanTilt) {
      const host = extractCameraHost(normalized);
      if (host) {
        setEsp32BaseUrl(`http://${host}`);
      }
    }

    setSaveSuccess(true);
    await onSaveUrl(normalized);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#162347]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Wifi size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Wi-Fi Camera Streaming Setup
              </h3>
              <p className="text-[11px] text-slate-400">
                Connect your ESP32-CAM / XIAO camera over local Wi-Fi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  cameraConnected
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span className="font-mono font-bold text-white">
                {cameraConnected ? 'CAMERA LINKED' : 'CAMERA STANDBY / DISCONNECTED'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Backend: <strong className={backendOnline ? 'text-emerald-400' : 'text-rose-400'}>{backendOnline ? 'ONLINE' : 'OFFLINE'}</strong>
            </div>
          </div>

          {/* Stream URL Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Camera Wi-Fi Stream URL or IP</span>
              <span className="text-[10px] text-sky-400 font-mono font-normal">Same Wi-Fi network</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setTestStatus('idle');
                }}
                placeholder="http://10.185.112.106:81/stream"
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleTestPing}
                disabled={testStatus === 'testing'}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Test Wi-Fi reachability"
              >
                {testStatus === 'testing' ? (
                  <RefreshCw size={13} className="animate-spin text-sky-400" />
                ) : (
                  <Wifi size={13} />
                )}
                <span>Test Ping</span>
              </button>
            </div>
            {testStatus !== 'idle' && (
              <div
                className={`mt-2 p-2 rounded text-[11px] flex items-center gap-1.5 ${
                  testStatus === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                    : testStatus === 'failed'
                    ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {testStatus === 'success' ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                <span>{testMessage}</span>
              </div>
            )}

            {/* Camera IP Finder Guidance */}
            <div className="mt-2.5 p-2.5 rounded-lg bg-sky-950/30 border border-sky-800/40 text-[11px] text-slate-300 space-y-1">
              <div className="font-semibold text-sky-300 flex items-center gap-1.5 text-xs">
                <span>💡 How to find your Camera&apos;s IP:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[10.5px]">
                <li>
                  <strong className="text-slate-200">Arduino Serial Monitor (115200 baud):</strong> Press the RST button on the camera board &rarr; look for <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">Camera Ready! Use &apos;http://10.185.112.X&apos;</code>
                </li>
                <li>
                  <strong className="text-slate-200">vivo V30 Hotspot Settings:</strong> Open Personal Hotspot &rarr; Connected Devices
                </li>
                <li className="text-amber-400">
                  ⚠️ Note: <code className="bg-black/40 px-1 py-0.5 rounded">10.185.112.238</code> is your computer, not the camera.
                </li>
              </ul>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Quick Stream Path Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_PATHS.map((preset) => (
                <button
                  key={preset.path}
                  type="button"
                  onClick={() => handleApplyPreset(preset.path)}
                  className="p-2 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-left transition-all cursor-pointer group"
                >
                  <div className="text-[11px] font-bold text-slate-200 group-hover:text-sky-300 font-mono">
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-slate-400">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Feed Mode Selection */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Website Streaming Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFeedMode('ai')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                  feedMode === 'ai'
                    ? 'bg-sky-950/40 border-sky-400 text-white shadow-sm ring-1 ring-sky-400/40'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                    <Cpu size={14} className="text-sky-400" /> AI Vision Feed
                  </span>
                  {feedMode === 'ai' && <Check size={14} className="text-sky-400 font-bold" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  OpenCV HOG+SVM person detection boxes & telemetry rendered live.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFeedMode('direct')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                  feedMode === 'direct'
                    ? 'bg-emerald-950/40 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400/40'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                    <Radio size={14} className="text-emerald-400" /> Direct Wi-Fi Cam
                  </span>
                  {feedMode === 'direct' && <Check size={14} className="text-emerald-400 font-bold" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Direct connection from camera over Wi-Fi. Lowest latency (&lt;50ms).
                </p>
              </button>
            </div>
          </div>

          {/* Sync Pan/Tilt Checkbox */}
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-300">
            <input
              type="checkbox"
              id="syncPanTilt"
              checked={syncPanTilt}
              onChange={(e) => setSyncPanTilt(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="syncPanTilt" className="cursor-pointer select-none">
              Also synchronize Pan & Tilt Actuator to this IP ({extractCameraHost(inputUrl) || '10.185.112.106'})
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-[#0F172A]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUpdating}
            className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-95 ${
              saveSuccess
                ? 'bg-emerald-600'
                : 'bg-sky-600 hover:bg-sky-500'
            }`}
          >
            {isUpdating ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : saveSuccess ? (
              <Check size={14} />
            ) : (
              <Wifi size={14} />
            )}
            <span>{saveSuccess ? 'Saved & Connected!' : 'Connect & Apply'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
