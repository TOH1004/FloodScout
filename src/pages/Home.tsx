import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Navigation,
  Eye,
  Radio,
  ChevronRight,
  Map,
  Camera,
  Waves,
  Menu,
  X,
} from 'lucide-react';

import FloodScoutLogo from '../components/common/FloodScoutLogo';
import ModelViewer3D from '../components/common/ModelViewer3D';


const USVIllustration = () => (
  <svg viewBox="0 0 340 200" className="w-full h-full" fill="none">
    {/* Water surface */}
    <path d="M0 140 Q40 130 80 138 Q120 146 160 138 Q200 130 240 138 Q280 146 320 138 L340 140 L340 200 L0 200 Z" fill="#0e3a5c" opacity="0.6" />
    <path d="M0 150 Q30 143 60 148 Q90 153 120 148 Q150 143 180 148 Q210 153 240 148 Q270 143 300 148 L340 150 L340 200 L0 200 Z" fill="#0a2d4a" opacity="0.5" />

    {/* USV hull */}
    <rect x="80" y="115" width="180" height="30" rx="12" fill="#1e40af" />
    <rect x="100" y="108" width="140" height="22" rx="6" fill="#2563eb" />

    {/* Thruster pods */}
    <rect x="72" y="128" width="20" height="12" rx="6" fill="#1d4ed8" />
    <rect x="248" y="128" width="20" height="12" rx="6" fill="#1d4ed8" />
    <circle cx="82" cy="134" r="4" fill="#60a5fa" />
    <circle cx="258" cy="134" r="4" fill="#60a5fa" />

    {/* Mast */}
    <rect x="168" y="72" width="4" height="40" rx="2" fill="#93c5fd" />

    {/* Camera */}
    <rect x="158" y="65" width="24" height="16" rx="4" fill="#22d3ee" />
    <circle cx="170" cy="73" r="5" fill="#0e1722" />
    <circle cx="170" cy="73" r="2.5" fill="#22d3ee" opacity="0.5" />

    {/* Detection cone */}
    <path d="M170 73 L120 30 L220 30 Z" fill="#22d3ee" opacity="0.08" />
    <path d="M170 73 L130 35 L210 35" stroke="#22d3ee" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />

    {/* Detection box */}
    <rect x="148" y="18" width="44" height="34" rx="4" stroke="#A9501C" strokeWidth="2" fill="none" strokeDasharray="3 3" />
    <rect x="150" y="20" width="40" height="30" rx="3" fill="#A9501C" opacity="0.08" />
    <text x="170" y="40" textAnchor="middle" fill="#A9501C" fontSize="8" fontWeight="bold">PERSON</text>
    <text x="170" y="50" textAnchor="middle" fill="#A9501C" fontSize="7">94%</text>

    {/* Signal waves */}
    <path d="M290 80 Q295 75 300 80" stroke="#22d3ee" strokeWidth="1.5" fill="none" opacity="0.6" />
    <path d="M286 76 Q295 68 304 76" stroke="#22d3ee" strokeWidth="1.5" fill="none" opacity="0.4" />
    <path d="M282 72 Q295 61 308 72" stroke="#22d3ee" strokeWidth="1.5" fill="none" opacity="0.2" />
    <circle cx="295" cy="83" r="2" fill="#22d3ee" opacity="0.8" />

    {/* GPS dot */}
    <circle cx="170" cy="125" r="3" fill="#22d3ee" />
    <circle cx="170" cy="125" r="6" stroke="#22d3ee" strokeWidth="1" opacity="0.4" />

    {/* Solar panels on deck */}
    <rect x="115" y="112" width="35" height="8" rx="2" fill="#1e3a5f" />
    <rect x="190" y="112" width="35" height="8" rx="2" fill="#1e3a5f" />
    <line x1="125" y1="112" x2="125" y2="120" stroke="#2563eb" strokeWidth="0.5" />
    <line x1="135" y1="112" x2="135" y2="120" stroke="#2563eb" strokeWidth="0.5" />
    <line x1="200" y1="112" x2="200" y2="120" stroke="#2563eb" strokeWidth="0.5" />
    <line x1="210" y1="112" x2="210" y2="120" stroke="#2563eb" strokeWidth="0.5" />

    {/* Sonar ripple */}
    <circle cx="170" cy="138" r="12" stroke="#22d3ee" strokeWidth="0.8" opacity="0.3" fill="none" />
    <circle cx="170" cy="138" r="22" stroke="#22d3ee" strokeWidth="0.6" opacity="0.2" fill="none" />
    <circle cx="170" cy="138" r="32" stroke="#22d3ee" strokeWidth="0.5" opacity="0.1" fill="none" />
  </svg>
);



