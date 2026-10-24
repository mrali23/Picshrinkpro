interface AdBannerProps {
  type: 'top' | 'sidebar' | 'bottom';
  className?: string;
}

export function AdBanner({ type, className = '' }: AdBannerProps) {
  if (type === 'top') {
    return (
      <div className={`ads-top my-6 mx-auto w-full max-w-[728px] overflow-hidden ${className}`}>
        <div className="flex flex-col items-center justify-center h-[90px] bg-slate-100/80 border border-dashed border-slate-300 rounded-xl px-4 text-center transition-all hover:bg-slate-100">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
            Advertisement
          </span>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500/50"></span>
            728 x 90 Responsive Leaderboard Ad Placement
          </div>
        </div>
      </div>
    );
  }

  if (type === 'sidebar') {
    return (
      <div className={`ads-sidebar w-full max-w-[300px] mx-auto my-4 overflow-hidden ${className}`}>
        <div className="flex flex-col items-center justify-center h-[250px] bg-slate-100/80 border border-dashed border-slate-300 rounded-xl p-4 text-center transition-all hover:bg-slate-100">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
            Advertisement
          </span>
          <div className="text-xs text-slate-500 font-medium">
            300 x 250 Medium Rectangle Ad
          </div>
          <p className="text-[11px] text-slate-400 mt-2 max-w-[200px]">
            High-converting targeted sponsor ad slot
          </p>
        </div>
      </div>
    );
  }

  // type === 'bottom'
  return (
    <div className={`ads-bottom my-8 mx-auto w-full max-w-[728px] overflow-hidden ${className}`}>
      <div className="flex flex-col items-center justify-center min-h-[90px] py-4 bg-slate-100/80 border border-dashed border-slate-300 rounded-xl px-4 text-center transition-all hover:bg-slate-100">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
          Advertisement
        </span>
        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500/50"></span>
          Post-Download Banner Ad (728 x 90)
        </div>
      </div>
    </div>
  );
}
