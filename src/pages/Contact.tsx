import { useState } from 'react';
import { Mail, Phone, MapPin, CheckCircle } from 'lucide-react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="w-full bg-[#FAF7F2] text-[#162347] py-16 sm:py-24 px-6 sm:px-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-[11px] font-bold tracking-[0.35em] text-[#162347]/70 uppercase block mb-2">
          DISASTER RESPONSE DISPATCH
        </span>
        <h1 className="font-script text-4xl sm:text-5xl md:text-6xl text-[#162347] font-bold tracking-tight mb-4">
          Contact Us
        </h1>
        <p className="font-editorial-serif text-lg tracking-[0.15em] text-[#162347]/80 uppercase">
          Emergency Deployment &amp; Agency Inquiries
        </p>
        <div className="w-16 h-[1px] bg-[#162347]/30 mx-auto mt-4"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start max-w-5xl mx-auto">
        
        {/* Left info column */}
        <div className="lg:col-span-5 space-y-8 text-left">
          <div>
            <h3 className="font-editorial-serif text-base font-semibold tracking-[0.2em] uppercase mb-4 text-[#162347]">
              Headquarters &amp; Command
            </h3>
            <p className="text-xs sm:text-[13px] text-[#162347]/80 leading-relaxed font-normal">
              Direct telemetry uplink stations and rapid drone-boat deployment hubs located in high-risk monsoon flood basins. Available 24/7 for civil defense, state disaster management, and NGO emergency units.
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-[13px] text-[#162347]/80 font-normal">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-[#162347] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#162347]">FloodScout Robotics HQ</p>
                <p>National Disaster Logistics Hub</p>
                <p>Klang Valley &amp; Johor Regional Centers</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone size={18} className="text-[#162347] shrink-0" />
              <p>+60 3-8888 2000 &nbsp;|&nbsp; 999 APM</p>
            </div>

            <div className="flex items-center gap-3">
              <Mail size={18} className="text-[#162347] shrink-0" />
              <p>dispatch@floodscout.org</p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6DFD5]">
            <h4 className="font-editorial-serif text-xs font-semibold tracking-[0.2em] uppercase mb-2 text-[#162347]">
              Operational Readiness
            </h4>
            <p className="text-xs text-[#162347]/70 leading-relaxed font-normal">
              Active rapid deployment teams on standby 24 hours daily with encrypted telemetry frequencies and emergency LoRa repeater relays.
            </p>
          </div>
        </div>

        {/* Right form column */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-10 border border-[#E6DFD5] shadow-lg">
          {submitted ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-[#BED6EE]/40 text-[#162347] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-editorial-serif text-xl tracking-[0.15em] uppercase font-semibold mb-2 text-[#162347]">
                Dispatch Request Received
              </h3>
              <p className="text-xs text-[#162347]/70 max-w-sm mx-auto leading-relaxed mb-6 font-normal">
                Our disaster operations command has received your deployment parameters and will establish direct radio telemetry uplink.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="bg-[#162347] text-[#FAF7F2] px-6 py-2.5 rounded-full text-[11px] tracking-[0.2em] uppercase font-semibold hover:bg-[#0E172E] transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <h3 className="font-editorial-serif text-base font-semibold tracking-[0.2em] uppercase mb-4 text-[#162347]">
                Request Deployment / Inquire
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-[#162347]/70 font-semibold mb-1">
                    Responder Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#FAF7F2] border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162347] focus:outline-none focus:border-[#162347]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-[#162347]/70 font-semibold mb-1">
                    Agency / Organization
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APM / Bomba / NGO"
                    className="w-full bg-[#FAF7F2] border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162347] focus:outline-none focus:border-[#162347]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#162347]/70 font-semibold mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full bg-[#FAF7F2] border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162347] focus:outline-none focus:border-[#162347]"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#162347]/70 font-semibold mb-1">
                  Deployment Scope
                </label>
                <select className="w-full bg-[#FAF7F2] border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162347] focus:outline-none focus:border-[#162347]">
                  <option>Emergency Flash Flood Search Deployment</option>
                  <option>Regional Flood Monitoring Station Setup</option>
                  <option>Pilot Training &amp; Rescue Fleet Integration</option>
                  <option>Technical Partnership &amp; Research Inquiries</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#162347]/70 font-semibold mb-1">
                  Incident Location &amp; Details
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide flood location coordinates, expected depth, and number of trapped residents..."
                  className="w-full bg-[#FAF7F2] border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162347] placeholder-[#162347]/40 focus:outline-none focus:border-[#162347]"
                ></textarea>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#162347] text-[#FAF7F2] py-3.5 rounded-full text-xs font-semibold tracking-[0.25em] uppercase hover:bg-[#0E172E] transition-all shadow-md"
                >
                  Transmit Dispatch Request
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
