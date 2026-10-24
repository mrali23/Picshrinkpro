import { SEOHead } from '../../components/common/SEOHead';
import { ShieldAlert, Lock, CheckCircle } from 'lucide-react';
import { AdBanner } from '../../components/common/AdBanner';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <SEOHead
        title="Privacy Policy - PicShrink Zero Server Storage Guarantee"
        description="PicShrink Privacy Policy: 100% browser-based client-side image processing. We do not store, view, or transmit your images to any remote server."
        path="/privacy-policy"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-3">
            <Lock className="w-3.5 h-3.5" /> Privacy First
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-slate-600">
            Last Updated: October 23, 2026 • Effective Immediately
          </p>
        </div>

        <AdBanner type="top" />

        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8 text-slate-700 leading-relaxed text-base">
          {/* Highlight banner */}
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-lg text-emerald-950">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Summary: We Do Not Store, Access, Or Transmit Your Images</span>
            </div>
            <p className="text-sm text-emerald-800">
              Unlike traditional image converter websites, PicShrink executes 100% of image
              compression, resizing, cropping, background removal, and PDF generation directly
              inside your web browser using HTML5 Canvas and WebAssembly. Your files never leave your
              device and are never uploaded to any remote server or third-party cloud.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">1. Information We Do Not Collect</h2>
            <p>
              When you use our services on <strong>PicShrink</strong>, you do
              not need to register an account, log in, or provide personal identification. We do not
              collect:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li>Your uploaded photos, graphics, documents, or image metadata.</li>
              <li>Your identity, personal email address, or phone number.</li>
              <li>Payment details or credit card information (our tools are 100% free).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">2. Client-Side Browser Execution</h2>
            <p>
              All image operations are performed in temporary volatile browser memory using standard
              browser APIs (HTMLCanvasElement, FileReader, Blob, and Web Workers). Once you close or
              refresh your browser tab, all transient data in memory is automatically expunged.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. Advertising &amp; Cookies</h2>
            <p>
              To keep our tools freely accessible to everyone worldwide, PicShrink displays
              third-party advertisements through Google AdSense and trusted advertising partners.
              These vendors may use cookies, web beacons, and unique device identifiers to serve ads
              based on prior visits to this website or other websites across the internet.
            </p>
            <p>
              You can opt out of personalized advertising by visiting Google Ad Settings (
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                https://adssettings.google.com
              </a>
              ) or through the Digital Advertising Alliance at{' '}
              <a
                href="https://optout.aboutads.info"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                optout.aboutads.info
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">4. Analytics &amp; Web Logs</h2>
            <p>
              We may collect standard, non-personally identifiable diagnostic telemetry (such as
              browser type, operating system, language preferences, referring site, and general
              geographic region) purely to diagnose browser compatibility bugs, optimize Core Web
              Vitals, and ensure smooth performance across devices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">5. GDPR &amp; CCPA Compliance</h2>
            <p>
              Because PicShrink does not collect, sell, or retain any personal data or uploaded
              content, we inherently satisfy the data minimization principles mandated under the
              European Union General Data Protection Regulation (GDPR) and the California Consumer
              Privacy Act (CCPA).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">6. Contact Our Privacy Officer</h2>
            <p>
              If you have any questions or feedback regarding this Privacy Policy or our client-side
              architecture, please reach out via our{' '}
              <a href="/contact" className="text-blue-600 hover:underline">
                Contact Page
              </a>
              .
            </p>
          </section>
        </div>

        <AdBanner type="bottom" />
      </div>
    </div>
  );
}
