import React, { useState, useRef, useCallback } from 'react';
import { ChevronsLeftRight, Eye, Sparkles } from 'lucide-react';

interface BeforeAfterSliderProps {
  originalUrl: string;
  processedUrl: string;
  originalLabel?: string;
  processedLabel?: string;
  aspectRatioClass?: string;
  className?: string;
  isTransparentBg?: boolean;
  isEyedropperActive?: boolean;
  onColorPick?: (rgb: { r: number; g: number; b: number }) => void;
}

export function BeforeAfterSlider({
  originalUrl,
  processedUrl,
  originalLabel = 'Original',
  processedLabel = 'Processed',
  className = '',
  isTransparentBg = false,
  isEyedropperActive = false,
  onColorPick,
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImgRef = useRef<HTMLImageElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(Math.round(clampedPos));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEyedropperActive && onColorPick && originalImgRef.current) {
      e.preventDefault();
      const img = originalImgRef.current;
      const rect = img.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        const scaleX = img.naturalWidth / rect.width;
        const scaleY = img.naturalHeight / rect.height;
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, x * scaleX, y * scaleY, 1, 1, 0, 0, 1, 1);
          const pixel = ctx.getImageData(0, 0, 1, 1).data;
          onColorPick({ r: pixel[0], g: pixel[1], b: pixel[2] });
          return;
        }
      }
    }

    setIsDragging(true);
    updatePosition(e.clientX);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && !isEyedropperActive) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  };

  const transparentStyle = isTransparentBg
    ? {
        backgroundImage:
          'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
        backgroundColor: '#ffffff',
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
      }
    : undefined;

  return (
    <div className={`relative select-none ${className}`}>
      {/* Slider Viewport Container */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full h-[320px] sm:h-[440px] rounded-2xl bg-slate-900 border border-slate-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner group ${
          isEyedropperActive ? 'cursor-crosshair ring-2 ring-pink-500' : 'cursor-ew-resize'
        }`}
        style={transparentStyle}
        title={isEyedropperActive ? 'Click on the image to sample background color' : 'Drag the slider or click anywhere to compare Before and After'}
      >
        {/* Layer 1: Processed (Bottom layer, full width) */}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <img
            src={processedUrl}
            alt={processedLabel}
            className="max-h-full max-w-full object-contain pointer-events-none transition-opacity duration-150"
          />
        </div>

        {/* Hidden or overlay reference image for sampling */}
        <img
          ref={originalImgRef}
          src={originalUrl}
          alt="Original Reference"
          className="hidden"
          crossOrigin="anonymous"
        />

        {/* Layer 2: Original (Top layer, clipped to slider position) */}
        <div
          className="absolute inset-0 flex items-center justify-center p-2 overflow-hidden pointer-events-none"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          }}
        >
          <img
            src={originalUrl}
            alt={originalLabel}
            className="max-h-full max-w-full object-contain pointer-events-none"
          />
        </div>

        {/* Divider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.6)] z-20 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Circular Grab Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white text-slate-800 shadow-xl border-2 border-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
            <ChevronsLeftRight className="w-4 h-4 text-blue-600" />
          </div>
        </div>

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 z-30 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold tracking-wide shadow-md flex items-center gap-1.5 border border-slate-700/60">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            {originalLabel}
          </span>
        </div>

        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-bold tracking-wide shadow-md flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-300" />
            {processedLabel}
          </span>
        </div>

        {/* Bottom Helper Hint */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <span className="px-3.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-sm text-slate-200 text-[10px] font-medium shadow-xs">
            Drag handle left or right to compare
          </span>
        </div>
      </div>
    </div>
  );
}
