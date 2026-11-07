import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { AdminData } from './worker';

class MemoryStorage {
  private readonly values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async put<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  async transaction<T>(callback: (transaction: MemoryStorage) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

const TEST_SECRETS = {
  ADMIN_USERNAME: 'test-admin',
  ADMIN_PASSWORD: 'test-password',
  SESSION_SECRET: 'test-session-secret-with-more-than-thirty-two-characters',
};

function createTestApp(secrets: Record<string, string> = TEST_SECRETS, assets: Record<string, string> = {}) {
  // Mirrors Cloudflare: Durable Objects are constructed as new AdminData(ctx, env)
  const data = new AdminData({ storage: new MemoryStorage() }, secrets);
  const stub = { fetch: (request: Request) => data.fetch(request) };
  const env = {
    ASSETS: {
      fetch: async (request: Request) => {
        const body = assets[new URL(request.url).pathname];
        return body === undefined ? new Response('asset') : new Response(body, { status: 200 });
      },
    },
    ADMIN_DATA: { idFromName: () => 'global', get: () => stub },
    ...secrets,
  };
  return {
    data,
    fetch: (path: string, init?: RequestInit) => worker.fetch(new Request('https://picshrink.test' + path, init), env),
  };
}

test('admin endpoints require a valid session and save site settings', async () => {
  const app = createTestApp();
  const initialSession = await app.fetch('/api/admin/session');
  assert.equal(initialSession.status, 200);
  assert.equal(initialSession.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(initialSession.headers.get('X-Frame-Options'), 'DENY');
  assert.ok(initialSession.headers.get('Strict-Transport-Security'));
  assert.deepEqual(await initialSession.json(), { authenticated: false });

  const unauthorized = await app.fetch('/api/admin/settings');
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get('X-Content-Type-Options'), 'nosniff');

  const login = await app.fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://picshrink.test' },
    body: JSON.stringify({ username: 'test-admin', password: 'test-password' }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('Set-Cookie');
  assert.ok(cookie);
  const cookieHeader = cookie.split(';')[0];

  const settings = {
    siteName: 'Test Image Site',
    siteDescription: 'Site description',
    gaMeasurementId: 'G-TEST12345',
    adsEnabled: true,
    adsensePublisherId: 'ca-pub-1234567890123456',
    adSlots: { top: '1234567890', sidebar: '2345678901', bottom: '3456789012' },
  };
  const save = await app.fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify(settings),
  });
  assert.equal(save.status, 200);
  const publicSettings = await app.fetch('/api/settings');
  assert.deepEqual(await publicSettings.json(), settings);
});

test('analytics events update shared live dashboard metrics', async () => {
  const app = createTestApp();
  const login = await app.fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-admin', password: 'test-password' }),
  });
  const cookie = login.headers.get('Set-Cookie')!.split(';')[0];

  for (const event of [
    { type: 'pageview', path: '/', visitorId: 'visitor-test-000001' },
    { type: 'tool_run', path: '/compressor', visitorId: 'visitor-test-000001' },
  ]) {
    const response = await app.fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://picshrink.test' },
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 202);
  }

  const response = await app.fetch('/api/admin/analytics', { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  const metrics = await response.json() as {
    realtimeActiveUsers: number;
    todayPageviews: number;
    totalImagesProcessed: number;
    popularTools: { name: string; count: number }[];
  };
  assert.equal(metrics.realtimeActiveUsers, 1);
  assert.equal(metrics.todayPageviews, 1);
  assert.equal(metrics.totalImagesProcessed, 1);
  assert.deepEqual(metrics.popularTools, [{ name: 'COMPRESSOR', count: 1 }]);
});





