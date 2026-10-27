import { useEffect, useState } from 'react';

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  gaMeasurementId: string;
  adsEnabled: boolean;
  adsensePublisherId: string;
  adSlots: {
    top: string;
    sidebar: string;
    bottom: string;
  };
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'PicShrink',
  siteDescription: 'Free online image tools for compressing, converting, resizing, and editing images.',
  gaMeasurementId: '',
  adsEnabled: false,
  adsensePublisherId: '',
  adSlots: { top: '', sidebar: '', bottom: '' },
};

const LOCAL_SETTINGS_KEY = 'picshrink_site_settings';
const SETTINGS_UPDATED_EVENT = 'picshrink-site-settings-updated';

export function getLocalSiteSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    const settings = JSON.parse(raw) as Partial<SiteSettings>;
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...settings,
      adSlots: { ...DEFAULT_SITE_SETTINGS.adSlots, ...settings.adSlots },
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function saveLocalSiteSettings(settings: SiteSettings): void {
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
}

export function onSiteSettingsUpdated(callback: () => void): () => void {
  window.addEventListener(SETTINGS_UPDATED_EVENT, callback);
  return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, callback);
}

export function usePublicSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(getLocalSiteSettings);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchPublicSiteSettings()
        .catch(() => getLocalSiteSettings())
        .then((nextSettings) => {
          if (active) setSettings(nextSettings);
        });
    };
    refresh();
    window.addEventListener(SETTINGS_UPDATED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(SETTINGS_UPDATED_EVENT, refresh);
    };
  }, []);

  return settings;
}

export async function fetchPublicSiteSettings(): Promise<SiteSettings> {
  const response = await fetch('/api/settings', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Site settings could not be loaded.');
  return { ...DEFAULT_SITE_SETTINGS, ...await response.json() as Partial<SiteSettings> };
}
