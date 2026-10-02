import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Wifi,
  Battery,
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
    <rect x="148" y="18" width="44" height="34" rx="4" stroke="#f97316" strokeWidth="2" fill="none" strokeDasharray="3 3" />
    <rect x="150" y="20" width="40" height="30" rx="3" fill="#f97316" opacity="0.08" />
    <text x="170" y="40" textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="bold">PERSON</text>
    <text x="170" y="50" textAnchor="middle" fill="#f97316" fontSize="7">94%</text>

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

const techSpecs = [
  {
    category: 'EDGE COMPUTER VISION & SENSING',
    items: [
      { name: 'YOLOv8 Edge AI Person Detection', desc: 'Custom trained model detects half-submerged human bodies, life vests, and waving gestures', spec: '96.4% Accuracy' },
      { name: 'Dual Optical & FLIR Thermal Sensors', desc: 'High-definition 1080p 60fps RGB optical feed with zero-lux thermal night vision infrared', spec: '150m Range' },
      { name: 'Bathymetric Ultrasonic Sonar', desc: 'Real-time underwater depth mapping to prevent rescue boats from grounding on submerged obstacles', spec: '0.3m – 30.0m' },
    ]
  },
  {
    category: 'HULL & PROPULSION ENGINEERING',
    items: [
      { name: 'Dual Encapsulated Brushless Thrusters', desc: 'High-torque weedless ducted thrusters providing 4.5 knots forward thrust in turbulent floodwaters', spec: '8.3 km/h Max' },
      { name: 'Ultra-Shallow Draft Carbon Composite Hull', desc: 'IP68 fully sealed waterproof casing capable of navigating through 15cm shallow floodwaters', spec: '0.15m Draft' },
      { name: 'Hot-Swappable LiFePO4 Power System', desc: '4S high-density battery pack providing 4.2 hours of continuous autonomous search and rescue', spec: '4.2 Hours' },
    ]
  },
  {
    category: 'TELEMETRY & MESH COMMUNICATIONS',
    items: [
      { name: '5.8 GHz COFDM Encrypted Video Link', desc: 'Ultra-low latency (18ms) encrypted digital video stream directly to operator laptop dashboard', spec: '3.5 km LOS' },
      { name: 'LoRa 433 MHz Emergency Telemetry', desc: 'Long-range low-bandwidth backup telemetry for remote disaster zones with collapsed cellular networks', spec: '12 km Range' },
      { name: 'Multi-Constellation GNSS Geotagging', desc: 'GPS + GLONASS + Galileo RTK positioning with centimeter-level victim coordinate tagging', spec: '±0.5m Precision' },
    ]
  }
];

