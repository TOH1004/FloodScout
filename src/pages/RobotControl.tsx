import { useState } from 'react';
import { 
  Cpu, 
  Activity, 
  Power, 
  Gauge
} from 'lucide-react';
import { useRescue } from '../context/RescueContext';

export default function RobotControl() {
  const { 
    thrusterPwm, 
    signalDbm, 
    emergencyStop 
  } = useRescue();

  const [leftThruster] = useState(thrusterPwm);
  const [rightThruster] = useState(thrusterPwm);
  const [searchPattern, setSearchPattern] = useState<'Lawnmower' | 'Expanding Spiral' | 'Waypoint Loop'>('Lawnmower');
  const [pitch] = useState(1.4);
  const [roll] = useState(-0.8);

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#070D1B] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#243452] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#00F0FF] text-xs font-mono mb-1">
            <Cpu size={14} />
            <span>HARDWARE &amp; SENSOR DIAGNOSTICS</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Robot Control &amp; Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-normal">
            Low-level actuator PWM, IMU stabilization, bathymetric sonar, and RF link metrics.
          </p>
        </div>

        <button
          onClick={emergencyStop}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs font-mono tracking-wide uppercase transition-all shadow-lg shadow-rose-600/30"
        >
          <Power size={15} />
          <span>Emergency Stop</span>
        </button>
      </div>

      {/* Main Grid: Thrusters, IMU, Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Dual Thruster PWM Controls (6 Cols) */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-6 border border-[#243452] space-y-6">
          <div className="flex items-center justify-between border-b border-[#243452] pb-3">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Gauge size={18} className="text-[#00F0FF]" />
              DUAL BRUSHLESS THRUSTER TELEMETRY
            </h3>
            <span className="text-xs font-mono text-emerald-400">PWM ACTIVE</span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            
            {/* Left Motor */}
            <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452] space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">PORT THRUSTER (M1)</span>
                <span className="text-[#00F0FF] font-bold">{leftThruster}%</span>
              </div>

              <div className="h-32 bg-[#131D31] rounded-lg relative overflow-hidden flex items-end justify-center p-2">
                <div 
                  className="w-full bg-gradient-to-t from-[#0284C7] to-[#00F0FF] rounded transition-all"
                  style={{ height: `${leftThruster}%` }}
                ></div>
              </div>

              <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                <span>RPM: {Math.round(leftThruster * 28)}</span>
                <span>CURR: {(leftThruster * 0.12).toFixed(1)}A</span>
              </div>
            </div>

            {/* Right Motor */}
            <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452] space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">STARBOARD THRUSTER (M2)</span>
                <span className="text-[#00F0FF] font-bold">{rightThruster}%</span>
              </div>

              <div className="h-32 bg-[#131D31] rounded-lg relative overflow-hidden flex items-end justify-center p-2">
                <div 
                  className="w-full bg-gradient-to-t from-[#0284C7] to-[#00F0FF] rounded transition-all"
                  style={{ height: `${rightThruster}%` }}
                ></div>
              </div>

              <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                <span>RPM: {Math.round(rightThruster * 28)}</span>
                <span>CURR: {(rightThruster * 0.12).toFixed(1)}A</span>
              </div>
            </div>

          </div>

          {/* Search Pattern Generator */}
          <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452] space-y-3">
            <span className="text-xs font-mono font-bold text-slate-300 block">
              AUTONOMOUS SEARCH PATTERN GENERATOR
            </span>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              {(['Lawnmower', 'Expanding Spiral', 'Waypoint Loop'] as const).map((pat) => (
                <button
                  key={pat}
                  onClick={() => setSearchPattern(pat)}
                  className={`py-2 px-2 rounded-lg border text-center transition-all ${
                    searchPattern === pat
                      ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF] font-bold'
                      : 'bg-[#131D31] border-[#243452] text-slate-400 hover:text-white'
                  }`}
                >
                  {pat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: IMU Gyro, Sonar & Power Distribution (6 Cols) */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-6 border border-[#243452] space-y-6">
          <div className="flex items-center justify-between border-b border-[#243452] pb-3">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Activity size={18} className="text-[#00F0FF]" />
              6-DOF IMU INCLINOMETER &amp; SENSORS
            </h3>
            <span className="text-xs font-mono text-slate-400">PITCH / ROLL</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452]">
              <span className="text-slate-400 block text-[10px]">IMU PITCH (BOW/STERN)</span>
              <span className="font-bold text-lg text-emerald-400">{pitch}°</span>
              <div className="text-[10px] text-slate-500 mt-1">Normal Level Trim</div>
            </div>

            <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452]">
              <span className="text-slate-400 block text-[10px]">IMU ROLL (PORT/STBD)</span>
              <span className="font-bold text-lg text-emerald-400">{roll}°</span>
              <div className="text-[10px] text-slate-500 mt-1">Wave Stabilized</div>
            </div>

            <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452]">
              <span className="text-slate-400 block text-[10px]">INTERNAL HULL TEMP</span>
              <span className="font-bold text-lg text-white">28.4 °C</span>
              <div className="text-[10px] text-emerald-400 mt-1">Cooling Fan Active</div>
            </div>

            <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452]">
              <span className="text-slate-400 block text-[10px]">RF LINK RSSI</span>
              <span className="font-bold text-lg text-[#00F0FF]">{signalDbm} dBm</span>
              <div className="text-[10px] text-slate-400 mt-1">Packet Loss: 0.02%</div>
            </div>
          </div>

          {/* Battery Cell Health */}
          <div className="bg-[#0A0F1D] p-4 rounded-xl border border-[#243452] space-y-2 text-xs font-mono">
            <span className="text-slate-400 block text-[10px]">4S LIPO CELL VOLTAGES</span>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-[#131D31] p-2 rounded border border-[#243452]">
                <div className="text-[10px] text-slate-500">C1</div>
                <div className="text-emerald-400 font-bold">4.06V</div>
              </div>
              <div className="bg-[#131D31] p-2 rounded border border-[#243452]">
                <div className="text-[10px] text-slate-500">C2</div>
                <div className="text-emerald-400 font-bold">4.05V</div>
              </div>
              <div className="bg-[#131D31] p-2 rounded border border-[#243452]">
                <div className="text-[10px] text-slate-500">C3</div>
                <div className="text-emerald-400 font-bold">4.05V</div>
              </div>
              <div className="bg-[#131D31] p-2 rounded border border-[#243452]">
                <div className="text-[10px] text-slate-500">C4</div>
                <div className="text-emerald-400 font-bold">4.06V</div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
