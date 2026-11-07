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

interface ManagedContent {
  id: string; title: string; slug: string; excerpt: string; body: string;
  status: 'draft' | 'published' | 'archived'; seoTitle: string;
  metaDescription: string; canonicalUrl: string; ogImageUrl: string;
  createdAt: number; updatedAt: number; publishedAt?: number; version: number;
}
interface AdminActivity {
  id: string; actor: string; action: string; resource: string;
  resourceId?: string; createdAt: number;
}
interface ManagedRedirect {
  id: string; sourcePath: string; destinationUrl: string;
  statusCode: 301 | 302 | 307 | 308; active: boolean; createdAt: number;
}
interface HomepageSection {
  id: string; key: string; title: string; content: string;
  visible: boolean; position: number; updatedAt: number;
}
interface MediaAsset { id: string; key: string; name: string; type: string; size: number; createdAt: number; }
interface R2BucketLike {
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string,string> }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream | null; httpMetadata?: { contentType?: string }; size?: number } | null>;
  delete(key: string): Promise<void>;
}
type AdminRole = 'admin' | 'editor' | 'viewer';
interface AdminPrincipal { username: string; role: AdminRole; }
interface AdminUserRecord { id: string; username: string; email: string; passwordSalt: string; passwordHash: string; role: AdminRole; active: boolean; createdAt: number; lastLoginAt?: number; }
interface AdminState {
  settings: SiteSettings;
  events: AnalyticsEvent[];
  messages?: ContactMessage[];
  content?: ManagedContent[];
  activity?: AdminActivity[];
  redirects?: ManagedRedirect[];
  homepageSections?: HomepageSection[];
  backups?: Array<{ id: string; label: string; createdAt: number; snapshot: Omit<AdminState, 'backups'> }>;
  media?: MediaAsset[];
  revokedSessions?: string[];
  users?: AdminUserRecord[];
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
  private readonly mediaBucket?: R2BucketLike;
  private readonly loginFailures = new Map<string, { count: number; firstAt: number }>();

