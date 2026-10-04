import React from 'react';

interface FloodScoutLogoProps {
  className?: string;
  showText?: boolean;
  textSize?: string;
  variant?: 'icon' | 'full';
}

export const FloodScoutLogo: React.FC<FloodScoutLogoProps> = ({
  className = 'w-9 h-9',
  showText = false,
  textSize = 'text-xl',
  variant = 'icon',
}) => {
  if (variant === 'full') {
    return (
      <img
        src="/logo.png"
        alt="FLOODSCOUT"
        className="h-9 w-auto object-contain select-none"
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-3 select-none">
      <img
        src="/logo-icon.png"
        alt="FloodScout Logo"
        className={`${className} object-contain rounded-xl shadow-sm hover:scale-105 transition-transform duration-200`}
      />
      {showText && (
        <span className={`font-black tracking-widest text-white font-sans ${textSize}`}>
          FLOODSCOUT
        </span>
      )}
    </div>
  );
};

export default FloodScoutLogo;
