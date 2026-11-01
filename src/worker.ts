import { createHmac } from 'node:crypto';

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

export interface AnalyticsEvent {
  type: string;
  path: string;
  visitorId?: string;
  timestamp: number;
}

interface AdminState {
  settings: SiteSettings;
  events: AnalyticsEvent[];
}

interface StorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  transaction<T>(callback: (transaction: StorageLike) => Promise<T>): Promise<T>;
}

export class AdminData {
  private readonly storage: StorageLike;

  constructor({ storage }: { storage: StorageLike }) {
    this.storage = storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/settings') {
      return this.handleGetPublicSettings();
    }

    if (path === '/api/analytics/track') {
      return this.handleTrack(request);
    }

    if (path === '/api/admin/session') {
      return this.handleSession(request);
    }

    if (path === '/api/admin/login') {
      return this.handleLogin(request);
    }

    if (path === '/api/admin/settings') {
      return this.handleAdminSettings(request);
    }

    if (path === '/api/admin/analytics') {
      return this.handleAnalytics(request);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetPublicSettings(): Promise<Response> {
    const settings = await this.getSettings();
    return jsonResponse(settings, 200);
  }

  private async handleSession(request: Request): Promise<Response> {
    const authenticated = this.getSessionUser(request) !== undefined;
    return jsonResponse({ authenticated }, 200);
  }

  private async handleLogin(request: Request): Promise<Response> {
    const env = getRequestEnv(request);
    const body = await readJsonBody<{ username?: string; password?: string }>(request);
    const username = body?.username;
    const password = body?.password;

    const expectedUser = env.ADMIN_USERNAME ?? 'admin';
    const expectedPassword = env.ADMIN_PASSWORD ?? 'admin';

    if (username !== expectedUser || password !== expectedPassword) {
      return jsonResponse({ error: 'Invalid login credentials' }, 401);
    }

    const sessionToken = createSessionToken(username, env.SESSION_SECRET ?? 'local-development-secret');
    return new Response(JSON.stringify({ authenticated: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `picshrink_session=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      },
    });
  }

  private async handleAdminSettings(request: Request): Promise<Response> {
    const sessionUser = this.getSessionUser(request);
    if (!sessionUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (request.method === 'GET') {
      const settings = await this.getSettings();
      return jsonResponse(settings, 200);
    }

    if (request.method === 'POST') {
      const body = await readJsonBody<Partial<SiteSettings>>(request);
      const nextSettings = {
        ...DEFAULT_SITE_SETTINGS,
        ...(body ?? {}),
        adSlots: {
          ...DEFAULT_SITE_SETTINGS.adSlots,
          ...(body?.adSlots ?? {}),
        },
      } satisfies SiteSettings;
      await this.saveSettings(nextSettings);
      return jsonResponse(nextSettings, 200);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  private async handleAnalytics(request: Request): Promise<Response> {
    const sessionUser = this.getSessionUser(request);
    if (!sessionUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const state = await this.getState();
    const events = state.events;
    const now = Date.now();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const pageviews = events.filter((event) => event.type === 'pageview' && event.timestamp >= dayStart.getTime()).length;
    const toolRuns = events.filter((event) => event.type === 'tool_run');
    const popularTools = toToolCounts(toolRuns.map((event) => event.path));
    const recentEvents = events.slice(-10).reverse();
    const activeUsers = new Set(
      events
        .filter((event) => event.visitorId && event.timestamp >= now - 5 * 60 * 1000)
        .map((event) => event.visitorId as string),
    ).size;

    return jsonResponse(
      {
        realtimeActiveUsers: activeUsers,
        todayPageviews: pageviews,
        totalImagesProcessed: toolRuns.length,
        popularTools,
        recentEvents,
      },
      200,
    );
  }

  private async handleTrack(request: Request): Promise<Response> {
    const body = await readJsonBody<{ type?: string; path?: string; visitorId?: string }>(request);
    const type = body?.type ?? 'pageview';
    const path = body?.path ?? '/';
    const visitorId = body?.visitorId ?? 'anonymous';

    const state = await this.getState();
    state.events.push({ type, path, visitorId, timestamp: Date.now() });
    state.events = state.events.slice(-2000);
    await this.storage.put('admin-state', state);

    return jsonResponse({ accepted: true }, 202);
  }

  private async getSettings(): Promise<SiteSettings> {
    const state = await this.getState();
    return { ...DEFAULT_SITE_SETTINGS, ...state.settings };
  }

  private async saveSettings(settings: SiteSettings): Promise<void> {
    const state = await this.getState();
    state.settings = settings;
    await this.storage.put('admin-state', state);
  }

  private async getState(): Promise<AdminState> {
    const state = await this.storage.get<AdminState>('admin-state');
    if (state) return state;

    const freshState: AdminState = {
      settings: { ...DEFAULT_SITE_SETTINGS },
      events: [],
    };
    await this.storage.put('admin-state', freshState);
    return freshState;
  }

  private getSessionUser(request: Request): string | undefined {
    const cookieValue = request.headers.get('Cookie') ?? '';
    const match = cookieValue.match(/(?:^|;\s*)picshrink_session=([^;]+)/);
    if (!match) return undefined;

    const token = decodeURIComponent(match[1]);
    const [hash, payload] = token.split('.');
    if (!hash || !payload) return undefined;

    const secret = getRequestEnv(request).SESSION_SECRET ?? 'local-development-secret';
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    return expected === hash ? payload : undefined;
  }
}

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ADMIN_DATA: {
    idFromName: (name: string) => string;
    get: (id: string) => { fetch: (request: Request) => Promise<Response> };
  };
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}

export function adminApi(request: Request, env: Env): Promise<Response> {
  const durableId = env.ADMIN_DATA.idFromName('global');
  return env.ADMIN_DATA.get(durableId).fetch(request);
}

export function markdownForRequest(request: Request): Response | undefined {
  const accept = request.headers.get('Accept') ?? '';
  const url = new URL(request.url);
  if (accept.includes('text/markdown') || url.searchParams.get('format') === 'markdown') {
    return new Response('# PicShrink\n\nBrowser-based image tools.', {
      status: 200,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }
  return undefined;
}

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'PicShrink',
  siteDescription: 'Free online image tools for compressing, converting, resizing, and editing images.',
  gaMeasurementId: '',
  adsEnabled: false,
  adsensePublisherId: '',
  adSlots: { top: '', sidebar: '', bottom: '' },
};

function readJsonBody<T>(request: Request): Promise<T | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return Promise.resolve(undefined);
  }

  return request
    .json()
    .then((body) => body as T)
    .catch(() => undefined);
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function createSessionToken(username: string, secret: string): string {
  return `${createHmac('sha256', secret).update(username).digest('hex')}.${username}`;
}

function getRequestEnv(request: Request): Env {
  const env = (request as Request & { env?: Env }).env;
  return env ?? {
    ASSETS: { fetch: async () => new Response('not found', { status: 404 }) },
    ADMIN_DATA: {
      idFromName: () => 'global',
      get: () => ({ fetch: async () => new Response('not found', { status: 404 }) }),
    },
  };
}

function toToolCounts(paths: string[]): Array<{ name: string; count: number }> {
  const totals = new Map<string, number>();
  for (const path of paths) {
    const key = (path || '/').split('/').filter(Boolean).join('/').toUpperCase() || 'HOME';
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }

  return [...totals.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) return adminApi(request, env);

    const markdownResponse = markdownForRequest(request);
    if (markdownResponse) return markdownResponse;

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export default worker;