  /**
   * Cloudflare constructs Durable Objects as `new AdminData(ctx, env)`, so the
   * secrets arrive here and never travel on the Request.
   */
  constructor({ storage }: { storage: StorageLike }, env: AdminSecrets & { MEDIA?: R2BucketLike } = {}) {
    this.storage = storage;
    this.secrets = env ?? {};
    this.mediaBucket = env?.MEDIA;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/content' || path.startsWith('/api/content/')) return this.handlePublicContent(request);
    if (path === '/api/settings') {
      return this.handleGetPublicSettings();
    }
    if (path === '/api/redirect/resolve') return this.handleResolveRedirect(request);

    if (path === '/api/analytics/track') {
      return this.handleTrack(request);
    }

    if (path === '/api/contact') {
      return this.handleContactSubmission(request);
    }

    if (path === '/api/admin/users' || path.startsWith('/api/admin/users/')) return this.handleUsers(request);
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

    if (path === '/api/admin/content' || path.startsWith('/api/admin/content/')) {
      return this.handleContent(request);
    }
    if (path === '/api/admin/activity') return this.handleActivity(request);
    if (path === '/api/admin/media' || path.startsWith('/api/admin/media/')) return this.handleMedia(request);
    if (path === '/api/admin/redirects' || path.startsWith('/api/admin/redirects/')) {
      return this.handleRedirects(request);
    }
    if (path === '/api/admin/homepage-sections') return this.handleHomepageSections(request);
    if (path === '/api/admin/backups' || path.startsWith('/api/admin/backups/')) {
      return this.handleBackups(request);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }


  private async recordActivity(actor: string, action: string, resource: string, resourceId?: string): Promise<void> {
    const state = await this.getState();
    const activity = state.activity ?? [];
    activity.unshift({ id: `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, actor, action, resource, resourceId, createdAt: Date.now() });
    state.activity = activity.slice(0, 2000);
    await this.storage.put('admin-state', state);
  }

  private async handleContent(request: Request): Promise<Response> {
    const actor = await this.getSessionUser(request);
    if (!actor) return jsonResponse({ error: 'Unauthorized' }, 401);
    const state = await this.getState();
    const url = new URL(request.url);
    const id = url.pathname.startsWith('/api/admin/content/') ? decodeURIComponent(url.pathname.slice('/api/admin/content/'.length)) : '';
    if (request.method === 'GET') {
      const status = url.searchParams.get('status');
      const items = (state.content ?? []).filter((item) => !status || item.status === status).sort((a,b) => b.updatedAt-a.updatedAt);
      return jsonResponse({ content: items }, 200);
    }
    if (request.method !== 'GET' && actor.role === 'viewer') return jsonResponse({ error: 'Forbidden' }, 403);
    if (request.method !== 'GET' && actor.role === 'viewer') return jsonResponse({ error: 'Forbidden' }, 403);
    if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
    const body = (await readJsonBody<Record<string, unknown>>(request)) ?? {};
    if (request.method === 'POST') {
      const title = typeof body?.title === 'string' ? body.title.trim() : '';
      const slug = slugify(typeof body?.slug === 'string' && body.slug.trim() ? body.slug : title);
      const excerpt = typeof body?.excerpt === 'string' ? body.excerpt.trim() : '';
      const contentBody = typeof body?.body === 'string' ? body.body : '';
      if (title.length < 3 || title.length > 180 || !slug || slug.length > 160 || excerpt.length > 500 || contentBody.length > 100000) {
        return jsonResponse({ error: 'Title, slug, excerpt, or article body is invalid.' }, 400);
      }
      const items = state.content ?? [];
      if (items.some((item) => item.slug === slug)) return jsonResponse({ error: 'That URL slug is already in use.' }, 409);
      const now = Date.now();
      const status = body.status === 'published' ? 'published' : 'draft';
      const item: ManagedContent = {
        id: `cnt_${now.toString(36)}_${Math.random().toString(36).slice(2,8)}`, title, slug, excerpt, body: contentBody,
        status, seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle.slice(0, 180) : title,
        metaDescription: typeof body.metaDescription === 'string' ? body.metaDescription.slice(0, 300) : excerpt,
        canonicalUrl: typeof body.canonicalUrl === 'string' ? body.canonicalUrl.slice(0, 500) : '',
        ogImageUrl: typeof body.ogImageUrl === 'string' ? body.ogImageUrl.slice(0, 1000) : '',
        createdAt: now, updatedAt: now, publishedAt: status === 'published' ? now : undefined, version: 1,
      };
      state.content = [item, ...items];
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'create', 'content', item.id);
      return jsonResponse({ content: item }, 201);
    }
    const items = state.content ?? [];
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return jsonResponse({ error: 'Content not found.' }, 404);
    if (request.method === 'PATCH') {
      const current = items[index];
      if (typeof body.version === 'number' && body.version !== current.version) {
        return jsonResponse({ error: 'This content changed in another session. Reload before saving.', current }, 409);
      }
      const nextSlug = typeof body.slug === 'string' ? slugify(body.slug) : current.slug;
      if (items.some((item) => item.id !== id && item.slug === nextSlug)) return jsonResponse({ error: 'That URL slug is already in use.' }, 409);
      const status = body.status === 'published' || body.status === 'archived' || body.status === 'draft' ? body.status : current.status;
      const updated: ManagedContent = {
        ...current,
        title: typeof body.title === 'string' ? body.title.trim().slice(0,180) : current.title,
        slug: nextSlug,
        excerpt: typeof body.excerpt === 'string' ? body.excerpt.trim().slice(0,500) : current.excerpt,
        body: typeof body.body === 'string' ? body.body.slice(0,100000) : current.body,
        status,
        seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle.slice(0,180) : current.seoTitle,
        metaDescription: typeof body.metaDescription === 'string' ? body.metaDescription.slice(0,300) : current.metaDescription,
        canonicalUrl: body.canonicalUrl === undefined ? current.canonicalUrl : sanitizeCanonicalUrl(body.canonicalUrl),
        ogImageUrl: typeof body.ogImageUrl === 'string' ? body.ogImageUrl.slice(0,1000) : current.ogImageUrl,
        updatedAt: Date.now(), publishedAt: status === 'published' ? (current.publishedAt ?? Date.now()) : undefined,
        version: current.version + 1,
      };
      items[index] = updated;
      state.content = items;
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'update', 'content', id);
      return jsonResponse({ content: updated }, 200);
    }
    if (request.method === 'DELETE') {
      state.content = items.filter((item) => item.id !== id);
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'delete', 'content', id);
      return jsonResponse({ deleted: true }, 200);
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }


  private async handleMedia(request: Request): Promise<Response> {
    const actor = await this.getSessionUser(request);
    if (!actor) return jsonResponse({ error: 'Unauthorized' }, 401);
    if (!this.mediaBucket) return jsonResponse({ error: 'Media storage is not configured. Bind an R2 bucket named MEDIA.' }, 503);
    const state = await this.getState();
    const url = new URL(request.url);
    const id = url.pathname.startsWith('/api/admin/media/') ? decodeURIComponent(url.pathname.slice('/api/admin/media/'.length)) : '';
    if (request.method === 'GET' && !id) return jsonResponse({ media: state.media ?? [] }, 200);
    if (request.method !== 'GET' && actor.role === 'viewer') return jsonResponse({ error: 'Forbidden' }, 403);
    if (!isSameOrigin(request) && request.method !== 'GET') return jsonResponse({ error: 'Forbidden' }, 403);
    if (request.method === 'POST') {
      const form = await request.formData().catch(() => null);
      const file = form?.get('file');
      if (!(file instanceof File)) return jsonResponse({ error: 'Select an image file to upload.' }, 400);
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
      if (!allowed.has(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
        return jsonResponse({ error: 'Only JPEG, PNG, WebP, AVIF, or GIF images up to 10 MB are accepted.' }, 400);
      }
      const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const signatureValid = file.type === 'image/jpeg' ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
        : file.type === 'image/png' ? header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47
        : file.type === 'image/gif' ? String.fromCharCode(...header.slice(0,3)) === 'GIF'
        : file.type === 'image/webp' ? String.fromCharCode(...header.slice(0,4)) === 'RIFF' && String.fromCharCode(...header.slice(8,12)) === 'WEBP'
        : file.type === 'image/avif' ? String.fromCharCode(...header.slice(4,8)) === 'ftyp' && ['avif','avis'].includes(String.fromCharCode(...header.slice(8,12))) : false;
      if (!signatureValid) return jsonResponse({ error: 'The file content does not match its declared image type.' }, 400);
      const id = `med_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' } as Record<string,string>)[file.type];
      const key = `uploads/${id}.${extension}`;
      await this.mediaBucket.put(key, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { uploadedBy: actor.username } });
      const asset: MediaAsset = { id, key, name: file.name.slice(0,200), type: file.type, size: file.size, createdAt: Date.now() };
      state.media = [asset, ...(state.media ?? [])].slice(0, 1000);
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'upload', 'media', id);
      return jsonResponse({ media: asset }, 201);
    }
    if (request.method === 'GET' && id) {
      const asset = (state.media ?? []).find((item) => item.id === id);
      if (!asset) return jsonResponse({ error: 'Media asset not found.' }, 404);
      const object = await this.mediaBucket.get(asset.key);
      if (!object?.body) return jsonResponse({ error: 'Media object is unavailable.' }, 404);
      return new Response(object.body, { status: 200, headers: { 'Content-Type': object.httpMetadata?.contentType ?? asset.type, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
    }
    if (request.method === 'DELETE' && id) {
      const asset = (state.media ?? []).find((item) => item.id === id);
      if (!asset) return jsonResponse({ error: 'Media asset not found.' }, 404);
      await this.mediaBucket.delete(asset.key);
      state.media = (state.media ?? []).filter((item) => item.id !== id);
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'delete', 'media', id);
      return jsonResponse({ deleted: true }, 200);
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }


  private async handleUsers(request: Request): Promise<Response> {
    const actor = await this.getSessionUser(request);
    if (!actor) return jsonResponse({ error: 'Unauthorized' }, 401);
    if (actor.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403);
    const state = await this.getState();
    const url = new URL(request.url);
    const id = url.pathname.startsWith('/api/admin/users/') ? decodeURIComponent(url.pathname.slice('/api/admin/users/'.length)) : '';
    if (request.method === 'GET') {
      return jsonResponse({ users: (state.users ?? []).map(({id,username,email,role,active,createdAt,lastLoginAt}) => ({id,username,email,role,active,createdAt,lastLoginAt})) }, 200);
    }
    if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
    const body = (await readJsonBody<Record<string, unknown>>(request)) ?? {};
    if (request.method === 'POST') {
      const username = typeof body.username === 'string' ? body.username.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const role = body.role === 'editor' || body.role === 'viewer' ? body.role : body.role === 'admin' ? 'admin' : null;
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || !role) {
        return jsonResponse({ error: 'Provide a valid username, email, role and password of at least 12 characters.' }, 400);
      }
      if ((state.users ?? []).some((user) => user.username.toLowerCase() === username.toLowerCase() || user.email.toLowerCase() === email)) {
        return jsonResponse({ error: 'Username or email is already registered.' }, 409);
      }
      const credentials = await hashAdminPassword(password);
      const user: AdminUserRecord = { id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`, username, email, ...credentials, role, active: true, createdAt: Date.now() };
      state.users = [...(state.users ?? []), user];
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'create', 'admin_user', user.id);
      return jsonResponse({ user: { id: user.id, username, email, role, active: true, createdAt: user.createdAt } }, 201);
    }
    const users = state.users ?? [];
    const target = users.find((user) => user.id === id);
    if (!target) return jsonResponse({ error: 'User not found.' }, 404);
    if (request.method === 'PATCH') {
      const role = body.role === 'admin' || body.role === 'editor' || body.role === 'viewer' ? body.role : target.role;
      const active = typeof body.active === 'boolean' ? body.active : target.active;
      if (target.username === actor.username && (!active || role !== 'admin')) return jsonResponse({ error: 'You cannot deactivate or demote your own account.' }, 400);
      if (target.role === 'admin' && (role !== 'admin' || !active) && users.filter((user) => user.role === 'admin' && user.active).length <= 1) {
        return jsonResponse({ error: 'At least one active administrator must remain.' }, 400);
      }
      target.role = role; target.active = active;
      if (typeof body.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) target.email = body.email.trim().toLowerCase();
      if (typeof body.password === 'string' && body.password.length >= 12) Object.assign(target, await hashAdminPassword(body.password));
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'update', 'admin_user', id);
      return jsonResponse({ updated: true }, 200);
    }
    if (request.method === 'DELETE') {
      if (target.username === actor.username) return jsonResponse({ error: 'You cannot delete your own account.' }, 400);
      if (target.role === 'admin' && target.active && users.filter((user) => user.role === 'admin' && user.active).length <= 1) {
        return jsonResponse({ error: 'At least one active administrator must remain.' }, 400);
      }
      state.users = users.filter((user) => user.id !== id);
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'delete', 'admin_user', id);
      return jsonResponse({ deleted: true }, 200);
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  private async handleActivity(request: Request): Promise<Response> {
    const actor = await this.getSessionUser(request);
    if (!actor) return jsonResponse({ error: 'Unauthorized' }, 401);
    if (actor.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403);
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);
    const state = await this.getState();
    return jsonResponse({ activity: (state.activity ?? []).slice(0, 200) }, 200);
  }

  private async handleRedirects(request: Request): Promise<Response> {
    const actor = await this.getSessionUser(request);
    if (!actor) return jsonResponse({ error: 'Unauthorized' }, 401);
    if (request.method !== 'GET' && actor.role === 'viewer') return jsonResponse({ error: 'Forbidden' }, 403);
    const state = await this.getState();
    const url = new URL(request.url);
    const id = url.pathname.startsWith('/api/admin/redirects/') ? decodeURIComponent(url.pathname.slice('/api/admin/redirects/'.length)) : '';
    if (request.method === 'GET') return jsonResponse({ redirects: state.redirects ?? [] }, 200);
    if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
    const body = (await readJsonBody<Record<string, unknown>>(request)) ?? {};
    if (request.method === 'POST') {
      const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath.trim() : '';
      const destinationUrl = typeof body.destinationUrl === 'string' ? body.destinationUrl.trim() : '';
      const statusCode = [301,302,307,308].includes(Number(body.statusCode)) ? Number(body.statusCode) as ManagedRedirect['statusCode'] : 301;
      if (!sourcePath.startsWith('/') || sourcePath.startsWith('//') || sourcePath.length > 500 ||
          !destinationUrl.startsWith('/') || destinationUrl.length > 1000 || destinationUrl.startsWith('//')) {
        return jsonResponse({ error: 'Use a local source path and a valid same-site destination.' }, 400);
      }
      const redirects = state.redirects ?? [];
      if (redirects.some((item) => item.sourcePath === sourcePath)) return jsonResponse({ error: 'A redirect already exists for this path.' }, 409);
      const item: ManagedRedirect = { id: `rdr_${Date.now().toString(36)}`, sourcePath, destinationUrl, statusCode, active: true, createdAt: Date.now() };
      state.redirects = [item, ...redirects];
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'create', 'redirect', item.id);
      return jsonResponse({ redirect: item }, 201);
    }
    if (request.method === 'DELETE') {
      state.redirects = (state.redirects ?? []).filter((item) => item.id !== id);
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'delete', 'redirect', id);
      return jsonResponse({ deleted: true }, 200);
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  private async handleHomepageSections(request: Request): Promise<Response> {
    const actor = await this.getSessionUser(request);
    if (!actor) return jsonResponse({ error: 'Unauthorized' }, 401);
    if (request.method === 'PUT' && actor.role === 'viewer') return jsonResponse({ error: 'Forbidden' }, 403);
    const state = await this.getState();
    if (request.method === 'GET') return jsonResponse({ sections: state.homepageSections ?? [] }, 200);
    if (request.method !== 'PUT' || !isSameOrigin(request)) return jsonResponse({ error: 'Method not allowed' }, 405);
    const body = (await readJsonBody<{ sections?: unknown }>(request)) ?? {};
    if (!Array.isArray(body?.sections) || body.sections.length > 40) return jsonResponse({ error: 'Invalid homepage sections.' }, 400);
    const sections: HomepageSection[] = body.sections.map((value, index) => {
      const item = value as Record<string, unknown>;
      return {
        id: typeof item.id === 'string' ? item.id.slice(0,80) : `section_${index}`,
        key: typeof item.key === 'string' ? item.key.slice(0,80) : `section_${index}`,
        title: typeof item.title === 'string' ? item.title.slice(0,180) : '',
        content: typeof item.content === 'string' ? item.content.slice(0,5000) : '',
        visible: item.visible !== false, position: index, updatedAt: Date.now(),
      };
    });
    state.homepageSections = sections;
    await this.storage.put('admin-state', state);
    await this.recordActivity(actor.username, 'update', 'homepage_sections');
    return jsonResponse({ sections }, 200);
  }

  private async handleBackups(request: Request): Promise<Response> {
    const actor = await this.getSessionUser(request);
    if (!actor) return jsonResponse({ error: 'Unauthorized' }, 401);
    if (actor.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403);
    const state = await this.getState();
    const url = new URL(request.url);
    if (request.method === 'GET') return jsonResponse({ backups: (state.backups ?? []).map(({id,label,createdAt}) => ({id,label,createdAt})) }, 200);
    if (request.method === 'POST' && url.pathname === '/api/admin/backups') {
      if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
      const body = await readJsonBody<{ label?: unknown }>(request);
      const { backups: previousBackups, ...snapshot } = state;
      void previousBackups;
      const backup = { id: `bkp_${Date.now().toString(36)}`, label: typeof body?.label === 'string' ? body.label.slice(0,100) : 'Manual backup', createdAt: Date.now(), snapshot };
      state.backups = [backup, ...(state.backups ?? [])].slice(0, 20);
      await this.storage.put('admin-state', state);
      await this.recordActivity(actor.username, 'create', 'backup', backup.id);
      return jsonResponse({ backup: { id: backup.id, label: backup.label, createdAt: backup.createdAt } }, 201);
    }
    if (request.method === 'POST' && url.pathname.endsWith('/restore')) {
      if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
      const id = decodeURIComponent(url.pathname.split('/').slice(-2)[0]);
      const backup = (state.backups ?? []).find((item) => item.id === id);
      if (!backup) return jsonResponse({ error: 'Backup not found.' }, 404);
      const restored = { ...backup.snapshot, backups: state.backups };
      await this.storage.put('admin-state', restored);
      await this.recordActivity(actor.username, 'restore', 'backup', id);
      return jsonResponse({ restored: true }, 200);
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  private async handlePublicContent(request: Request): Promise<Response> {
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);
    const pathname = new URL(request.url).pathname;
    const state = await this.getState();
    if (pathname === '/api/content') {
      const content = (state.content ?? []).filter((item) => item.status === 'published').sort((a,b) => (b.publishedAt ?? b.updatedAt) - (a.publishedAt ?? a.updatedAt)).map(({id,title,slug,excerpt,seoTitle,metaDescription,ogImageUrl,publishedAt,updatedAt}) => ({id,title,slug,excerpt,seoTitle,metaDescription,ogImageUrl,publishedAt,updatedAt}));
      return jsonResponse({ content }, 200);
    }
    const slug = decodeURIComponent(pathname.slice('/api/content/'.length));
    const content = (state.content ?? []).find((item) => item.slug === slug && item.status === 'published');
    if (!content) return jsonResponse({ error: 'Content not found.' }, 404);
    return jsonResponse({ content }, 200);
  }

  private async handleResolveRedirect(request: Request): Promise<Response> {
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);
    const requestedPath = new URL(request.url).searchParams.get('path') ?? '';
    const state = await this.getState();
    const redirect = (state.redirects ?? []).find((item) => item.active && item.sourcePath === requestedPath);
    if (!redirect) return jsonResponse({ found: false }, 404);
    return jsonResponse({ found: true, destinationUrl: redirect.destinationUrl, statusCode: redirect.statusCode }, 200);
  }

  private async handleGetPublicSettings(): Promise<Response> {
    const settings = await this.getSettings();
    return jsonResponse(settings, 200);
  }

  private async handleSession(request: Request): Promise<Response> {
    const user = await this.getSessionUser(request);
    return jsonResponse({ authenticated: Boolean(user), username: user?.username, role: user?.role }, 200);
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
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
    if (!isSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
    if (!this.isLoginConfigured()) return jsonResponse({ error: 'Admin login is not configured.' }, 503);

    const clientKey = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const now = Date.now();
    const record = this.loginFailures.get(clientKey);
    if (record && now - record.firstAt < LOGIN_WINDOW_MS && record.count >= MAX_LOGIN_FAILURES) {
      return jsonResponse({ error: 'Too many login attempts. Try again later.' }, 429);
    }
    const body = await readJsonBody<{ username?: unknown; password?: unknown }>(request);
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const state = await this.getState();
    let user = (state.users ?? []).find((item) => item.username.toLowerCase() === username.toLowerCase() && item.active);
    if (!user && !(state.users ?? []).length &&
        safeEqual(username, this.secrets.ADMIN_USERNAME as string) &&
        safeEqual(password, this.secrets.ADMIN_PASSWORD as string)) {
      const passwordRecord = await hashAdminPassword(password);
      user = { id: 'usr_root', username, email: '', ...passwordRecord, role: 'admin', active: true, createdAt: now, lastLoginAt: now };
      state.users = [user];
      await this.storage.put('admin-state', state);
    } else if (user && !(await verifyAdminPassword(password, user.passwordSalt, user.passwordHash))) {
      user = undefined;
    }

    if (!user) {
      if (!record || now - record.firstAt >= LOGIN_WINDOW_MS) this.loginFailures.set(clientKey, { count: 1, firstAt: now });
      else record.count += 1;
      return jsonResponse({ error: 'Invalid login credentials' }, 401);
    }

    user.lastLoginAt = now;
    await this.storage.put('admin-state', state);
    this.loginFailures.delete(clientKey);
    const sessionToken = createSessionToken(user.username, user.role, this.secrets.SESSION_SECRET as string);
    return new Response(JSON.stringify({ authenticated: true, username: user.username, role: user.role }), {
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
    const cookieValue = request.headers.get('Cookie') ?? '';
    const match = cookieValue.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    if (match) {
      const state = await this.getState();
      const tokenHash = createHash('sha256').update(match[1]).digest('hex');
      state.revokedSessions = [...(state.revokedSessions ?? []), tokenHash].slice(-2000);
      await this.storage.put('admin-state', state);
    }
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
    const sessionUser = await this.getSessionUser(request);
    if (!sessionUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (request.method === 'POST' && sessionUser.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403);
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
    const sessionUser = await this.getSessionUser(request);
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
    const actor = await this.getSessionUser(request);
    if (!actor) return jsonResponse({ error: 'Unauthorized' }, 401);
    if (actor.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403);
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
      if (!Array.isArray(state.content)) state.content = [];
      if (!Array.isArray(state.activity)) state.activity = [];
      if (!Array.isArray(state.redirects)) state.redirects = [];
      if (!Array.isArray(state.homepageSections)) state.homepageSections = [];
      if (!Array.isArray(state.backups)) state.backups = [];
      if (!Array.isArray(state.media)) state.media = [];
      if (!Array.isArray(state.revokedSessions)) state.revokedSessions = [];
      if (!Array.isArray(state.users)) state.users = [];
      return state;
    }

    const freshState: AdminState = {
      settings: { ...DEFAULT_SITE_SETTINGS },
      events: [],
      messages: [], content: [], activity: [], redirects: [],
      homepageSections: [
        { id: 'home_hero', key: 'hero', title: 'Hero section', content: 'Homepage hero content configuration', visible: true, position: 0, updatedAt: Date.now() },
        { id: 'home_tools', key: 'tools', title: 'Image tools', content: 'Homepage tools section configuration', visible: true, position: 1, updatedAt: Date.now() },
        { id: 'home_features', key: 'features', title: 'Why PicShrinkPro', content: 'Homepage features section configuration', visible: true, position: 2, updatedAt: Date.now() },
      ], backups: [], media: [], revokedSessions: [], users: [],
    };
    await this.storage.put('admin-state', freshState);
    return freshState;
  }

  private async getSessionUser(request: Request): Promise<AdminPrincipal | undefined> {
    const secret = this.secrets.SESSION_SECRET;
    if (!this.isLoginConfigured() || !secret) return undefined;

    const cookieValue = request.headers.get('Cookie') ?? '';
    const match = cookieValue.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    if (!match) return undefined;

    const state = await this.getState();
    const tokenHash = createHash('sha256').update(match[1]).digest('hex');
    if ((state.revokedSessions ?? []).includes(tokenHash)) return undefined;
    const claims = verifySessionToken(match[1], secret);
    if (!claims) return undefined;
    const user = (state.users ?? []).find((item) => item.username.toLowerCase() === claims.username.toLowerCase() && item.active);
    return user ? { username: user.username, role: user.role } : undefined;
  }
}

export interface Env extends AdminSecrets {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  MEDIA?: R2BucketLike;
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

function sanitizeCanonicalUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try { const url = new URL(value.trim()); return ['http:', 'https:'].includes(url.protocol) ? url.toString().slice(0, 500) : ''; }
  catch { return ''; }
}

async function hashAdminPassword(password: string): Promise<{ passwordSalt: string; passwordHash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210_000, hash: 'SHA-256' }, key, 256);
  return { passwordSalt: Buffer.from(salt).toString('base64url'), passwordHash: Buffer.from(bits).toString('base64url') };
}

async function verifyAdminPassword(password: string, saltValue: string, expectedHash: string): Promise<boolean> {
  try {
    const salt = Buffer.from(saltValue, 'base64url');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210_000, hash: 'SHA-256' }, key, 256);
    return safeEqual(Buffer.from(bits).toString('base64url'), expectedHash);
  } catch { return false; }
}

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160);
}

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

function createSessionToken(username: string, role: AdminRole, secret: string): string {
  const payload = toBase64Url(JSON.stringify({ u: username, r: role, exp: Date.now() + SESSION_TTL_SECONDS * 1000 }));
  return `${payload}.${sign(payload, secret)}`;
}

function verifySessionToken(token: string, secret: string): { username: string; role: AdminRole } | undefined {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return undefined;
  if (!safeEqual(signature, sign(payload, secret))) return undefined;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { u?: unknown; r?: unknown; exp?: unknown };
    if (typeof data.u !== 'string' || typeof data.exp !== 'number' || data.exp < Date.now()) return undefined;
    const role = data.r === 'editor' || data.r === 'viewer' ? data.r : 'admin';
    return { username: data.u, role };
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
      const redirectResponse = request.method === 'GET' ? await adminApi(new Request(new URL(`/api/redirect/resolve?path=${encodeURIComponent(url.pathname)}`, url), { method: 'GET' }), env) : undefined;
      if (redirectResponse?.ok) {
        const redirect = await redirectResponse.json() as { destinationUrl: string; statusCode: number };
        response = Response.redirect(new URL(redirect.destinationUrl, url).toString(), redirect.statusCode);
      } else {
        const markdownResponse = await markdownForRequest(request, env);
        response = markdownResponse ?? await env.ASSETS.fetch(request);
      }
    }

    return withSecurityHeaders(response, url.pathname);
  },
};

export default worker;
