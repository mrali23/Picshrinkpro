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
  assert.deepEqual(await initialSession.json(), { authenticated: false });

  const unauthorized = await app.fetch('/api/admin/settings');
  assert.equal(unauthorized.status, 401);

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
  assert.deepEqual(await ok.json(), { authenticated: true });

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
