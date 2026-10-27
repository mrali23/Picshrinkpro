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

function createTestApp() {
  const data = new AdminData({ storage: new MemoryStorage() });
  const stub = { fetch: (request: Request) => data.fetch(request) };
  const env = {
    ASSETS: { fetch: async () => new Response('asset') },
    ADMIN_DATA: { idFromName: () => 'global', get: () => stub },
    ADMIN_USERNAME: 'test-admin',
    ADMIN_PASSWORD: 'test-password',
    SESSION_SECRET: 'test-session-secret-with-more-than-thirty-two-characters',
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
