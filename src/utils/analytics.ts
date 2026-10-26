/**
 * Browser-local activity tracker with optional GA4 event forwarding.
 * Local counts are not equivalent to site-wide visitor analytics.
 */
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
const GA_KEY = 'picshrink_ga_id';
function readStored(): StoredAnalytics {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [], counts: {}, mbSaved: 0 };
    const x = JSON.parse(raw) as Partial<StoredAnalytics>;
    return {
      events: Array.isArray(x.events) ? x.events.filter(e => e && Number.isFinite(e.timestamp)) : [],
      counts: x.counts && typeof x.counts === 'object' ? x.counts : {},
      mbSaved: Number.isFinite(x.mbSaved) && (x.mbSaved as number) > 0 ? x.mbSaved as number : 0,
    };
  } catch { return { events: [], counts: {}, mbSaved: 0 }; }
}
function persist(data: StoredAnalytics) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* best effort */ } }
function isValidGa(id: string) { return /^G-[A-Z0-9]+$/i.test(id); }
export const analytics = {
  getMeasurementId(): string {
    try {
      const value = localStorage.getItem(GA_KEY) || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GA_MEASUREMENT_ID || '' : '');
      return isValidGa(value) ? value : '';
    } catch { return ''; }
  },
  setMeasurementId(id: string): void {
    try {
      if (isValidGa(id.trim())) { localStorage.setItem(GA_KEY, id.trim()); this.initGA4(id.trim()); }
      else localStorage.removeItem(GA_KEY);
    } catch { /* storage may be disabled */ }
  },
  initGA4(measurementId?: string): void {
    const id = measurementId || this.getMeasurementId();
    if (!isValidGa(id) || typeof window === 'undefined' || document.getElementById('ga4-script')) return;
    try {
      const script = document.createElement('script');
      script.id = 'ga4-script'; script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
      document.head.appendChild(script);
      const win = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
      win.dataLayer = win.dataLayer || [];
      win.gtag = (...args: unknown[]) => { win.dataLayer?.push(args); };
      win.gtag('js', new Date());
      win.gtag('config', id, { send_page_view: false, transport_type: 'beacon' });
    } catch (error) { console.warn('GA4 initialization failed:', error); }
  },
  trackPageView(path: string): void {
    const data = readStored();
    data.events.unshift({ id: 'pv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), timestamp: Date.now(), type: 'pageview', path });
    data.events = data.events.slice(0, 100); persist(data);
    const win = window as Window & { gtag?: (...args: unknown[]) => void };
    win.gtag?.('event', 'page_view', { page_path: path, page_title: document.title });
  },
  trackToolUsage(toolName: string, path: string, savedBytes = 0): void {
    const data = readStored();
    data.counts[path] = (data.counts[path] || 0) + 1;
    if (Number.isFinite(savedBytes) && savedBytes > 0) data.mbSaved += savedBytes / (1024 * 1024);
    data.events.unshift({ id: 'tool-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), timestamp: Date.now(), type: 'tool_run', path, details: { toolName, savedBytes: Math.max(0, savedBytes) } });
    data.events = data.events.slice(0, 100); persist(data);
    const win = window as Window & { gtag?: (...args: unknown[]) => void };
    win.gtag?.('event', 'tool_usage', { event_category: 'Image Tools', event_label: toolName, value: Math.round(Math.max(0, savedBytes) / 1024) });
  },
  getSummary(): AnalyticsSummary {
    const data = readStored(), now = Date.now(), today = new Date(now).toDateString();
    const recent = data.events.filter(e => now - e.timestamp < 30 * 60 * 1000);
    const popularTools = Object.entries(data.counts).map(([path, count]) => ({ name: path.replace('/', '').toUpperCase() || 'HOME', count })).sort((a,b) => b.count-a.count);
    return {
      realtimeActiveUsers: recent.length > 0 ? 1 : 0,
      todayPageviews: data.events.filter(e => e.type === 'pageview' && new Date(e.timestamp).toDateString() === today).length,
      totalImagesProcessed: data.events.filter(e => e.type === 'tool_run').length,
      totalMegabytesSaved: Math.round(data.mbSaved * 10) / 10,
      popularTools, recentEvents: data.events.slice(0,10), gaMeasurementId: this.getMeasurementId(),
    };
  },
};
