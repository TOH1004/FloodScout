import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Volume2,
  Menu,
  X
} from 'lucide-react';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3500);
      setEmail('');
    }
  };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setTimeout(() => setNewsletterSubscribed(false), 3500);
      setNewsletterEmail('');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F6F4F0] text-[#14171F] font-sans selection:bg-[#7BD7FF] selection:text-[#14171F]">
      
      {/* ── TOP NAV BAR (Pill Style from Reference) ────────────────────────── */}
      <header className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7">
        <div className="flex items-center justify-between">
          
          {/* Left Pill Navigation (Real FloodScout Pages, No Mock Data) */}
          <nav className="hidden md:flex items-center gap-6 bg-white/90 backdrop-blur-md border border-[#E5E0D8] rounded-full px-6 py-2.5 shadow-xs text-[13px] font-medium tracking-wide">
            <Link to="/" className="flex items-center gap-1.5 text-[#14171F] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14171F]"></span>
              Home
            </Link>
            <Link to="/our-story" className="text-[#64748B] hover:text-[#14171F] transition-colors">
              Our Story
            </Link>
            <Link to="/technology" className="text-[#64748B] hover:text-[#14171F] transition-colors">
              Technology
            </Link>
          </nav>

          {/* Center Brand Logo (8-spoke Asterisk) */}
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#14171F] hover:opacity-90 transition-opacity">
            <svg className="w-6 h-6 text-[#14171F]" viewBox="0 0 24 24" fill="currentColor">
              {/* Geometric 8-spoke starburst / asterisk icon */}
              <circle cx="12" cy="12" r="2.5" />
              <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3A1.5 1.5 0 0 1 12 2zm0 14a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3A1.5 1.5 0 0 1 12 16zm10-4a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1 0-3h3A1.5 1.5 0 0 1 22 12zM8 12a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1 0-3h3A1.5 1.5 0 0 1 8 12zm11.07-7.07a1.5 1.5 0 0 1 0 2.12l-2.12 2.12a1.5 1.5 0 1 1-2.12-2.12l2.12-2.12a1.5 1.5 0 0 1 2.12 0zm-9.9 9.9a1.5 1.5 0 0 1 0 2.12l-2.12 2.12a1.5 1.5 0 0 1-2.12-2.12l2.12-2.12a1.5 1.5 0 0 1 2.12 0zm0-9.9a1.5 1.5 0 0 1 2.12 0l2.12 2.12a1.5 1.5 0 0 1-2.12 2.12L7.05 7.05a1.5 1.5 0 0 1 0-2.12zm9.9 9.9a1.5 1.5 0 0 1 0 2.12l-2.12 2.12a1.5 1.5 0 0 1-2.12-2.12l2.12-2.12a1.5 1.5 0 0 1 2.12 0z" />
            </svg>
            <span className="font-semibold tracking-tight text-lg">FloodScout</span>
          </Link>

          {/* Right Pill Navigation & Actions (Real FloodScout Pages, No Mock Data) */}
          <div className="hidden md:flex items-center gap-6 bg-white/90 backdrop-blur-md border border-[#E5E0D8] rounded-full px-6 py-2.5 shadow-xs text-[13px] font-medium tracking-wide">
            <Link to="/victims" className="text-[#64748B] hover:text-[#14171F] transition-colors">
              Victim Radar
            </Link>
            <Link to="/contact" className="text-[#64748B] hover:text-[#14171F] transition-colors">
              Contact
            </Link>
            <Link
              to="/dashboard"
              className="bg-[#14171F] hover:bg-[#0F172A] text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-all shadow-xs"
            >
              Launch Dashboard
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              to="/dashboard"
              className="bg-[#14171F] text-white text-[11px] font-semibold px-4 py-2 rounded-full uppercase tracking-wider"
            >
              Dashboard
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#14171F] bg-white rounded-full border border-[#E5E0D8]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Drawer (Real FloodScout Pages, No Mock Data) */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 bg-white rounded-2xl p-5 border border-[#E5E0D8] shadow-lg flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
            <Link to="/" className="text-sm font-semibold py-1">Home</Link>
            <Link to="/our-story" className="text-sm text-[#64748B] py-1">Our Story</Link>
            <Link to="/technology" className="text-sm text-[#64748B] py-1">Technology</Link>
            <Link to="/victims" className="text-sm text-[#64748B] py-1">Victim Radar</Link>
            <Link to="/contact" className="text-sm text-[#64748B] py-1">Contact</Link>
            <Link
              to="/dashboard"
              className="bg-[#14171F] text-white text-center py-2.5 rounded-full font-semibold text-xs tracking-wider uppercase mt-2 shadow"
            >
              Launch Dashboard
            </Link>
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────────── */}
      <main className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-20 sm:space-y-28">

        {/* =================================================================== */}
        {/* 1. HERO SECTION: Split Bento Grid (Light Blue Left Card)             */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

          {/* ── LEFT HERO CARD (Changed from light yellow/green to LIGHT BLUE) ─ */}
          <div className="lg:col-span-6 bg-[#7BD7FF] rounded-[36px] p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden shadow-xs">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            {/* Top Subtitle / Tag */}
            <div className="flex items-center gap-2 text-[#0F172A] font-semibold text-xs tracking-wide relative z-10">
              <svg className="w-4 h-4 text-[#0F172A]" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="2.5" />
                <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3A1.5 1.5 0 0 1 12 2zm0 14a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3A1.5 1.5 0 0 1 12 16zm10-4a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1 0-3h3A1.5 1.5 0 0 1 22 12zM8 12a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1 0-3h3A1.5 1.5 0 0 1 8 12zm11.07-7.07a1.5 1.5 0 0 1 0 2.12l-2.12 2.12a1.5 1.5 0 1 1-2.12-2.12l2.12-2.12a1.5 1.5 0 0 1 2.12 0zm-9.9 9.9a1.5 1.5 0 0 1 0 2.12l-2.12 2.12a1.5 1.5 0 0 1-2.12-2.12l2.12-2.12a1.5 1.5 0 0 1 2.12 0zm0-9.9a1.5 1.5 0 0 1 2.12 0l2.12 2.12a1.5 1.5 0 0 1-2.12 2.12L7.05 7.05a1.5 1.5 0 0 1 0-2.12zm9.9 9.9a1.5 1.5 0 0 1 0 2.12l-2.12 2.12a1.5 1.5 0 0 1-2.12-2.12l2.12-2.12a1.5 1.5 0 0 1 2.12 0z" />
              </svg>
              <span>FloodScout Group</span>
            </div>

            {/* Main Headline with Diagonal Arrow Badge */}
            <div className="my-10 sm:my-14 relative z-10">
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold text-[#0F172A] leading-[1.08] tracking-tight">
                Saving{' '}
                <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[#0F172A]/40 mx-1 align-middle transition-transform hover:scale-110">
                  <ArrowUpRight size={22} className="text-[#0F172A]" />
                </span>{' '}
                Nature &amp; Fighting{' '}
                <span className="underline decoration-[#0F172A]/30 underline-offset-8">
                  Floods
                </span>{' '}
                Together.
              </h1>
            </div>

            {/* Email Subscribe / Launch Input Form */}
            <div className="relative z-10 space-y-7">
              <form
                onSubmit={handleSubscribe}
                className="bg-white rounded-full p-1.5 pl-5 sm:pl-6 flex items-center justify-between shadow-xs max-w-md w-full border border-white/80"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="bg-transparent text-xs sm:text-sm text-[#0F172A] placeholder:text-[#64748B] outline-none flex-grow pr-2"
                />
                <button
                  type="submit"
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <span>{subscribed ? 'Joined!' : 'Subscribe'}</span>
                  <ArrowRight size={14} />
                </button>
              </form>

              {/* Social Proof Overlapping Avatars */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5 overflow-hidden">
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                    alt="Responder 1"
                  />
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop"
                    alt="Responder 2"
                  />
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"
                    alt="Responder 3"
                  />
                </div>
                <span className="text-[11px] sm:text-xs text-[#0F172A]/85 font-medium leading-tight">
                  1,200+ members &amp; emergency responders in our fleet network
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT HERO CARD (Aerial Nature / Flood Landscape Photo) ─────── */}
          <div className="lg:col-span-6 rounded-[36px] overflow-hidden relative min-h-[460px] sm:min-h-[560px] shadow-xs group">
            {/* Background Landscape Photo */}
            <img
              src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600&auto=format&fit=crop"
              alt="Flood landscape & pristine nature"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            {/* Atmospheric gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30"></div>

            {/* Floating Top-Left Card ("We & Our Volunteers / Rescuers") */}
            <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 pr-4 flex items-center gap-3 border border-white/80 shadow-md">
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120&auto=format&fit=crop"
                alt="Volunteer"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <span className="text-[10px] text-[#64748B] block font-mono">Operations</span>
                <span className="text-xs font-bold text-[#0F172A] leading-tight block">
                  We &amp; Our Volunteers
                </span>
              </div>
              <div className="w-6 h-6 rounded-full bg-[#7BD7FF] text-[#0F172A] flex items-center justify-center font-bold text-xs ml-1 shadow-xs">
                <ArrowUpRight size={13} />
              </div>
            </div>

            {/* Floating Top-Right Sound / Mic Button */}
            <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white hover:bg-white/35 transition-colors cursor-pointer shadow-md">
              <Volume2 size={16} />
            </div>

            {/* Interactive Hotspot Pins on Terrain (Light Blue Dots) */}
            <div className="absolute top-[38%] left-[22%] bg-black/40 backdrop-blur-md border border-white/30 text-white/90 text-[11px] font-medium px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#7BD7FF] animate-pulse"></span>
              <span>Autonomous Sonar</span>
            </div>

            <div className="absolute top-[28%] right-[18%] bg-black/40 backdrop-blur-md border border-white/30 text-white/90 text-[11px] font-medium px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#7BD7FF] animate-ping"></span>
              <span>AI Victim Detection</span>
            </div>

            <div className="absolute top-[48%] left-[45%] bg-black/40 backdrop-blur-md border border-white/30 text-white/90 text-[11px] font-medium px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#7BD7FF]"></span>
              <span>ESP32 Wi-Fi Telemetry</span>
            </div>

            {/* Bottom-Left Floating Pill Card */}
            <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-full py-2 px-3.5 flex items-center gap-2.5 border border-white/80 shadow-md">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop"
                alt="Member"
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="text-xs font-semibold text-[#0F172A]">
                Join us in fighting environmental disasters
              </span>
            </div>

            {/* Bottom-Right Subtitle & Social Links */}
            <div className="absolute bottom-6 right-6 text-right max-w-[240px] hidden sm:block">
              <div className="flex justify-end gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-[10px] text-white font-mono cursor-pointer hover:bg-white/40 transition-colors">
                  FB
                </span>
                <span className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-[10px] text-white font-mono cursor-pointer hover:bg-white/40 transition-colors">
                  TW
                </span>
              </div>
              <p className="text-[11px] text-white/90 font-medium leading-snug drop-shadow-sm">
                We are an engineering initiative dedicated to protecting human lives &amp; nature.
              </p>
            </div>
          </div>

        </section>

        {/* ── MOUSE SCROLL INDICATOR ───────────────────────────────────────── */}
        <div className="flex justify-center -mt-6">
          <div className="w-6 h-10 rounded-full border-2 border-[#14171F]/25 flex items-start justify-center p-1 cursor-pointer hover:border-[#14171F] transition-colors">
            <span className="w-1.5 h-2.5 rounded-full bg-[#14171F] animate-bounce mt-1"></span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. STATEMENT & ORBITING PREVIEWS SECTION                           */}
        {/* =================================================================== */}
        <section className="relative py-12 sm:py-20 text-center max-w-4xl mx-auto px-4">
          
          {/* Orbiting Floating Thumbnail 1 (Top-Left: Flood Water) */}
          <div className="hidden md:block absolute -top-2 left-6 w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg animate-pulse">
            <img
              src="https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=200&auto=format&fit=crop"
              alt="Water surface"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Orbiting Floating Thumbnail 2 (Lower-Left: Rescue Boat) */}
          <div className="hidden md:block absolute bottom-8 left-16 w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=200&auto=format&fit=crop"
              alt="Nature"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Orbiting Floating Thumbnail 3 (Top-Right: Sonar / Glacial Water) */}
          <div className="hidden md:block absolute top-2 right-12 w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1498084393753-b411b2d26b34?q=80&w=200&auto=format&fit=crop"
              alt="Glacier lake"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Orbiting Floating Thumbnail 4 (Lower-Right: Terrain) */}
          <div className="hidden md:block absolute bottom-6 right-20 w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=200&auto=format&fit=crop"
              alt="Terrain landscape"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Central Statement */}
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0F172A] leading-tight max-w-2xl mx-auto">
            Let's Make Our World Cleaner &amp; Greener!
          </h2>

          <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto mt-4 mb-8 leading-relaxed font-normal">
            We work with partners &amp; communities to ensure nature thrives and climate-driven disaster threats are mitigated.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-full transition-all flex items-center gap-2 active:scale-95 shadow-sm"
            >
              <span>View Projects</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/technology"
              className="text-[#0F172A] hover:underline text-xs sm:text-sm font-semibold px-4 py-3 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F172A]"></span>
              <span>Learn More</span>
            </Link>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 3. 4 PILL CAPSULES BANNER ("We Protect -> Nature" with Light Blue)   */}
        {/* =================================================================== */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">

          {/* Capsule 1: "We" */}
          <div className="bg-white rounded-full py-8 sm:py-12 px-6 flex items-center justify-center border border-[#E5E0D8] shadow-xs hover:border-[#14171F]/30 transition-all">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] tracking-tight">
              We
            </span>
          </div>

          {/* Capsule 2: "Protect" with Glacial Water Photo */}
          <div className="relative rounded-full py-8 sm:py-12 px-6 flex items-center justify-center overflow-hidden border border-[#E5E0D8] shadow-xs group">
            <img
              src="https://images.unsplash.com/photo-1498084393753-b411b2d26b34?q=80&w=600&auto=format&fit=crop"
              alt="Protect Glacial Water"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition-colors"></div>
            <span className="relative z-10 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight drop-shadow-md">
              Protect
            </span>
          </div>

          {/* Capsule 3: Giant Arrow (Changed from yellow/green to LIGHT BLUE) */}
          <div className="bg-[#7BD7FF] rounded-full py-8 sm:py-12 px-6 flex items-center justify-center shadow-xs hover:bg-[#68CEF7] transition-all cursor-pointer group">
            <ArrowRight
              size={44}
              className="text-[#0F172A] stroke-[2.5] transition-transform group-hover:translate-x-2"
            />
          </div>

          {/* Capsule 4: "Nature" with Mountain Landscape Photo */}
          <div className="relative rounded-full py-8 sm:py-12 px-6 flex items-center justify-center overflow-hidden border border-[#E5E0D8] shadow-xs group">
            <img
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop"
              alt="Preserve Nature"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition-colors"></div>
            <span className="relative z-10 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight drop-shadow-md">
              Nature
            </span>
          </div>

        </section>

        {/* =================================================================== */}
        {/* 4. INITIATIVES / MISSIONS TABLE (Reference Section 4)              */}
        {/* =================================================================== */}
        <section className="bg-white/80 backdrop-blur-md rounded-[36px] p-6 sm:p-10 lg:p-12 border border-[#E5E0D8] shadow-xs relative">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-8 border-b border-[#E5E0D8] gap-3">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
                Our initiatives for 2026
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-xs text-left sm:text-right font-normal">
              Find out what projects we are implementing to protect nature and rescue flood victims.
            </p>
          </div>

          {/* Table Column Headers */}
          <div className="grid grid-cols-12 py-3.5 text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] border-b border-[#F1EFE9]">
            <div className="col-span-5 sm:col-span-5">Title</div>
            <div className="col-span-4 sm:col-span-4">Tags</div>
            <div className="col-span-3 sm:col-span-3 text-right">Date</div>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-12 py-5 sm:py-6 items-center border-b border-[#F1EFE9] hover:bg-[#F6F4F0]/60 transition-colors rounded-xl px-2">
            <div className="col-span-5 sm:col-span-5 text-sm sm:text-lg font-bold text-[#0F172A]">
              Tree planting
            </div>
            <div className="col-span-4 sm:col-span-4 flex flex-wrap gap-1.5">
              <span className="bg-[#F6F4F0] border border-[#E5E0D8] text-[11px] text-[#64748B] px-3 py-0.5 rounded-full font-medium">
                green and cleaner
              </span>
            </div>
            <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-3 text-xs sm:text-sm text-[#64748B] font-mono">
              <span>12/03/26</span>
              <div className="w-8 h-8 rounded-full border border-[#E5E0D8] flex items-center justify-center hover:bg-[#0F172A] hover:text-white transition-colors cursor-pointer">
                <ArrowRight size={14} />
              </div>
            </div>
          </div>

          {/* Row 2 (Featured Row with Light Blue Tag & Hovering Preview Card) */}
          <div className="relative grid grid-cols-12 py-5 sm:py-6 items-center border-b border-[#F1EFE9] hover:bg-[#F6F4F0]/60 transition-colors rounded-xl px-2">
            <div className="col-span-5 sm:col-span-5 text-sm sm:text-lg font-bold text-[#0F172A]">
              Beach cleanup
            </div>
            <div className="col-span-4 sm:col-span-4 flex flex-wrap gap-1.5">
              {/* Light blue pill badge (changed from yellow/green) */}
              <span className="bg-[#BAE6FD] text-[#0369A1] font-semibold text-[11px] px-3.5 py-0.5 rounded-full border border-[#7BD7FF]">
                future generations
              </span>
            </div>
            <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-3 text-xs sm:text-sm text-[#64748B] font-mono">
              <span>29/05/26</span>
              {/* Dashed circle icon from reference */}
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-[#0F172A]/50 flex items-center justify-center text-[#0F172A] hover:bg-[#0F172A] hover:text-white transition-colors cursor-pointer">
                <ArrowUpRight size={14} />
              </div>
            </div>

            {/* Tilted Floating Preview Card Hovering over Row 2 (from screenshot) */}
            <div className="hidden lg:block absolute right-24 -top-8 w-48 h-32 rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform rotate-6 pointer-events-none z-20">
              <img
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop"
                alt="Beach & Water cleanup"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-12 py-5 sm:py-6 items-center border-b border-[#F1EFE9] hover:bg-[#F6F4F0]/60 transition-colors rounded-xl px-2">
            <div className="col-span-5 sm:col-span-5 text-sm sm:text-lg font-bold text-[#0F172A]">
              Educational events
            </div>
            <div className="col-span-4 sm:col-span-4 flex flex-wrap gap-1.5">
              <span className="bg-[#F6F4F0] border border-[#E5E0D8] text-[11px] text-[#64748B] px-3 py-0.5 rounded-full font-medium">
                courses
              </span>
              <span className="bg-[#F6F4F0] border border-[#E5E0D8] text-[11px] text-[#64748B] px-3 py-0.5 rounded-full font-medium hidden sm:inline-block">
                green initiatives
              </span>
            </div>
            <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-3 text-xs sm:text-sm text-[#64748B] font-mono">
              <span>05/06/26</span>
              <div className="w-8 h-8 rounded-full border border-[#E5E0D8] flex items-center justify-center hover:bg-[#0F172A] hover:text-white transition-colors cursor-pointer">
                <ArrowRight size={14} />
              </div>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-12 py-5 sm:py-6 items-center hover:bg-[#F6F4F0]/60 transition-colors rounded-xl px-2">
            <div className="col-span-5 sm:col-span-5 text-sm sm:text-lg font-bold text-[#0F172A]">
              Park cleaning
            </div>
            <div className="col-span-4 sm:col-span-4 flex flex-wrap gap-1.5">
              <span className="bg-[#F6F4F0] border border-[#E5E0D8] text-[11px] text-[#64748B] px-3 py-0.5 rounded-full font-medium">
                stay off clearing
              </span>
            </div>
            <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-3 text-xs sm:text-sm text-[#64748B] font-mono">
              <span>18/08/26</span>
              <div className="w-8 h-8 rounded-full border border-[#E5E0D8] flex items-center justify-center hover:bg-[#0F172A] hover:text-white transition-colors cursor-pointer">
                <ArrowRight size={14} />
              </div>
            </div>
          </div>

        </section>

        {/* =================================================================== */}
        {/* 5. 4 VERTICAL BENTO PROBLEM CARDS (Reference Section 5)            */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

          {/* ── CARD 1: Ocean Pollution (Featured Card with Light Blue Button) ── */}
          <div className="relative rounded-[32px] overflow-hidden min-h-[460px] p-6 flex flex-col justify-between shadow-xs group">
            <img
              src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=800&auto=format&fit=crop"
              alt="Ocean Pollution"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30"></div>

            {/* Top Tags & Light Blue Circular Arrow Badge */}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="bg-black/40 backdrop-blur-md border border-white/30 text-white/90 text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7BD7FF]"></span>
                  Ecological Catastrophe
                </span>
                <span className="bg-black/40 backdrop-blur-md border border-white/30 text-white/90 text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
                  Pollution Issues
                </span>
              </div>
              {/* Light blue circular arrow button (changed from yellow/green) */}
              <div className="w-9 h-9 rounded-full bg-[#7BD7FF] text-[#0F172A] flex items-center justify-center font-bold shadow-md cursor-pointer hover:scale-110 transition-transform">
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Bottom Content */}
            <div className="relative z-10 space-y-3">
              <h4 className="text-2xl font-bold text-white tracking-tight leading-tight">
                Ocean<br />Pollution
              </h4>
              <p className="text-[11px] text-white/80 line-clamp-3 leading-relaxed font-normal">
                Restoring natural marine ecosystems through autonomous monitoring and active environmental surveillance.
              </p>
              <Link
                to="/technology"
                className="w-full bg-white/95 hover:bg-white text-[#0F172A] py-2.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1 shadow-sm block text-center"
              >
                <span>EXPLORE PROBLEM</span>
                <span className="text-xs">›</span>
              </Link>
            </div>
          </div>

          {/* ── CARD 2: Glacier Melting ─────────────────────────────────────── */}
          <div className="relative rounded-[32px] overflow-hidden min-h-[460px] p-6 flex flex-col justify-between shadow-xs group">
            <img
              src="https://images.unsplash.com/photo-1498084393753-b411b2d26b34?q=80&w=800&auto=format&fit=crop"
              alt="Glacier Melting"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30"></div>

            {/* Top Glass Badge */}
            <div className="relative z-10 flex justify-end">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white flex items-center justify-center font-bold shadow-md cursor-pointer hover:bg-white/30 transition-colors">
                <ArrowUpRight size={16} />
              </div>
            </div>

            {/* Bottom Content */}
            <div className="relative z-10 space-y-3">
              <h4 className="text-2xl font-bold text-white tracking-tight leading-tight">
                Glacier<br />Melting
              </h4>
              <p className="text-[11px] text-white/80 line-clamp-3 leading-relaxed font-normal">
                Detecting rapid ice melt surges and tracking resulting downstream flood level inundations.
              </p>
              <Link
                to="/victims"
                className="w-full bg-white/95 hover:bg-white text-[#0F172A] py-2.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1 shadow-sm block text-center"
              >
                <span>EXPLORE PROBLEM</span>
                <span className="text-xs">›</span>
              </Link>
            </div>
          </div>

          {/* ── CARD 3: Forest Clearance ────────────────────────────────────── */}
          <div className="relative rounded-[32px] overflow-hidden min-h-[460px] p-6 flex flex-col justify-between shadow-xs group">
            <img
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop"
              alt="Forest Clearance"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30"></div>

            {/* Top Glass Badge */}
            <div className="relative z-10 flex justify-end">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white flex items-center justify-center font-bold shadow-md cursor-pointer hover:bg-white/30 transition-colors">
                <ArrowUpRight size={16} />
              </div>
            </div>

            {/* Bottom Content */}
            <div className="relative z-10 space-y-3">
              <h4 className="text-2xl font-bold text-white tracking-tight leading-tight">
                Forest<br />Clearance
              </h4>
              <p className="text-[11px] text-white/80 line-clamp-3 leading-relaxed font-normal">
                Protecting watershed basins and preventing devastating runoff that accelerates catastrophic flooding.
              </p>
              <Link
                to="/technology"
                className="w-full bg-white/95 hover:bg-white text-[#0F172A] py-2.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1 shadow-sm block text-center"
              >
                <span>EXPLORE PROBLEM</span>
                <span className="text-xs">›</span>
              </Link>
            </div>
          </div>

          {/* ── CARD 4: GHG Emissions ───────────────────────────────────────── */}
          <div className="relative rounded-[32px] overflow-hidden min-h-[460px] p-6 flex flex-col justify-between shadow-xs group">
            <img
              src="https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop"
              alt="GHG Emissions"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30"></div>

            {/* Top Glass Badge */}
            <div className="relative z-10 flex justify-end">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white flex items-center justify-center font-bold shadow-md cursor-pointer hover:bg-white/30 transition-colors">
                <ArrowUpRight size={16} />
              </div>
            </div>

            {/* Bottom Content */}
            <div className="relative z-10 space-y-3">
              <h4 className="text-2xl font-bold text-white tracking-tight leading-tight">
                GHG<br />Emissions
              </h4>
              <p className="text-[11px] text-white/80 line-clamp-3 leading-relaxed font-normal">
                Developing zero-emission all-electric amphibious autonomous robots to replace fossil fuel emergency craft.
              </p>
              <Link
                to="/our-story"
                className="w-full bg-white/95 hover:bg-white text-[#0F172A] py-2.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1 shadow-sm block text-center"
              >
                <span>EXPLORE PROBLEM</span>
                <span className="text-xs">›</span>
              </Link>
            </div>
          </div>

        </section>

        {/* =================================================================== */}
        {/* 6. NEWSLETTER / SUBSCRIPTION BANNER (Reference Section 6)          */}
        {/* =================================================================== */}
        <section className="bg-white rounded-[36px] p-8 sm:p-12 lg:p-16 border border-[#E5E0D8] shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            
            {/* Left Content */}
            <div className="space-y-4 max-w-xl">
              <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-[#64748B] border border-[#E5E0D8] px-3.5 py-1 rounded-full">
                newsletter
              </span>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] tracking-tight leading-tight">
                Subscribe to our newsletter to get the latest updates on missions projects &amp; initiatives.
              </h3>
            </div>

            {/* Right Form */}
            <div className="w-full lg:max-w-md">
              <form
                onSubmit={handleNewsletter}
                className="bg-[#F6F4F0] rounded-full p-1.5 pl-5 sm:pl-6 flex items-center justify-between border border-[#E5E0D8] shadow-xs"
              >
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Email address |"
                  required
                  className="bg-transparent text-xs sm:text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none flex-grow pr-2"
                />
                <button
                  type="submit"
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all flex items-center gap-1.5 active:scale-95 shadow-sm whitespace-nowrap"
                >
                  <span>{newsletterSubscribed ? 'Subscribed!' : 'Subscribe'}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>

          </div>
        </section>

      </main>

      {/* ── FOOTER (Matching Reference) ───────────────────────────────────── */}
      <footer className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-t border-[#E5E0D8]/80 text-[#64748B] text-xs font-medium">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Copyright */}
          <div>
            © 2026, All Right Reserved
          </div>

          {/* Center Logo */}
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-[#0F172A] hover:opacity-80 transition-opacity">
            <svg className="w-4 h-4 text-[#0F172A]" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="2.5" />
              <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3A1.5 1.5 0 0 1 12 2zm0 14a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3A1.5 1.5 0 0 1 12 16zm10-4a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1 0-3h3A1.5 1.5 0 0 1 22 12zM8 12a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1 0-3h3A1.5 1.5 0 0 1 8 12zm11.07-7.07a1.5 1.5 0 0 1 0 2.12l-2.12 2.12a1.5 1.5 0 1 1-2.12-2.12l2.12-2.12a1.5 1.5 0 0 1 2.12 0zm-9.9 9.9a1.5 1.5 0 0 1 0 2.12l-2.12 2.12a1.5 1.5 0 0 1-2.12-2.12l2.12-2.12a1.5 1.5 0 0 1 2.12 0zm0-9.9a1.5 1.5 0 0 1 2.12 0l2.12 2.12a1.5 1.5 0 0 1-2.12 2.12L7.05 7.05a1.5 1.5 0 0 1 0-2.12zm9.9 9.9a1.5 1.5 0 0 1 0 2.12l-2.12 2.12a1.5 1.5 0 0 1-2.12-2.12l2.12-2.12a1.5 1.5 0 0 1 2.12 0z" />
            </svg>
            <span>FloodScout</span>
          </Link>

          {/* Social / Page Links (Pill Style) */}
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 rounded-full border border-[#E5E0D8] bg-white text-[11px] font-semibold text-[#0F172A] hover:bg-[#0F172A] hover:text-white transition-colors shadow-xs"
            >
              Dashboard
            </Link>
            <Link
              to="/technology"
              className="px-3.5 py-1.5 rounded-full border border-[#E5E0D8] bg-white text-[11px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors shadow-xs"
            >
              Technology
            </Link>
            <Link
              to="/contact"
              className="px-3.5 py-1.5 rounded-full border border-[#E5E0D8] bg-white text-[11px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors shadow-xs"
            >
              Contact
            </Link>
          </div>

        </div>
      </footer>

    </div>
  );
}