export default function Home() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroPreviewTab, setHeroPreviewTab] = useState<'3d' | 'recon'>('3d');

  useEffect(() => {
    const handleScroll = () => {
      if (mobileMenuOpen) setMobileMenuOpen(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen]);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3500);
      setEmail('');
    }
  };

  const steps = [
    { icon: <Navigation size={18} />, num: '1', label: 'Deploy', desc: 'Launch USV-01 from staging bank into flooded zone. Autonomous navigation begins immediately.' },
    { icon: <Waves size={18} />, num: '2', label: 'Navigate', desc: 'Sonar-guided path finding avoids submerged debris while mapping the flood boundary.' },
    { icon: <Camera size={18} />, num: '3', label: 'Scan', desc: 'XIAO ESP32-S3 streams live pan-tilt camera. AI model scans every frame for human presence.' },
    { icon: <Eye size={18} />, num: '4', label: 'Detect', desc: 'OpenCV + SVM classifier triggers alert with confidence score, GPS coords, and front-range distance.' },
    { icon: <Radio size={18} />, num: '5', label: 'Confirm', desc: 'Operator reviews live feed, confirms contact or marks false-alarm via the Robot Console.' },
    { icon: <Map size={18} />, num: '6', label: 'Localise', desc: 'GPS fix transmitted to Operations dashboard. Rescue team dispatched with exact coordinates.' },
  ];


  const navItems = [
    { label: 'Our Story', id: 'our-story' },
    { label: 'Mission', id: 'mission' },
    { label: 'Technology', id: 'technology' },
    { label: 'Hardware', id: 'hardware' },
    { label: 'Command Interface', id: 'command-interface' },
  ];

  return (
    <div className="w-full min-h-screen bg-[#F3ECDE] text-[#183451] font-sans selection:bg-[#A9501C]/30 selection:text-[#22d3ee]">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#183451] border-b border-[#1d3a5f]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <FloodScoutLogo />
            <span className="font-extrabold text-white tracking-widest text-lg">FLOODSCOUT</span>
          </Link>

          {/* Center nav — desktop */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="bg-[#A9501C] hover:bg-[#8a4016] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all shadow-lg shadow-[#A9501C]/30 active:scale-95"
            >
              Launch Dashboard →
            </Link>
            <button
              className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#183451] px-6 py-4 flex flex-col gap-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-left text-sm font-medium text-slate-400 hover:text-white py-2.5 border-b border-white/5 last:border-0 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section id="hero" className="max-w-7xl mx-auto px-6 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left: Headline */}
        <div className="space-y-8">


          <h1 className="text-5xl sm:text-6xl lg:text-[68px] font-extrabold leading-[1.0] tracking-tight">
            Find people<br />
            in floodwater<br />
            <span className="text-[#A9501C]">faster.</span>
          </h1>

          <p className="text-[#183451]/70 text-lg leading-relaxed max-w-md">
            FloodScout is an autonomous water-level rescue robot that streams live video, detects victims with AI, and transmits GPS coordinates to rescue teams — all from a vessel built from off-the-shelf parts.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/login"
              className="bg-[#A9501C] hover:bg-[#8a4016] text-white font-bold px-8 py-4 rounded-full transition-all text-sm shadow-xl shadow-[#A9501C]/30 active:scale-95 flex items-center gap-2"
            >
              Open Robot Console
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="bg-[#183451]/10 hover:bg-[#183451]/15 border border-[#183451]/30 text-[#183451] font-semibold px-8 py-4 rounded-full transition-all text-sm flex items-center gap-2"
            >
              Operations Dashboard
              <ArrowUpRight size={16} />
            </Link>
          </div>


        </div>

        {/* Right: USV preview with 3D Vessel View & AI Recon */}
        <div className="relative flex flex-col items-center">
          {/* Header bar with toggle */}
          <div className="flex items-center justify-between w-full max-w-lg mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee] animate-pulse shadow-[0_0_8px_#22d3ee]" />
              <span className="text-xs font-mono font-bold text-[#183451] tracking-wider uppercase">USV-01 · 3D TWIN</span>
            </div>
            <div className="flex items-center bg-[#183451]/10 p-1 rounded-full border border-[#183451]/20 text-[11px] font-mono">
              <button
                onClick={() => setHeroPreviewTab('3d')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer font-bold ${
                  heroPreviewTab === '3d'
                    ? 'bg-[#A9501C] text-white shadow'
                    : 'text-[#183451] hover:text-black'
                }`}
              >
                3D Model
              </button>
              <button
                onClick={() => setHeroPreviewTab('recon')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer font-bold ${
                  heroPreviewTab === 'recon'
                    ? 'bg-[#A9501C] text-white shadow'
                    : 'text-[#183451] hover:text-black'
                }`}
              >
                AI Vision
              </button>
            </div>
          </div>

          {/* Preview content */}
          {heroPreviewTab === '3d' ? (
            <div className="w-full max-w-lg h-[360px] sm:h-[400px]">
              <ModelViewer3D className="w-full h-full min-h-[360px]" autoRotateSpeed={1.5} showControls={true} />
            </div>
          ) : (
            <div className="relative w-full max-w-lg h-[360px] sm:h-[400px] rounded-3xl overflow-hidden bg-gradient-to-b from-[#0a1929] to-[#071220] border border-[#1b2b3c] shadow-2xl">
              <USVIllustration />
              <div className="absolute top-4 right-4 bg-[#A9501C] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg animate-pulse">
                PERSON DETECTED · 94%
              </div>
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-[10px] font-mono text-slate-300 px-3 py-2 rounded-lg border border-white/10">
                4.2988°N · 100.7642°E · 2.45 m
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className="flex items-center justify-between w-full max-w-lg mt-3 px-2 text-[11px] font-mono text-[#183451]/80">
            <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Robot online
            </span>
            <span className="text-[#183451] font-semibold">{heroPreviewTab === '3d' ? 'Interactive 3D GLTF' : 'OpenCV HOG+SVM · tracking'}</span>
            <span className="text-[#183451]/60">{heroPreviewTab === '3d' ? '60 FPS' : '5.9 FPS'}</span>
          </div>
        </div>
      </section>





      {/* ── OUR STORY ─────────────────────────────────────────────────────── */}
      <section id="our-story" className="border-t border-[#D4AF83]/40 py-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Top row: Story text + Cross-Section Flooded Street Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-16">
            {/* Left: Headline & story */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-0.5 bg-[#A9501C] inline-block" />
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#A9501C] font-bold">
                  OUR STORY
                </span>
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.08] text-[#183451]">
                Rescue starts at<br />
                <span className="text-[#22d3ee]">water level.</span>
              </h2>

              <div className="space-y-5 text-[#183451]/70 text-sm sm:text-base leading-relaxed pt-2">
                <p>
                  FloodScout was born from the monsoon flash floods across Southeast Asia. We saw drones fly over flooded neighbourhoods and miss the people sheltering beneath roofs, awnings and trees — while rescuers waded into fast currents to search by hand.
                </p>
                <p>
                  So we moved the camera down to where people actually are.
                </p>
              </div>

              {/* Action Links */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/our-story"
                  className="bg-[#A9501C] hover:bg-[#8a4016] text-white font-bold px-6 py-3 rounded-full transition-all text-sm flex items-center gap-2 shadow-lg shadow-[#A9501C]/25 hover:scale-[1.02] active:scale-95"
                >
                  The Story Behind It
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/technology"
                  className="bg-[#183451]/10 hover:bg-[#183451]/20 border border-[#183451]/30 text-[#183451] font-bold px-6 py-3 rounded-full transition-all text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  Discover our Technology
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>

            {/* Right: Cross-Section Flooded Street Card */}
            <div className="lg:col-span-6 bg-[#0b1622] border border-[#1b2b3c] rounded-2xl p-5 sm:p-6 shadow-2xl">
              {/* Card Header & Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5 text-[10px] font-mono tracking-wider">
                <span className="text-slate-400 uppercase font-semibold">CROSS-SECTION · FLOODED STREET</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                    <span className="w-3 h-0.5 bg-red-400 inline-block" />
                    Aerial view
                  </span>
                  <span className="flex items-center gap-1.5 text-[#22d3ee] font-semibold">
                    <span className="w-3 h-0.5 bg-[#A9501C] inline-block" />
                    Water-level view
                  </span>
                </div>
              </div>

              {/* Graphic Diagram */}
              <div className="my-4 overflow-hidden rounded-xl bg-[#07111c] border border-white/5">
                <svg viewBox="0 0 640 330" className="w-full h-auto block" fill="none">
                  {/* Sky background */}
                  <rect width="640" height="330" fill="#07111c" />

                  {/* Tree on left */}
                  <rect x="88" y="160" width="16" height="75" fill="#1b2a38" rx="2" />
                  <circle cx="96" cy="140" r="48" fill="#0f291e" />
                  <circle cx="96" cy="140" r="40" fill="#16382b" />
                  <circle cx="90" cy="132" r="26" fill="#1e4d3a" />

                  {/* House wall & structure */}
                  <rect x="290" y="110" width="250" height="125" fill="#152230" stroke="#1e3247" strokeWidth="1.5" />
                  {/* Window */}
                  <rect x="360" y="135" width="46" height="50" rx="3" fill="#0e1823" stroke="#263d55" strokeWidth="1.5" />
                  <line x1="383" y1="135" x2="383" y2="185" stroke="#263d55" strokeWidth="1" />
                  <line x1="360" y1="160" x2="406" y2="160" stroke="#263d55" strokeWidth="1" />

                  {/* Pitched Roof */}
                  <polygon points="270,110 415,38 560,110" fill="#1d2e3f" stroke="#2a425a" strokeWidth="2" />

                  {/* Porch overhang extending over the water */}
                  <polygon points="180,140 290,110 290,125 180,148" fill="#192837" stroke="#263d55" strokeWidth="1" />
                  <rect x="186" y="148" width="6" height="87" fill="#1f3347" />

                  {/* Person Sheltering under the porch */}
                  <rect x="215" y="152" width="38" height="66" rx="4" fill="#facc15" fillOpacity="0.08" stroke="#facc15" strokeWidth="1.5" />
                  {/* Label above person */}
                  <rect x="198" y="132" width="72" height="15" rx="3" fill="#162533" stroke="#eab308" strokeWidth="0.8" />
                  <text x="234" y="143" fill="#facc15" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">Person sheltering</text>
                  {/* Person silhouette */}
                  <circle cx="234" cy="164" r="5" fill="#facc15" />
                  <path d="M226 182 C226 172 242 172 242 182 L242 208 L226 208 Z" fill="#facc15" />

                  {/* Drone up in sky */}
                  <g transform="translate(420, 28)">
                    <rect x="-14" y="8" width="28" height="8" rx="2" fill="#94a3b8" />
                    <line x1="-30" y1="12" x2="30" y2="12" stroke="#64748b" strokeWidth="2" />
                    <circle cx="0" cy="12" r="3" fill="#38bdf8" />
                    <ellipse cx="-30" cy="8" rx="10" ry="2" fill="#cbd5e1" opacity="0.7" />
                    <ellipse cx="30" cy="8" rx="10" ry="2" fill="#cbd5e1" opacity="0.7" />
                    <text x="38" y="15" fill="#f87171" fontSize="9" fontFamily="monospace" fontWeight="bold">Drone: view blocked</text>
                  </g>

                  {/* Drone aerial cone (blocked by roof) */}
                  <polygon points="420,44 330,110 510,110" fill="#ef4444" fillOpacity="0.06" />
                  <line x1="420" y1="44" x2="330" y2="110" stroke="#f87171" strokeWidth="1.2" strokeDasharray="3 3" />
                  <line x1="420" y1="44" x2="510" y2="110" stroke="#f87171" strokeWidth="1.2" strokeDasharray="3 3" />
                  <line x1="330" y1="110" x2="245" y2="170" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.4" />
                  <text x="355" y="128" fill="#ef4444" fontSize="16" fontWeight="bold" fontFamily="sans-serif">✕</text>

                  {/* Floodwater Body */}
                  <path d="M0 235 Q160 231 320 235 T640 235 L640 330 L0 330 Z" fill="#082032" fillOpacity="0.9" />
                  <path d="M0 235 Q160 231 320 235 T640 235" stroke="#0ea5e9" strokeWidth="2" fill="none" opacity="0.6" />
                  <path d="M0 240 Q140 237 280 240 T640 240" stroke="#22d3ee" strokeWidth="1" fill="none" opacity="0.3" strokeDasharray="6 4" />

                  {/* FloodScout Camera at water level */}
                  <g transform="translate(65, 233)">
                    <rect x="-24" y="-4" width="48" height="12" rx="4" fill="#0c4a6e" stroke="#0284c7" strokeWidth="1" />
                    <circle cx="0" cy="0" r="7" fill="#06121e" stroke="#22d3ee" strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="3" fill="#22d3ee" />

                    <text x="0" y="32" fill="#22d3ee" fontSize="11" fontFamily="monospace" fontWeight="bold">FloodScout camera</text>
                    <text x="0" y="47" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">sees under eaves, porches &amp; canopy</text>
                  </g>

                  {/* Camera sightline shooting under porch directly to person */}
                  <polygon points="72,233 215,158 215,208" fill="#22d3ee" fillOpacity="0.08" />
                  <line x1="72" y1="233" x2="215" y2="183" stroke="#22d3ee" strokeWidth="2" />
                  <line x1="72" y1="233" x2="215" y2="158" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
                  <line x1="72" y1="233" x2="215" y2="208" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
                </svg>
              </div>

              {/* Caption */}
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mt-4">
                Drones see rooftops. People shelter under them. A camera at water level sees what aerial search misses.
              </p>
            </div>
          </div>

          {/* 3-Column: Problem · Approach · Result */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 mb-12">
            {/* 01 */}
            <div className="border-t-2 border-red-500/80 pt-6">
              <span className="text-[11px] font-mono font-bold tracking-wider text-red-400 block mb-2">01 · THE PROBLEM</span>
              <h3 className="text-xl font-bold text-[#183451] mb-3">Search is slow and dangerous</h3>
              <p className="text-[#183451]/70 text-sm leading-relaxed">
                Aerial drones are blinded by corrugated roofs and tree cover. Responders on foot face swift currents and submerged hazards.
              </p>
            </div>

            {/* 02 */}
            <div className="border-t-2 border-[#22d3ee] pt-6">
              <span className="text-[11px] font-mono font-bold tracking-wider text-[#22d3ee] block mb-2">02 · OUR APPROACH</span>
              <h3 className="text-xl font-bold text-[#183451] mb-3">Look from the water, not the sky</h3>
              <p className="text-[#183451]/70 text-sm leading-relaxed">
                A compact hull travels down inundated streets, scanning porches and peering under eaves where people take refuge.
              </p>
            </div>

            {/* 03 */}
            <div className="border-t-2 border-orange-500/80 pt-6">
              <span className="text-[11px] font-mono font-bold tracking-wider text-[#A9501C] block mb-2">03 · THE RESULT</span>
              <h3 className="text-xl font-bold text-[#183451] mb-3">Crews go straight to people</h3>
              <p className="text-[#183451]/70 text-sm leading-relaxed">
                On-board AI flags human silhouettes, logs GPS coordinates and alerts the nearest rescue boat automatically.
              </p>
            </div>
          </div>

          {/* Metrics bar */}
          <div className="bg-[#0b1622] border border-[#1b2b3c] rounded-2xl p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="md:border-r md:border-white/10 md:pr-6">
              <div className="text-white font-extrabold font-mono text-3xl sm:text-4xl">&lt;120 <span className="text-lg font-normal text-slate-400">s</span></div>
              <div className="text-xs text-slate-400 font-mono mt-1">from case to water</div>
            </div>

            <div className="md:border-r md:border-white/10 md:pr-6">
              <div className="text-white font-extrabold font-mono text-3xl sm:text-4xl">15 <span className="text-lg font-normal text-slate-400">cm</span></div>
              <div className="text-xs text-slate-400 font-mono mt-1">hull draft for shallow streets</div>
            </div>

            <div className="md:border-r md:border-white/10 md:pr-6">
              <div className="text-white font-extrabold font-mono text-3xl sm:text-4xl">&lt;1 <span className="text-lg font-normal text-slate-400">s</span></div>
              <div className="text-xs text-slate-400 font-mono mt-1">detection to alert</div>
            </div>

            <div>
              <div className="text-[#A9501C] font-extrabold font-mono text-3xl sm:text-4xl">Remote</div>
              <div className="text-xs text-slate-400 font-mono mt-1">operated from the bank, crew stays dry</div>
            </div>
          </div>


        </div>
      </section>

      {/* ── MISSION FLOW ─────────────────────────────────────────────────── */}
      <section id="mission" className="border-t border-[#D4AF83]/40 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-5 h-0.5 bg-[#A9501C] inline-block" />
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#A9501C] font-bold">
                  MISSION FLOW
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#183451]">
                From launch to location<br />in six steps.
              </h2>
            </div>
            <Link to="/login" className="flex items-center gap-1.5 text-[#22d3ee] text-sm font-semibold hover:underline shrink-0">
              Open live console <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-[#22d3ee]/30 transition-all group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full border border-[#22d3ee]/40 flex items-center justify-center text-[#22d3ee] group-hover:bg-[#A9501C]/10 transition-colors">
                    {step.icon}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">{step.num} / 6</span>
                </div>
                <h3 className="text-xl font-bold text-[#183451] mb-2">{step.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESCUE TECHNOLOGY ────────────────────────────────────────────── */}
      <section id="technology" className="border-t border-[#D4AF83]/40 py-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-0.5 bg-[#A9501C] inline-block" />
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#A9501C] font-bold">
                RESCUE TECHNOLOGY
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.08] text-[#183451]">
                Four systems.<br />
                One search loop.
              </h2>
              <p className="text-[#183451]/70 text-sm sm:text-base leading-relaxed max-w-lg lg:mb-1">
                Live video streams over Wi-Fi to the operator laptop for YOLO-assisted person detection, while dual NodeMCU ESP32 controllers coordinate camera pan/tilt, ultrasonic sensing, GPS, and differential BLDC thrust.
              </p>
            </div>
          </div>

          {/* System Architecture Diagram Card */}
          <div className="bg-[#0a131e] border border-[#1b2b3c] rounded-2xl p-6 sm:p-8 mb-12 shadow-2xl">
            {/* Diagram Header */}
            <div className="flex items-center justify-between pb-6 border-b border-white/5 text-[11px] font-mono">
              <span className="text-slate-400 uppercase tracking-widest font-semibold">SYSTEM ARCHITECTURE</span>
              <span className="text-slate-500">PWM 50 Hz · UART 115200 baud</span>
            </div>

            {/* Architecture Node Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-6 sm:py-8">
              {/* Left Column: SENSE cards */}
              <div className="lg:col-span-3 space-y-3.5">
                <div className="bg-[#0e1b29] border border-white/10 rounded-xl p-4 relative group hover:border-[#22d3ee]/40 transition-colors">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mb-1">SENSE · VISION</span>
                  <h4 className="text-sm font-bold text-white">Camera</h4>
                  <p className="text-xs text-slate-200 font-mono mt-0.5">Seeed Studio XIAO ESP32-S3 Sense</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Live RGB video streamed over Wi-Fi</p>
                </div>

                <div className="bg-[#0e1b29] border border-white/10 rounded-xl p-4 relative group hover:border-[#22d3ee]/40 transition-colors">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mb-1">SENSE · RANGE</span>
                  <h4 className="text-sm font-bold text-white">HC-SR04 Ultrasonic Sensor</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Front-facing short-range distance measurement</p>
                </div>

                <div className="bg-[#0e1b29] border border-white/10 rounded-xl p-4 relative group hover:border-[#22d3ee]/40 transition-colors">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block mb-1">SENSE · POSITION</span>
                  <h4 className="text-sm font-bold text-white">GY-NEO8M GPS</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Provides the robot’s outdoor coordinates</p>
                </div>
              </div>

              {/* Center Column: VISION / AI Core Node */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full bg-[#0c2231] border-2 border-[#22d3ee] rounded-2xl p-6 shadow-2xl shadow-cyan-950/60 relative">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#22d3ee] block mb-1">
                    VISION / AI
                  </span>
                  <h3 className="text-xl font-bold text-white">Laptop-Based Person Detection</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Live camera stream processed using a lightweight YOLO-family model
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="bg-[#A9501C] text-[#060d14] font-bold text-[10px] font-mono px-2.5 py-0.5 rounded">
                      Wi-Fi Stream
                    </span>
                    <span className="border border-[#22d3ee] text-[#22d3ee] font-semibold text-[10px] font-mono px-2.5 py-0.5 rounded">
                      YOLO Detection
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: CONTROL & MOVE nodes */}
              <div className="lg:col-span-4 space-y-3.5">
                {/* CONTROL · CAMERA */}
                <div className="bg-[#0b1c2b] border border-[#22d3ee]/40 rounded-xl p-4 relative group hover:border-[#22d3ee] transition-colors">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#22d3ee] block mb-1 font-semibold">CONTROL · CAMERA</span>
                  <h4 className="text-sm font-bold text-white">NodeMCU ESP32 #2</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Web-controlled pan/tilt camera and sensor interface
                  </p>
                </div>

                {/* CONTROL · PROPULSION */}
                <div className="bg-[#0b1c2b] border border-[#22d3ee]/40 rounded-xl p-4 relative group hover:border-[#22d3ee] transition-colors">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#22d3ee] block mb-1 font-semibold">CONTROL · PROPULSION</span>
                  <h4 className="text-sm font-bold text-white">NodeMCU ESP32 #1</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Processes RC steering and throttle commands
                  </p>
                </div>

                {/* MOVE */}
                <div className="bg-[#171419] border border-orange-500/40 rounded-xl p-4 relative group hover:border-orange-500 transition-colors">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-orange-400 block mb-1 font-semibold">MOVE</span>
                  <h4 className="text-sm font-bold text-white">Twin BLDC Thrusters</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Two bidirectional 30 A ESCs enable differential steering
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Core Subsystem Cards in 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: AI-Assisted Victim Detection */}
            <div className="bg-[#0b1622] border border-white/10 rounded-2xl p-6 shadow-xl hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#22d3ee]">
                  <Eye size={18} />
                </div>
                <h3 className="text-lg font-bold text-white">AI-Assisted Victim Detection</h3>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                The XIAO ESP32-S3 Sense streams live video from FloodScout to the operator laptop over Wi-Fi. A lightweight YOLO-family object-detection model running on the laptop identifies visible human presence and highlights potential victims for operator review.
              </p>
              <div className="space-y-2.5 text-xs font-mono border-t border-white/5 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Camera</span>
                  <span className="text-slate-200 font-semibold">Seeed Studio XIAO ESP32-S3 Sense</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">AI Processing</span>
                  <span className="text-slate-200 font-semibold">Operator laptop</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Detection</span>
                  <span className="text-slate-200 font-semibold">Visible person detection</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Output</span>
                  <span className="text-[#A9501C] font-bold">Bounding box + confidence score</span>
                </div>
              </div>
            </div>

            {/* Card 2: Front-Facing Distance Sensing */}
            <div className="bg-[#0b1622] border border-white/10 rounded-2xl p-6 shadow-xl hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#22d3ee]">
                  <Waves size={18} />
                </div>
                <h3 className="text-lg font-bold text-white">Front-Facing Distance Sensing</h3>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                A HC-SR04 ultrasonic sensor mounted at the front of FloodScout provides approximate short-range distance information to objects or targets in the inspection direction. The measurement supports close-range navigation and operator awareness.
              </p>
              <div className="space-y-2.5 text-xs font-mono border-t border-white/5 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Sensor</span>
                  <span className="text-slate-200 font-semibold">HC-SR04</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Function</span>
                  <span className="text-slate-200 font-semibold">Front-facing distance measurement</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Controller</span>
                  <span className="text-slate-200 font-semibold">NodeMCU ESP32 #2</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Output</span>
                  <span className="text-[#A9501C] font-bold">Live distance reading</span>
                </div>
              </div>
            </div>

            {/* Card 3: GPS Position Information */}
            <div className="bg-[#0b1622] border border-white/10 rounded-2xl p-6 shadow-xl hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#22d3ee]">
                  <Navigation size={18} />
                </div>
                <h3 className="text-lg font-bold text-white">GPS Position Information</h3>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                A GY-NEO8M GPS module provides FloodScout’s outdoor coordinates. The position is used as supporting location information when the operator identifies a possible victim location.
              </p>
              <div className="space-y-2.5 text-xs font-mono border-t border-white/5 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Module</span>
                  <span className="text-slate-200 font-semibold">GY-NEO8M</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Interface</span>
                  <span className="text-slate-200 font-semibold">UART</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Controller</span>
                  <span className="text-slate-200 font-semibold">NodeMCU ESP32 #2</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Purpose</span>
                  <span className="text-[#22d3ee] font-semibold text-right max-w-[210px]">Robot position / search reference</span>
                </div>
              </div>
            </div>

            {/* Card 4: Differential BLDC Propulsion */}
            <div className="bg-[#0b1622] border border-white/10 rounded-2xl p-6 shadow-xl hover:border-orange-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#A9501C]">
                  <Waves size={18} />
                </div>
                <h3 className="text-lg font-bold text-white">Differential BLDC Propulsion</h3>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                FloodScout uses two ducted BLDC underwater thrusters, each driven by an independent bidirectional ESC. NodeMCU ESP32 #1 converts steering and throttle commands from the HotRC receiver into independent left and right motor commands.
              </p>
              <div className="space-y-2.5 text-xs font-mono border-t border-white/5 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Motors</span>
                  <span className="text-slate-200 font-semibold">Twin ducted BLDC thrusters</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">ESCs</span>
                  <span className="text-slate-200 font-semibold">2 × bidirectional 30 A</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Control</span>
                  <span className="text-slate-200 font-semibold">HotRC CT-6A + F-06A receiver</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Steering</span>
                  <span className="text-[#A9501C] font-bold">Differential thrust</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BUILT FROM PARTS ─────────────────────────────────────────────── */}
      <section id="hardware" className="border-t border-[#D4AF83]/40 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: 3D interactive model stage */}
            <div className="w-full">
              <ModelViewer3D className="w-full h-[460px] min-h-[460px]" autoRotateSpeed={1.0} showControls={true} />
            </div>

            {/* Right: parts list */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-5 h-0.5 bg-[#A9501C] inline-block" />
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#A9501C] font-bold">
                  OPEN HARDWARE
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
                Built from parts any<br />team can source.
              </h2>
              <p className="text-[#183451]/70 text-base leading-relaxed mb-8">
                Every major component is commercially available, and the final prototype remains within the RM700 hardware budget. The control system is split across dedicated modules for propulsion, sensing, camera positioning and vision processing. The control and AI software runs locally on the operator system and onboard microcontrollers.
              </p>

              <div>
                <Link
                  to="/technology"
                  className="inline-flex items-center gap-2 bg-[#A9501C] hover:bg-[#8a4016] text-white font-bold px-7 py-3.5 rounded-full text-sm transition-all shadow-lg shadow-[#A9501C]/30 active:scale-95 hover:scale-[1.02]"
                >
                  Discover Hardware
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DUAL DASHBOARD PREVIEW ───────────────────────────────────────── */}
      <section id="command-interface" className="border-t border-[#D4AF83]/40 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-5 h-0.5 bg-[#A9501C] inline-block" />
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#A9501C] font-bold">
                COMMAND INTERFACE
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#183451]">
              One view for the pilot.<br />
              <span className="text-slate-400">One for the commander.</span>
            </h2>
            <p className="text-slate-500 text-base mt-4 max-w-xl mx-auto leading-relaxed">
              Everything is full-screen and mission-focused. No data entry, no menus — just actionable situational awareness.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Robot Console card */}
            <div className="bg-[#0e1722] border border-[#1b2b3c] rounded-2xl overflow-hidden group hover:border-[#22d3ee]/40 transition-all">
              {/* Mock header */}
              <div className="bg-[#090f17] border-b border-white/5 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A9501C]" />
                  </div>
                  <span className="text-slate-400 font-mono text-[11px] ml-2">Robot console · dashboard</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-mono">● LIVE</span>
              </div>

              {/* Mock dashboard preview */}
              <div className="p-4 space-y-3">
                {/* Top row: camera + target */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-[#192738] rounded-xl p-3 aspect-video flex flex-col justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[9px] font-mono text-slate-400">LIVE FEED</span>
                    </div>
                    <div className="flex items-center justify-center flex-1 py-2">
                      <div className="border-2 border-dashed border-[#A9501C]/60 rounded-lg w-16 h-10 flex items-center justify-center">
                        <span className="text-[#A9501C] text-[8px] font-mono">PERSON 94%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                      <span>XIAO</span><span>·</span><span>5.9 FPS</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-[#192738] rounded-xl p-3 aspect-video flex flex-col justify-between">
                    <div className="text-[9px] font-mono text-slate-400">VICTIM #1 CONFIRMED</div>
                    <div className="text-[#22d3ee] font-extrabold text-2xl font-mono">2.45<span className="text-xs text-slate-500 ml-1">m</span></div>
                    <div className="grid grid-cols-2 gap-1">
                      <button className="bg-[#A9501C] text-white text-[7px] font-bold py-1 rounded">Confirmed ✓</button>
                      <button className="bg-white/10 text-slate-300 text-[7px] font-bold py-1 rounded">False alarm</button>
                    </div>
                  </div>
                </div>

                {/* Bottom row: arm + map + log */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-[#192738] rounded-xl p-3 space-y-1.5">
                    <div className="text-[9px] font-mono text-slate-400">CAMERA ARM</div>
                    <div className="w-12 h-12 bg-[#0a1929] border border-[#1b2b3c] rounded-lg mx-auto flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#A9501C] shadow-[0_0_6px_#22d3ee]" />
                    </div>
                    <div className="text-[8px] font-mono text-slate-500 text-center">Pan 90° · Tilt 55°</div>
                  </div>
                  <div className="bg-slate-950 border border-[#192738] rounded-xl p-3 overflow-hidden">
                    <div className="text-[9px] font-mono text-slate-400 mb-1">TACTICAL MAP</div>
                    <div className="bg-[#0a1929] rounded-lg w-full h-16 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'linear-gradient(#1e40af22 1px, transparent 1px), linear-gradient(90deg, #1e40af22 1px, transparent 1px)', backgroundSize: '8px 8px'}} />
                      <div className="w-3 h-3 bg-[#A9501C] rotate-45 shadow-[0_0_8px_#22d3ee]" />
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-[#192738] rounded-xl p-3 space-y-1">
                    <div className="text-[9px] font-mono text-slate-400">LOG</div>
                    {['Confirmed', 'Detected', 'Scan started'].map((l, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[7px] font-mono text-slate-500">
                        <span className={`w-1 h-1 rounded-full shrink-0 ${i === 0 ? 'bg-emerald-400' : i === 1 ? 'bg-orange-400' : 'bg-slate-500'}`} />
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-slate-500 text-xs">Robot console — pilot view</span>
                <Link to="/login" className="text-[#22d3ee] text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  Open Console <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* Operations Dashboard card */}
            <div className="bg-[#0e1722] border border-[#1b2b3c] rounded-2xl overflow-hidden group hover:border-[#A9501C]/40 transition-all">
              {/* Mock header */}
              <div className="bg-[#090f17] border-b border-white/5 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A9501C]" />
                  </div>
                  <span className="text-slate-400 font-mono text-[11px] ml-2">Operations · FLOODSCOUT COMMAND</span>
                </div>
                <span className="text-amber-400 text-[10px] font-mono">⚠ ACTIVE OPS</span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-px bg-white/5 border-b border-white/5">
                {[
                  { l: 'MISSING', v: '23', c: 'text-white' },
                  { l: 'RESCUED', v: '14', c: 'text-emerald-400' },
                  { l: 'STILL MISSING', v: '9', c: 'text-rose-400' },
                  { l: 'TEAMS', v: '6', c: 'text-cyan-400' },
                ].map(s => (
                  <div key={s.l} className="bg-[#090f17] px-4 py-3 text-center">
                    <div className={`font-extrabold text-lg font-mono ${s.c}`}>{s.v}</div>
                    <div className="text-slate-600 text-[8px] font-mono uppercase tracking-wider mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Mock map */}
              <div className="p-4">
                <div className="bg-slate-950 border border-[#192738] rounded-xl overflow-hidden h-44 relative">
                  <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(#22d3ee15 1px, transparent 1px), linear-gradient(90deg, #22d3ee15 1px, transparent 1px)', backgroundSize: '14px 14px'}} />
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 176" preserveAspectRatio="none">
                    <polygon points="60,40 120,30 140,90 80,100" fill="#A9501C20" stroke="#A9501C" strokeWidth="1.5" />
                    <polygon points="150,50 210,45 220,105 155,110" fill="#f59e0b15" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
                    <polygon points="80,110 140,105 150,145 90,150" fill="#22d3ee10" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 2" />
                    <polygon points="100,68 108,88 100,82 92,88" fill="#22d3ee" />
                    <circle cx="100" cy="68" r="12" stroke="#22d3ee" strokeWidth="0.8" fill="none" opacity="0.4" />
                    <circle cx="135" cy="62" r="5" fill="#A9501C" />
                    <circle cx="135" cy="62" r="9" stroke="#A9501C" strokeWidth="0.8" fill="none" opacity="0.5" />
                  </svg>
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[8px] font-mono space-y-0.5">
                    <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#A9501C] rotate-45 inline-block" />USV-01</div>
                    <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#A9501C] inline-block" />Detected person</div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/60 rounded-lg px-2 py-1 text-[8px] font-mono text-slate-400">[GOOGLE HYBRID]</div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-slate-500 text-xs">Operations dashboard — commander view</span>
                <Link to="/login" className="text-[#A9501C] text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  Open Dashboard <ArrowRight size={13} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FIELD TRIALS CTA BANNER ──────────────────────────────────────── */}
      <section id="contact" className="py-6 px-6 max-w-7xl mx-auto pb-16">
        <div className="bg-[#A9501C] rounded-3xl p-10 sm:p-14 relative overflow-hidden">
          {/* Background texture */}
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 60%)'}} />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <span className="text-[11px] font-mono uppercase tracking-widest text-orange-200/80">Field trials</span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
                Work with us on<br />field trials.
              </h2>
              <p className="text-orange-100/80 text-base leading-relaxed max-w-lg">
                We are looking for Civil Defence, Bomba, and engineering teams to run joint deployments. We bring the robot — you bring local knowledge. Together we make flood search faster.
              </p>
            </div>

            <div className="flex flex-col gap-4 shrink-0">
              <Link
                to="/contact"
                className="bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold px-8 py-4 rounded-full transition-all text-sm flex items-center gap-2 shadow-xl active:scale-95"
              >
                Get in touch
                <ArrowRight size={16} />
              </Link>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="bg-white/20 border border-white/30 text-white placeholder:text-white/60 text-xs rounded-full px-4 py-2.5 outline-none flex-1 min-w-0"
                />
                <button
                  type="submit"
                  className="bg-white text-[#A9501C] font-bold text-xs px-5 py-2.5 rounded-full hover:bg-orange-50 active:scale-95 transition-all whitespace-nowrap"
                >
                  {subscribed ? 'Sent ✓' : 'Stay updated'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <FloodScoutLogo />
            <span className="font-extrabold text-white tracking-widest">FLOODSCOUT</span>
          </Link>

          <div className="text-slate-600 text-xs font-mono text-center">
            © 2026 FloodScout Group · Ayer Tawar, Perak · All rights reserved
          </div>

          <div className="flex items-center gap-3">
            {[
              { to: '/login', label: 'Robot Console' },
              { to: '/login', label: 'Operations' },
              { to: '/contact', label: 'Contact' },
            ].map((l, i) => (
              <Link
                key={i}
                to={l.to}
                className="text-slate-600 hover:text-slate-300 text-xs transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
