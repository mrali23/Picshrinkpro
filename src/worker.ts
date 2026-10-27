import { DEFAULT_SITE_SETTINGS, type SiteSettings } from './utils/siteSettings.ts';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_DATA: {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(request: Request): Promise<Response> };
  };
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}

interface DurableStorageReader {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

interface DurableStorage extends DurableStorageReader {
  transaction<T>(callback: (transaction: DurableStorageReader) => Promise<T>): Promise<T>;
}

interface AnalyticsEvent {
  id: string;
  timestamp: number;
  type: 'pageview' | 'tool_run';
  path: string;
}

interface StoredAnalytics {
  date: string;
  pageviewsToday: number;
  toolRuns: number;
  toolCounts: Record<string, number>;
  activeVisitors: Record<string, number>;
  recentEvents: AnalyticsEvent[];
}

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const ACTIVE_VISITOR_TTL_MS = 5 * 60 * 1000;
const encoder = new TextEncoder();
const defaultAnalytics: StoredAnalytics = {
  date: '',
  pageviewsToday: 0,
  toolRuns: 0,
  toolCounts: {},
  activeVisitors: {},
  recentEvents: [],
};

function jsonResponse(payload: object, status = 200, headers: HeadersInit = {}): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store, max-age=0');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders });
}

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  const result = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
  return result;
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) difference |= (left[i] || 0) ^ (right[i] || 0);
  return difference === 0;
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function createToken(username: string, secret: string): Promise<string> {
  const payload = b64url(encoder.encode(JSON.stringify({
    sub: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload)));
  return payload + '.' + b64url(signature);
}

async function isValidToken(token: string, env: Env): Promise<boolean> {
  if (!env.ADMIN_USERNAME || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[0]))) as { sub?: string; exp?: number };
    if (payload.sub !== env.ADMIN_USERNAME || typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return false;
    return await crypto.subtle.verify('HMAC', await signingKey(env.SESSION_SECRET), fromB64url(parts[1]), encoder.encode(parts[0]));
  } catch {
    return false;
  }
}

function cookieName(request: Request): string {
  return new URL(request.url).protocol === 'https:' ? '__Secure-picshrink_admin' : 'picshrink_admin_local';
}

function getCookie(request: Request): string | null {
  const header = request.headers.get('Cookie') || '';
  const name = cookieName(request);
  for (const item of header.split(';')) {
    const entry = item.trim();
    const separator = entry.indexOf('=');
    if (separator > 0 && entry.slice(0, separator) === name) return entry.slice(separator + 1);
  }
  return null;
}

function cookie(request: Request, token: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:';
  return cookieName(request) + '=' + token + '; Path=/api/admin; Max-Age=' + maxAge +
    '; HttpOnly; SameSite=Strict' + (secure ? '; Secure' : '');
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function isValidSettings(value: unknown): value is SiteSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Partial<SiteSettings>;
  return typeof settings.siteName === 'string' && settings.siteName.trim().length > 0 && settings.siteName.length <= 80 &&
    typeof settings.siteDescription === 'string' && settings.siteDescription.length <= 320 &&
    typeof settings.gaMeasurementId === 'string' && (!settings.gaMeasurementId || /^G-[A-Z0-9]+$/i.test(settings.gaMeasurementId)) &&
    typeof settings.adsEnabled === 'boolean' &&
    typeof settings.adsensePublisherId === 'string' && (!settings.adsensePublisherId || /^ca-pub-\d{8,24}$/.test(settings.adsensePublisherId)) &&
    !!settings.adSlots && typeof settings.adSlots.top === 'string' && /^\d{0,24}$/.test(settings.adSlots.top) &&
    typeof settings.adSlots.sidebar === 'string' && /^\d{0,24}$/.test(settings.adSlots.sidebar) &&
    typeof settings.adSlots.bottom === 'string' && /^\d{0,24}$/.test(settings.adSlots.bottom);
}