export default function Home() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const parts = [
    { label: 'Camera', value: 'XIAO ESP32-S3 Sense — 2MP OV2640, Wi-Fi, AI inference onboard' },
    { label: 'Controller', value: 'NodeMCU ESP32 — dual-core, BLE + Wi-Fi, GPIO bus for servo & ESC' },
    { label: 'Propulsion', value: 'Dual BLDC thrusters — bidirectional ESCs, ±20° yaw authority' },
    { label: 'Navigation', value: 'GY-NEO8M GPS — 10 Hz fix, 2.5 m CEP, NMEA serial to ESP32' },
    { label: 'Sonar', value: 'HC-SR04 ultrasonic — 2 cm–4 m, 10 Hz, front obstacle & proximity' },
    { label: 'Gimbal', value: '2× SG90 servo — 180° pan, 90° tilt, PWM via GPIO 18 / 19' },
    { label: 'Radio', value: 'HotRC CT-6A + F-06A — 2.4 GHz RC with 6-channel failsafe override' },
  ];

  const navItems = [
    { label: 'Our Story', id: 'our-story' },
    { label: 'Technology', id: 'technology' },
    { label: 'Mission', id: 'mission' },
    { label: 'Hardware', id: 'hardware' },
    { label: 'Contact', id: 'contact' },
  ];

  return (
    <div className="w-full min-h-screen bg-[#060d14] text-white font-sans selection:bg-[#22d3ee]/30 selection:text-[#22d3ee]">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#060d14]/95 backdrop-blur-md border-b border-white/5">
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
              className="bg-[#f97316] hover:bg-[#ea6c0c] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all shadow-lg shadow-orange-900/30 active:scale-95"
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
          <div className="md:hidden border-t border-white/5 bg-[#060d14]/98 px-6 py-4 flex flex-col gap-2">
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
          <div className="inline-flex items-center gap-2 bg-[#22d3ee]/10 border border-[#22d3ee]/30 text-[#22d3ee] text-xs font-mono px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
            FloodScout USV-01 · Ayer Tawar, Perak
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[68px] font-extrabold leading-[1.0] tracking-tight">
            Find people<br />
            in floodwater<br />
            <span className="text-[#f97316]">faster.</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            FloodScout is an autonomous water-level rescue robot that streams live video, detects victims with AI, and transmits GPS coordinates to rescue teams — all from a vessel built from off-the-shelf parts.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/login"
              className="bg-[#f97316] hover:bg-[#ea6c0c] text-white font-bold px-8 py-4 rounded-full transition-all text-sm shadow-xl shadow-orange-900/40 active:scale-95 flex items-center gap-2"
            >
              Open Robot Console
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-8 py-4 rounded-full transition-all text-sm flex items-center gap-2"
            >
              Operations Dashboard
              <ArrowUpRight size={16} />
            </Link>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { label: 'Detection accuracy', value: '94%' },
              { label: 'Range (HC-SR04)', value: '4 m' },
              { label: 'Video latency', value: '<120 ms' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
                <div className="text-[#22d3ee] font-extrabold text-lg font-mono">{s.value}</div>
                <div className="text-slate-500 text-[11px] uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: USV preview card */}
        <div className="relative">
          <div className="bg-[#0e1722] border border-[#1b2b3c] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_#f43f5e]" />
                <span className="text-xs font-bold text-slate-200 tracking-wide">LIVE RECONNAISSANCE · USV-01</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-emerald-400 flex items-center gap-1"><Wifi size={10}/> LINK</span>
                <span className="text-cyan-400 flex items-center gap-1"><Battery size={10}/> 82%</span>
                <span className="text-slate-400">GPS FIX</span>
              </div>
            </div>

            {/* USV illustration */}
            <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a1929] to-[#071220]">
              <USVIllustration />
              <div className="absolute top-3 right-3 bg-[#f97316] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg animate-pulse">
                PERSON DETECTED · 94%
              </div>
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-[10px] font-mono text-slate-300 px-2.5 py-1.5 rounded-lg border border-white/10">
                4.2988°N · 100.7642°E · 2.45 m
              </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between mt-4 text-[11px] font-mono">
              <span className="text-emerald-400">● Robot online</span>
              <span className="text-[#22d3ee]">OpenCV HOG+SVM · tracking</span>
              <span className="text-slate-500">5.9 FPS</span>
            </div>
          </div>

          {/* Decorative glow */}
          <div className="absolute -inset-4 bg-[#22d3ee]/5 rounded-[40px] blur-3xl -z-10" />
        </div>
      </section>

      {/* ── TICKER STATS BAR ─────────────────────────────────────────────── */}
      <div className="border-y border-white/5 bg-white/[0.02] py-5 overflow-hidden">
        <div className="flex items-center gap-16">
          <div className="flex items-center gap-16 whitespace-nowrap px-8">
            {[
              { label: 'SECTORS COVERED', value: '12' },
              { label: 'VICTIMS LOCATED', value: '7' },
              { label: 'MISSION TIME', value: '00:06:57' },
              { label: 'SONAR RANGE', value: '4.0 m' },
              { label: 'AI CONFIDENCE', value: '94%' },
              { label: 'RESCUE TEAMS', value: '5 + 1 USV' },
              { label: 'WATER DEPTH', value: '1.6 m rising' },
              { label: 'GPS FIX', value: '3D · 8 sats' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-slate-600 font-mono text-[10px] uppercase tracking-widest">{s.label}</span>
                <span className="text-white font-extrabold font-mono text-sm">{s.value}</span>
                {i < 7 && <span className="text-white/10 text-lg">·</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROBLEM STATEMENT ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 border border-white/10 px-3.5 py-1.5 rounded-full inline-block mb-8">
              Why it matters
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              When streets become rivers, every minute of{' '}
              <span className="text-[#22d3ee]">searching counts.</span>
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-slate-400 text-lg leading-relaxed">
              During the 2021 Batu Pahat flood, rescue teams spent hours wading through waist-deep water searching street by street. By the time victims were found, hypothermia had set in.
            </p>
            <p className="text-slate-400 text-base leading-relaxed">
              FloodScout deploys in 90 seconds. It navigates to GPS waypoints autonomously, streams AI-enhanced video to operators on dry land, and transmits exact victim coordinates — cutting search time from hours to minutes.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { icon: '⏱', stat: '< 2 min', label: 'From launch to first contact' },
                { icon: '📡', stat: '400 m', label: 'Max operational radius' },
                { icon: '🤖', stat: '94%', label: 'Victim detection accuracy' },
                { icon: '⚡', stat: '90 s', label: 'Deployment time' },
              ].map(c => (
                <div key={c.label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                  <div className="text-2xl mb-1">{c.icon}</div>
                  <div className="text-[#22d3ee] font-extrabold text-xl font-mono">{c.stat}</div>
                  <div className="text-slate-500 text-xs mt-0.5 leading-snug">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── OUR STORY ─────────────────────────────────────────────────────── */}
      <section id="our-story" className="border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 border border-white/10 px-3.5 py-1.5 rounded-full inline-block mb-5">
              Heritage &amp; Life-Saving Vision
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Our Story
            </h2>
            <p className="text-slate-500 text-xs mt-3 tracking-[0.3em] uppercase font-mono">
              Autonomous Robotics for Extreme Flood Disaster Response
            </p>
            <div className="w-16 h-px bg-white/10 mx-auto mt-4" />
          </div>

          {/* Narrative + images */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
            {/* Left: text */}
            <div className="space-y-5 text-slate-400 text-base leading-relaxed">
              <p>
                <span className="text-6xl font-extrabold text-white float-left mr-4 leading-[0.85]">B</span>
                orn from the devastating monsoon flash floods across Southeast Asia, FloodScout was created by a dedicated team of robotics engineers and disaster response pioneers. We witnessed firsthand how conventional aerial drones are blinded by corrugated roofs, awnings, and tree canopies, while human responders are put in grave danger by swift currents and submerged hazards.
              </p>
              <p className="clear-left">
                FloodScout redefines flood search-and-rescue by shifting the perspective directly to the water level. Operating at water level, our autonomous IP68 composite amphibious hull navigates inundated streets, scans submerged porches, and peers directly under eaves.
              </p>
              <p>
                Equipped with custom edge AI YOLOv8 computer vision, bathymetric sonar depth mapping, and mesh RF telemetry, FloodScout automatically flags trapped human silhouettes, logs GPS coordinates, and alerts frontline rescue boats in sub-second time.
              </p>
              <button
                onClick={() => scrollTo('technology')}
                className="inline-flex items-center gap-2 mt-2 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee] font-semibold px-6 py-3 rounded-full text-sm transition-all"
              >
                Discover Our Technology <ArrowRight size={14} />
              </button>
            </div>

            {/* Right: dual images */}
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=600&auto=format&fit=crop"
                  alt="Flood Rescue Operations"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 shadow-xl mt-8">
                <img
                  src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop"
                  alt="Engineering Team"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
          </div>

          {/* 6-step banner */}
          <div className="bg-[#0e1722] border border-[#1b2b3c] rounded-3xl p-12 text-center">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-4 block">Operational Protocol</span>
            <h3 className="text-2xl font-extrabold text-white mb-4">The 6-Step Operational Cycle</h3>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
              "Deploy into raging torrents, Monitor real-time bathymetry, Detect trapped victims with edge AI, Locate with precision GPS, Assess triage urgency, and Rescue with frontline coordination."
            </p>
          </div>
        </div>
      </section>

      {/* ── MISSION FLOW ─────────────────────────────────────────────────── */}
      <section id="mission" className="border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 border border-white/10 px-3.5 py-1.5 rounded-full inline-block mb-5">
                Mission flow
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
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
                  <div className="w-8 h-8 rounded-full border border-[#22d3ee]/40 flex items-center justify-center text-[#22d3ee] group-hover:bg-[#22d3ee]/10 transition-colors">
                    {step.icon}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">{step.num} / 6</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{step.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESCUE TECHNOLOGY ────────────────────────────────────────────── */}
      <section id="technology" className="border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 border border-white/10 px-3.5 py-1.5 rounded-full inline-block mb-5">
              Engineering &amp; Hardware Architecture
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Rescue Technology
            </h2>
            <p className="text-slate-500 text-xs mt-3 tracking-[0.3em] uppercase font-mono">
              Autonomous Water-Level Systems &amp; AI Vision
            </p>
            <div className="w-16 h-px bg-white/10 mx-auto mt-4" />
          </div>

          {/* Hero image */}
          <div className="w-full aspect-[21/9] overflow-hidden rounded-2xl border border-white/10 mb-16 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1600&auto=format&fit=crop"
              alt="Rescue Robotics Hardware Engineering"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Spec sections */}
          <div className="space-y-16 max-w-5xl mx-auto">
            {techSpecs.map((section, idx) => (
              <div key={idx} className="border-t border-white/5 pt-10">
                <h3 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 text-center mb-10">
                  {section.category}
                </h3>
                <div className="space-y-0">
                  {section.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/5 py-5 last:border-0 hover:bg-white/[0.02] transition-colors rounded-lg px-3 -mx-3"
                    >
                      <div className="pr-4">
                        <h4 className="text-white font-semibold text-sm">{item.name}</h4>
                        <p className="text-slate-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                      <span className="text-[#22d3ee] font-bold font-mono text-sm shrink-0">{item.spec}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILT FROM PARTS ─────────────────────────────────────────────── */}
      <section id="hardware" className="border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: illustration / dark card */}
            <div className="bg-[#0e1722] border border-[#1b2b3c] rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[340px] flex items-center justify-center">
              <div className="w-full max-w-xs mx-auto">
                <USVIllustration />
              </div>
              {/* Bottom left badge */}
              <div className="absolute bottom-5 left-5 bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-xl px-4 py-2.5 text-[#22d3ee] font-mono text-xs">
                <div className="font-bold">USV-01 · v2.1</div>
                <div className="text-[#22d3ee]/60 text-[10px] mt-0.5">Water-Level Rescue Robot</div>
              </div>
              {/* Top right badge */}
              <div className="absolute top-5 right-5 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-3 py-1 text-emerald-400 text-[10px] font-mono font-bold">
                ● OPERATIONAL
              </div>
            </div>

            {/* Right: parts list */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 border border-white/10 px-3.5 py-1.5 rounded-full inline-block mb-8">
                Open hardware
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
                Built from parts any<br />team can source.
              </h2>
              <p className="text-slate-400 text-base leading-relaxed mb-8">
                Every component is available on Shopee or Lazada. Total BOM cost under RM 700. The software is fully open and runs on free-tier cloud.
              </p>

              <div className="space-y-3">
                {parts.map((p, i) => (
                  <div key={i} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
                    <div className="w-6 h-6 rounded-full border border-[#22d3ee]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[#22d3ee]" style={{ fontSize: 10 }}>✓</span>
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm">{p.label} — </span>
                      <span className="text-slate-500 text-sm">{p.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DUAL DASHBOARD PREVIEW ───────────────────────────────────────── */}
      <section className="border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 border border-white/10 px-3.5 py-1.5 rounded-full inline-block mb-6">
              Command interface
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
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
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee]" />
                  </div>
                  <span className="text-slate-400 font-mono text-[11px] ml-2">Robot console · dashboard</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-mono">● LIVE</span>
              </div>

              {/* Mock dashboard preview */}
              <div className="p-4 space-y-3">
                {/* Top row: camera + target */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#060d14] border border-[#192738] rounded-xl p-3 aspect-video flex flex-col justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[9px] font-mono text-slate-400">LIVE FEED</span>
                    </div>
                    <div className="flex items-center justify-center flex-1 py-2">
                      <div className="border-2 border-dashed border-[#f97316]/60 rounded-lg w-16 h-10 flex items-center justify-center">
                        <span className="text-[#f97316] text-[8px] font-mono">PERSON 94%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                      <span>XIAO</span><span>·</span><span>5.9 FPS</span>
                    </div>
                  </div>
                  <div className="bg-[#060d14] border border-[#192738] rounded-xl p-3 aspect-video flex flex-col justify-between">
                    <div className="text-[9px] font-mono text-slate-400">VICTIM #1 CONFIRMED</div>
                    <div className="text-[#22d3ee] font-extrabold text-2xl font-mono">2.45<span className="text-xs text-slate-500 ml-1">m</span></div>
                    <div className="grid grid-cols-2 gap-1">
                      <button className="bg-[#f97316] text-white text-[7px] font-bold py-1 rounded">Confirmed ✓</button>
                      <button className="bg-white/10 text-slate-300 text-[7px] font-bold py-1 rounded">False alarm</button>
                    </div>
                  </div>
                </div>

                {/* Bottom row: arm + map + log */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#060d14] border border-[#192738] rounded-xl p-3 space-y-1.5">
                    <div className="text-[9px] font-mono text-slate-400">CAMERA ARM</div>
                    <div className="w-12 h-12 bg-[#0a1929] border border-[#1b2b3c] rounded-lg mx-auto flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#22d3ee] shadow-[0_0_6px_#22d3ee]" />
                    </div>
                    <div className="text-[8px] font-mono text-slate-500 text-center">Pan 90° · Tilt 55°</div>
                  </div>
                  <div className="bg-[#060d14] border border-[#192738] rounded-xl p-3 overflow-hidden">
                    <div className="text-[9px] font-mono text-slate-400 mb-1">TACTICAL MAP</div>
                    <div className="bg-[#0a1929] rounded-lg w-full h-16 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'linear-gradient(#1e40af22 1px, transparent 1px), linear-gradient(90deg, #1e40af22 1px, transparent 1px)', backgroundSize: '8px 8px'}} />
                      <div className="w-3 h-3 bg-[#22d3ee] rotate-45 shadow-[0_0_8px_#22d3ee]" />
                    </div>
                  </div>
                  <div className="bg-[#060d14] border border-[#192738] rounded-xl p-3 space-y-1">
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
            <div className="bg-[#0e1722] border border-[#1b2b3c] rounded-2xl overflow-hidden group hover:border-[#f97316]/40 transition-all">
              {/* Mock header */}
              <div className="bg-[#090f17] border-b border-white/5 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee]" />
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
                <div className="bg-[#060d14] border border-[#192738] rounded-xl overflow-hidden h-44 relative">
                  <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(#22d3ee15 1px, transparent 1px), linear-gradient(90deg, #22d3ee15 1px, transparent 1px)', backgroundSize: '14px 14px'}} />
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 176" preserveAspectRatio="none">
                    <polygon points="60,40 120,30 140,90 80,100" fill="#f9731620" stroke="#f97316" strokeWidth="1.5" />
                    <polygon points="150,50 210,45 220,105 155,110" fill="#f59e0b15" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
                    <polygon points="80,110 140,105 150,145 90,150" fill="#22d3ee10" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 2" />
                    <polygon points="100,68 108,88 100,82 92,88" fill="#22d3ee" />
                    <circle cx="100" cy="68" r="12" stroke="#22d3ee" strokeWidth="0.8" fill="none" opacity="0.4" />
                    <circle cx="135" cy="62" r="5" fill="#f97316" />
                    <circle cx="135" cy="62" r="9" stroke="#f97316" strokeWidth="0.8" fill="none" opacity="0.5" />
                  </svg>
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[8px] font-mono space-y-0.5">
                    <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#22d3ee] rotate-45 inline-block" />USV-01</div>
                    <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#f97316] inline-block" />Detected person</div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/60 rounded-lg px-2 py-1 text-[8px] font-mono text-slate-400">[GOOGLE HYBRID]</div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-slate-500 text-xs">Operations dashboard — commander view</span>
                <Link to="/login" className="text-[#f97316] text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  Open Dashboard <ArrowRight size={13} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FIELD TRIALS CTA BANNER ──────────────────────────────────────── */}
      <section id="contact" className="py-6 px-6 max-w-7xl mx-auto pb-16">
        <div className="bg-[#f97316] rounded-3xl p-10 sm:p-14 relative overflow-hidden">
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
                  className="bg-white text-[#f97316] font-bold text-xs px-5 py-2.5 rounded-full hover:bg-orange-50 active:scale-95 transition-all whitespace-nowrap"
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
