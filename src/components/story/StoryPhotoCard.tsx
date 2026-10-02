import { useState } from 'react';
import { ZoomIn } from 'lucide-react';

interface StoryPhotoCardProps {
  src: string;
  alt: string;
  title?: string;
  aspectRatio?: string;
  onZoom?: (src: string, title: string) => void;
  className?: string;
}

export default function StoryPhotoCard({
  src,
  alt,
  title,
  aspectRatio = 'aspect-[16/10]',
  onZoom,
  className = '',
}: StoryPhotoCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleClick = () => {
    if (onZoom) {
      onZoom(src, title || alt);
    }
  };

  return (
    <div className={`w-full group ${className}`}>
      <div
        onClick={handleClick}
        className="cursor-pointer relative rounded-xl border border-[#162347] bg-white overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
      >
        {/* Pure Clean Photo Container - NO labels, NO tags */}
        <div className={`relative w-full ${aspectRatio} bg-slate-100 overflow-hidden`}>
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-400">
              <span className="font-writing text-xs animate-pulse">Loading photo...</span>
            </div>
          )}

          <img
            src={src}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Hover Zoom Overlay */}
          <div className="absolute inset-0 bg-[#162347]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1px]">
            <span className="p-2 rounded-full bg-white/90 text-[#162347] shadow-md transition-transform group-hover:scale-110">
              <ZoomIn size={16} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
