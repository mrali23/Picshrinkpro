import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { CompressorPage } from './pages/tools/CompressorPage';
import { BgRemoverPage } from './pages/tools/BgRemoverPage';
import { ResizerPage } from './pages/tools/ResizerPage';
import { CropperPage } from './pages/tools/CropperPage';
import { JpgToPngPage } from './pages/tools/JpgToPngPage';
import { PngToJpgPage } from './pages/tools/PngToJpgPage';
import { WebpConverterPage } from './pages/tools/WebpConverterPage';
import { ImageToPdfPage } from './pages/tools/ImageToPdfPage';
import { FiltersPage } from './pages/tools/FiltersPage';

// Legal & Company
import { AboutPage } from './pages/legal/AboutPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsPage } from './pages/legal/TermsPage';
import { ContactPage } from './pages/legal/ContactPage';

// Blog
import { BlogIndexPage } from './pages/blog/BlogIndexPage';
import { BlogPostPage } from './pages/blog/BlogPostPage';

// Admin
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
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
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </HelmetProvider>
  );
}
