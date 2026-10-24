import { SEOHead } from '../../components/common/SEOHead';
import { ShieldCheck, Cpu, Zap, Lock, Heart, CheckCircle2 } from 'lucide-react';
import { AdBanner } from '../../components/common/AdBanner';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <SEOHead
        title="About PicShrink - Our Mission for Free Private Image Tools"
        description="Learn about PicShrink's mission: delivering 100% free, client-side, privacy-first online image tools with zero server uploads and zero watermarks."
        path="/about"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% In-Browser Privacy
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            About PicShrink
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Empowering millions of creators, developers, photographers, and small businesses with
            frictionless, studio-quality image editing tools that run 100% locally on your machine.
          </p>
        </div>

        <AdBanner type="top" />

        {/* Long-form 400+ words article */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-8 text-slate-700 leading-relaxed text-base sm:text-lg">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500" />
              Our Core Founding Philosophy
            </h2>
            <p>
              In an era where everyday digital tasks require handing over personal data, navigating
              aggressive monthly paywalls, and watching progress bars tick as sensitive family photos
              or confidential business documents upload to mysterious cloud servers, PicShrink was
              born out of a simple conviction: <strong>your images belong to you alone.</strong>
            </p>
            <p>
              Modern web browsers and devices possess immense computing capabilities. High-performance
              graphics processors, multi-core CPUs, and WebAssembly runtimes have evolved to the point
              where image compression, background cutout rendering, format conversion, and PDF synthesis
              can take place entirely inside client-side browser memory—faster, more reliably, and
              infinitely more securely than transmitting megabytes over cellular networks.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="w-6 h-6 text-blue-600" />
              How Zero-Server Architecture Works
            </h2>
            <p>
              Every tool on PicShrink—whether you are compressing heavy DSLR photos down by 85%,
              cropping an Instagram story to 9:16, stripping backgrounds to create transparent PNGs,
              or merging scanned receipts into a multi-page PDF—runs exclusively on your local device.
            </p>
            <p>
              When you drag a file into PicShrink, HTML5 File and Canvas APIs read the raw binary
              stream locally. Mathematical algorithms evaluate luminance, bicubic interpolation, and
              color-space matrices in real time. Because zero image bytes ever travel over the wire to
              a backend server:
            </p>
            <ul className="space-y-2.5 pt-2 text-base">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Unrivaled Processing Speed:</strong> No network upload lag, no server queue
                  congestion, and instant responsive feedback.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Ironclad Data Privacy:</strong> Confidential legal contracts, healthcare
                  documents, and family moments never leave your browser sandbox.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Full Offline Capability:</strong> Once loaded, PicShrink continues
                  functioning reliably even when your internet connection drops.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Eco-Friendly Computing:</strong> By delegating computations to end-user
                  hardware, we eliminate unnecessary hyperscale cloud server energy consumption.
                </span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500" />
              Committed to Free, Clean Web Utilities
            </h2>
            <p>
              We believe essential utility software should remain transparent and accessible to
              everyone worldwide. PicShrink will never trap users with bait-and-switch watermarks,
              require mandatory user registrations, or force monthly recurring subscriptions for basic
              image resizing and compression.
            </p>
            <p>
              We maintain our infrastructure through unobtrusive, standard advertising placements,
              ensuring that freelancers, students, teachers, developers, and non-profits across the
              globe enjoy unlimited access to professional-grade image utilities without financial
              barriers.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div>
              Published by the <strong>PicShrink Engineering Team</strong>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <Lock className="w-4 h-4" /> Zero Remote Storage Guarantee
            </div>
          </div>
        </div>

        <AdBanner type="bottom" />
      </div>
    </div>
  );
}
