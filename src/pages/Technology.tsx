import { Link } from 'react-router-dom';

export default function Technology() {
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

  return (
    <div className="w-full bg-[#FAF7F2] text-[#162347] py-16 sm:py-24 px-6 sm:px-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-[11px] font-bold tracking-[0.35em] text-[#162347]/70 uppercase block mb-2">
          ENGINEERING &amp; HARDWARE ARCHITECTURE
        </span>
        <h1 className="font-script text-6xl sm:text-7xl text-[#162347] mb-4">
          Rescue Technology
        </h1>
        <p className="font-editorial-serif text-lg tracking-[0.15em] text-[#162347]/80 uppercase">
          Autonomous Water-Level Systems &amp; AI Vision
        </p>
        <div className="w-16 h-[1px] bg-[#162347]/30 mx-auto mt-4"></div>
      </div>

      {/* Hero Showcase Image */}
      <div className="w-full aspect-[21/9] overflow-hidden border border-[#E6DFD5] shadow-md mb-20">
        <img
          src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1600&auto=format&fit=crop"
          alt="Rescue Robotics Hardware Engineering"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Spec Sections */}
      <div className="space-y-16 max-w-4xl mx-auto">
        {techSpecs.map((section, idx) => (
          <div key={idx} className="border-t border-[#E6DFD5] pt-10">
            <h3 className="font-editorial-serif text-base sm:text-lg font-bold tracking-[0.25em] text-center uppercase text-[#162347] mb-10">
              {section.category}
            </h3>

            <div className="space-y-8">
              {section.items.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E6DFD5]/40 pb-4">
                  <div className="pr-4">
                    <h4 className="font-editorial-serif text-sm sm:text-base font-semibold tracking-wide text-[#162347]">
                      {item.name}
                    </h4>
                    <p className="text-xs text-[#162347]/70 mt-1 font-normal">
                      {item.desc}
                    </p>
                  </div>
                  <span className="font-editorial-serif text-sm sm:text-base font-bold text-[#162347] self-end sm:self-auto shrink-0 font-mono">
                    {item.spec}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Launch Dashboard Action */}
      <div className="text-center pt-16">
        <Link
          to="/dashboard"
          className="bg-[#162347] text-[#FAF7F2] hover:bg-[#0E172E] px-10 py-3.5 rounded-full text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 shadow-md inline-block"
        >
          ENTER RESCUE DASHBOARD
        </Link>
      </div>
    </div>
  );
}
