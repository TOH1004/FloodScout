import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Shield } from 'lucide-react';

import FloodScoutLogo from '../components/common/FloodScoutLogo';


const DEMO_EMAIL = 'demo@floodscout.com';
const DEMO_PASSWORD = 'demo123';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      sessionStorage.setItem('fs_auth', 'true');
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Use the demo account to continue.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#060d14] flex items-center justify-center p-6 font-sans">
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#22d3ee]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#f97316]/5 rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#22d3ee]/20 to-transparent" />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-white/5 relative z-10">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#0e1f2e] via-[#0a1620] to-[#060d14] p-10 flex flex-col justify-between border-r border-white/5">
          <Link to="/" className="flex items-center gap-3 group">
            <FloodScoutLogo />
            <span className="font-bold text-white tracking-tight text-xl">FLOODSCOUT</span>
          </Link>

          <div className="space-y-6 py-10">
            <div className="inline-flex items-center gap-2 bg-[#22d3ee]/10 border border-[#22d3ee]/20 text-[#22d3ee] text-xs font-mono px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
              USV-01 · Operational · Ayer Tawar
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Autonomous<br />
              <span className="text-[#22d3ee]">Rescue Command</span><br />
              Center
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Access the FloodScout Robot Console and Operations Dashboard to monitor flood rescue missions in real-time.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { label: 'Victims Located', value: '7' },
                { label: 'AI Accuracy', value: '94%' },
                { label: 'Active Teams', value: '5 + 1' },
                { label: 'Response Time', value: '< 2 min' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="text-[#22d3ee] font-extrabold text-lg font-mono">{s.value}</div>
                  <div className="text-slate-500 text-[10px] uppercase tracking-wide mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-600 text-xs font-mono">
            <Shield size={12} className="text-slate-700" />
            © 2026 FloodScout · Ayer Tawar, Perak
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div className="bg-[#0a1220] p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">Sign in</h3>
            <p className="text-slate-400 text-sm">Access the rescue command center</p>
          </div>

          {/* Demo account banner */}
          <button
            id="demo-account-btn"
            onClick={handleDemoLogin}
            className="w-full mb-6 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/15 border border-[#22d3ee]/30 rounded-xl px-4 py-3.5 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#22d3ee] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
                  Demo Account
                </div>
                <div className="text-slate-400 text-xs mt-1 font-mono">
                  {DEMO_EMAIL} · {DEMO_PASSWORD}
                </div>
              </div>
              <div className="text-[#22d3ee] text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                Use this →
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-600 text-xs">or sign in manually</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="text-slate-400 text-xs font-medium mb-1.5 block">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-600 outline-none focus:border-[#22d3ee]/50 focus:bg-[#22d3ee]/5 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="text-slate-400 text-xs font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-10 pr-12 py-3 placeholder:text-slate-600 outline-none focus:border-[#22d3ee]/50 focus:bg-[#22d3ee]/5 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                <span className="text-rose-400 text-xs leading-relaxed">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-[#f97316] hover:bg-[#ea6c0c] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-orange-900/30 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                'Launch Dashboard →'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
              ← Back to landing page
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
