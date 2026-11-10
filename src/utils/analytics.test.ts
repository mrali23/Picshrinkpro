import assert from 'node:assert/strict';
import test from 'node:test';
import { analytics, isAdminPath } from './analytics';

test('isAdminPath matches the admin area only', () => {
  assert.equal(isAdminPath('/admin'), true);
  assert.equal(isAdminPath('/admin/users'), true);
  assert.equal(isAdminPath('/administrator'), false);
  assert.equal(isAdminPath('/blog/admin'), false);
  assert.equal(isAdminPath('/'), false);
});

test('page views on admin paths are not stored, sent or forwarded to Google', () => {
  const calls: string[] = [];
  const g = globalThis as Record<string, unknown>;
  const saved = { localStorage: g.localStorage, fetch: g.fetch, window: g.window, document: g.document };
  g.localStorage = { getItem: () => { calls.push('read'); return null; }, setItem: () => { calls.push('write'); } };
  g.fetch = () => { calls.push('fetch'); return Promise.resolve(new Response('{}')); };
  g.window = { gtag: () => calls.push('gtag') };
  g.document = { title: 'Test page' };
  try {
    analytics.trackPageView('/admin');
    analytics.trackPageView('/admin/users');
    assert.deepEqual(calls, [], 'admin views must not touch storage, network or gtag');
    analytics.trackPageView('/compressor');
    const after: string[] = [...calls];
    assert.ok(after.includes('write') && after.includes('fetch') && after.includes('gtag'), 'public views are still tracked');
  } finally {
    g.localStorage = saved.localStorage; g.fetch = saved.fetch; g.window = saved.window; g.document = saved.document;
  }
});

test('Google Analytics is not configured while on an admin path', () => {
  const g = globalThis as Record<string, unknown>;
  const saved = { window: g.window, document: g.document };
  const injected: string[] = [];
  g.window = { location: { pathname: '/admin' } };
  g.document = {
    getElementById: () => null,
    createElement: () => ({}),
    head: { appendChild: () => injected.push('script') },
  };
  try {
    analytics.initGA4('G-ABC123DEF4');
    assert.deepEqual(injected, [], 'no gtag script may be added on /admin');
    assert.equal((g.window as { dataLayer?: unknown[] }).dataLayer, undefined);
  } finally {
    g.window = saved.window; g.document = saved.document;
  }
});
