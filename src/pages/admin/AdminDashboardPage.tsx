import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Activity, BarChart3, Check, Eye, EyeOff, LogOut, Mail, Save, Settings, ShieldCheck, Users } from 'lucide-react';
import { analytics, type AnalyticsEvent } from '../../utils/analytics';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '../../utils/siteSettings';

interface AnalyticsSummary {
  realtimeActiveUsers: number;
  todayPageviews: number;
  totalImagesProcessed: number;
  popularTools: { name: string; count: number }[];
  recentEvents: AnalyticsEvent[];
}

type AdminTab = 'overview' | 'inbox' | 'settings';

interface ContactMessage {
  id: string; name: string; email: string; subject: string; message: string;
  status: 'unread' | 'read' | 'archived'; createdAt: number;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  const isJson = response.headers.get('Content-Type')?.includes('application/json');
  if (!isJson) throw new Error('Admin API is unavailable. Run the Cloudflare Worker locally with `bun run dev:worker`.');
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(timestamp);
}

function AdminDashboardContent() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAdminData = useCallback(async () => {
    const [nextSettings, nextSummary, inbox] = await Promise.all([
      requestJson<SiteSettings>('/api/admin/settings'),
      requestJson<AnalyticsSummary>('/api/admin/analytics'),
      requestJson<{ messages: ContactMessage[] }>('/api/admin/messages'),
    ]);
    setSettings(nextSettings);
    setSummary(nextSummary);
    setMessages(inbox.messages);
  }, []);

  useEffect(() => {
    let active = true;
    requestJson<{ authenticated: boolean }>('/api/admin/session')
      .then((session) => {
        if (!active) return;
        setAuthenticated(session.authenticated);
        if (session.authenticated) loadAdminData().catch((reason: unknown) => {
          if (active) setError(reason instanceof Error ? reason.message : 'Could not load the admin dashboard.');
        });
      })
      .catch((reason: unknown) => {
        if (active) {
          setAuthenticated(false);
          setError(reason instanceof Error ? reason.message : 'Could not connect to the admin service.');
        }
      });
    return () => { active = false; };
  }, [loadAdminData]);

  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setInterval(() => {
      loadAdminData().catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Analytics refresh failed.');
      });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [authenticated, loadAdminData]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await requestJson('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      setAuthenticated(true);
      setPassword('');
      await loadAdminData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Admin login failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await requestJson('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      analytics.initGA4(settings.gaMeasurementId);
      window.dispatchEvent(new Event('picshrink-site-settings-updated'));
      setNotice('Site settings saved and applied.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Settings could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setError('');
    try {
      await requestJson('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      setAuthenticated(false);
      setSummary(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not log out.');
    }
  };

  const updateMessageStatus = async (id: string, status: ContactMessage['status']) => {
    setError('');
    try {
      const result = await requestJson<{ message: ContactMessage }>('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      setMessages((current) => current.map((message) => message.id === id ? result.message : message));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Message could not be updated.');
    }
  };

  const updateSettings = (patch: Partial<SiteSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  if (authenticated === null) {
    return <main className="mx-auto max-w-lg px-4 py-20 text-center text-slate-600">Connecting to secure admin…</main>;
  }

  if (!authenticated) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-14">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck size={25} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Secure area</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Admin sign in</h1>
          <p className="mt-2 text-sm text-slate-500">Use your Cloudflare Worker credentials, or the local credentials in `.dev.vars` while developing.</p>
          <form className="mt-7 space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-slate-700">
              Username
              <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <span className="relative mt-1.5 block">
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 text-slate-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[75vh] bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">PicShrinkPro control panel</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Admin dashboard</h1>
            <p className="mt-1 text-slate-500">Manage site metadata, analytics, and live ad placements.</p>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <LogOut size={17} /> Sign out
          </button>
        </header>

        <nav className="mb-6 flex gap-2 border-b border-slate-200">
          <button onClick={() => setTab('overview')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === 'overview' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
            <BarChart3 size={17} /> Overview
          </button>
          <button onClick={() => setTab('inbox')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === 'inbox' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
            <Mail size={17} /> Inbox <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{messages.filter((message) => message.status === 'unread').length}</span>
          </button>
          <button onClick={() => setTab('settings')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === 'settings' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
            <Settings size={17} /> Site settings
          </button>
        </nav>

        {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><Check size={17} />{notice}</p>}

        {tab === 'overview' ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Active visitors · last 5 min', value: summary?.realtimeActiveUsers ?? '—', icon: Users },
                { label: 'Page views today · UTC', value: summary?.todayPageviews ?? '—', icon: Eye },
                { label: 'Image tool runs · all time', value: summary?.totalImagesProcessed ?? '—', icon: Activity },
                { label: 'Google Analytics 4', value: settings.gaMeasurementId ? 'Connected' : 'Not configured', icon: BarChart3 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-slate-500"><span>{label}</span><Icon size={18} className="text-blue-600" /></div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Most-used tools</h2>
                <div className="mt-4 space-y-3">
                  {summary?.popularTools.length ? summary.popularTools.map((tool) => (
                    <div key={tool.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                      <span className="font-medium text-slate-700">{tool.name}</span><span className="font-bold text-slate-900">{tool.count}</span>
                    </div>
                  )) : <p className="py-5 text-sm text-slate-500">No tool usage has been recorded yet.</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Recent site activity</h2>
                <div className="mt-4 space-y-3">
                  {summary?.recentEvents.length ? summary.recentEvents.slice(0, 8).map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                      <span className="truncate text-slate-700">{event.type === 'pageview' ? 'Page view' : 'Tool run'} · {event.path}</span>
                      <time className="shrink-0 text-xs text-slate-500">{formatTime(event.timestamp)}</time>
                    </div>
                  )) : <p className="py-5 text-sm text-slate-500">Visitor activity will appear here as people use the site.</p>}
                </div>
              </div>
            </section>
            <p className="mt-4 text-xs text-slate-500">Live metrics refresh every 10 seconds. Active visitors are anonymous browser IDs seen within the last 5 minutes. GA4 visitor and revenue reports are available in your Google Analytics account.</p>
          </>
        ) : tab === 'inbox' ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-xl font-bold text-slate-900">Contact inbox</h2><p className="mt-1 text-sm text-slate-500">Messages submitted through the public contact form are stored in the Worker and visible here.</p></div>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">{messages.filter((message) => message.status === 'unread').length} unread</span>
            </div>
            {messages.length ? messages.map((message) => (
              <article key={message.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{message.subject}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${message.status === 'unread' ? 'bg-blue-50 text-blue-700' : message.status === 'archived' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{message.status}</span></div>
                    <p className="mt-1 text-sm text-slate-600">{message.name} · <a className="text-blue-600 hover:underline" href={`mailto:${encodeURIComponent(message.email)}`}>{message.email}</a></p>
                  </div>
                  <time className="text-xs text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(message.createdAt)}</time>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.status !== 'read' && <button onClick={() => updateMessageStatus(message.id, 'read')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Mark read</button>}
                  {message.status !== 'archived' && <button onClick={() => updateMessageStatus(message.id, 'archived')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Archive</button>}
                  {message.status === 'archived' && <button onClick={() => updateMessageStatus(message.id, 'unread')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Restore to unread</button>}
                </div>
              </article>
            )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Mail className="mx-auto text-slate-400" size={28} /><h3 className="mt-3 font-semibold text-slate-800">Your inbox is empty</h3><p className="mt-1 text-sm text-slate-500">New contact form submissions will appear here.</p></div>}
          </section>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">General site settings</h2>
              <div className="mt-5 grid gap-5">
                <label className="text-sm font-medium text-slate-700">Site name
                  <input maxLength={80} required value={settings.siteName} onChange={(event) => updateSettings({ siteName: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">Default site description
                  <textarea maxLength={320} rows={3} value={settings.siteDescription} onChange={(event) => updateSettings({ siteDescription: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Google Analytics 4</h2>
              <p className="mt-1 text-sm text-slate-500">Add your GA4 web stream Measurement ID. Events will be sent to that property.</p>
              <label className="mt-4 block text-sm font-medium text-slate-700">Measurement ID
                <input placeholder="G-XXXXXXXXXX" value={settings.gaMeasurementId} onChange={(event) => updateSettings({ gaMeasurementId: event.target.value.trim() })}
                  className="mt-1.5 w-full max-w-xl rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
              </label>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-lg font-bold text-slate-900">Google AdSense</h2><p className="mt-1 text-sm text-slate-500">Use your approved publisher ID and the ad unit slot IDs created in AdSense.</p></div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={settings.adsEnabled} onChange={(event) => updateSettings({ adsEnabled: event.target.checked })} className="h-4 w-4 accent-blue-600" />
                  Enable ads
                </label>
              </div>
              <label className="mt-5 block text-sm font-medium text-slate-700">Publisher ID
                <input placeholder="ca-pub-1234567890123456" value={settings.adsensePublisherId} onChange={(event) => updateSettings({ adsensePublisherId: event.target.value.trim() })}
                  className="mt-1.5 w-full max-w-xl rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
              </label>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {(['top', 'sidebar', 'bottom'] as const).map((slot) => (
                  <label key={slot} className="text-sm font-medium capitalize text-slate-700">{slot} ad slot ID
                    <input inputMode="numeric" placeholder="1234567890" value={settings.adSlots[slot]}
                      onChange={(event) => updateSettings({ adSlots: { ...settings.adSlots, [slot]: event.target.value.trim() } })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">Ads display only when enabled and both a publisher ID and the placement’s slot ID are set. AdSense approval and an authorized domain are required for live ads.</p>
            </section>

            <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <Save size={17} />{busy ? 'Saving…' : 'Save site settings'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export function AdminDashboardPage() {
  return (
    <>
      <Helmet>
        <title>Admin | PicShrink</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminDashboardContent />
    </>
  );
}
