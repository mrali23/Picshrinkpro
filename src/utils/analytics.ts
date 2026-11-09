import { DEFAULT_SITE_SETTINGS, fetchPublicSiteSettings, getLocalSiteSettings } from './siteSettings';

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  type: 'pageview' | 'tool_run' | 'zip_download' | 'filter_applied';
  path: string;
  details?: Record<string, unknown>;
}

export interface AnalyticsSummary {
  realtimeActiveUsers: number;
  todayPageviews: number;
  totalImagesProcessed: number;
  totalMegabytesSaved: number;
  popularTools: { name: string; count: number }[];
  recentEvents: AnalyticsEvent[];
  gaMeasurementId: string;
}

type StoredAnalytics = { events: AnalyticsEvent[]; counts: Record<string, number>; mbSaved: number };
const STORAGE_KEY = 'picshrink_analytics_v2';
const VISITOR_KEY = 'picshrink_visitor_id';
let activeMeasurementId = '';

function readStored(): StoredAnalytics {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [], counts: {}, mbSaved: 0 };
    const value = JSON.parse(raw) as Partial<StoredAnalytics>;
    return {
      events: Array.isArray(value.events) ? value.events.filter((event) => event && Number.isFinite(event.timestamp)) : [],
      counts: value.counts && typeof value.counts === 'object' ? value.counts : {},
      mbSaved: Number.isFinite(value.mbSaved) && (value.mbSaved as number) > 0 ? value.mbSaved as number : 0,
    };
  } catch {
    return { events: [], counts: {}, mbSaved: 0 };
  }
}

function persist(data: StoredAnalytics): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Local analytics could not be saved:', error);
  }
}

/** The admin area must never be tracked: it would skew stats and load advertising and remarketing requests. */
export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

function isValidGa(id: string): boolean {
  return /^G-[A-Z0-9]+$/i.test(id);
}

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
}

function sendSharedEvent(type: 'pageview' | 'tool_run', path: string): void {
  if (isAdminPath(path)) return;
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, path, visitorId: visitorId() }),
    keepalive: true,
  }).then((response) => {
    if (response.headers.get('Content-Type')?.includes('application/json') && !response.ok) {
      console.warn('Shared analytics event was rejected:', response.status);
    }
  }).catch((error: unknown) => {
    console.warn('Shared analytics could not be reached:', error);
  });
}

function configureGA4(measurementId: string): void {
  const id = measurementId.trim();
  if (typeof window !== 'undefined' && isAdminPath(window.location.pathname)) return;
  if (!isValidGa(id) || typeof window === 'undefined') {
    if (!id && activeMeasurementId) {
      document.getElementById('ga4-script')?.remove();
      activeMeasurementId = '';
    }
    return;
  }
  const win = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  win.dataLayer = win.dataLayer || [];
  win.gtag = win.gtag || ((...args: unknown[]) => { win.dataLayer?.push(args); });
  if (activeMeasurementId !== id) {
    document.getElementById('ga4-script')?.remove();
    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(script);
    win.gtag('js', new Date());
    activeMeasurementId = id;
  }
  win.gtag('config', id, { send_page_view: false, transport_type: 'beacon' });
  win.gtag('event', 'page_view', { page_path: window.location.pathname, page_title: document.title });
}

export const analytics = {
  getMeasurementId(): string {
    const settingsId = getLocalSiteSettings().gaMeasurementId;
    if (isValidGa(settingsId)) return settingsId;
    try {
      const legacyId = localStorage.getItem('picshrink_ga_id') || '';
      return isValidGa(legacyId) ? legacyId : '';
    } catch {
      return '';
    }
  },

  setMeasurementId(id: string): void {
    if (!id.trim()) {
      configureGA4('');
      return;
    }
    if (isValidGa(id.trim())) configureGA4(id.trim());
  },

  initGA4(measurementId?: string): void {
    if (measurementId !== undefined) {
      configureGA4(measurementId);
      return;
    }
    fetchPublicSiteSettings()
      .then((settings) => configureGA4(settings.gaMeasurementId))
      .catch(() => {
        const localSettings = getLocalSiteSettings();
        const fallbackId = localSettings.gaMeasurementId || DEFAULT_SITE_SETTINGS.gaMeasurementId;
        if (fallbackId) configureGA4(fallbackId);
      });
  },

  trackPageView(path: string): void {
    if (isAdminPath(path)) return;
    const data = readStored();
    data.events.unshift({
      id: 'pv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      timestamp: Date.now(),
      type: 'pageview',
      path,
    });
    data.events = data.events.slice(0, 100);
    persist(data);
    sendSharedEvent('pageview', path);
    const win = window as Window & { gtag?: (...args: unknown[]) => void };
    win.gtag?.('event', 'page_view', { page_path: path, page_title: document.title });
  },

  trackToolUsage(toolName: string, path: string, savedBytes = 0): void {
    const data = readStored();
    data.counts[path] = (data.counts[path] || 0) + 1;
    if (Number.isFinite(savedBytes) && savedBytes > 0) data.mbSaved += savedBytes / (1024 * 1024);
    data.events.unshift({
      id: 'tool-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      timestamp: Date.now(),
      type: 'tool_run',
      path,
      details: { toolName, savedBytes: Math.max(0, savedBytes) },
    });
    data.events = data.events.slice(0, 100);
    persist(data);
    sendSharedEvent('tool_run', path);
    const win = window as Window & { gtag?: (...args: unknown[]) => void };
    win.gtag?.('event', 'tool_usage', {
      event_category: 'Image Tools',
      event_label: toolName,
      value: Math.round(Math.max(0, savedBytes) / 1024),
    });
  },

  getSummary(): AnalyticsSummary {
    const data = readStored();
    const now = Date.now();
    const today = new Date(now).toDateString();
    return {
      realtimeActiveUsers: 0,
      todayPageviews: data.events.filter((event) => event.type === 'pageview' && new Date(event.timestamp).toDateString() === today).length,
      totalImagesProcessed: data.events.filter((event) => event.type === 'tool_run').length,
      totalMegabytesSaved: Math.round(data.mbSaved * 10) / 10,
      popularTools: Object.entries(data.counts)
        .map(([path, count]) => ({ name: path.replace('/', '').toUpperCase() || 'HOME', count }))
        .sort((a, b) => b.count - a.count),
      recentEvents: data.events.slice(0, 10),
      gaMeasurementId: this.getMeasurementId(),
    };
  },
};
