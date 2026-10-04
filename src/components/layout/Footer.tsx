import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-[#F3ECDE] text-[#183451] border-t border-[#E6DFD5] pt-16 pb-12 select-none">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        
        {/* 3 Columns Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 pb-14 border-b border-[#E6DFD5]/80 text-center md:text-left">
          
          {/* Column 1: Operations */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <h3 className="font-editorial-serif text-sm tracking-[0.25em] uppercase font-bold text-[#183451]">
              OPERATIONS
            </h3>
            <div className="text-xs sm:text-[13px] text-[#183451]/80 space-y-2 leading-relaxed font-normal">
              <div className="flex gap-2 justify-center md:justify-start">
                <span className="font-bold text-[#183451]">Primary Unit:</span>
                <span>FloodScout-01</span>
              </div>
              <div className="flex gap-2 justify-center md:justify-start">
                <span className="font-bold text-[#183451]">Status:</span>
                <span className="text-emerald-700 font-semibold">Active Deployment</span>
              </div>
              <div className="flex gap-2 justify-center md:justify-start">
                <span className="font-bold text-[#183451]">Telemetry:</span>
                <span>5.8 GHz COFDM Link</span>
              </div>
              <div className="flex gap-2 justify-center md:justify-start">
                <span className="font-bold text-[#183451]">Emergency:</span>
                <span>LoRa 433MHz Mesh Fallback</span>
              </div>
            </div>
          </div>

          {/* Column 2: Links */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <h3 className="font-editorial-serif text-sm tracking-[0.25em] uppercase font-bold text-[#183451]">
              LINKS
            </h3>
            <ul className="text-xs sm:text-[13px] text-[#183451]/80 space-y-2.5 font-normal">
              <li>
                <Link to="/our-story" className="hover:text-[#183451] hover:underline underline-offset-4 transition-colors">
                  Our Story &amp; Mission
                </Link>
              </li>
              <li>
                <Link to="/technology" className="hover:text-[#183451] hover:underline underline-offset-4 transition-colors">
                  Rescue Technology
                </Link>
              </li>
              <li>
                <Link to="/victims" className="hover:text-[#183451] hover:underline underline-offset-4 transition-colors">
                  Victim Radar &amp; Triage
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#183451] hover:underline underline-offset-4 transition-colors">
                  Operations Dashboard
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#183451] hover:underline underline-offset-4 transition-colors">
                  Emergency Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Dispatch Center */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <h3 className="font-editorial-serif text-sm tracking-[0.25em] uppercase font-bold text-[#183451]">
              DISPATCH &amp; HQ
            </h3>
            <div className="text-xs sm:text-[13px] text-[#183451]/80 space-y-1.5 leading-relaxed font-normal">
              <p>National Disaster Response Command</p>
              <p>Flood Emergency Operations Zone Alpha</p>
              <p className="pt-1 font-semibold text-[#183451]">+60 3-8888 2000 &nbsp;|&nbsp; 999 APM</p>
            </div>

            {/* Comms Icons */}
            <div className="flex items-center gap-3 pt-2">
              {/* Radio link icon */}
              <a 
                href="#radio" 
                aria-label="Emergency Comms" 
                className="w-7 h-7 rounded-full bg-[#183451] text-[#F3ECDE] flex items-center justify-center hover:opacity-80 transition-opacity shadow-sm"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
              </a>

              {/* Satellite GPS icon */}
              <a 
                href="#gps" 
                aria-label="GPS Mesh" 
                className="w-7 h-7 rounded-full bg-[#183451] text-[#F3ECDE] flex items-center justify-center hover:opacity-80 transition-opacity shadow-sm"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                </svg>
              </a>

              {/* Secure Channel */}
              <a 
                href="#secure" 
                aria-label="Encrypted Telemetry" 
                className="w-7 h-7 rounded-full bg-[#183451] text-[#F3ECDE] flex items-center justify-center hover:opacity-80 transition-opacity shadow-sm"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Copyright & Legal Line */}
        <div className="pt-8 text-center text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[#183451]/70 font-medium">
          <p>
            ©2026 FLOODSCOUT ROBOTICS &nbsp;|&nbsp; AUTONOMOUS RESCUE PLATFORM &nbsp;|&nbsp; TERMS &nbsp;|&nbsp; SAFETY PROTOCOLS
          </p>
        </div>

      </div>
    </footer>
  );
}
