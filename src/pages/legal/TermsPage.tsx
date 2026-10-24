import { SEOHead } from '../../components/common/SEOHead';
import { FileText, ShieldAlert } from 'lucide-react';
import { AdBanner } from '../../components/common/AdBanner';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <SEOHead
        title="Terms of Service - PicShrink Free Online Image Tools"
        description="PicShrink Terms of Service: Guidelines, allowable usage, disclaimer of warranties, and service terms for our free online image tools."
        path="/terms"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-800 mb-3">
            <FileText className="w-3.5 h-3.5" /> Legal Terms
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-3 text-slate-600">
            Last Updated: October 23, 2026 • Effective Immediately
          </p>
        </div>

        <AdBanner type="top" />

        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8 text-slate-700 leading-relaxed text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing and using <strong>PicShrink</strong>, you
              acknowledge that you have read, understood, and agreed to be bound by these Terms of
              Service and our Privacy Policy. If you do not agree with any part of these terms, you
              must immediately discontinue use of the website.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">2. Description of Service</h2>
            <p>
              PicShrink provides browser-based, client-side image manipulation utilities including
              image compression, resizing, background removal, cropping, format conversion (JPG, PNG,
              WebP), and image-to-PDF compilation. The service is provided free of charge, with no
              requirement for registration or software downloads.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. Intellectual Property and Content Rights</h2>
            <p>
              <strong>You retain 100% ownership and copyright</strong> of all photos, graphics, and
              materials you process through PicShrink. Because files are processed entirely on your
              local device and are never transmitted to our servers, PicShrink does not claim,
              acquire, or license any rights to your content.
            </p>
            <p>
              The PicShrink website design, branding, logos, code, and documentation are protected by
              international copyright and trademark laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">4. Permitted and Prohibited Use</h2>
            <p>You agree to use PicShrink only for lawful purposes. You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li>
                Attempt to reverse engineer, disrupt, or attack the website infrastructure via DDoS or
                automated vulnerability exploitation.
              </li>
              <li>
                Use automated bots or scrapers to extract or redistribute site content without explicit
                written consent.
              </li>
              <li>
                Process or distribute content that infringes upon third-party copyrights or violates
                applicable state, national, or international laws.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">5. Disclaimer of Warranties</h2>
            <p>
              PicShrink is provided strictly on an <strong>"AS IS"</strong> and{' '}
              <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, whether express
              or implied. We do not warrant that the website will operate uninterrupted or error-free,
              or that image processing results will fulfill every specific commercial criterion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">6. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, PicShrink and its operators shall not be liable
              for any direct, indirect, incidental, consequential, or punitive damages resulting from
              your use or inability to use the service, including data corruption or loss of profits.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">7. Changes to Terms</h2>
            <p>
              We reserve the right to amend these Terms of Service at any time. Any changes will be
              posted on this page with an updated "Last Updated" timestamp.
            </p>
          </section>
        </div>

        <AdBanner type="bottom" />
      </div>
    </div>
  );
}
