import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Route-level lazy loading keeps image-processing dependencies out of the initial page bundle.
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const CompressorPage = lazy(() => import('./pages/tools/CompressorPage').then(m => ({ default: m.CompressorPage })));
const BgRemoverPage = lazy(() => import('./pages/tools/BgRemoverPage').then(m => ({ default: m.BgRemoverPage })));
const ResizerPage = lazy(() => import('./pages/tools/ResizerPage').then(m => ({ default: m.ResizerPage })));
const CropperPage = lazy(() => import('./pages/tools/CropperPage').then(m => ({ default: m.CropperPage })));
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
import { analytics } from './utils/analytics';

// Scroll to top & real-time analytics tracker on route change
function RouteTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    analytics.trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    analytics.initGA4();
  }, []);

  return null;
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <RouteTracker />
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
          <Navbar />
          <main className="flex-1">
            <Suspense fallback={<div role="status" className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">Loading page…</div>}>
            <Routes>
              {/* 1. Home Page */}
              <Route path="/" element={<HomePage />} />

              {/* 2. Tool Pages (8 Pages) */}
              <Route path="/compressor" element={<CompressorPage />} />
              <Route path="/bg-remover" element={<BgRemoverPage />} />
              <Route path="/resizer" element={<ResizerPage />} />
              <Route path="/cropper" element={<CropperPage />} />
              <Route path="/jpg-to-png" element={<JpgToPngPage />} />
              <Route path="/png-to-jpg" element={<PngToJpgPage />} />
              <Route path="/webp-converter" element={<WebpConverterPage />} />
              <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
              <Route path="/filters" element={<FiltersPage />} />

              {/* 3. Legal & Company Pages (4 Pages) */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* 4. Blog Pages (8 Pages: 1 Index + 7 Articles) */}
              <Route path="/blog" element={<BlogIndexPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              {/* Alias for prompt variation */}
              <Route
                path="/blog/compress-without-losing-quality"
                element={<Navigate to="/blog/how-to-compress-image-without-losing-quality" replace />}
              />

              {/* Catch-all 404 fallback */}
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </HelmetProvider>
  );
}
