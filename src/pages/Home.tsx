import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="w-full bg-[#FAF7F2] text-[#162347] font-sans selection:bg-[#BED6EE] selection:text-[#162347]">
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: "SEE BEYOND THE FLOOD save more lives" */}
      {/* ========================================================================= */}
      <section className="relative w-full h-[580px] sm:h-[640px] md:h-[720px] overflow-hidden flex items-center justify-center text-center">
        {/* Deep Ocean Aerial Ripple Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop')`,
          }}
        >
          {/* Rich Oceanic Indigo & Navy Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#132247]/85 via-[#182C5E]/80 to-[#101C3A]/90 mix-blend-multiply"></div>
          {/* Subtle water ripple texture glow */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#4176B8]/30 via-transparent to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-3xl mx-auto px-6 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
          <h1 className="font-editorial-serif text-3xl sm:text-5xl md:text-6xl text-[#FAF7F2] tracking-[0.2em] sm:tracking-[0.25em] uppercase font-light drop-shadow-sm mb-1 sm:mb-2">
            SEE BEYOND THE FLOOD
          </h1>
          
          <p className="font-script text-4xl sm:text-6xl md:text-7xl text-[#FAF7F2] tracking-normal font-normal lowercase mb-10 sm:mb-12 drop-shadow">
            save more lives
          </p>

          <Link
            to="/dashboard"
            className="border border-[#FAF7F2]/90 text-[#FAF7F2] hover:bg-[#FAF7F2] hover:text-[#162347] px-9 py-2.5 sm:py-3 rounded-full text-[11px] sm:text-xs font-semibold tracking-[0.28em] uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg inline-block"
          >
            LAUNCH DASHBOARD
          </Link>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 2. "OUR MISSION" SECTION: Editorial Split Layout */}
      {/* ========================================================================= */}
      <section className="w-full bg-[#FAF7F2] py-20 sm:py-28 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text & CTA */}
          <div className="lg:col-span-5 flex flex-col items-start text-left pr-0 lg:pr-4">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.35em] text-[#162347]/70 uppercase mb-2">
              THE WATER-LEVEL ADVANTAGE
            </span>

            <h2 className="font-script text-5xl sm:text-6xl md:text-7xl text-[#162347] font-normal leading-tight mb-6">
              Our Mission
            </h2>

            <p className="text-xs sm:text-[13px] text-[#162347]/80 leading-relaxed font-normal mb-8 max-w-md">
              Instead of relying solely on overhead aerial drones or risking human responders in hazardous swift currents, FloodScout provides an intelligent water-level perspective. Our autonomous robot navigates submerged urban alleys, penetrates under verandahs and roof eaves, detects trapped victims using real-time AI computer vision, and routes critical GPS coordinates directly to frontline disaster response units.
            </p>

            <Link
              to="/technology"
              className="bg-[#162347] text-[#FAF7F2] hover:bg-[#0E172E] px-8 py-3 rounded-full text-[11px] font-semibold tracking-[0.25em] uppercase transition-all duration-300 shadow-md hover:shadow-lg inline-block text-center"
            >
              LEARN MORE
            </Link>
          </div>

          {/* Right Column: Layered Editorial Imagery */}
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-lg sm:max-w-xl flex items-center gap-4 sm:gap-6">
              
              {/* Image 1: Rescue Boat in Flood Search */}
              <div className="w-1/2 aspect-[4/5] overflow-hidden shadow-lg border border-[#E6DFD5] bg-white group">
                <img
                  src="https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=987&auto=format&fit=crop"
                  alt="Flood rescue water-level operations"
                  className="w-full h-full object-cover img-zoom"
                />
              </div>

              {/* Image 2: Rescue Command Operator Station */}
              <div className="w-1/2 aspect-[4/5] overflow-hidden shadow-lg border border-[#E6DFD5] bg-white group">
                <img
                  src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1000&auto=format&fit=crop"
                  alt="AI Computer Vision Rescue Command"
                  className="w-full h-full object-cover img-zoom"
                />
              </div>

            </div>
          </div>

        </div>
      </section>


      {/* ========================================================================= */}
      {/* 3. "DEPLOYED WITH" PARTNERS BAR (Sky Blue Background) */}
      {/* ========================================================================= */}
      <section className="w-full bg-[#BED6EE] text-[#162347] py-8 sm:py-9 px-6 border-y border-[#AEC9E4]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center md:justify-between gap-6 md:gap-12 text-center">
          
          <span className="text-[11px] sm:text-xs font-bold tracking-[0.3em] uppercase text-[#162347]/80">
            DEPLOYED WITH
          </span>

          <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 lg:gap-24">
            
            {/* APM Rescue */}
            <div className="font-editorial-serif text-lg sm:text-2xl font-bold tracking-tight text-[#162347] hover:opacity-80 transition-opacity cursor-default flex items-center">
              <span className="font-serif italic font-normal text-xl sm:text-2xl mr-0.5">APM</span>
              <span className="font-bold uppercase tracking-wider text-sm sm:text-base"> Civil Defense</span>
            </div>

            {/* Bomba Fire & Rescue */}
            <div className="font-sans text-sm sm:text-lg font-extrabold tracking-[0.2em] uppercase text-[#162347] hover:opacity-80 transition-opacity cursor-default">
              BOMBA <span className="font-light">+</span> RESCUE
            </div>

            {/* NADMA SMART */}
            <div className="font-sans text-xl sm:text-2xl font-black tracking-[0.25em] uppercase text-[#162347] hover:opacity-80 transition-opacity cursor-default">
              NADMA
            </div>

          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 4. THREE PILLARS FEATURE SECTION: Deep Navy Coastal Experience */}
      {/* ========================================================================= */}
      <section className="w-full bg-[#162347] text-[#FAF7F2] py-20 sm:py-28 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto">
          
          {/* 3 Columns with Subtle Divider Borders */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/15 pb-16">
            
            {/* Column 1: DETECT & ASSESS (Scallop/Sonar Waves Icon) */}
            <div className="flex flex-col items-center text-center px-6 lg:px-10 py-10 md:py-4">
              <div className="w-14 h-14 mb-6 text-[#FAF7F2] flex items-center justify-center">
                {/* Custom Elegant Sonar/Scallop SVG */}
                <svg className="w-10 h-10 stroke-current fill-none stroke-[1.2]" viewBox="0 0 24 24">
                  <path d="M12 2C6.5 2 3 7 3 13c0 4.5 3.5 7.5 9 7.5s9-3 9-7.5c0-6-3.5-11-9-11z" />
                  <path d="M12 2.5v18" />
                  <path d="M12 2.5C9.5 5 7 9 7 14c0 3 2 5.5 5 6.5" />
                  <path d="M12 2.5C14.5 5 17 9 17 14c0 3-2 5.5-5 6.5" />
                  <path d="M4.5 8c2.5 1 5.5 2 7.5 2s5-1 7.5-2" />
                  <path d="M4 14c2.5 1 5.5 1.5 8 1.5s5.5-.5 8-1.5" />
                </svg>
              </div>

              <h3 className="font-editorial-serif text-sm sm:text-[15px] font-semibold tracking-[0.25em] uppercase mb-4 text-[#FAF7F2]">
                DETECT &amp; ASSESS
              </h3>

              <p className="text-xs sm:text-[13px] text-[#FAF7F2]/75 leading-relaxed font-normal max-w-xs">
                Edge AI YOLOv8 model continuously inspects floodwaters for human silhouettes and trapped victims with 96.4% confidence.
              </p>
            </div>

            {/* Column 2: WATER-LEVEL VIEW (Palm / Amphibious Mast Icon) */}
            <div className="flex flex-col items-center text-center px-6 lg:px-10 py-10 md:py-4">
              <div className="w-14 h-14 mb-6 text-[#FAF7F2] flex items-center justify-center">
                {/* Custom Elegant Mast/Palm SVG */}
                <svg className="w-10 h-10 stroke-current fill-none stroke-[1.2]" viewBox="0 0 24 24">
                  <path d="M12 22V9" />
                  <path d="M12 9c-2-3-6-4-10-3 3 2 4 5 4 8" />
                  <path d="M12 9c2-3 6-4 10-3-3 2-4 5-4 8" />
                  <path d="M12 8c-1-3-4-6-7-7 1 3 2 6 4 7" />
                  <path d="M12 8c1-3 4-6 7-7-1 3-2 6-4 7" />
                  <path d="M9 22h6" />
                </svg>
              </div>

              <h3 className="font-editorial-serif text-sm sm:text-[15px] font-semibold tracking-[0.25em] uppercase mb-4 text-[#FAF7F2]">
                WATER-LEVEL VIEW
              </h3>

              <p className="text-xs sm:text-[13px] text-[#FAF7F2]/75 leading-relaxed font-normal max-w-xs">
                Ultra-shallow 0.15m draft penetrates narrow urban alleys, porches, and roof eaves invisible to overhead drones.
              </p>
            </div>

            {/* Column 3: LOCATE & RESCUE (Conch / Mesh Beacon Icon) */}
            <div className="flex flex-col items-center text-center px-6 lg:px-10 py-10 md:py-4">
              <div className="w-14 h-14 mb-6 text-[#FAF7F2] flex items-center justify-center">
                {/* Custom Elegant Conch/Beacon SVG */}
                <svg className="w-10 h-10 stroke-current fill-none stroke-[1.2]" viewBox="0 0 24 24">
                  <path d="M12 3c-4.5 0-8 3.5-8 8 0 5 4 9 9 9 3 0 7-2 7-6 0-3-2.5-5-5.5-5s-4.5 1.5-4.5 3.5c0 1.5 1 2.5 2.5 2.5s2-.8 2-1.5" />
                  <path d="M12 3c2 2 3 5 3 8" />
                  <path d="M16 6c1.5 1.5 2.5 3.5 2.5 5" />
                </svg>
              </div>

              <h3 className="font-editorial-serif text-sm sm:text-[15px] font-semibold tracking-[0.25em] uppercase mb-4 text-[#FAF7F2]">
                LOCATE &amp; RESCUE
              </h3>

              <p className="text-xs sm:text-[13px] text-[#FAF7F2]/75 leading-relaxed font-normal max-w-xs">
                Real-time GPS geotagging and dual optical/FLIR thermal telemetry stream coordinates directly to rescue boats.
              </p>
            </div>

          </div>

          {/* Centered Pill Button */}
          <div className="flex justify-center pt-2">
            <Link
              to="/dashboard"
              className="border border-[#FAF7F2]/90 text-[#FAF7F2] hover:bg-[#FAF7F2] hover:text-[#162347] px-10 py-2.5 sm:py-3 rounded-full text-[11px] sm:text-xs font-semibold tracking-[0.28em] uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md inline-block"
            >
              LAUNCH DASHBOARD
            </Link>
          </div>

        </div>
      </section>


      {/* ========================================================================= */}
      {/* 5. REAL-TIME FIELD DISPATCH GALLERY (6 Photos Grid) */}
      {/* ========================================================================= */}
      <section className="w-full bg-[#FAF7F2] py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto">
        
        {/* 6 Photos in a Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-10">
          
          {/* Photo 1: Rescue Boat on Floodwater */}
          <div className="aspect-square overflow-hidden bg-white shadow-sm border border-[#E6DFD5] group cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=600&auto=format&fit=crop"
              alt="Flood Rescue Boat Operations"
              className="w-full h-full object-cover img-zoom"
            />
          </div>

          {/* Photo 2: Water Navigation Perspective */}
          <div className="aspect-square overflow-hidden bg-white shadow-sm border border-[#E6DFD5] group cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop"
              alt="Water surface search perspective"
              className="w-full h-full object-cover img-zoom"
            />
          </div>

          {/* Photo 3: Inundated Urban Sector */}
          <div className="aspect-square overflow-hidden bg-white shadow-sm border border-[#E6DFD5] group cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=600&auto=format&fit=crop"
              alt="Submerged residential buildings"
              className="w-full h-full object-cover img-zoom"
            />
          </div>

          {/* Photo 4: Thermal Night Vision Rescue */}
          <div className="aspect-square overflow-hidden bg-white shadow-sm border border-[#E6DFD5] group cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1508873696983-2df5293cb32b?q=80&w=600&auto=format&fit=crop"
              alt="Night search operations"
              className="w-full h-full object-cover img-zoom"
            />
          </div>

          {/* Photo 5: Operator Laptop Command Station */}
          <div className="aspect-square overflow-hidden bg-white shadow-sm border border-[#E6DFD5] group cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop"
              alt="Rescue team command monitor"
              className="w-full h-full object-cover img-zoom"
            />
          </div>

          {/* Photo 6: Floodwater Extraction */}
          <div className="aspect-square overflow-hidden bg-white shadow-sm border border-[#E6DFD5] group cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=600&auto=format&fit=crop"
              alt="Flood emergency boat deployment"
              className="w-full h-full object-cover img-zoom"
            />
          </div>

        </div>

        {/* Follow Tag */}
        <div className="text-center">
          <Link
            to="/victims"
            className="inline-block text-[11px] sm:text-xs font-bold tracking-[0.3em] uppercase text-[#162347] hover:text-[#162347]/70 transition-colors"
          >
            DISPATCH RADAR #FLOODSCOUTRESCUE
          </Link>
        </div>

      </section>

    </div>
  );
}