function adminData(env: Env, path: string, init?: RequestInit): Promise<Response> {
  const id = env.ADMIN_DATA.idFromName('picshrinkpro-global');
  return env.ADMIN_DATA.get(id).fetch(new Request('https://admin-data' + path, init));
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 8192) throw new Error('Request too large.');
  return JSON.parse(text);
}

async function adminApi(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;

  if (request.method === 'GET' && path === '/api/admin/session') {
    const token = getCookie(request);
    return token && await isValidToken(token, env)
      ? jsonResponse({ authenticated: true })
      : jsonResponse({ authenticated: false });
  }

  if (request.method === 'POST' && (path === '/api/admin/login' || path === '/api/admin/logout')) {
    if (!sameOrigin(request)) return jsonResponse({ error: 'Cross-origin request rejected.' }, 403);
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return jsonResponse({ error: 'Expected application/json.' }, 415);
    }
  }

  if (request.method === 'POST' && path === '/api/admin/login') {
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
      return jsonResponse({ error: 'Admin login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD, and a 32-character SESSION_SECRET in Worker secrets.' }, 503);
    }
    let body: { username?: unknown; password?: unknown };
    try {
      body = await readJson(request) as { username?: unknown; password?: unknown };
    } catch (error) {
      return jsonResponse({ error: error instanceof Error && error.message === 'Request too large.' ? error.message : 'Invalid JSON request.' }, 400);
    }
    if (typeof body.username !== 'string' || typeof body.password !== 'string' ||
      body.username.length > 128 || body.password.length > 256 ||
      !constantTimeEqual(body.username, env.ADMIN_USERNAME) || !constantTimeEqual(body.password, env.ADMIN_PASSWORD)) {
      return jsonResponse({ error: 'Invalid administrator username or password.' }, 401);
    }
    const token = await createToken(env.ADMIN_USERNAME, env.SESSION_SECRET);
    return jsonResponse({ authenticated: true }, 200, { 'Set-Cookie': cookie(request, token, SESSION_TTL_SECONDS) });
  }

  if (request.method === 'POST' && path === '/api/admin/logout') {
    return jsonResponse({ authenticated: false }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  }

  if (path.startsWith('/api/admin/')) {
    if (request.method === 'POST' && !sameOrigin(request)) return jsonResponse({ error: 'Cross-origin request rejected.' }, 403);
    const token = getCookie(request);
    if (!token || !await isValidToken(token, env)) return jsonResponse({ error: 'Administrator login required.' }, 401);
    if (path === '/api/admin/settings' && request.method === 'GET') return adminData(env, path);
    if (path === '/api/admin/analytics' && request.method === 'GET') return adminData(env, path);
    if (path === '/api/admin/settings' && request.method === 'POST') {
      let settings: unknown;
      try {
        settings = await readJson(request);
      } catch {
        return jsonResponse({ error: 'Invalid settings request.' }, 400);
      }
      if (!isValidSettings(settings)) return jsonResponse({ error: 'Please check the site settings and ID formats.' }, 400);
      return adminData(env, path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    }
    return jsonResponse({ error: 'Not found.' }, 404);
  }

  if (path === '/api/settings' && request.method === 'GET') return adminData(env, path);
  if (path === '/api/analytics/track' && request.method === 'POST') {
    if (!sameOrigin(request)) return jsonResponse({ error: 'Cross-origin request rejected.' }, 403);
    let event: unknown;
    try {
      event = await readJson(request);
    } catch {
      return jsonResponse({ error: 'Invalid analytics event.' }, 400);
    }
    return adminData(env, path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  }

  return jsonResponse({ error: 'Not found.' }, 404);
}

export class AdminData {
  private readonly storage: DurableStorage;

  constructor(state: { storage: DurableStorage }) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api/settings' && request.method === 'GET') {
      const settings = await this.storage.get<SiteSettings>('settings') || DEFAULT_SITE_SETTINGS;
      return jsonResponse(settings);
    }
    if (path === '/api/admin/settings' && request.method === 'GET') {
      const settings = await this.storage.get<SiteSettings>('settings') || DEFAULT_SITE_SETTINGS;
      return jsonResponse(settings);
    }
    if (path === '/api/admin/settings' && request.method === 'POST') {
      const settings = await request.json() as SiteSettings;
      await this.storage.put('settings', settings);
      return jsonResponse({ saved: true });
    }
    if (path === '/api/analytics/track' && request.method === 'POST') return this.track(request);
    if (path === '/api/admin/analytics' && request.method === 'GET') return this.analyticsSummary();
    return jsonResponse({ error: 'Not found.' }, 404);
  }

  private async track(request: Request): Promise<Response> {
    let event: { type?: unknown; path?: unknown; visitorId?: unknown };
    try {
      event = await request.json() as { type?: unknown; path?: unknown; visitorId?: unknown };
    } catch {
      return jsonResponse({ error: 'Invalid analytics event.' }, 400);
    }
    if ((event.type !== 'pageview' && event.type !== 'tool_run') ||
      typeof event.path !== 'string' || !/^\/[a-z0-9/-]{0,180}$/i.test(event.path) ||
      typeof event.visitorId !== 'string' || !/^[a-z0-9-]{16,64}$/i.test(event.visitorId)) {
      return jsonResponse({ error: 'Invalid analytics event.' }, 400);
    }

    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    await this.storage.transaction(async (transaction) => {
      const stored = await transaction.get<StoredAnalytics>('analytics') || {
        ...defaultAnalytics,
        toolCounts: {},
        activeVisitors: {},
        recentEvents: [],
      };
      if (stored.date !== today) {
        stored.date = today;
        stored.pageviewsToday = 0;
      }
      for (const [id, expiresAt] of Object.entries(stored.activeVisitors)) {
        if (expiresAt <= now) delete stored.activeVisitors[id];
      }
      stored.activeVisitors[event.visitorId as string] = now + ACTIVE_VISITOR_TTL_MS;
      if (Object.keys(stored.activeVisitors).length > 10000) {
        const oldest = Object.entries(stored.activeVisitors).sort((a, b) => a[1] - b[1]).slice(0, 1000);
        for (const [id] of oldest) delete stored.activeVisitors[id];
      }
      if (event.type === 'pageview') stored.pageviewsToday++;
      else {
        stored.toolRuns++;
        stored.toolCounts[event.path as string] = (stored.toolCounts[event.path as string] || 0) + 1;
      }
      stored.recentEvents.unshift({
        id: crypto.randomUUID(),
        timestamp: now,
        type: event.type as AnalyticsEvent['type'],
        path: event.path as string,
      });
      stored.recentEvents = stored.recentEvents.slice(0, 50);
      await transaction.put('analytics', stored);
    });
    return jsonResponse({ recorded: true }, 202);
  }

  private async analyticsSummary(): Promise<Response> {
    const stored = await this.storage.get<StoredAnalytics>('analytics') || {
      ...defaultAnalytics,
      toolCounts: {},
      activeVisitors: {},
      recentEvents: [],
    };
    const now = Date.now();
    const activeVisitors = Object.values(stored.activeVisitors).filter((expiresAt) => expiresAt > now).length;
    return jsonResponse({
      realtimeActiveUsers: activeVisitors,
      todayPageviews: stored.date === new Date(now).toISOString().slice(0, 10) ? stored.pageviewsToday : 0,
      totalImagesProcessed: stored.toolRuns,
      popularTools: Object.entries(stored.toolCounts)
        .map(([path, count]) => ({ name: path.replace(/^\//, '').replace(/-/g, ' ').toUpperCase() || 'HOME', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentEvents: stored.recentEvents,
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) return adminApi(request, env);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
