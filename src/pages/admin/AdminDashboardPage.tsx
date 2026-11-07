import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Activity, BarChart3, Check, Eye, EyeOff, FileText, Image, LogOut, Mail, Save, Settings, ShieldCheck, Users } from 'lucide-react';
import { analytics, type AnalyticsEvent } from '../../utils/analytics';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '../../utils/siteSettings';

interface AnalyticsSummary {
  realtimeActiveUsers: number;
  todayPageviews: number;
  totalImagesProcessed: number;
  popularTools: { name: string; count: number }[];
  recentEvents: AnalyticsEvent[];
}

type AdminRole = 'admin' | 'editor' | 'viewer';
type AdminTab = 'overview' | 'content' | 'media' | 'inbox' | 'site' | 'users' | 'settings';
interface AdminUser { id: string; username: string; email: string; role: AdminRole; active: boolean; createdAt: number; lastLoginAt?: number; }
interface ManagedRedirect { id: string; sourcePath: string; destinationUrl: string; statusCode: 301 | 302 | 307 | 308; active: boolean; createdAt: number; }
interface ManagedSection { id: string; key: string; title: string; content: string; visible: boolean; position: number; updatedAt: number; }
interface ActivityEntry { id: string; actor: string; action: string; resource: string; resourceId?: string; createdAt: number; }
interface BackupEntry { id: string; label: string; createdAt: number; }
interface MediaAsset { id: string; key: string; name: string; type: string; size: number; createdAt: number; }
interface ManagedContent { id: string; title: string; slug: string; excerpt: string; body: string; status: 'draft' | 'published' | 'archived'; seoTitle: string; metaDescription: string; canonicalUrl: string; ogImageUrl: string; createdAt: number; updatedAt: number; publishedAt?: number; version: number; }

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
  const [userRole, setUserRole] = useState<AdminRole>('admin');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [userDraft, setUserDraft] = useState({ username: '', email: '', password: '', role: 'editor' as AdminRole });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [contentItems, setContentItems] = useState<ManagedContent[]>([]);
  const [redirects, setRedirects] = useState<ManagedRedirect[]>([]);
  const [sections, setSections] = useState<ManagedSection[]>([]);
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [redirectDraft, setRedirectDraft] = useState({ sourcePath: '', destinationUrl: '', statusCode: '301' });
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentDraft, setContentDraft] = useState({ title: '', slug: '', excerpt: '', body: '', status: 'draft' as 'draft' | 'published', seoTitle: '', metaDescription: '', canonicalUrl: '', ogImageUrl: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAdminData = useCallback(async (role: AdminRole = userRole) => {
    const [nextSettings, nextSummary, contentResult, redirectResult, sectionResult, inbox, activity, backup, users] = await Promise.all([
      requestJson<SiteSettings>('/api/admin/settings'),
      requestJson<AnalyticsSummary>('/api/admin/analytics'),
      requestJson<{ content: ManagedContent[] }>('/api/admin/content'),
      requestJson<{ redirects: ManagedRedirect[] }>('/api/admin/redirects'),
      requestJson<{ sections: ManagedSection[] }>('/api/admin/homepage-sections'),
      role === 'admin' ? requestJson<{ messages: ContactMessage[] }>('/api/admin/messages') : Promise.resolve({ messages: [] as ContactMessage[] }),
      role === 'admin' ? requestJson<{ activity: ActivityEntry[] }>('/api/admin/activity') : Promise.resolve({ activity: [] as ActivityEntry[] }),
      role === 'admin' ? requestJson<{ backups: BackupEntry[] }>('/api/admin/backups') : Promise.resolve({ backups: [] as BackupEntry[] }),
      role === 'admin' ? requestJson<{ users: AdminUser[] }>('/api/admin/users') : Promise.resolve({ users: [] as AdminUser[] }),
    ]);
    setSettings(nextSettings); setSummary(nextSummary); setContentItems(contentResult.content);
    setRedirects(redirectResult.redirects); setSections(sectionResult.sections);
    setMessages(inbox.messages); setActivityEntries(activity.activity); setBackups(backup.backups); setAdminUsers(users.users);
  }, [userRole]);

  useEffect(() => {
    let active = true;
    requestJson<{ authenticated: boolean; role?: AdminRole }>('/api/admin/session')
      .then((session) => {
        if (!active) return;
        setAuthenticated(session.authenticated);
        const role = session.role ?? 'admin';
        setUserRole(role);
        if (session.authenticated) loadAdminData(role).catch((reason: unknown) => {
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
      loadAdminData(userRole).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Analytics refresh failed.');
      });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [authenticated, loadAdminData, userRole]);


  useEffect(() => {
    if (tab !== 'media' || !authenticated) return;
    let active = true;
    setMediaLoading(true);
    requestJson<{ media: MediaAsset[] }>('/api/admin/media')
      .then((result) => { if (active) setMediaAssets(result.media); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Media library could not be loaded.'); })
      .finally(() => { if (active) setMediaLoading(false); });
    return () => { active = false; };
  }, [tab, authenticated]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const login = await requestJson<{ role: AdminRole }>('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      setAuthenticated(true);
      setUserRole(login.role);
      setPassword('');
      await loadAdminData(login.role);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Admin login failed.');
    } finally {
      setBusy(false);
    }
  };


  const createAdminUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const result = await requestJson<{ user: AdminUser }>('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userDraft),
      });
      setAdminUsers((items) => [...items, result.user]);
      setUserDraft({ username: '', email: '', password: '', role: 'editor' });
      setNotice('User account created.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'User could not be created.'); }
  };

  const updateAdminUser = async (user: AdminUser, patch: Partial<Pick<AdminUser, 'role' | 'active'>>) => {
    try {
      await requestJson('/api/admin/users/' + encodeURIComponent(user.id), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      setAdminUsers((items) => items.map((item) => item.id === user.id ? { ...item, ...patch } : item));
      setNotice('User permissions updated.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'User could not be updated.'); }
  };

  const deleteAdminUser = async (user: AdminUser) => {
    if (!window.confirm('Delete admin account "' + user.username + '"?')) return;
    try {
      await requestJson('/api/admin/users/' + encodeURIComponent(user.id), { method: 'DELETE' });
      setAdminUsers((items) => items.filter((item) => item.id !== user.id));
      setNotice('User account deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'User could not be deleted.'); }
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
      setUserRole('admin');
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



  const uploadMedia = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMediaFile) { setError('Choose an image before uploading.'); return; }
    const form = new FormData(); form.set('file', selectedMediaFile);
    try {
      const result = await requestJson<{ media: MediaAsset }>('/api/admin/media', { method: 'POST', body: form });
      setMediaAssets((items) => [result.media, ...items]); setSelectedMediaFile(null);
      const input = document.getElementById('admin-media-file') as HTMLInputElement | null;
      if (input) input.value = '';
      setNotice('Image uploaded to the configured R2 bucket.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Image upload failed.'); }
  };

  const deleteMedia = async (asset: MediaAsset) => {
    if (!window.confirm('Delete "' + asset.name + '" from the media library?')) return;
    try {
      await requestJson('/api/admin/media/' + encodeURIComponent(asset.id), { method: 'DELETE' });
      setMediaAssets((items) => items.filter((item) => item.id !== asset.id));
      setNotice('Media asset deleted from R2.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Media asset could not be deleted.'); }
  };

  const resetContentDraft = () => {
    setEditingContentId(null);
    setContentDraft({ title: '', slug: '', excerpt: '', body: '', status: 'draft', seoTitle: '', metaDescription: '', canonicalUrl: '', ogImageUrl: '' });
  };

  const saveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const existing = contentItems.find((item) => item.id === editingContentId);
      const result = await requestJson<{ content: ManagedContent }>(editingContentId ? '/api/admin/content/' + encodeURIComponent(editingContentId) : '/api/admin/content', {
        method: editingContentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contentDraft, version: existing?.version }),
      });
      setContentItems((items) => editingContentId ? items.map((item) => item.id === result.content.id ? result.content : item) : [result.content, ...items]);
      resetContentDraft();
      setNotice(result.content.status === 'published' ? 'Article saved and marked published in the CMS.' : 'Draft saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Content could not be saved.');
    } finally { setBusy(false); }
  };

  const editContent = (item: ManagedContent) => {
    setEditingContentId(item.id);
    setContentDraft({ title: item.title, slug: item.slug, excerpt: item.excerpt, body: item.body, status: item.status === 'published' ? 'published' : 'draft', seoTitle: item.seoTitle, metaDescription: item.metaDescription, canonicalUrl: item.canonicalUrl, ogImageUrl: item.ogImageUrl });
    setError(''); setNotice('');
  };

  const deleteContent = async (item: ManagedContent) => {
    if (!window.confirm('Permanently delete "' + item.title + '" from the CMS?')) return;
    try {
      await requestJson('/api/admin/content/' + encodeURIComponent(item.id), { method: 'DELETE' });
      setContentItems((items) => items.filter((entry) => entry.id !== item.id));
      if (editingContentId === item.id) resetContentDraft();
      setNotice('Content deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Content could not be deleted.'); }
  };


  const createRedirect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    try {
      const result = await requestJson<{ redirect: ManagedRedirect }>('/api/admin/redirects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...redirectDraft, statusCode: Number(redirectDraft.statusCode) }),
      });
      setRedirects((items) => [result.redirect, ...items]);
      setRedirectDraft({ sourcePath: '', destinationUrl: '', statusCode: '301' });
      setNotice('Redirect created and now active.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Redirect could not be created.'); }
  };

  const deleteRedirect = async (id: string) => {
    try {
      await requestJson('/api/admin/redirects/' + encodeURIComponent(id), { method: 'DELETE' });
      setRedirects((items) => items.filter((item) => item.id !== id));
      setNotice('Redirect deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Redirect could not be deleted.'); }
  };

  const saveSections = async () => {
    setBusy(true); setError('');
    try {
      const result = await requestJson<{ sections: ManagedSection[] }>('/api/admin/homepage-sections', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections }),
      });
      setSections(result.sections); setNotice('Homepage section settings saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sections could not be saved.'); }
    finally { setBusy(false); }
  };

  const createBackup = async () => {
    try {
      const result = await requestJson<{ backup: BackupEntry }>('/api/admin/backups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: 'Manual backup' }),
      });
      setBackups((items) => [result.backup, ...items]); setNotice('Backup snapshot created.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Backup could not be created.'); }
  };

  const restoreBackup = async (id: string) => {
    if (!window.confirm('Restore this snapshot? Current settings, content, inbox and site controls will be replaced.')) return;
    try {
      await requestJson('/api/admin/backups/' + encodeURIComponent(id) + '/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      await loadAdminData(); setNotice('Backup snapshot restored.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Backup could not be restored.'); }
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
          {userRole === 'admin' &&           <button onClick={() => setTab('inbox')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === 'inbox' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
            <Mail size={17} /> Inbox <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{messages.filter((message) => message.status === 'unread').length}</span>
          </button>
          }
          {userRole === 'admin' &&           <button onClick={() => setTab('settings')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === 'settings' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
            <Settings size={17} /> Site settings
          </button>
          }
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
        ) : tab === 'users' ? (
          <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <div className="space-y-3"><div><h2 className="text-xl font-bold text-slate-900">Users & permissions</h2><p className="mt-1 text-sm text-slate-500">Accounts use PBKDF2 password hashes. Permissions are enforced by the Worker, not just by hiding controls.</p></div>
              {adminUsers.map((user) => <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div><p className="font-semibold text-slate-900">{user.username}</p><p className="text-xs text-slate-500">{user.email || 'No email'} · {user.active ? 'Active' : 'Disabled'}</p></div><div className="flex flex-wrap items-center gap-2"><select value={user.role} disabled={user.username === username} onChange={(e) => updateAdminUser(user,{role:e.target.value as AdminRole})} className="rounded-lg border border-slate-200 px-2 py-2 text-xs"><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button onClick={() => updateAdminUser(user,{active:!user.active})} disabled={user.username === username} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">{user.active ? 'Disable' : 'Enable'}</button><button onClick={() => deleteAdminUser(user)} disabled={user.username === username} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40">Delete</button></div></article>)}
            </div>
            <form onSubmit={createAdminUser} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Add administrator account</h3><label className="block text-sm font-semibold text-slate-700">Username<input required minLength={3} maxLength={32} value={userDraft.username} onChange={(e)=>setUserDraft(v=>({...v,username:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label><label className="block text-sm font-semibold text-slate-700">Email<input required type="email" value={userDraft.email} onChange={(e)=>setUserDraft(v=>({...v,email:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label><label className="block text-sm font-semibold text-slate-700">Temporary password<input required minLength={12} type="password" autoComplete="new-password" value={userDraft.password} onChange={(e)=>setUserDraft(v=>({...v,password:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label><label className="block text-sm font-semibold text-slate-700">Role<select value={userDraft.role} onChange={(e)=>setUserDraft(v=>({...v,role:e.target.value as AdminRole}))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Create account</button><p className="text-xs text-slate-500">Share temporary passwords through a secure channel and require users to change them separately; a self-service password change flow is still pending.</p></form>
          </section>
        ) : tab === 'content' ? (
          <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Content studio</h2><p className="mt-1 text-sm text-slate-500">Create and manage CMS entries with version-aware editing and SEO metadata.</p></div>{userRole !== 'viewer' && <button onClick={resetContentDraft} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">New article</button>}</div>
              {contentItems.length ? contentItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate font-bold text-slate-900">{item.title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{item.status}</span></div><p className="mt-1 text-xs text-slate-500">/blog/{item.slug} · v{item.version}</p></div><time className="shrink-0 text-xs text-slate-400">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(item.updatedAt)}</time></div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.excerpt || 'No excerpt provided.'}</p>
                  <div className="mt-3 flex gap-2">{userRole !== 'viewer' && <><button onClick={() => editContent(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button><button onClick={() => deleteContent(item)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button></>}</div>
                </article>
              )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><FileText className="mx-auto text-slate-400" size={28}/><h3 className="mt-3 font-semibold text-slate-800">No CMS articles yet</h3><p className="mt-1 text-sm text-slate-500">Create a draft to start building your managed content library.</p></div>}
            </div>
            {userRole !== 'viewer' && <form onSubmit={saveContent} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div><h2 className="text-lg font-bold text-slate-900">{editingContentId ? 'Edit article' : 'Create article'}</h2><p className="mt-1 text-xs text-slate-500">Content is stored safely as text. HTML and scripts are not executed.</p></div>
              <label className="block text-sm font-semibold text-slate-700">Title<input required minLength={3} maxLength={180} value={contentDraft.title} onChange={(e) => setContentDraft((v) => ({...v,title:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
              <label className="block text-sm font-semibold text-slate-700">URL slug<input required value={contentDraft.slug} onChange={(e) => setContentDraft((v) => ({...v,slug:e.target.value}))} placeholder="article-url-slug" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
              <label className="block text-sm font-semibold text-slate-700">Excerpt<textarea rows={2} maxLength={500} value={contentDraft.excerpt} onChange={(e) => setContentDraft((v) => ({...v,excerpt:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
              <label className="block text-sm font-semibold text-slate-700">Article body<textarea required rows={9} maxLength={100000} value={contentDraft.body} onChange={(e) => setContentDraft((v) => ({...v,body:e.target.value}))} placeholder="Write article content. Separate paragraphs with blank lines." className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">SEO title<input maxLength={180} value={contentDraft.seoTitle} onChange={(e) => setContentDraft((v) => ({...v,seoTitle:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label><label className="block text-sm font-semibold text-slate-700">Meta description<input maxLength={300} value={contentDraft.metaDescription} onChange={(e) => setContentDraft((v) => ({...v,metaDescription:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label></div>
              <label className="block text-sm font-semibold text-slate-700">Canonical URL<input value={contentDraft.canonicalUrl} onChange={(e) => setContentDraft((v) => ({...v,canonicalUrl:e.target.value}))} placeholder="Optional absolute URL" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
              <label className="block text-sm font-semibold text-slate-700">Open Graph image URL<input value={contentDraft.ogImageUrl} onChange={(e) => setContentDraft((v) => ({...v,ogImageUrl:e.target.value}))} placeholder="Optional image URL" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
              <label className="block text-sm font-semibold text-slate-700">Publication status<select value={contentDraft.status} onChange={(e) => setContentDraft((v) => ({...v,status:e.target.value as 'draft'|'published'}))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="draft">Draft</option><option value="published">Published</option></select></label>
              <div className="flex flex-wrap gap-2"><button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save article'}</button><button type="button" onClick={resetContentDraft} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Clear</button></div>
            </form>}
          </section>
        ) : tab === 'media' ? (
          <section className="space-y-5">
            <div><h2 className="text-xl font-bold text-slate-900">Media library</h2><p className="mt-1 text-sm text-slate-500">Upload, preview, and remove image assets stored in your Cloudflare R2 bucket. Maximum file size: 10 MB.</p></div>
            {userRole !== 'viewer' && <form onSubmit={uploadMedia} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
              <input id="admin-media-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(e) => setSelectedMediaFile(e.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700"/>
              <button disabled={!selectedMediaFile} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Upload image</button>
            </form>}
            {mediaLoading ? <p className="py-10 text-center text-sm text-slate-500">Loading media library…</p> : mediaAssets.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{mediaAssets.map((asset) => <article key={asset.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><img src={'/media/' + encodeURIComponent(asset.id)} alt={asset.name} loading="lazy" className="aspect-square w-full bg-slate-100 object-contain"/><div className="space-y-2 p-3"><p className="truncate text-xs font-semibold text-slate-800" title={asset.name}>{asset.name}</p><p className="text-[11px] text-slate-500">{(asset.size / 1024).toFixed(1)} KB · {asset.type.replace('image/','').toUpperCase()}</p>{userRole !== 'viewer' && <button onClick={() => deleteMedia(asset)} className="text-xs font-semibold text-rose-600 hover:underline">Delete asset</button>} <button onClick={() => navigator.clipboard.writeText(window.location.origin + '/media/' + asset.id)} className="ml-2 text-xs font-semibold text-blue-600 hover:underline">Copy public URL</button></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Image className="mx-auto text-slate-400" size={30}/><h3 className="mt-3 font-semibold text-slate-800">No media uploaded</h3><p className="mt-1 text-sm text-slate-500">Choose an image above to populate the library.</p></div>}
          </section>
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
        ) : tab === 'site' ? (
          <section className="space-y-6">
            <div><h2 className="text-xl font-bold text-slate-900">Website, SEO and operations</h2><p className="mt-1 text-sm text-slate-500">Manage redirects, homepage section configuration, audit activity, and recoverable application snapshots.</p></div>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div><h3 className="font-bold text-slate-900">SEO redirects</h3><p className="mt-1 text-xs text-slate-500">Redirect old local paths to new local paths. External destinations are blocked.</p></div>
                <form onSubmit={createRedirect} className="grid gap-3 sm:grid-cols-3">
                  <input required value={redirectDraft.sourcePath} onChange={(e) => setRedirectDraft((v) => ({...v,sourcePath:e.target.value}))} placeholder="/old-path" className="rounded-xl border border-slate-300 px-3 py-2 text-sm"/>
                  <input required value={redirectDraft.destinationUrl} onChange={(e) => setRedirectDraft((v) => ({...v,destinationUrl:e.target.value}))} placeholder="/new-path" className="rounded-xl border border-slate-300 px-3 py-2 text-sm"/>
                  <div className="flex gap-2"><select value={redirectDraft.statusCode} onChange={(e) => setRedirectDraft((v) => ({...v,statusCode:e.target.value}))} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-2 py-2 text-sm"><option>301</option><option>302</option><option>307</option><option>308</option></select><button className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Add</button></div>
                </form>
                <div className="space-y-2">{redirects.length ? redirects.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="min-w-0 break-all text-slate-700">{item.sourcePath} <span className="text-slate-400">→</span> {item.destinationUrl} <b className="ml-1">{item.statusCode}</b></span><button onClick={() => deleteRedirect(item.id)} className="shrink-0 text-rose-600">Delete</button></div>) : <p className="text-sm text-slate-400">No redirects configured.</p>}</div>
              </div>
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div><h3 className="font-bold text-slate-900">Homepage sections</h3><p className="mt-1 text-xs text-slate-500">Configure section labels and content records. Public homepage components must be wired to these records before these settings change their visible layout.</p></div>
                {sections.map((section,index) => <div key={section.id} className="space-y-2 rounded-xl border border-slate-100 p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{section.key}</span><label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={section.visible} onChange={(e) => setSections((items) => items.map((v,i) => i===index ? {...v,visible:e.target.checked} : v))}/>Visible</label></div><input value={section.title} onChange={(e) => setSections((items) => items.map((v,i) => i===index ? {...v,title:e.target.value} : v))} placeholder="Section title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/><textarea rows={2} value={section.content} onChange={(e) => setSections((items) => items.map((v,i) => i===index ? {...v,content:e.target.value} : v))} placeholder="Section content/configuration" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></div>)}
                <button onClick={saveSections} disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save section settings'}</button>
              </div>
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Activity log</h3><p className="mt-1 text-xs text-slate-500">Recent admin changes recorded by the Worker.</p></div><Activity className="text-blue-600"/></div>
                <div className="max-h-72 space-y-2 overflow-auto">{userRole === 'admin' && (activityEntries.length ? activityEntries.slice(0,50).map((entry) => <div key={entry.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-xs"><span className="text-slate-700"><b>{entry.actor}</b> {entry.action} {entry.resource} {entry.resourceId || ''}</span><time className="shrink-0 text-slate-400">{new Intl.DateTimeFormat(undefined,{dateStyle:'short',timeStyle:'short'}).format(entry.createdAt)}</time></div>)  : <p className="text-sm text-slate-400">No administrative activity recorded yet.</p>)}</div>
              </div>
              {userRole === 'admin' && <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Backup snapshots</h3><p className="mt-1 text-xs text-slate-500">Snapshots cover Durable Object application state, not R2 media objects.</p></div><button onClick={createBackup} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Create backup</button></div>
                <div className="space-y-2">{backups.length ? backups.map((backup) => <div key={backup.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-semibold text-slate-800">{backup.label}</p><time className="text-xs text-slate-400">{new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(backup.createdAt)}</time></div><button onClick={() => restoreBackup(backup.id)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Restore</button></div>) : <p className="text-sm text-slate-400">No backups created.</p>}</div>
              </div>}
            </div>
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