test('admin user management hashes passwords and enforces editor/viewer roles', async () => {
  const app = createTestApp();
  const rootLogin = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  const rootCookie = rootLogin.headers.get('Set-Cookie')!.split(';')[0];
  const create = await app.fetch('/api/admin/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: rootCookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ username: 'content-editor', email: 'editor@example.com', password: 'long-test-password-123', role: 'editor' }),
  });
  assert.equal(create.status, 201);
  const user = (await create.json() as { user: { id: string; role: string } }).user;
  assert.equal(user.role, 'editor');

  const editorLogin = await app.fetch('/api/admin/login', loginRequest('content-editor', 'long-test-password-123'));
  assert.equal(editorLogin.status, 200);
  const editorCookie = editorLogin.headers.get('Set-Cookie')!.split(';')[0];
  const session = await app.fetch('/api/admin/session', { headers: { Cookie: editorCookie } });
  assert.deepEqual(await session.json(), { authenticated: true, username: 'content-editor', role: 'editor' });

  const forbiddenSettingsWrite = await app.fetch('/api/admin/settings', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: editorCookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({}),
  });
  assert.equal(forbiddenSettingsWrite.status, 403);
  const editorContentRead = await app.fetch('/api/admin/content', { headers: { Cookie: editorCookie } });
  assert.equal(editorContentRead.status, 200);
  const privateInbox = await app.fetch('/api/admin/messages', { headers: { Cookie: editorCookie } });
  assert.equal(privateInbox.status, 403);

  const disable = await app.fetch('/api/admin/users/' + user.id, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: rootCookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ active: false }),
  });
  assert.equal(disable.status, 200);
  const revokedSession = await app.fetch('/api/admin/session', { headers: { Cookie: editorCookie } });
  assert.deepEqual(await revokedSession.json(), { authenticated: false });
});

test('CMS supports draft creation, versioned editing, publishing, and public reads', async () => {
  const app = createTestApp();
  const login = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
  const create = await app.fetch('/api/admin/content', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ title: 'A Managed Article', slug: 'Managed Article', excerpt: 'A short summary', body: 'First paragraph.\\n\\nSecond paragraph.', status: 'draft' }),
  });
  assert.equal(create.status, 201);
  const created = (await create.json() as { content: { id: string; slug: string; version: number } }).content;
  assert.equal(created.slug, 'managed-article');
  assert.equal(created.version, 1);
  assert.equal((await app.fetch('/api/content/managed-article')).status, 404);

  const stale = await app.fetch('/api/admin/content/' + created.id, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ title: 'Stale edit', version: 0 }),
  });
  assert.equal(stale.status, 409);

  const publish = await app.fetch('/api/admin/content/' + created.id, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ title: 'A Managed Article', status: 'published', version: 1 }),
  });
  assert.equal(publish.status, 200);
  const publicArticle = await app.fetch('/api/content/managed-article');
  assert.equal(publicArticle.status, 200);
  assert.equal((await publicArticle.json() as { content: { status: string } }).content.status, 'published');
  const publicIndex = await app.fetch('/api/content');
  assert.equal((await publicIndex.json() as { content: unknown[] }).content.length, 1);
});



test('CMS scheduled articles stay private until the authenticated publisher runs', async () => {
  const app = createTestApp();
  const login = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
  const scheduledAt = Date.now() + 40;
  const create = await app.fetch('/api/admin/content', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ title: 'Scheduled Release', slug: 'scheduled-release', excerpt: 'Later', body: 'Scheduled body', status: 'scheduled', scheduledAt }),
  });
  assert.equal(create.status, 201);
  assert.equal((await app.fetch('/api/content/scheduled-release')).status, 404);

  const unauthorized = await app.fetch('/api/internal/publish-scheduled', { method: 'POST' });
  assert.equal(unauthorized.status, 401);

  await new Promise((resolve) => setTimeout(resolve, 60));
  const publish = await app.fetch('/api/internal/publish-scheduled', {
    method: 'POST', headers: { Authorization: `Bearer ${TEST_SECRETS.SESSION_SECRET}` },
  });
  assert.equal(publish.status, 200);
  assert.equal((await publish.json() as { published: number }).published, 1);
  assert.equal((await app.fetch('/api/content/scheduled-release')).status, 200);
});

