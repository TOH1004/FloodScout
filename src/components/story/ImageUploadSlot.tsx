import React, { useState, useRef } from 'react';
import { Upload, X, ZoomIn, Image as ImageIcon, Camera } from 'lucide-react';

interface ImageUploadSlotProps {
  id: string;
  stepNumber: string;
  title: string;
  subtitle?: string;
  defaultPlaceholderUrl?: string;
  initialCaption?: string;
  onImageZoom?: (url: string, title: string) => void;
}

export default function ImageUploadSlot({
  id,
  stepNumber,
  title,
  subtitle = 'Drop photo here or click to browse',
  defaultPlaceholderUrl,
  initialCaption = '',
  onImageZoom,
}: ImageUploadSlotProps) {
  const storageKey = `floodscout_story_img_${id}`;
  const captionKey = `floodscout_story_cap_${id}`;

  const [imageUrl, setImageUrl] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return defaultPlaceholderUrl || null;
  });

  const [caption, setCaption] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(captionKey);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return initialCaption;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP, etc.)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImageUrl(result);
        try {
          localStorage.setItem(storageKey, result);
        } catch (err) {
          console.warn('Storage unavailable or quota exceeded:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageUrl(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const handleCaptionSave = (newCap: string) => {
    setCaption(newCap);
    try {
      localStorage.setItem(captionKey, newCap);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`group relative rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
          isDragging
            ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-400/40'
            : imageUrl
            ? 'border-[#162347] bg-white shadow-xs hover:shadow-md'
            : 'border-dashed border-[#162347]/40 bg-[#FAF8F5] hover:border-[#162347] hover:bg-white'
        }`}
      >
        {imageUrl ? (
          <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-slate-100">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
            />

            {/* Hover overlay with action buttons */}
            <div className="absolute inset-0 bg-[#162347]/65 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-3 backdrop-blur-xs">
              {onImageZoom && (
                <button
                  type="button"
                  onClick={() => onImageZoom(imageUrl, caption || title)}
                  className="px-2.5 py-1 rounded-full bg-white text-[#162347] hover:bg-slate-100 text-[11px] font-writing font-bold flex items-center gap-1 shadow-sm transition-all hover:scale-105"
                >
                  <ZoomIn size={12} />
                  <span>Enlarge</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-full bg-[#162347] text-white hover:bg-slate-900 text-[11px] font-writing font-bold flex items-center gap-1 shadow-sm transition-all hover:scale-105"
              >
                <Upload size={12} />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 text-[11px] shadow-sm transition-all hover:scale-105"
                title="Remove photo"
              >
                <X size={13} />
              </button>
            </div>

            {/* Top Badge */}
            <div className="absolute top-2 left-2 pointer-events-none">
              <span className="bg-[#162347]/90 backdrop-blur-xs text-white text-[9px] font-writing font-bold tracking-wider px-2 py-0.5 rounded shadow-xs">
                {stepNumber} &bull; Image Slot
              </span>
            </div>
          </div>
        ) : (
          /* Blank / Upload State */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer aspect-[16/10] sm:aspect-[4/3] w-full flex flex-col items-center justify-center p-4 text-center transition-colors group-hover:bg-[#F5F1E9]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFE9DE] border border-[#162347]/30 text-[#162347] flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform">
              <Camera size={18} />
            </div>

            <span className="font-writing font-bold text-xs text-[#162347] block mb-0.5">
              + Insert Photo for this Step
            </span>
            <p className="font-writing text-[10px] text-[#162347]/70 max-w-[220px] leading-snug mb-2">
              {subtitle}
            </p>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#162347] text-white hover:bg-slate-900 text-[10px] font-writing font-bold transition-all shadow-xs">
              <ImageIcon size={11} />
              Upload Image
            </span>
          </div>
        )}

        {/* Caption Bar */}
        <div className="px-3 py-1.5 bg-[#FAF7F2] border-t border-[#162347]/20 flex items-center justify-between text-[11px]">
          {isEditingCaption ? (
            <input
              type="text"
              defaultValue={caption}
              autoFocus
              onBlur={(e) => {
                setIsEditingCaption(false);
                handleCaptionSave(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingCaption(false);
                  handleCaptionSave((e.target as HTMLInputElement).value);
                }
              }}
              className="w-full bg-white border border-[#162347]/50 rounded px-2 py-0.5 text-[11px] text-[#162347] focus:outline-none font-writing"
              placeholder="Enter photo notes..."
            />
          ) : (
            <span
              onClick={() => setIsEditingCaption(true)}
              className="font-writing text-[#162347]/80 hover:text-[#162347] cursor-pointer truncate flex-1 text-[11px]"
              title="Click to edit caption"
            >
              📷 {caption || 'Add photo caption / note (click to edit)'}
            </span>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ml-2 text-[9px] text-[#162347]/70 hover:text-[#162347] uppercase font-writing font-bold tracking-wider shrink-0"
          >
            {imageUrl ? 'Change' : 'Browse'}
          </button>
        </div>
      </div>
    </div>
  );
}
