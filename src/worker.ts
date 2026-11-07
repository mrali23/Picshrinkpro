import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

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

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: number;
}

interface AdminState {
  settings: SiteSettings;
  events: AnalyticsEvent[];
  messages?: ContactMessage[];
}

interface StorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  transaction<T>(callback: (transaction: StorageLike) => Promise<T>): Promise<T>;
}

/** Secrets that must be configured as Worker secrets (or in .dev.vars locally). */
export interface AdminSecrets {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}

const SESSION_COOKIE = 'picshrink_session';
const SESSION_TTL_SECONDS = 24 * 60 * 60;
const MIN_SESSION_SECRET_LENGTH = 32;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ALLOWED_EVENT_TYPES = new Set(['pageview', 'tool_run']);

export class AdminData {
  private readonly storage: StorageLike;
  private readonly secrets: AdminSecrets;
  private readonly loginFailures = new Map<string, { count: number; firstAt: number }>();

  /**
   * Cloudflare constructs Durable Objects as `new AdminData(ctx, env)`, so the
   * secrets arrive here and never travel on the Request.
   */
  constructor({ storage }: { storage: StorageLike }, env: AdminSecrets = {}) {
    this.storage = storage;
    this.secrets = env ?? {};
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

    if (path === '/api/contact') {
      return this.handleContactSubmission(request);
    }

    if (path === '/api/admin/messages') {
      return this.handleAdminMessages(request);
    }

    if (path === '/api/admin/session') {
      return this.handleSession(request);
    }

    if (path === '/api/admin/login') {
      return this.handleLogin(request);
    }

    if (path === '/api/admin/logout') {
      return this.handleLogout(request);
    }

    if (path === '/api/admin/settings') {
      return this.handleAdminSettings(request);
    }

    if (path === '/api/admin/analytics') {
      return this.handleAnalytics(request);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }

  private async handleGetPublicSettings(): Promise<Response> {
    const settings = await this.getSettings();
    return jsonResponse(settings, 200);
  }

  private async handleSession(request: Request): Promise<Response> {
    const authenticated = this.getSessionUser(request) !== undefined;
    return jsonResponse({ authenticated }, 200);
  }

  private isLoginConfigured(): boolean {
    const { ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET } = this.secrets;
    return Boolean(
      ADMIN_USERNAME &&
        ADMIN_PASSWORD &&
        SESSION_SECRET &&
        SESSION_SECRET.length >= MIN_SESSION_SECRET_LENGTH,
    );
  }

  private async handleLogin(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    if (!isSameOrigin(request)) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // Fail closed: never fall back to built-in credentials or a built-in secret.
    if (!this.isLoginConfigured()) {
      return jsonResponse({ error: 'Admin login is not configured.' }, 503);
    }

    const clientKey = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const now = Date.now();
    const record = this.loginFailures.get(clientKey);
    if (record && now - record.firstAt < LOGIN_WINDOW_MS && record.count >= MAX_LOGIN_FAILURES) {
      return jsonResponse({ error: 'Too many login attempts. Try again later.' }, 429);
    }

    const body = await readJsonBody<{ username?: unknown; password?: unknown }>(request);
    const username = typeof body?.username === 'string' ? body.username : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    // Evaluate both comparisons so timing does not reveal which one failed.
    const userOk = safeEqual(username, this.secrets.ADMIN_USERNAME as string);
    const passOk = safeEqual(password, this.secrets.ADMIN_PASSWORD as string);

    if (!(userOk && passOk)) {
      if (!record || now - record.firstAt >= LOGIN_WINDOW_MS) {
        this.loginFailures.set(clientKey, { count: 1, firstAt: now });
      } else {
        record.count += 1;
      }
      return jsonResponse({ error: 'Invalid login credentials' }, 401);
    }

    this.loginFailures.delete(clientKey);
    const sessionToken = createSessionToken(username, this.secrets.SESSION_SECRET as string);
    return new Response(JSON.stringify({ authenticated: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': `${SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`,
      },
    });
  }

  private async handleLogout(request: Request): Promise<Response> {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
    if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
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
      if (!isSameOrigin(request)) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
      const body = await readJsonBody<unknown>(request);
      const nextSettings = sanitizeSettings(body);
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

  private async handleContactSubmission(request: Request): Promise<Response> {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
    if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);

    const body = await readJsonBody<{ name?: unknown; email?: unknown; subject?: unknown; message?: unknown }>(request);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : 'Feedback';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 || message.length < 10 || message.length > 5000 ||
        !['Feedback', 'Bug', 'Feature', 'Partnership'].includes(subject)) {
      return jsonResponse({ error: 'Please provide a valid name, email, topic, and message (10–5000 characters).' }, 400);
    }

    const state = await this.getState();
    const now = Date.now();
    // Bound duplicate submissions from the same email without retaining IP addresses.
    const recentFromSender = (state.messages ?? []).filter((item) =>
      item.email === email && now - item.createdAt < 60_000
    ).length;
    if (recentFromSender >= 3) return jsonResponse({ error: 'Please wait before sending another message.' }, 429);

    const entry: ContactMessage = {
      id: `msg_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name, email, subject, message, status: 'unread', createdAt: now,
    };
    state.messages = [entry, ...(state.messages ?? [])].slice(0, 1000);
    await this.storage.put('admin-state', state);
    return jsonResponse({ accepted: true, id: entry.id }, 201);
  }

  private async handleAdminMessages(request: Request): Promise<Response> {
    if (!this.getSessionUser(request)) return jsonResponse({ error: 'Unauthorized' }, 401);
    const state = await this.getState();
    if (request.method === 'GET') {
      return jsonResponse({ messages: (state.messages ?? []).slice(0, 200) }, 200);
    }
    if (request.method === 'PATCH') {
      if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
      const body = await readJsonBody<{ id?: unknown; status?: unknown }>(request);
      if (typeof body?.id !== 'string' || !['unread', 'read', 'archived'].includes(String(body.status))) {
        return jsonResponse({ error: 'Invalid message update.' }, 400);
      }
      const messages = state.messages ?? [];
      const target = messages.find((item) => item.id === body.id);
      if (!target) return jsonResponse({ error: 'Message not found.' }, 404);
      target.status = body.status as ContactMessage['status'];
      await this.storage.put('admin-state', state);
      return jsonResponse({ updated: true, message: target }, 200);
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  private async handleTrack(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    if (!isSameOrigin(request)) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const body = await readJsonBody<{ type?: unknown; path?: unknown; visitorId?: unknown }>(request);
    const type = typeof body?.type === 'string' ? body.type : 'pageview';
    const path = typeof body?.path === 'string' ? body.path : '/';
    const visitorId = typeof body?.visitorId === 'string' ? body.visitorId : 'anonymous';

    // Public, unauthenticated endpoint: only accept well-formed, bounded events.
    if (!ALLOWED_EVENT_TYPES.has(type) || !path.startsWith('/') || path.length > 200 || visitorId.length > 64) {
      return jsonResponse({ error: 'Invalid event' }, 400);
    }

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
    if (state) {
      if (!Array.isArray(state.messages)) state.messages = [];
      return state;
    }

    const freshState: AdminState = {
      settings: { ...DEFAULT_SITE_SETTINGS },
      events: [],
      messages: [],
    };
    await this.storage.put('admin-state', freshState);
    return freshState;
  }

  private getSessionUser(request: Request): string | undefined {
    const secret = this.secrets.SESSION_SECRET;
    if (!this.isLoginConfigured() || !secret) return undefined;

    const cookieValue = request.headers.get('Cookie') ?? '';
    const match = cookieValue.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    if (!match) return undefined;

    return verifySessionToken(match[1], secret);
  }
}

export interface Env extends AdminSecrets {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ADMIN_DATA: {
    idFromName: (name: string) => string;
    get: (id: string) => { fetch: (request: Request) => Promise<Response> };
  };
}

export function adminApi(request: Request, env: Env): Promise<Response> {
  const durableId = env.ADMIN_DATA.idFromName('global');
  return env.ADMIN_DATA.get(durableId).fetch(request);
}

/**
 * Serves the prerendered Markdown twin of a page (generated at build time) when
 * an agent asks for `Accept: text/markdown` or `?format=markdown`.
 * Returns undefined when the request is not a Markdown request or no twin exists.
 */
export async function markdownForRequest(request: Request, env: Pick<Env, 'ASSETS'>): Promise<Response | undefined> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;

  const accept = request.headers.get('Accept') ?? '';
  const url = new URL(request.url);
  const wantsMarkdown = accept.includes('text/markdown') || url.searchParams.get('format') === 'markdown';
  if (!wantsMarkdown) return undefined;

  const cleanPath = url.pathname.replace(/\/+$/, '') || '/index';
  const markdownPath = `${cleanPath === '/' ? '/index' : cleanPath}.md`;
  const assetResponse = await env.ASSETS.fetch(new Request(new URL(markdownPath, url).toString(), { method: 'GET' }));
  if (!assetResponse.ok) return undefined;

  return new Response(request.method === 'HEAD' ? null : assetResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
    },
  });
}

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'PicShrink',
  siteDescription: 'Free online image tools for compressing, converting, resizing, and editing images.',
  gaMeasurementId: '',
  adsEnabled: false,
  adsensePublisherId: '',
  adSlots: { top: '', sidebar: '', bottom: '' },
};

function clampString(value: unknown, fallback: string, maxLength = 300): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
}

/** Whitelist known settings keys and types instead of spreading the request body. */
function sanitizeSettings(input: unknown): SiteSettings {
  const body = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof SiteSettings, unknown>>;
  const slots = (body.adSlots && typeof body.adSlots === 'object' ? body.adSlots : {}) as Record<string, unknown>;
  return {
    siteName: clampString(body.siteName, DEFAULT_SITE_SETTINGS.siteName, 100),
    siteDescription: clampString(body.siteDescription, DEFAULT_SITE_SETTINGS.siteDescription, 300),
    gaMeasurementId: clampString(body.gaMeasurementId, '', 40),
    adsEnabled: typeof body.adsEnabled === 'boolean' ? body.adsEnabled : DEFAULT_SITE_SETTINGS.adsEnabled,
    adsensePublisherId: clampString(body.adsensePublisherId, '', 60),
    adSlots: {
      top: clampString(slots.top, '', 40),
      sidebar: clampString(slots.sidebar, '', 40),
      bottom: clampString(slots.bottom, '', 40),
    },
  };
}

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
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Rejects cross-site writes. A missing Origin header (same-origin tools, tests) is allowed. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** Constant-time string comparison (hashing first so lengths always match). */
function safeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSessionToken(username: string, secret: string): string {
  const payload = toBase64Url(JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL_SECONDS * 1000 }));
  return `${payload}.${sign(payload, secret)}`;
}

function verifySessionToken(token: string, secret: string): string | undefined {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return undefined;
  if (!safeEqual(signature, sign(payload, secret))) return undefined;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { u?: unknown; exp?: unknown };
    if (typeof data.u !== 'string' || typeof data.exp !== 'number' || data.exp < Date.now()) return undefined;
    return data.u;
  } catch {
    return undefined;
  }
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

/**
 * Apply the same baseline response protections to static assets, Markdown
 * responses, and API responses. API routes used to return before these
 * headers were added, leaving a gap in the Worker-wide security policy.
 */
export function withSecurityHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    let response: Response;

    if (url.pathname.startsWith('/api/')) {
      response = await adminApi(request, env);
    } else {
      const markdownResponse = await markdownForRequest(request, env);
      response = markdownResponse ?? await env.ASSETS.fetch(request);
    }

    return withSecurityHeaders(response, url.pathname);
  },
};

export default worker;
