import React from 'react';
import { Cpu, RefreshCw, Sparkles, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';

interface SkeletonPreviewProps {
  mode?: 'slider' | 'side-by-side' | 'single' | 'grid';
  statusText?: string;
  subText?: string;
  className?: string;
  heightClass?: string;
}

export function SkeletonPreview({
  mode = 'slider',
  statusText = 'Processing image in browser...',
  subText = '100% private in-memory Canvas processing • Zero server uploads',
  className = '',
  heightClass = 'h-72 sm:h-80',
}: SkeletonPreviewProps) {
  if (mode === 'side-by-side') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left panel skeleton */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="h-3.5 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-3.5 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
            <div
              className={`${heightClass} rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 border border-slate-200/80 flex flex-col items-center justify-center relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <ImageIcon className="w-10 h-10 text-slate-300 animate-pulse mb-2" />
              <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Right panel skeleton (processed) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="h-3.5 w-24 bg-blue-200 rounded animate-pulse" />
              <div className="h-3.5 w-16 bg-blue-100 rounded animate-pulse" />
            </div>
            <div
              className={`${heightClass} rounded-2xl bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-slate-100 border border-blue-200/60 flex flex-col items-center justify-center relative overflow-hidden p-6 text-center shadow-inner`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              </div>
              <p className="text-sm font-bold text-slate-800">{statusText}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">{subText}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'grid') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2 relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
              <div className="w-12 h-4 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-32 rounded-xl bg-slate-200/70 animate-pulse flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
            <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'single') {
    return (
      <div
        className={`${heightClass} rounded-2xl bg-gradient-to-br from-slate-100 via-white to-slate-100 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden p-6 text-center ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />

        {/* Scan line effect */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>In-Browser Acceleration</span>
          </div>
          <h4 className="text-sm sm:text-base font-bold text-slate-800">{statusText}</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">{subText}</p>
        </div>
      </div>
    );
  }

  // Default: 'slider' mode comparison skeleton
  return (
    <div
      className={`${heightClass} rounded-2xl bg-slate-100 border border-slate-200 relative overflow-hidden flex items-center justify-center ${className}`}
    >
      {/* Background comparison split skeleton */}
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="bg-slate-100 relative overflow-hidden flex items-center justify-center border-r border-dashed border-slate-300">
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-white/80 backdrop-blur-xs text-[11px] font-semibold text-slate-500 shadow-xs">
            Original Image
          </div>
          <ImageIcon className="w-12 h-12 text-slate-300 animate-pulse" />
        </div>
        <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-100 relative overflow-hidden flex items-center justify-center">
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-blue-100/90 text-[11px] font-bold text-blue-700 shadow-xs">
            Optimized Output
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
          </div>
        </div>
      </div>

      {/* Shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

      {/* Middle Slider Divider Skeleton Handle */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center pointer-events-none z-10">
        <div className="w-0.5 h-full bg-white shadow-md relative">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-blue-600">
            <SlidersHorizontal className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Central Floating Processing Badge */}
      <div className="relative z-20 px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 flex items-center gap-3 max-w-sm mx-4">
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{statusText}</p>
          <p className="text-[11px] text-slate-500 truncate">{subText}</p>
        </div>
      </div>
    </div>
  );
}
