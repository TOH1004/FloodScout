import { useMemo } from 'react';
import {
  Radar,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sliders,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useObstacleSensor } from '../hooks/useObstacleSensor';
import { getEsp32BaseUrl, setEsp32BaseUrl } from '../config/esp32';

export function ObstacleSensorSection() {
  const sensor = useObstacleSensor();

  const {
    distanceM,
    distanceCm,
    isObstacleDetected,
    status,
    warningThresholdM,
    criticalThresholdM,
    autoBrakeArmed,
    buzzerEnabled,
    sensorModel,
    maxRangeM,
    minRangeM,
    pingRateHz,
    isHardwareConnected,
    history,
    setWarningThresholdM,
    setCriticalThresholdM,
    setAutoBrakeArmed,
    setBuzzerEnabled,
  } = sensor;

  // Radar Sector Arc dimensions
  const svgWidth = 360;
  const svgHeight = 220;
  const originX = svgWidth / 2;
  const originY = svgHeight - 20;
  const maxRadiusPx = 175;

  // Calculate obstacle position in the 60° forward cone
  const obstacleRadiusPx = useMemo(() => {
    const clampedDist = Math.max(minRangeM, Math.min(maxRangeM, distanceM));
    return (clampedDist / maxRangeM) * maxRadiusPx;
  }, [distanceM, minRangeM, maxRangeM]);

  // SVG Radar Path generator for forward 60° arc (-30° to +30° from top)
  const arcPath = useMemo(() => {
    const startAngle = (-30 * Math.PI) / 180;
    const endAngle = (30 * Math.PI) / 180;
    const x1 = originX + maxRadiusPx * Math.sin(startAngle);
    const y1 = originY - maxRadiusPx * Math.cos(startAngle);
    const x2 = originX + maxRadiusPx * Math.sin(endAngle);
    const y2 = originY - maxRadiusPx * Math.cos(endAngle);
    return `M ${originX} ${originY} L ${x1} ${y1} A ${maxRadiusPx} ${maxRadiusPx} 0 0 1 ${x2} ${y2} Z`;
  }, [originX, originY, maxRadiusPx]);

  // Warning Zone Arc Path
  const warningArcPath = useMemo(() => {
    const warnRadius = (warningThresholdM / maxRangeM) * maxRadiusPx;
    const startAngle = (-30 * Math.PI) / 180;
    const endAngle = (30 * Math.PI) / 180;
    const x1 = originX + warnRadius * Math.sin(startAngle);
    const y1 = originY - warnRadius * Math.cos(startAngle);
    const x2 = originX + warnRadius * Math.sin(endAngle);
    const y2 = originY - warnRadius * Math.cos(endAngle);
    return `M ${originX} ${originY} L ${x1} ${y1} A ${warnRadius} ${warnRadius} 0 0 1 ${x2} ${y2} Z`;
  }, [originX, originY, maxRadiusPx, warningThresholdM, maxRangeM]);

  // Danger Zone Arc Path
  const dangerArcPath = useMemo(() => {
    const dangerRadius = (criticalThresholdM / maxRangeM) * maxRadiusPx;
    const startAngle = (-30 * Math.PI) / 180;
    const endAngle = (30 * Math.PI) / 180;
    const x1 = originX + dangerRadius * Math.sin(startAngle);
    const y1 = originY - dangerRadius * Math.cos(startAngle);
    const x2 = originX + dangerRadius * Math.sin(endAngle);
    const y2 = originY - dangerRadius * Math.cos(endAngle);
    return `M ${originX} ${originY} L ${x1} ${y1} A ${dangerRadius} ${dangerRadius} 0 0 1 ${x2} ${y2} Z`;
  }, [originX, originY, maxRadiusPx, criticalThresholdM, maxRangeM]);

  // Rolling History Sparkline Path
  const sparklineD = useMemo(() => {
    if (history.length < 2) return '';
    const width = 280;
    const height = 45;
    const stepX = width / (history.length - 1);

    return history.reduce((acc, pt, idx) => {
      const x = idx * stepX;
      // Invert Y so closer distance is lower / more alarming
      const y = height - Math.max(0, Math.min(height, (pt.distanceM / 4.0) * height));
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [history]);

  return (
    <div className="h-full flex flex-col bg-[#FAF7F2] text-[#162347] overflow-y-auto select-none p-3.5 space-y-3.5 min-h-0 font-sans">
      {/* ─── Top Control Strip ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E6DFD5]">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-xs transition-colors ${
            status === 'DANGER'
              ? 'bg-rose-600 text-white animate-pulse'
              : status === 'CAUTION'
              ? 'bg-amber-500 text-white'
              : 'bg-[#162347] text-cyan-300'
          }`}>
            <Radar size={16} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-[#162347] leading-none flex items-center gap-2">
              <span>Front Obstacle &amp; Proximity Sensor</span>
              {isHardwareConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    const input = window.prompt(
                      `Enter ESP32 IP address or URL:\n(e.g., 10.133.81.149 or http://10.133.81.149)`,
                      getEsp32BaseUrl()
                    );
                    if (input && input.trim()) {
                      setEsp32BaseUrl(input.trim());
                    }
                  }}
                  className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-emerald-200 transition-colors"
                  title="Click to change ESP32 IP address"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE HARDWARE ({getEsp32BaseUrl().replace('http://', '')})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const input = window.prompt(
                      `Enter ESP32 IP address or URL:\n(e.g., 10.133.81.149 or http://10.133.81.149)`,
                      getEsp32BaseUrl()
                    );
                    if (input && input.trim()) {
                      setEsp32BaseUrl(input.trim());
                    }
                  }}
                  className="text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-amber-200 transition-colors"
                  title="Click to configure ESP32 IP address"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  CONNECTING ({getEsp32BaseUrl().replace('http://', '')}) - Set IP
                </button>
              )}
            </h3>
            <p className="text-[10px] font-mono text-[#162347]/60 mt-0.5">
              {sensorModel} • 60° Forward Sonar Cone
            </p>
          </div>
        </div>

        {/* Proximity Buzzer & Auto-Brake Toggles */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <button
            onClick={() => setBuzzerEnabled(!buzzerEnabled)}
            className={`px-2 py-1 rounded flex items-center gap-1 font-bold border transition-all cursor-pointer shadow-2xs ${
              buzzerEnabled
                ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400'
                : 'bg-white text-slate-600 border-[#E6DFD5] hover:bg-slate-50'
            }`}
            title="Toggle proximity audio alert beeper"
          >
            {buzzerEnabled ? <Volume2 size={12} className="text-amber-700" /> : <VolumeX size={12} />}
            <span>Buzzer: {buzzerEnabled ? 'ON' : 'MUTE'}</span>
          </button>

          <button
            onClick={() => setAutoBrakeArmed(!autoBrakeArmed)}
            className={`px-2 py-1 rounded flex items-center gap-1 font-bold border transition-all cursor-pointer shadow-2xs ${
              autoBrakeArmed
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-slate-100 text-slate-500 border-slate-300'
            }`}
            title="Toggle emergency collision avoidance auto-brake"
          >
            <ShieldCheck size={12} className={autoBrakeArmed ? "text-emerald-700" : "text-slate-400"} />
            <span>Auto-Brake: {autoBrakeArmed ? 'ARMED' : 'DISARMED'}</span>
          </button>
        </div>
      </div>

      {/* ─── Hero Obstacle Alert Banner ────────────────────────────────────────── */}
      <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-xs transition-all ${
        status === 'DANGER'
          ? 'bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-500/20 animate-pulse'
          : status === 'CAUTION'
          ? 'bg-amber-50 border-amber-300 text-amber-950'
          : 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            status === 'DANGER'
              ? 'bg-rose-600 text-white shadow-md'
              : status === 'CAUTION'
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-600 text-white'
          }`}>
            {status === 'DANGER' ? (
              <ShieldAlert size={20} className="animate-bounce" />
            ) : status === 'CAUTION' ? (
              <AlertTriangle size={20} />
            ) : (
              <CheckCircle2 size={20} />
            )}
          </div>
          <div>
            <div className="text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2">
              <span>{status === 'DANGER' ? 'CRITICAL PROXIMITY HAZARD' : status === 'CAUTION' ? 'OBSTACLE DETECTED IN FRONT' : 'FORWARD SECTOR CLEAR'}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                status === 'DANGER'
                  ? 'bg-rose-600 text-white'
                  : status === 'CAUTION'
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-[11px] font-sans mt-0.5 opacity-85">
              {status === 'DANGER'
                ? `Obstacle at ${distanceCm.toFixed(1)} cm! Collision threshold (<${Math.round(criticalThresholdM * 100)} cm) breached. ${autoBrakeArmed ? 'Auto-halt thruster interlock active.' : 'Manual avoidance required immediately.'}`
                : status === 'CAUTION'
                ? `Object identified directly in front of vessel at ${distanceCm.toFixed(1)} cm (${distanceM.toFixed(2)} m). Vessel slowing down.`
                : `No obstructions detected within ${Math.round(warningThresholdM * 100)} cm safety zone. Clear water path ahead.`}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 font-mono">
          <div className="text-3xl font-black font-sans leading-none tracking-tight">
            {distanceCm > 0 && distanceCm <= 450 ? distanceCm.toFixed(1) : '> 400'} <span className="text-sm font-mono font-normal">cm</span>
          </div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">
            {distanceM.toFixed(2)} m
          </div>
        </div>
      </div>

      {/* ─── Main Two-Column View: Sonar Arc Radar & KPI Telemetry ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left: 2D Forward Sonar Radar Cone Visualization (7 cols) */}
        <div className="lg:col-span-7 bg-[#0A1128] rounded-xl p-3.5 border border-slate-800 text-white flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Forward Acoustic Sonar Scanning Cone (60° FOV)
            </span>
            <span className="text-slate-400">Range: {maxRangeM}m</span>
          </div>

          {/* SVG Sonar Radar Arc */}
          <div className="flex items-center justify-center my-2 relative">
            <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible">
              <defs>
                <radialGradient id="sonarGlow" cx="50%" cy="100%" r="100%">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
                  <stop offset="70%" stopColor="#0284C7" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                </radialGradient>

                <linearGradient id="dangerArcGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.1" />
                </linearGradient>

                <linearGradient id="warnArcGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Outer 60° Cone Boundary */}
              <path d={arcPath} fill="url(#sonarGlow)" stroke="#0284C7" strokeWidth="1.5" strokeOpacity="0.4" />

              {/* Warning Zone Layer */}
              <path d={warningArcPath} fill="url(#warnArcGrad)" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity="0.7" />

              {/* Danger Zone Layer */}
              <path d={dangerArcPath} fill="url(#dangerArcGrad)" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.8" />

              {/* Distance Concentric Circles */}
              {[100, 200, 300, 400].map((distCm) => {
                const distM = distCm / 100.0;
                const r = (distM / maxRangeM) * maxRadiusPx;
                const startAngle = (-30 * Math.PI) / 180;
                const endAngle = (30 * Math.PI) / 180;
                const x1 = originX + r * Math.sin(startAngle);
                const y1 = originY - r * Math.cos(startAngle);
                const x2 = originX + r * Math.sin(endAngle);
                const y2 = originY - r * Math.cos(endAngle);
                return (
                  <g key={distCm}>
                    <path
                      d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                      strokeOpacity="0.25"
                    />
                    <text x={originX + 8} y={originY - r + 3} fill="#64748B" fontSize="8" fontFamily="monospace">
                      {distCm} cm
                    </text>
                  </g>
                );
              })}

              {/* Center Line Vector (Robot Head Orientation) */}
              <line
                x1={originX}
                y1={originY}
                x2={originX}
                y2={originY - maxRadiusPx}
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity="0.4"
              />

              {/* Real-time Measured Obstacle Blip & Target Bar */}
              {isObstacleDetected && (
                <>
                  {/* Acoustic Beam Line from Vessel to Obstacle */}
                  <line
                    x1={originX}
                    y1={originY}
                    x2={originX}
                    y2={originY - obstacleRadiusPx}
                    stroke={status === 'DANGER' ? '#EF4444' : '#F59E0B'}
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                    className="animate-pulse"
                  />

                  {/* Pulsing Ripple Rings */}
                  <circle
                    cx={originX}
                    cy={originY - obstacleRadiusPx}
                    r="12"
                    fill="none"
                    stroke={status === 'DANGER' ? '#EF4444' : '#F59E0B'}
                    strokeWidth="1.5"
                    className="animate-ping opacity-60"
                  />

                  {/* Obstacle Target Node */}
                  <circle
                    cx={originX}
                    cy={originY - obstacleRadiusPx}
                    r="6.5"
                    fill={status === 'DANGER' ? '#EF4444' : '#F59E0B'}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer"
                  />

                  {/* Obstacle Distance Tag */}
                  <g transform={`translate(${originX + 10}, ${originY - obstacleRadiusPx - 4})`}>
                    <rect x="0" y="-10" width="88" height="20" rx="4" fill="#0F172A" stroke={status === 'DANGER' ? '#EF4444' : '#F59E0B'} strokeWidth="1" />
                    <text x="6" y="4" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      🚨 {distanceCm > 0 && distanceCm <= 450 ? distanceCm.toFixed(1) : '> 400'} cm
                    </text>
                  </g>
                </>
              )}

              {/* FloodScout-01 Vessel Icon at Apex */}
              <circle cx={originX} cy={originY} r="9" fill="#0891B2" stroke="#FFFFFF" strokeWidth="2" />
              <text x={originX} y={originY + 14} fill="#94A3B8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                FLOODSCOUT-01
              </text>
            </svg>
          </div>

          {/* Sonar Legend Footer */}
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 rounded-xs bg-rose-500 inline-block" /> Danger Zone (&lt;{Math.round(criticalThresholdM * 100)} cm)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 rounded-xs bg-amber-500 inline-block" /> Warning Zone ({Math.round(warningThresholdM * 100)} cm)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 rounded-xs bg-cyan-500 inline-block" /> Safe Clearance (&gt;{Math.round(warningThresholdM * 100)} cm)
            </span>
          </div>
        </div>

        {/* Right: Key Telemetry Metrics & Proximity Trend (5 cols) */}
        <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
          
          {/* Proximity Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white border border-[#E6DFD5] p-3 rounded-xl shadow-xs">
              <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block mb-0.5">
                Front Distance
              </span>
              <div className="font-sans font-black text-2xl text-[#162347] leading-none">
                {distanceCm > 0 && distanceCm <= 450 ? distanceCm.toFixed(1) : '> 400'} <span className="text-xs font-mono font-normal">cm</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                {distanceM.toFixed(2)} meters
              </span>
            </div>

            <div className="bg-white border border-[#E6DFD5] p-3 rounded-xl shadow-xs">
              <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block mb-0.5">
                Obstacle In Path
              </span>
              <div className={`font-mono font-black text-lg leading-none mt-1 flex items-center gap-1 ${
                isObstacleDetected ? 'text-rose-600' : 'text-emerald-700'
              }`}>
                {isObstacleDetected ? (
                  <>
                    <XCircle size={16} /> YES (DETECTED)
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> NO (CLEAR)
                  </>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                Within {Math.round(warningThresholdM * 100)} cm Cone
              </span>
            </div>

            <div className="bg-white border border-[#E6DFD5] p-3 rounded-xl shadow-xs">
              <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block mb-0.5">
                Ping Frequency
              </span>
              <div className="font-sans font-bold text-lg text-sky-800 leading-none">
                {pingRateHz} <span className="text-xs font-mono font-normal">Hz</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                ~50ms Sonar Interval
              </span>
            </div>

            <div className="bg-white border border-[#E6DFD5] p-3 rounded-xl shadow-xs">
              <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block mb-0.5">
                Collision Interlock
              </span>
              <div className={`font-mono font-bold text-xs leading-none mt-1 ${
                status === 'DANGER' && autoBrakeArmed ? 'text-rose-600 animate-pulse' : 'text-emerald-700'
              }`}>
                {status === 'DANGER' && autoBrakeArmed ? 'AUTO-HALT ENGAGED' : autoBrakeArmed ? 'ARMED & READY' : 'BYPASS'}
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                Threshold: &lt;{Math.round(criticalThresholdM * 100)} cm
              </span>
            </div>
          </div>

          {/* Real-time Distance History Sparkline Trend */}
          <div className="bg-white border border-[#E6DFD5] p-3 rounded-xl shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Activity size={12} className="text-cyan-600" />
                Live Distance History (Last 25 Pings)
              </span>
              <span className="text-slate-400">Real-time Trend</span>
            </div>

            <div className="bg-slate-900 rounded-lg p-2 flex items-center justify-center">
              <svg width="100%" height="45" viewBox="0 0 280 45" className="overflow-visible">
                {/* Critical line */}
                <line x1="0" y1={45 - (criticalThresholdM / 4.0) * 45} x2="280" y2={45 - (criticalThresholdM / 4.0) * 45} stroke="#EF4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                {/* Warning line */}
                <line x1="0" y1={45 - (warningThresholdM / 4.0) * 45} x2="280" y2={45 - (warningThresholdM / 4.0) * 45} stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

                {/* Distance trail line */}
                {sparklineD && (
                  <path
                    d={sparklineD}
                    fill="none"
                    stroke={status === 'DANGER' ? '#EF4444' : status === 'CAUTION' ? '#F59E0B' : '#06B6D4'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Real Hardware Calibration & Threshold Controls ───────────────────────────── */}
      <div className="bg-white border border-[#E6DFD5] rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E6DFD5] pb-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#162347]">
            <Sliders size={14} className="text-[#162347]" />
            <span>Hardware Calibration &amp; Collision Thresholds (cm)</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-slate-500">Source:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold">
              ESP32 HTTP Wi-Fi (/api/sensors)
            </span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          
          {/* Warning Threshold Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-amber-800">Caution / Warning Threshold:</span>
              <strong className="text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                {Math.round(warningThresholdM * 100)} cm ({warningThresholdM.toFixed(2)} m)
              </strong>
            </div>
            <input
              type="range"
              min="50"
              max="250"
              step="5"
              value={Math.round(warningThresholdM * 100)}
              onChange={(e) => setWarningThresholdM(parseInt(e.target.value) / 100)}
              className="w-full accent-amber-600 h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>50 cm (Close)</span>
              <span>250 cm (Far)</span>
            </div>
          </div>

          {/* Danger/Collision Threshold Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-rose-800">Emergency Collision / Brake Threshold:</span>
              <strong className="text-rose-900 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                {Math.round(criticalThresholdM * 100)} cm ({criticalThresholdM.toFixed(2)} m)
              </strong>
            </div>
            <input
              type="range"
              min="15"
              max="100"
              step="5"
              value={Math.round(criticalThresholdM * 100)}
              onChange={(e) => setCriticalThresholdM(parseInt(e.target.value) / 100)}
              className="w-full accent-rose-600 h-1.5 rounded cursor-pointer bg-[#E6DFD5]"
            />
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>15 cm (Critical Stop)</span>
              <span>100 cm (Early Brake)</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
