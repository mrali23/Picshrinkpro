import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { NotFoundPage } from './pages/NotFoundPage';
import { RelatedLinks } from './components/common/RelatedLinks';
import { usePublicSiteSettings } from './utils/siteSettings';
import { applyTheme, onThemeModeChanged } from './utils/theme';

// Route-level lazy loading keeps image-processing dependencies out of the initial page bundle.
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const CompressorPage = lazy(() => import('./pages/tools/CompressorPage').then(m => ({ default: m.CompressorPage })));
const BgRemoverPage = lazy(() => import('./pages/tools/BgRemoverPage').then(m => ({ default: m.BgRemoverPage })));
const ResizerPage = lazy(() => import('./pages/tools/ResizerPage').then(m => ({ default: m.ResizerPage })));
// Use ImageCropperPage path (not CropperPage) so builds never pick up a cached PLACEHOLDER stub.
const CropperPage = lazy(() => import('./pages/tools/ImageCropperPage').then(m => ({ default: m.CropperPage })));
const JpgToPngPage = lazy(() => import('./pages/tools/JpgToPngPage').then(m => ({ default: m.JpgToPngPage })));
const PngToJpgPage = lazy(() => import('./pages/tools/PngToJpgPage').then(m => ({ default: m.PngToJpgPage })));
const WebpConverterPage = lazy(() => import('./pages/tools/WebpConverterPage').then(m => ({ default: m.WebpConverterPage })));
const ImageToPdfPage = lazy(() => import('./pages/tools/ImageToPdfPage').then(m => ({ default: m.ImageToPdfPage })));
const FiltersPage = lazy(() => import('./pages/tools/FiltersPage').then(m => ({ default: m.FiltersPage })));

// Legal pages
const AboutPage = lazy(() => import('./pages/legal/AboutPage').then(m => ({ default: m.AboutPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('./pages/legal/TermsPage').then(m => ({ default: m.TermsPage })));
const ContactPage = lazy(() => import('./pages/legal/ContactPage').then(m => ({ default: m.ContactPage })));

// Blog pages
const BlogIndexPage = lazy(() => import('./pages/blog/BlogIndexPage').then(m => ({ default: m.BlogIndexPage })));
const BlogPostPage = lazy(() => import('./pages/blog/BlogPostPage').then(m => ({ default: m.BlogPostPage })));

// Admin
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
import { analytics, isAdminPath } from './utils/analytics';

// Scroll to top & real-time analytics tracker on route change
function RouteTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    analytics.trackPageView(pathname);
  }, [pathname]);

  // Start Google Analytics once, on the first public page. Never on /admin.
  const gaStarted = useRef(false);
  useEffect(() => {
    if (isAdminPath(pathname) || gaStarted.current) return;
    gaStarted.current = true;
    analytics.initGA4();
  }, [pathname]);

  return null;
}

/** Applies the admin-managed theme (brand color, corners, light/dark) to the page and keeps it live. */
function ThemeApplier() {
  const { theme } = usePublicSiteSettings();
  const { pathname } = useLocation();
  const scope = pathname.startsWith('/admin') ? 'admin' : 'public';

  useEffect(() => {
    const apply = () => applyTheme(theme, scope);
    apply();
    const stopMode = onThemeModeChanged(apply);
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    query?.addEventListener('change', apply);
    return () => {
      stopMode();
      query?.removeEventListener('change', apply);
    };
  }, [theme, scope]);

  return null;
}

/** Routes and layout without a router, so the same tree is used by the browser and by the build-time prerender. */
export function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  return (
    <>
        <RouteTracker />
        <ThemeApplier />
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
          {!isAdminRoute && <Navbar />}
          <main className="flex-1">
            <Suspense fallback={<div role="status" className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">Loading page…</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/compressor" element={<CompressorPage />} />
              <Route path="/bg-remover" element={<BgRemoverPage />} />
              <Route path="/resizer" element={<ResizerPage />} />
              <Route path="/cropper" element={<CropperPage />} />
              <Route path="/jpg-to-png" element={<JpgToPngPage />} />
              <Route path="/png-to-jpg" element={<PngToJpgPage />} />
              <Route path="/webp-converter" element={<WebpConverterPage />} />
              <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
              <Route path="/filters" element={<FiltersPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/blog" element={<BlogIndexPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route
                path="/blog/compress-without-losing-quality"
                element={<Navigate to="/blog/how-to-compress-image-without-losing-quality" replace />}
              />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
            {!isAdminRoute && <RelatedLinks />}
          </main>
          {!isAdminRoute && <Footer />}
        </div>
    </>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </HelmetProvider>
  );
}
