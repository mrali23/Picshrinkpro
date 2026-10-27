import { useEffect, useRef } from 'react';
import { usePublicSiteSettings } from '../../utils/siteSettings';

interface AdBannerProps {
  type: 'top' | 'sidebar' | 'bottom';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export function AdBanner({ type, className = '' }: AdBannerProps) {
  const settings = usePublicSiteSettings();
  const adRef = useRef<HTMLModElement>(null);

  const slot = settings.adSlots[type];
  const hasAd = settings.adsEnabled && /^ca-pub-\d{8,24}$/.test(settings.adsensePublisherId) && /^\d{1,24}$/.test(slot);

  useEffect(() => {
    if (!hasAd) return;
    const scriptId = 'picshrink-adsense-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(settings.adsensePublisherId)}`;
      document.head.appendChild(script);
    }

    const element = adRef.current;
    if (!element || element.dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error('AdSense ad could not be initialized:', error);
    }
  }, [hasAd, settings.adsensePublisherId, slot]);

  if (hasAd) {
    const isSidebar = type === 'sidebar';
    return (
      <div className={`mx-auto my-6 w-full overflow-hidden text-center ${isSidebar ? 'max-w-[300px]' : 'max-w-[728px]'} ${className}`}>
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Advertisement</span>
        <ins key={`${settings.adsensePublisherId}-${slot}`} ref={adRef} className="adsbygoogle"
          style={{ display: 'block', minHeight: isSidebar ? 250 : 90 }}
          data-ad-client={settings.adsensePublisherId}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true" />
      </div>
    );
  }

  const dimensions = type === 'sidebar' ? 'h-[250px] max-w-[300px]' : 'h-[90px] max-w-[728px]';
  return (
    <div className={`mx-auto my-6 w-full ${dimensions} ${className}`}>
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100/80 px-4 text-center">
        <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Advertisement</span>
        <span className="text-xs font-medium text-slate-500">
          {settings.adsEnabled ? 'Add a publisher ID and this placement’s AdSense slot ID in Admin → Site settings.' : 'AdSense is not configured.'}
        </span>
      </div>
    </div>
  );
}
