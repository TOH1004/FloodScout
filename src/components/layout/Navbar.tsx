import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu } from 'lucide-react';
import { useRescue } from '../../context/RescueContext';

interface NavbarProps {
  onOpenDeploy?: () => void;
}

export default function Navbar({ onOpenDeploy }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { victims } = useRescue();

  const activeVictimsCount = victims.filter((v) => v.status !== 'Rescued').length;

  const navLinks = [
    { name: 'HOME', path: '/' },
    { name: 'OUR STORY', path: '/our-story' },
    { name: 'TECHNOLOGY', path: '/technology' },
    { name: 'VICTIM RADAR', path: '/victims' },
    { name: 'CONTACT', path: '/contact' },
  ];

  return (
    <header className="w-full bg-[#FAF7F2] select-none border-b border-[#E6DFD5]">
      {/* 1. Top Logo Header */}
      {location.pathname === '/' ? (
        <div className="py-6 px-4 md:px-8 text-center relative">
          <Link 
            to="/" 
            className="inline-block hover:opacity-90 transition-opacity"
          >
            <h1 className="font-script text-5xl sm:text-6xl md:text-7xl text-[#162347] leading-none tracking-normal font-normal">
              FloodScout
            </h1>
            <span className="block text-[10px] font-editorial-serif tracking-[0.35em] text-[#162347]/70 uppercase mt-1">
              Autonomous Water-Level Rescue Robotics
            </span>
          </Link>

          {/* Mobile menu hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 text-[#162347] p-2"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      ) : (
        <div className="md:hidden py-4 px-4 flex justify-between items-center relative">
          <Link to="/" className="font-script text-3xl text-[#162347]">FloodScout</Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#162347] p-2"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      )}

      {/* 2. Main Navigation Bar */}
      <nav className={`bg-[#FAF7F2] hidden md:block ${location.pathname === '/' ? 'border-t border-[#E6DFD5]' : ''}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between py-3.5 px-6">
          {/* Empty Left Spacer (for perfect centering) */}
          <div className="flex-1 hidden lg:block"></div>

          {/* Centered Links */}
          <div className="flex items-center justify-center gap-6 lg:gap-10 flex-none">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path ||
                (link.path === '/our-story' && location.pathname === '/about') ||
                (link.path === '/technology' && location.pathname === '/dine') ||
                (link.path === '/victims' && location.pathname === '/socialize');

              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-[11px] lg:text-[13px] tracking-[0.25em] font-medium transition-all duration-200 relative py-1 ${
                    isActive 
                      ? 'text-[#162347] font-semibold after:content-[""] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-[1.5px] after:bg-[#162347]' 
                      : 'text-[#162347]/75 hover:text-[#162347]'
                  }`}
                >
                  {link.name}
                  {link.name === 'VICTIM RADAR' && activeVictimsCount > 0 && (
                    <span className="ml-1.5 bg-[#162347] text-[#FAF7F2] text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {activeVictimsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          
          {/* Launch Dashboard CTA (Right Aligned) */}
          <div className="flex-1 flex justify-end pl-4">
            <Link
              to="/dashboard"
              className="bg-[#162347] text-[#FAF7F2] hover:bg-[#0E172E] px-4 lg:px-6 py-2 rounded-full text-[9px] lg:text-[10px] font-bold tracking-[0.2em] uppercase transition-all shadow-sm hover:shadow-md inline-block whitespace-nowrap"
            >
              Launch Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E6DFD5] bg-[#FAF7F2] py-4 px-6 flex flex-col items-center gap-3 text-center animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs tracking-[0.25em] font-medium text-[#162347] py-2 w-full hover:bg-[#E6DFD5]/40 transition-colors flex items-center justify-center gap-2"
            >
              <span>{link.name}</span>
              {link.name === 'VICTIM RADAR' && activeVictimsCount > 0 && (
                <span className="bg-[#162347] text-[#FAF7F2] text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                  {activeVictimsCount}
                </span>
              )}
            </Link>
          ))}
          {onOpenDeploy && (
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full mt-2 bg-[#162347] text-[#FAF7F2] py-2.5 rounded-full text-xs tracking-[0.2em] uppercase font-semibold shadow-md block text-center"
            >
              Launch Dashboard
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
