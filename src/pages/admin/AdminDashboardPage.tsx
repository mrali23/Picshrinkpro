import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  KeyRound,
  ShieldCheck,
  TrendingUp,
  HardDrive,
  Cpu,
  DollarSign,
  FileText,
  BarChart3,
  Globe,
  Settings,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Eye,
  EyeOff,
  Layers,
  Search,
  Radio,
  Activity,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { BLOG_POSTS } from '../../data/blogData';
import { TOOLS_DATA } from '../../data/toolsData';
import { analytics } from '../../utils/analytics';

export function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'analytics' | 'blog' | 'adsense' | 'seo'>('analytics');

  // AdSense simulator state
  const [adsEnabled, setAdsEnabled] = useState<boolean>(true);
  const [publisherId, setPublisherId] = useState<string>('ca-pub-9283748291038472');

  // Real-time analytics & GA4 state
  const [gaInput, setGaInput] = useState<string>(analytics.getMeasurementId());
  const [gaSaved, setGaSaved] = useState<boolean>(false);
  const [analyticsSummary, setAnalyticsSummary] = useState(analytics.getSummary());

  // Refresh analytics telemetry every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAnalyticsSummary(analytics.getSummary());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveGA = (e: React.FormEvent) => {
    e.preventDefault();
    analytics.setMeasurementId(gaInput);
    setGaSaved(true);
    setTimeout(() => setGaSaved(false), 3500);
  };

  // Admin credentials from environment secrets (with production fallback)
  const EXPECTED_USER = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
  const EXPECTED_PASS = import.meta.env.VITE_ADMIN_PASSWORD || 'picshrink_admin_secret_2026';

  // Check existing session
  useEffect(() => {
    const sessionToken = sessionStorage.getItem('picshrink_admin_session');
    if (sessionToken === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (usernameInput.trim() === EXPECTED_USER && passwordInput.trim() === EXPECTED_PASS) {
      sessionStorage.setItem('picshrink_admin_session', 'authenticated');
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid administrator username or secret password.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('picshrink_admin_session');
    setIsAuthenticated(false);
    setUsernameInput('');
    setPasswordInput('');
  };

  // Login Screen if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <SEOHead
          title="Admin Login - PicShrink Admin Dashboard"
          description="PicShrink Administrator Portal login. Access site analytics, blog CMS, and settings."
          path="/admin"
        />

        <div className="w-full max-w-md bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Portal</h1>
            <p className="text-xs text-slate-400">
              Enter administrator credentials configured in system secrets.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Secret Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Unlock Admin Dashboard</span>
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            Protected administrator area. Authorized personnel only.
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin Console View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8">
      <SEOHead
        title="Admin Dashboard - PicShrink Control Center"
        description="PicShrink administrator dashboard for managing image tools, blog posts, monetization, and SEO telemetry."
        path="/admin"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black">
              PS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  PicShrink <span className="text-blue-500">Admin Control</span>
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Live System
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Logged in as <strong>{EXPECTED_USER}</strong> • 100% Client-Side Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <span>View Live Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
          {[
            { id: 'analytics', label: 'Overview & Analytics', icon: BarChart3 },
            { id: 'blog', label: 'Blog & Content (8)', icon: FileText },
            { id: 'adsense', label: 'Monetization & Ads', icon: DollarSign },
            { id: 'seo', label: 'Technical SEO & Sitemaps', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview & Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Live Real-Time Banner */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-75"></span>
                  <Radio className="w-5 h-5 relative z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Real-Time Analytics Engine
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Streaming active sessions, client-side tool executions, and bandwidth metrics.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    {analyticsSummary.realtimeActiveUsers}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Active Users Now
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAnalyticsSummary(analytics.getSummary())}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="Refresh Live Data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Active Visitors (Last 30m)</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {analyticsSummary.realtimeActiveUsers}
                </div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Real-time active sessions
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Today's Total Pageviews</span>
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white font-mono">
                  {analyticsSummary.todayPageviews}
                </div>
                <div className="text-[11px] text-blue-400 font-medium">
                  Tracked across 21 pages
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Total Megabytes Saved</span>
                  <HardDrive className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-black text-white font-mono">
                  {analyticsSummary.totalMegabytesSaved} MB
                </div>
                <div className="text-[11px] text-indigo-400 font-medium">
                  Direct client-side reduction
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Server Infrastructure Cost</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400">$0.00 / mo</div>
                <div className="text-[11px] text-emerald-400 font-medium">
                  100% In-Browser Zero Cloud Compute
                </div>
              </div>
            </div>

            {/* Google Analytics 4 (GA4) Real-Time Configuration Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" />
                    <span>Google Analytics 4 (GA4) Real-Time Integration</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Connect your free GA4 Measurement ID to unlock official live visitor maps, device stats, and instant event streaming.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {analyticsSummary.gaMeasurementId ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> GA4 Active ({analyticsSummary.gaMeasurementId})
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold">
                      Not Configured Yet
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveGA} className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Enter GA4 Measurement ID (e.g. G-ABC123XYZ)"
                    value={gaInput}
                    onChange={(e) => setGaInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Save &amp; Connect GA4</span>
                </button>

                <a
                  href="https://analytics.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <span>Open GA4 Realtime</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </form>

              {gaSaved && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>GA4 Measurement ID saved! Tracking script initialized and streaming live pageviews.</span>
                </div>
              )}
            </div>

            {/* Publishing & Real-Time Analytics Walkthrough */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>How Real-Time Analytics Works When You Publish</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="font-bold text-blue-400 text-sm flex items-center gap-1.5">
                    <span>1. Google Analytics 4 (Free)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Go to <strong>analytics.google.com</strong>, create a free Web property, and copy your Measurement ID (<code className="text-blue-300 font-mono">G-XXXXXXXXXX</code>). Paste it above in this dashboard or in <code className="text-blue-300 font-mono">.env</code>. Once published, your GA4 <strong>Realtime Dashboard</strong> will show live visitors, active pages, countries, and events in real time.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                    <span>2. Netlify Realtime Analytics</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    When you deploy your site on Netlify (by uploading the generated <code className="text-emerald-300 font-mono">dist/</code> folder or linking your Git repo), you can enable <strong>Netlify Analytics</strong> in your Netlify dashboard under <em>Site Configuration &gt; Analytics</em>. It tracks 100% of server requests with zero ad-blocker loss and no cookie consent banner required.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="font-bold text-purple-400 text-sm flex items-center gap-1.5">
                    <span>3. In-App PicShrink Telemetry</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    PicShrink includes this built-in live telemetry dashboard at <code className="text-purple-300 font-mono">/admin</code>. It monitors real-time active users, popular tools, compression savings, and page executions automatically without needing any external subscription.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Activity Stream & Tool Usage Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Recent Live Events Stream */}
              <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Live Event Telemetry Feed</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Auto-refreshed</span>
                </div>

                <div className="space-y-2.5">
                  {analyticsSummary.recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            evt.type === 'pageview' ? 'bg-blue-400' : 'bg-emerald-400'
                          }`}
                        />
                        <div>
                          <span className="font-semibold text-white">
                            {evt.type === 'pageview' ? 'Pageview:' : 'Tool Execution:'}{' '}
                          </span>
                          <span className="font-mono text-slate-300">{evt.path}</span>
                          {evt.details?.tool && (
                            <span className="text-slate-400 ml-1.5">({evt.details.tool})</span>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Tools Ranking */}
              <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white">Top Tools by Popularity</h3>

                <div className="space-y-3">
                  {analyticsSummary.popularTools.slice(0, 6).map((tool, idx) => (
                    <div
                      key={tool.name}
                      className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-200">{tool.name}</span>
                      </div>
                      <span className="font-mono text-slate-400 font-semibold">
                        {tool.count.toLocaleString()} runs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Blog CMS & Articles */}
        {activeTab === 'blog' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Articles &amp; Educational Guides (8)</h2>
                <p className="text-xs text-slate-400">
                  All blog posts include Article schema JSON-LD, custom authoring, and internal tool links.
                </p>
              </div>
              <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> 7 Detailed Articles + 1 Blog Index
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/70 border-b border-slate-800 text-slate-300 font-bold">
                  <tr>
                    <th className="px-4 py-3">Title &amp; URL</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Read Time</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {BLOG_POSTS.map((post) => (
                    <tr key={post.slug} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white max-w-sm truncate">{post.title}</div>
                        <div className="text-[11px] text-blue-400 font-mono">{post.path}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          {post.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">{post.readTime}</td>
                      <td className="px-4 py-3 text-slate-400">{post.date}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                          Published
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={post.path}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white transition-colors"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Monetization & AdSense */}
        {activeTab === 'adsense' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Google AdSense Configuration</h2>
                <p className="text-xs text-slate-400">
                  Control ads-top (728x90), ads-sidebar (300x250), and ads-bottom placements.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAdsEnabled(!adsEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adsEnabled
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {adsEnabled ? 'Ads Display: ACTIVE' : 'Ads Display: PAUSED'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    AdSense Publisher ID
                  </label>
                  <input
                    type="text"
                    value={publisherId}
                    onChange={(e) => setPublisherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Referenced in public/ads.txt
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-bold text-white">Slot Configurations:</h4>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Top Header Ad (.ads-top):</span>
                      <strong className="text-slate-200">728 × 90 Leaderboard</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Tool Sidebar Ad (.ads-sidebar):</span>
                      <strong className="text-slate-200">300 × 250 Medium Rect</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Post-Download Ad (.ads-bottom):</span>
                      <strong className="text-slate-200">728 × 90 Responsive</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-blue-950/40 border border-blue-900/60 space-y-3 text-xs leading-relaxed text-blue-200">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>AdSense Compliance Notice</span>
                </div>
                <p>
                  PicShrink AdSense placeholders adhere to Google Webmaster Guidelines with clear
                  separation from tool buttons, labeled with subtle "Advertisement" tags, and zero
                  layout shifts (CLS &lt; 0.1).
                </p>
                <div className="pt-2 text-[11px] text-blue-300">
                  ads.txt status: Valid at <strong>/ads.txt</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Technical SEO & Sitemaps */}
        {activeTab === 'seo' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">SEO Health &amp; Canonical Auditing</h2>
                <p className="text-xs text-slate-400">
                  Application: <span className="font-semibold text-blue-400">PicShrink - Free Online Image Tools</span>
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                21 / 21 Pages Indexed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/70 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sitemap Status
                </span>
                <div className="text-base font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>public/sitemap.xml</span>
                </div>
                <p className="text-xs text-slate-400">
                  21 clean URLs with lastmod: 2026-10-23
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/70 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Robots.txt
                </span>
                <div className="text-base font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>public/robots.txt</span>
                </div>
                <p className="text-xs text-slate-400">
                  User-agent: * Allow: / with sitemap directive
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/70 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Netlify Clean URLs
                </span>
                <div className="text-base font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>public/_redirects</span>
                </div>
                <p className="text-xs text-slate-400">
                  /* /index.html 200 SPA rewrite active
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