test('public homepage sections and sitemap expose only public configuration and published posts', async () => {
  const staticSitemap = '<?xml version="1.0" encoding="UTF-8"?>\\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://picshrink.test/</loc></url></urlset>';
  const app = createTestApp(TEST_SECRETS, { '/sitemap.xml': staticSitemap });
  const homepage = await app.fetch('/api/homepage-sections');
  assert.equal(homepage.status, 200);
  assert.equal(homepage.headers.get('Cache-Control'), 'public, max-age=60, stale-while-revalidate=300');
  const sections = (await homepage.json() as { sections: Array<{ key: string; visible: boolean }> }).sections;
  assert.deepEqual(sections.map((item) => item.key), ['hero', 'tools', 'features']);

  const login = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
  const create = await app.fetch('/api/admin/content', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ title: 'Sitemap Managed Article', slug: 'sitemap-managed-article', excerpt: 'Published sitemap test', body: 'Content', status: 'published' }),
  });
  assert.equal(create.status, 201);
  const sitemap = await app.fetch('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get('Content-Type') ?? '', /application\/xml/);
  const xml = await sitemap.text();
  assert.match(xml, /https:\/\/picshrink.test\//);
  assert.match(xml, /https:\\/\\/picshrink.test\\//);
});

test('SEO redirects are validated, listed, and applied by the Worker', async () => {
  const app = createTestApp();
  const login = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
  const created = await app.fetch('/api/admin/redirects', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ sourcePath: '/old-guide', destinationUrl: '/blog', statusCode: 301 }),
  });
  assert.equal(created.status, 201);
  const bad = await app.fetch('/api/admin/redirects', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ sourcePath: '/unsafe', destinationUrl: '//evil.example', statusCode: 301 }),
  });
  assert.equal(bad.status, 400);
  const publicResponse = await app.fetch('/old-guide', { redirect: 'manual' });
  assert.equal(publicResponse.status, 301);
  assert.equal(publicResponse.headers.get('Location'), 'https://picshrink.test/blog');
});

test('activity log and backup snapshots are available to authenticated administrators', async () => {
  const app = createTestApp();
  const login = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
  const created = await app.fetch('/api/admin/backups', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ label: 'Before update' }),
  });
  assert.equal(created.status, 201);
  const backups = await app.fetch('/api/admin/backups', { headers: { Cookie: cookie } });
  assert.equal((await backups.json() as { backups: unknown[] }).backups.length, 1);
  const activity = await app.fetch('/api/admin/activity', { headers: { Cookie: cookie } });
  assert.ok((await activity.json() as { activity: Array<{ action: string }> }).activity.some((item) => item.action === 'create'));
});

test('admin logout clears the secure session cookie', async () => {
  const app = createTestApp();
  const login = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
  const before = await app.fetch('/api/admin/session', { headers: { Cookie: cookie } });
  assert.deepEqual(await before.json(), { authenticated: true, username: 'test-admin', role: 'admin' });

  const logout = await app.fetch('/api/admin/logout', {
    method: 'POST',
    headers: { Cookie: cookie, Origin: 'https://picshrink.test' },
    body: '{}',
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('Set-Cookie') ?? '', /Max-Age=0/);
  const after = await app.fetch('/api/admin/session', { headers: { Cookie: cookie } });
  assert.deepEqual(await after.json(), { authenticated: false });
});

test('contact form submissions are persisted and manageable from the authenticated inbox', async () => {
  const app = createTestApp();
  const submission = await app.fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://picshrink.test' },
    body: JSON.stringify({
      name: 'Jane Doe',
      email: 'jane@example.com',
      subject: 'Bug',
      message: 'The image compressor is not responding on my browser.',
    }),
  });
  assert.equal(submission.status, 201);
  const created = await submission.json() as { accepted: boolean; id: string };
  assert.equal(created.accepted, true);

  const invalid = await app.fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x', email: 'not-an-email', subject: 'Bug', message: 'short' }),
  });
  assert.equal(invalid.status, 400);

  const unauthenticated = await app.fetch('/api/admin/messages');
  assert.equal(unauthenticated.status, 401);

  const login = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
  const inbox = await app.fetch('/api/admin/messages', { headers: { Cookie: cookie } });
  assert.equal(inbox.status, 200);
  const data = await inbox.json() as { messages: Array<{ id: string; status: string; email: string }> };
  assert.equal(data.messages.length, 1);
  assert.equal(data.messages[0].id, created.id);
  assert.equal(data.messages[0].status, 'unread');

  const updated = await app.fetch('/api/admin/messages', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://picshrink.test' },
    body: JSON.stringify({ id: created.id, status: 'read' }),
  });
  assert.equal(updated.status, 200);
  const updatedBody = await updated.json() as { message: { status: string } };
  assert.equal(updatedBody.message.status, 'read');
});

