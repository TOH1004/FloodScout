import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="w-full bg-[#FAF7F2] text-[#162347] py-16 sm:py-24 px-6 sm:px-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-[11px] font-bold tracking-[0.35em] text-[#162347]/70 uppercase block mb-2">
          HERITAGE &amp; LIFE-SAVING VISION
        </span>
        <h1 className="font-script text-6xl sm:text-7xl text-[#162347] mb-4">
          Our Story
        </h1>
        <p className="font-editorial-serif text-lg tracking-[0.15em] text-[#162347]/80 uppercase">
          Autonomous Robotics for Extreme Flood Disaster Response
        </p>
        <div className="w-16 h-[1px] bg-[#162347]/30 mx-auto mt-4"></div>
      </div>

      {/* Main Narrative Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
        <div className="space-y-6 text-xs sm:text-sm text-[#162347]/80 leading-relaxed font-normal">
          <p className="first-letter:text-5xl first-letter:font-editorial-serif first-letter:float-left first-letter:mr-3 first-letter:text-[#162347]">
            Born from the devastating monsoon flash floods across Southeast Asia, FloodScout was created by a dedicated team of robotics engineers and disaster response pioneers. We witnessed firsthand how conventional aerial drones are blinded by corrugated roofs, awnings, and tree canopies, while human responders are put in grave danger by swift currents and submerged hazards.
          </p>
          <p>
            FloodScout redefines flood search-and-rescue by shifting the perspective directly to the water level. Operating at water level, our autonomous IP68 composite amphibious hull navigates inundated streets, scans submerged porches, and peers directly under eaves.
          </p>
          <p>
            Equipped with custom edge AI YOLOv8 computer vision, bathymetric sonar depth mapping, and mesh RF telemetry, FloodScout automatically flags trapped human silhouettes, logs GPS coordinates, and alerts frontline rescue boats in sub-second time.
          </p>
          <div className="pt-4">
            <Link
              to="/technology"
              className="bg-[#162347] text-[#FAF7F2] hover:bg-[#0E172E] px-8 py-3 rounded-full text-[11px] font-semibold tracking-[0.25em] uppercase transition-all duration-300 shadow-md inline-block"
            >
              DISCOVER OUR TECHNOLOGY
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-[3/4] overflow-hidden border border-[#E6DFD5] shadow-md bg-white">
            <img
              src="https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=600&auto=format&fit=crop"
              alt="Flood Rescue Operations"
              className="w-full h-full object-cover img-zoom"
            />
          </div>
          <div className="aspect-[3/4] overflow-hidden border border-[#E6DFD5] shadow-md bg-white mt-8">
            <img
              src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop"
              alt="Command Station"
              className="w-full h-full object-cover img-zoom"
            />
          </div>
        </div>
      </div>

      {/* Values Banner in Deep Navy */}
      <div className="bg-[#162347] text-[#FAF7F2] p-12 text-center rounded-sm">
        <h3 className="font-editorial-serif text-xl tracking-[0.2em] uppercase font-semibold mb-4 text-[#FAF7F2]">
          The 6-Step Operational Cycle
        </h3>
        <p className="text-xs sm:text-sm text-[#FAF7F2]/80 max-w-2xl mx-auto leading-relaxed font-normal">
          "Deploy into raging torrents, Monitor real-time bathymetry, Detect trapped victims with edge AI, Locate with precision GPS, Assess triage urgency, and Rescue with frontline coordination."
        </p>
      </div>
    </div>
  );
}
