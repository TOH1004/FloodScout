import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  X, 
  ArrowUpRight, 
  ArrowRight 
} from 'lucide-react';
import StoryPhotoCard from '../components/story/StoryPhotoCard';

interface LightboxState {
  isOpen: boolean;
  imageUrl: string;
  title: string;
}

export default function About() {
  const [lightbox, setLightbox] = useState<LightboxState>({
    isOpen: false,
    imageUrl: '',
    title: '',
  });

  const openLightbox = (url: string, title: string) => {
    setLightbox({ isOpen: true, imageUrl: url, title });
  };

  const closeLightbox = () => {
    setLightbox({ isOpen: false, imageUrl: '', title: '' });
  };

  return (
    <div className="w-full bg-[#FAF7F2] text-[#162347] min-h-screen relative overflow-x-hidden selection:bg-[#BED6EE] selection:text-[#162347]">
      
      {/* Background Engineering Notebook Grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(22, 35, 71, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(22, 35, 71, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      {/* ─── Compact Hero Header ─── */}
      <header className="relative z-10 pt-10 sm:pt-14 pb-8 px-4 sm:px-8 max-w-4xl mx-auto text-center">
        <h1 className="font-writing font-bold text-2xl sm:text-3xl md:text-4xl text-[#162347] tracking-tight mb-3">
          From an Idea to a Robot That Moves
        </h1>

        <div className="max-w-2xl mx-auto space-y-2 text-[#162347]/85">
          <p className="font-writing text-xs sm:text-sm leading-relaxed">
            FloodScout didn't begin as a finished rescue robot.
          </p>
          <p className="font-writing text-xs sm:text-sm leading-relaxed">
            It began with a <span className="font-bold underline decoration-amber-500/60 decoration-2 underline-offset-3">draft design</span>, a few ideas, and a simple question:
          </p>
          <div className="pt-1.5">
            <span className="font-writing font-bold text-sm sm:text-base text-[#162347] bg-[#F6F0DC] px-4 py-1.5 rounded-2xl inline-block border border-[#162347] shadow-xs">
              “Can we actually make this work?”
            </span>
          </div>
        </div>
      </header>

      {/* ─── PROCESS STEPS ─── */}
      <main className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto pb-24 space-y-12">

        {/* ═════════════════════════════════════════════════════════
            01 — From a Draft to a Direction
            Collection: 2 CAD / blueprint photos side-by-side (NO labels)
        ═════════════════════════════════════════════════════════ */}
        <section className="relative pt-2">
          <div className="space-y-3">
            {/* Story Content */}
            <div className="space-y-1.5 max-w-3xl">
              <h2 className="font-writing font-bold text-base sm:text-lg text-[#162347] tracking-tight">
                01 — From a Draft to a Direction
              </h2>

              <div className="font-writing text-xs sm:text-sm text-[#162347] leading-relaxed space-y-1.5">
                <p>Our first step was not building. <span className="font-bold text-[#162347]">It was designing.</span></p>
                <p>
                  We started with an initial draft of what FloodScout could look like and how it could work. After several discussions, we refined the idea and confirmed the direction of the robot.
                </p>
                <p>
                  But having a design on paper was only the beginning. <span className="font-bold text-[#162347]">We still had to turn that idea into something real.</span>
                </p>
              </div>
            </div>

            {/* 2-Photo Horizontal Collection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <StoryPhotoCard
                src="/image/section1/IMG-20260902-WA0014.jpg"
                alt="Initial CAD Model"
                aspectRatio="aspect-[16/10]"
                onZoom={openLightbox}
              />
              <StoryPhotoCard
                src="/image/section1/IMG-20260903-WA0024.jpg"
                alt="SolidWorks Technical Draft Blueprint"
                aspectRatio="aspect-[16/10]"
                onZoom={openLightbox}
              />
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════
            02 — Our First Build
            Single Photo: ESP32 breadboard & laptop setup (NO labels)
        ═════════════════════════════════════════════════════════ */}
        <section className="relative pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Story Content */}
            <div className="lg:col-span-7 space-y-2 order-2 lg:order-1">
              <h2 className="font-writing font-bold text-base sm:text-lg text-[#162347] tracking-tight">
                02 — Our First Build
              </h2>

              <div className="font-writing text-xs sm:text-sm text-[#162347] leading-relaxed space-y-1.5">
                <p>We had our first meeting and started building the first part of the prototype.</p>
                <p>This was when we discovered an important lesson:</p>
                
                {/* Highlight Callout */}
                <div className="pl-3.5 border-l-3 border-l-amber-500 py-1 my-1.5 bg-amber-50/60 rounded-r-xl pr-3">
                  <p className="font-writing font-bold text-xs sm:text-sm text-[#162347]">
                    “Not everything that looks possible on paper is practical in the real world.”
                  </p>
                </div>

                <p>Some components did not work the way we expected.</p>
                <p>Some ideas were difficult to implement.</p>
                <p>Some parts of our original design simply had to change.</p>
                <p className="text-[#162347]/70 italic">After the meeting, we were stuck.</p>
                <p className="font-bold text-[#162347]">
                  We knew what we wanted to build, but we were not sure how to move forward.
                </p>
              </div>
            </div>

            {/* Right: Authentic Prototype Photo */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <StoryPhotoCard
                src="/image/section2.jpg"
                alt="First Hardware Assembly"
                aspectRatio="aspect-[4/3]"
                onZoom={openLightbox}
              />
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════
            03 — Finding the Way Forward
            Single Mentor Meeting Photo (NO labels, JUST ONE image)
        ═════════════════════════════════════════════════════════ */}
        <section className="relative pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Story Content */}
            <div className="lg:col-span-7 space-y-2 order-2 lg:order-1">
              <h2 className="font-writing font-bold text-base sm:text-lg text-[#162347] tracking-tight">
                03 — Finding the Way Forward
              </h2>

              <div className="font-writing text-xs sm:text-sm text-[#162347] leading-relaxed space-y-1.5">
                <p className="font-bold text-[#162347]">Then came our meeting with our mentor.</p>
                <p>
                  Instead of continuing to force our original approach, we reviewed the problems we were facing and discussed what could realistically work within our time and resources.
                </p>
                <p>
                  Our mentor recommended different components and helped us clarify the system.
                </p>
                <p className="font-bold text-[#162347]">That changed our direction.</p>
                <p>
                  We replaced some of our original ideas with components that were more suitable for the prototype. And this time, things started to work.
                </p>

                {/* Core Philosophy Highlight */}
                <div className="pl-3.5 border-l-3 border-l-blue-600 py-1 my-1.5 bg-blue-50/60 rounded-r-xl pr-3">
                  <p className="font-writing font-bold text-xs sm:text-sm text-[#162347]">
                    “The project became clearer once we stopped trying to make the original plan perfect and started building what was actually possible.”
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Just ONE Mentor Meeting Photo */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <StoryPhotoCard
                src="/image/section3.jpeg"
                alt="Mentor Consultation Meeting"
                aspectRatio="aspect-[16/10]"
                onZoom={openLightbox}
              />
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════
            04 — Build, Test, Repeat
            Collection: 3 Soldering / test bench photos side-by-side (NO labels)
        ═════════════════════════════════════════════════════════ */}
        <section className="relative pt-2">
          <div className="space-y-3">
            {/* Story Content */}
            <div className="space-y-1.5 max-w-3xl">
              <h2 className="font-writing font-bold text-base sm:text-lg text-[#162347] tracking-tight">
                04 — Build, Test, Repeat
              </h2>

              <div className="font-writing text-xs sm:text-sm text-[#162347] leading-relaxed space-y-1.5">
                <p className="font-bold text-[#162347]">From there, the project became a race against time.</p>
                <p>
                  We had to connect the components, write the code, test the sensors, work on the camera, and build the dashboard — all while figuring things out along the way.
                </p>
                <p>There were problems everywhere.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-1.5 font-writing text-[11px] text-[#162347]">
                  <div className="bg-[#FAF7F2] p-2 rounded-lg border border-[#162347]/20 shadow-xs">
                    <span className="text-rose-600 block font-bold">FAILED TESTS</span>
                    <span>Required recoding</span>
                  </div>
                  <div className="bg-[#FAF7F2] p-2 rounded-lg border border-[#162347]/20 shadow-xs">
                    <span className="text-amber-700 block font-bold">HW BEHAVIOR</span>
                    <span>Motors diverged</span>
                  </div>
                  <div className="bg-[#FAF7F2] p-2 rounded-lg border border-[#162347]/20 shadow-xs">
                    <span className="text-blue-700 block font-bold">TIMELINES</span>
                    <span>Took longer</span>
                  </div>
                </div>

                <p>We spent a lot of time debugging and rebuilding. But every problem gave us something to improve.</p>

                <div className="pl-3.5 border-l-3 border-l-indigo-600 py-1 my-1.5 bg-indigo-50/60 rounded-r-xl pr-3">
                  <p className="font-writing font-bold text-xs sm:text-sm text-[#162347]">
                    “We were no longer just designing a robot. We were learning how to build one.”
                  </p>
                </div>
              </div>
            </div>

            {/* 3-Photo Horizontal Collection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <StoryPhotoCard
                src="/image/section4.jpg"
                alt="Circuit Wiring & Assembly"
                aspectRatio="aspect-[4/3]"
                onZoom={openLightbox}
              />
              <StoryPhotoCard
                src="/image/section4(1).jpg"
                alt="Motor Wiring & Power Routing"
                aspectRatio="aspect-[4/3]"
                onZoom={openLightbox}
              />
              <StoryPhotoCard
                src="/image/section4(2).jpg"
                alt="Hull Assembly & Propulsion Setup"
                aspectRatio="aspect-[4/3]"
                onZoom={openLightbox}
              />
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════
            05 — From the Workbench to the Real World
            Keeping Two Sections: Seaside & Indoor Side-by-Side (NO labels)
        ═════════════════════════════════════════════════════════ */}
        <section className="relative pt-2">
          <div className="space-y-4">
            {/* Story Text */}
            <div className="space-y-1.5 max-w-3xl">
              <h2 className="font-writing font-bold text-base sm:text-lg text-[#162347] tracking-tight">
                05 — From the Workbench to the Real World
              </h2>

              <div className="font-writing text-xs sm:text-sm text-[#162347] leading-relaxed space-y-1.5">
                <p>
                  Eventually, we reached the point where we could take FloodScout outside the development environment and test it in a real setting.
                </p>
                <p>
                  We conducted our demo at the <strong className="font-bold underline decoration-cyan-500/60 decoration-2">seaside</strong>, testing the physical robot and its movement in water.
                </p>
                <p>
                  We also continued testing <strong className="font-bold underline decoration-indigo-500/60 decoration-2">indoors</strong>, where we could demonstrate the camera, detection, dashboard, and other system functions in a more controlled environment.
                </p>
                <p>These tests showed us something important:</p>

                <div className="pl-3.5 border-l-3 border-l-cyan-600 py-1 my-1.5 bg-cyan-50/60 rounded-r-xl pr-3">
                  <p className="font-writing font-bold text-xs sm:text-sm text-[#162347]">
                    “A prototype doesn't need to be perfect to prove that an idea can work.”
                  </p>
                </div>

                <p className="font-bold text-[#162347]">
                  It needs to work well enough for us to see what comes next.
                </p>
              </div>
            </div>

            {/* Two Sections Side-by-Side: Seaside and Indoor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-xs font-writing font-bold text-[#162347] block mb-1.5">
                  Seaside Water Testing
                </span>
                <StoryPhotoCard
                  src="/image/section5_sea.jpg"
                  alt="Seaside Water Testing"
                  aspectRatio="aspect-[16/10]"
                  onZoom={openLightbox}
                />
              </div>

              <div>
                <span className="text-xs font-writing font-bold text-[#162347] block mb-1.5">
                  Indoor Camera & AI Detection
                </span>
                <StoryPhotoCard
                  src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800&auto=format&fit=crop"
                  alt="Indoor Camera & AI Detection"
                  aspectRatio="aspect-[16/10]"
                  onZoom={openLightbox}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════
            06 — From Pieces to a System
            Finished Prototype Photo (NO labels)
        ═════════════════════════════════════════════════════════ */}
        <section className="relative pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Story Text */}
            <div className="lg:col-span-7 space-y-2 order-2 lg:order-1">
              <h2 className="font-writing font-bold text-base sm:text-lg text-[#162347] tracking-tight">
                06 — From Pieces to a System
              </h2>

              <div className="font-writing text-xs sm:text-sm text-[#162347] leading-relaxed space-y-1.5">
                <p>
                  After all the discussions, changes, debugging, and testing, the individual parts finally started coming together.
                </p>

                {/* Subsystem Readiness Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 font-writing text-xs">
                  <div className="flex items-center gap-2 bg-[#F6F0DC]/80 p-2.5 rounded-lg border border-[#162347]/30 shadow-xs">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="font-bold text-[#162347]">The robot could move.</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#F6F0DC]/80 p-2.5 rounded-lg border border-[#162347]/30 shadow-xs">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="font-bold text-[#162347]">Sensors could detect surroundings.</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#F6F0DC]/80 p-2.5 rounded-lg border border-[#162347]/30 shadow-xs">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="font-bold text-[#162347]">Camera could provide visual feed.</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#F6F0DC]/80 p-2.5 rounded-lg border border-[#162347]/30 shadow-xs">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="font-bold text-[#162347]">Dashboard displayed what was happening.</span>
                  </div>
                </div>

                <p>Computer vision could assist with detecting people.</p>
                <p className="font-bold text-[#162347]">What started as a draft had become a working prototype.</p>
                <p>
                  And the wires, boards, sensors, motors, and code had finally become something more:
                </p>

                <div className="pl-3.5 border-l-3 border-l-emerald-600 py-1 my-1.5 bg-emerald-50/60 rounded-r-xl pr-3">
                  <p className="font-writing font-bold text-xs sm:text-sm text-[#162347]">
                    “a possible tool for helping people during floods.”
                  </p>
                </div>
              </div>
            </div>

            {/* Finished Prototype Photo */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <StoryPhotoCard
                src="/image/section6.jpg"
                alt="Complete FloodScout Amphibious Rescue Robot Prototype"
                aspectRatio="aspect-[4/3]"
                onZoom={openLightbox}
              />
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════
            WHAT COMES NEXT?
        ═════════════════════════════════════════════════════════ */}
        <section className="relative pt-6 text-center">
          <div className="relative z-10 max-w-3xl mx-auto">
            
            <h2 className="font-writing font-bold text-xl sm:text-2xl md:text-3xl text-[#162347] tracking-tight mb-2">
              What Comes Next?
            </h2>

            <p className="font-writing text-xs sm:text-sm text-[#162347]/85 max-w-xl mx-auto mb-6 leading-relaxed">
              FloodScout is still a prototype. There is still a lot we want to improve:
            </p>

            {/* What Comes Next Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-left mb-8">
              {[
                { title: 'Better communication', desc: 'Long-range mesh radio & satellite failover telemetry' },
                { title: 'More reliable positioning', desc: 'RTK GPS + visual odometry under flooded structures' },
                { title: 'Improved computer vision', desc: 'Multi-spectrum thermal infrared victim detection' },
                { title: 'More robust navigation', desc: 'Swift-water dynamic collision avoidance' },
                { title: 'Longer operating range', desc: 'High-density LiFePO4 cells and dual propulsion' },
                { title: 'Autonomous rescue assistance', desc: 'Life-vest deployment & direct beacon guidance' },
              ].map((item, idx) => (
                <div key={idx} className="bg-[#F6F0DC]/70 border border-[#162347]/30 rounded-xl p-2.5 hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-4.5 h-4.5 rounded-full bg-[#162347] text-white font-writing font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="font-writing font-bold text-xs text-[#162347]">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[11px] font-writing text-[#162347]/75 pl-6 leading-snug">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* The Hard-Won Lesson */}
            <div className="max-w-2xl mx-auto space-y-3.5 pt-4 border-t border-[#162347]/15 text-center font-writing text-xs sm:text-sm text-[#162347]/90 leading-relaxed">
              <p>But this project taught us that building something real is rarely a straight line.</p>
              
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-writing font-bold text-[#162347]">
                <span>We started with a design.</span>
                <span>&bull;</span>
                <span>We got stuck.</span>
                <span>&bull;</span>
                <span>We asked for guidance.</span>
                <span>&bull;</span>
                <span>We changed our approach.</span>
              </div>

              <p>We spent hours testing and debugging.</p>
              <p className="font-writing font-bold text-xs sm:text-sm text-[#162347]">
                And eventually, we got it working.
              </p>

              <div className="py-2">
                <p className="text-xs font-writing text-[#162347]/70 italic mb-1">
                  Because innovation doesn't happen when the first idea works perfectly.
                </p>
                <div className="p-2.5 rounded-xl bg-[#F6F0DC] border border-[#162347] inline-block shadow-xs">
                  <p className="font-writing font-bold text-xs sm:text-sm text-[#162347]">
                    “It happens when you keep improving the idea until it works in the real world.”
                  </p>
                </div>
              </div>

              {/* The 4-Step Manifesto */}
              <div className="py-4 space-y-1.5">
                <h3 className="font-writing font-bold text-xs sm:text-sm text-[#162347]/70">
                  From a draft.
                </h3>
                <h3 className="font-writing font-bold text-xs sm:text-sm text-[#162347]/80">
                  To a discussion.
                </h3>
                <h3 className="font-writing font-bold text-sm sm:text-base text-[#162347]/90">
                  To a prototype.
                </h3>
                <h3 className="font-writing font-bold text-base sm:text-lg text-[#162347]">
                  To a real-world demo.
                </h3>
                <div className="pt-2">
                  <h2 className="font-writing font-bold text-xl sm:text-3xl text-[#162347] tracking-tight">
                    This is FloodScout.
                  </h2>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/dashboard"
                  className="px-5 py-2 rounded-full bg-[#162347] hover:bg-slate-900 text-white font-writing font-bold text-xs tracking-wider uppercase shadow-xs transition-all hover:scale-105 flex items-center gap-1.5"
                >
                  <span>Open Operations Dashboard</span>
                  <ArrowRight size={13} />
                </Link>
                <Link
                  to="/technology"
                  className="px-5 py-2 rounded-full bg-white hover:bg-slate-50 text-[#162347] font-writing font-bold text-xs tracking-wider uppercase border border-[#162347] transition-all flex items-center gap-1.5"
                >
                  <span>Explore Robot Hardware Specs</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* ─── Clean Lightbox Modal for Enlargeable Images (NO labels) ─── */}
      {lightbox.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#162347]/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-4xl w-full bg-black border border-[#162347] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-950 flex items-center justify-center">
              <img
                src={lightbox.imageUrl}
                alt={lightbox.title}
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                aria-label="Close image viewer"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