const loginRequest = (username: string, password: string) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});

test('login fails closed when secrets are not configured and rejects admin/admin', async () => {
  const app = createTestApp({});
  const response = await app.fetch('/api/admin/login', loginRequest('admin', 'admin'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Set-Cookie'), null);

  const weakSecret = createTestApp({ ...TEST_SECRETS, SESSION_SECRET: 'too-short' });
  const weak = await weakSecret.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  assert.equal(weak.status, 503);
});

test('wrong credentials are rejected and repeated failures are rate limited', async () => {
  const app = createTestApp();
  const defaults = await app.fetch('/api/admin/login', loginRequest('admin', 'admin'));
  assert.equal(defaults.status, 401);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.equal((await app.fetch('/api/admin/login', loginRequest('test-admin', 'nope'))).status, 401);
  }
  const limited = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  assert.equal(limited.status, 429);
});

test('session cookie is Secure, HttpOnly and cannot be forged or tampered with', async () => {
  const app = createTestApp();
  const login = await app.fetch('/api/admin/login', loginRequest('test-admin', 'test-password'));
  const setCookie = login.headers.get('Set-Cookie')!;
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Strict/);

  const token = setCookie.split(';')[0].split('=')[1];
  const ok = await app.fetch('/api/admin/session', { headers: { Cookie: `picshrink_session=${token}` } });
  assert.deepEqual(await ok.json(), { authenticated: true, username: 'test-admin', role: 'admin' });

  const [payload] = token.split('.');
  const tampered = await app.fetch('/api/admin/session', { headers: { Cookie: `picshrink_session=${payload}.forged` } });
  assert.deepEqual(await tampered.json(), { authenticated: false });

  // The token an attacker could mint with the old built-in default secret must not work.
  const { createHmac } = await import('node:crypto');
  const forgedPayload = Buffer.from(JSON.stringify({ u: 'admin', exp: Date.now() + 60_000 })).toString('base64url');
  const forgedSig = createHmac('sha256', 'local-development-secret').update(forgedPayload).digest('base64url');
  const forged = await app.fetch('/api/admin/session', { headers: { Cookie: `picshrink_session=${forgedPayload}.${forgedSig}` } });
  assert.deepEqual(await forged.json(), { authenticated: false });
});

test('cross-site writes and malformed analytics events are rejected', async () => {
  const app = createTestApp();
  const crossSite = await app.fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ type: 'pageview', path: '/' }),
  });
  assert.equal(crossSite.status, 403);

  const badType = await app.fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'drop-table', path: '/' }),
  });
  assert.equal(badType.status, 400);
});

test('pages get security headers and agents get the Markdown twin of a page', async () => {
  const app = createTestApp(TEST_SECRETS, { '/compressor.md': '# Compressor\n' });
  const page = await app.fetch('/compressor');
  assert.equal(page.headers.get('X-Frame-Options'), 'DENY');
  assert.ok(page.headers.get('Strict-Transport-Security'));

  const markdown = await app.fetch('/compressor', { headers: { Accept: 'text/markdown' } });
  assert.match(markdown.headers.get('Content-Type') ?? '', /text\/markdown/);
  assert.equal(await markdown.text(), '# Compressor\n');

  const missing = await app.fetch('/no-twin?format=markdown');
  assert.equal(await missing.text(), 'asset');
});
