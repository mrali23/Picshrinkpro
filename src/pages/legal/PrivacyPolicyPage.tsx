import { SEOHead } from '../../components/common/SEOHead';
import { ShieldAlert, Lock, CheckCircle } from 'lucide-react';
import { AdBanner } from '../../components/common/AdBanner';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <SEOHead
        title="Privacy Policy - PicShrink Browser-Based Image Processing"
        description="PicShrink processes image inputs in your browser. The AI runtime and model may be downloaded from third-party hosts; the selected image itself is processed locally."
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
            Last Updated: October 26, 2026
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
              Image inputs for compression, resizing, cropping, conversion, and background removal are processed in your browser and are not uploaded by these tools. The AI background remover downloads its runtime and model weights from third-party content hosts on first use; those downloads do not contain your image. If you configure Google Analytics, event data is sent to Google.
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
              <li>Your identity, personal email address, or phone number. Anonymous browser activity identifiers are used for site-wide usage counts when the analytics endpoint is available.</li>
              <li>Payment details or credit card information (our tools are 100% free).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">2. Client-Side Browser Execution</h2>
            <p>
              Image processing uses browser APIs and temporary memory. AI background removal uses a browser-hosted segmentation model; runtime and model files may be fetched from third-party hosts while your selected image is processed locally. Temporary image URLs and in-memory data are released when no longer needed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. Advertising &amp; Cookies</h2>
            <p>
              AdSense ads load only when the site administrator enables them and configures a publisher account and ad slots. Google and its partners may use cookies or similar technologies to serve and measure ads under their own policies.
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
              The site records page views and image-tool runs using a random browser identifier, page path, and event time. The identifier is kept in browser storage and is used to estimate visitors active in the last five minutes; uploaded images and IP addresses are not included in these analytics events. The site-wide counts are stored by Cloudflare. If a GA4 Measurement ID is configured, page-view and tool-use events are also sent to that Google Analytics property. Cloudflare may process ordinary request logs to deliver and secure the site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">5. GDPR &amp; CCPA Compliance</h2>
            <p>
              Privacy obligations depend on enabled features, third-party services, and users' locations. This page is a plain-language summary, not a legal certification or a guarantee of compliance with a specific law.
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
