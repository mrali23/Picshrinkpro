import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  Scissors,
  Wand2,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface ShowcaseMode {
  id: 'compress' | 'bg' | 'filter';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  beforeImg: string;
  afterImg: string;
  beforeLabel: string;
  afterLabel: string;
  beforeStats: string;
  afterStats: string;
  savingsBadge: string;
  toolPath: string;
  toolActionText: string;
  isCutout?: boolean;
  filterStyle?: React.CSSProperties;
}

const MODES: ShowcaseMode[] = [
  {
    id: 'compress',
    label: 'Compress',
    icon: Zap,
    tag: 'Smart Compression Engine',
    // Optimized Unsplash: smaller width for display size + lower quality for "after"
    beforeImg:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=75&fm=webp',
    afterImg:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=40&fm=webp',
    beforeLabel: 'Original RAW (3.8 MB)',
    afterLabel: 'PicShrink WebP (482 KB)',
    beforeStats: '3.8 MB • Uncompressed',
    afterStats: '482 KB • Zero Quality Loss (-87%)',
    savingsBadge: '-87% Smaller',
    toolPath: '/compressor',
    toolActionText: 'Compress Photos Free',
  },
  {
    id: 'bg',
    label: 'Remove BG',
    icon: Scissors,
    tag: 'E-Commerce & Product Cutouts',
    beforeImg: '/assets/headphones_cutout.webp',
    afterImg: '/assets/headphones_cutout.webp',
    beforeLabel: 'With Studio Backdrop',
    afterLabel: 'Clean Cutout (PNG)',
    beforeStats: 'Studio Background',
    afterStats: 'Transparent 4K PNG Cutout',
    savingsBadge: 'Instant Cutout',
    toolPath: '/bg-remover',
    toolActionText: 'Remove Background Free',
    isCutout: true,
  },
  {
    id: 'filter',
    label: 'Magic Filter',
    icon: Wand2,
    tag: 'Canvas GPU Shader',
    beforeImg:
      'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=75&fm=webp',
    afterImg:
      'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=75&fm=webp',
    beforeLabel: 'Original Camera Shot',
    afterLabel: 'Cyberpunk Neon Grade',
    beforeStats: 'Standard Colors',
    afterStats: 'Vibrant Contrast & Saturation',
    savingsBadge: 'GPU Accelerated',
    toolPath: '/filters',
    toolActionText: 'Apply Photo Filters',
    filterStyle: {
      filter: 'contrast(140%) saturate(190%) hue-rotate(20deg) brightness(105%)',
    },
  },
];

export function HeroInteractiveShowcase() {
  const [activeMode, setActiveMode] = useState<'compress' | 'bg' | 'filter'>('compress');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = MODES.find((m) => m.id === activeMode) || MODES[0];

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className="relative w-full max-w-lg mx-auto select-none">
      <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-[36px] opacity-25 blur-2xl group-hover:opacity-40 transition duration-1000 -z-10" />

      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Interactive Live Preview
            </span>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isActive = activeMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setActiveMode(m.id);
                    setSliderPosition(50);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSliderPosition((p) => Math.max(0, p - 5));
            if (e.key === 'ArrowRight') setSliderPosition((p) => Math.min(100, p + 5));
          }}
          className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize bg-slate-900 shadow-inner group focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Drag slider or click anywhere to compare Before and After"
        >
          {/* BASE LAYER: AFTER */}
          <div className="absolute inset-0 w-full h-full">
            {current.isCutout ? (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`,
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    backgroundColor: '#f8fafc',
                  }}
                />
                <img
                  src={current.afterImg}
                  alt={current.afterLabel}
                  width={800}
                  height={600}
                  decoding="async"
                  loading="eager"
                  fetchPriority="high"
                  className="w-full h-full object-contain p-6 relative z-10 drop-shadow-2xl select-none"
                />
              </div>
            ) : (
              <img
                src={current.afterImg}
                alt={current.afterLabel}
                width={800}
                height={600}
                decoding="async"
                loading="eager"
                fetchPriority="high"
                className="w-full h-full object-cover select-none"
                style={current.filterStyle}
              />
            )}

            <div className="absolute top-3 right-3 z-10">
              <span className="px-2.5 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-black shadow-lg flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {current.afterLabel}
              </span>
            </div>
          </div>

          {/* TOP LAYER: BEFORE */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
            style={{
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            }}
          >
            {current.isCutout ? (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(99,102,241,0.3),transparent_65%)]" />
                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
                <img
                  src={current.beforeImg}
                  alt={current.beforeLabel}
                  width={800}
                  height={600}
                  decoding="async"
                  className="w-full h-full object-contain p-6 relative z-10 drop-shadow-2xl select-none"
                />
              </div>
            ) : (
              <img
                src={current.beforeImg}
                alt={current.beforeLabel}
                width={800}
                height={600}
                decoding="async"
                className="w-full h-full object-cover select-none"
              />
            )}

            <div className="absolute top-3 left-3 z-10">
              <span className="px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-black shadow-lg border border-slate-700/60">
                {current.beforeLabel}
              </span>
            </div>
          </div>

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.6)] z-20 pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-2xl border-2 border-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <div className="flex gap-1">
                <span className="w-0.5 h-3.5 bg-blue-600 rounded-full"></span>
                <span className="w-0.5 h-3.5 bg-blue-600 rounded-full"></span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 inset-x-0 mx-auto w-fit z-10 px-3.5 py-1 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white/90 shadow-md pointer-events-none flex items-center gap-2">
            <span>Drag slider to compare</span>
            <span className="text-blue-400 font-bold">•</span>
            <span className="text-emerald-400 font-black">{current.savingsBadge}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Before Processing
            </span>
            <span className="font-extrabold text-slate-800 font-mono text-xs sm:text-sm">
              {current.beforeStats}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80">
            <span className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider">
              After PicShrink
            </span>
            <span className="font-extrabold text-blue-700 font-mono text-xs sm:text-sm">
              {current.afterStats}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
          <div className="flex items-center gap-1 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local Image Processing</span>
          </div>
          <div className="flex items-center gap-1 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Client GPU ~12ms</span>
          </div>
        </div>

        <Link
          to={current.toolPath}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group"
        >
          <span>{current.toolActionText}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
