import { Link } from 'react-router-dom';
import {
  Minimize2,
  Scissors,
  Maximize2,
  Crop,
  FileType2,
  FileImage,
  Zap,
  FileText,
  ShieldCheck,
  Cpu,
  Sparkles,
  Lock,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { SEOHead } from '../components/common/SEOHead';
import { AdBanner } from '../components/common/AdBanner';
import { FaqSection } from '../components/common/FaqSection';
import { HeroInteractiveShowcase } from '../components/home/HeroInteractiveShowcase';
import { TOOLS_DATA } from '../data/toolsData';

const iconMap: Record<string, any> = {
  Minimize2,
  Scissors,
  Maximize2,
  Crop,
  FileType2,
  FileImage,
  Zap,
  FileText,
  Wand2,
};

const homeFaqs = [
  {
    question: 'Is PicShrink really 100% free with no limits or watermarks?',
    answer:
      'Yes, absolutely. PicShrink is completely free for personal and commercial projects. There are no daily usage limits, no credit card requirements, no registration walls, and we never add watermarks to your pictures.',
  },
  {
    question: 'How does in-browser client-side image processing protect my privacy?',
    answer:
      'Unlike cloud-based tools that upload your files to remote servers, PicShrink runs pure JavaScript, WebAssembly, and HTML5 Canvas API algorithms directly inside your own web browser. Your private photos never leave your computer or phone.',
  },
  {
    question: 'Can I process multiple images at once and download as a ZIP?',
    answer:
      'Yes! All PicShrink tools support bulk drag-and-drop. You can upload dozens of photos at once and download them individually or bundled together in a single ZIP file.',
  },
  {
    question: 'Will compressing my images ruin their visual quality?',
    answer:
      'Not at all. Our smart compression algorithms discard only redundant color data and metadata that the human eye cannot perceive. Images typically shrink by 70% to 85% while remaining virtually indistinguishable from the original raw file.',
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="PicShrink - Free Online Image Tools - Compress, Convert & Edit"
        description="Free online image tools to compress, remove background, resize, crop, convert JPG PNG WebP and image to PDF. 100% free, no watermark, browser-based private."
        path="/"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold tracking-wide">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>100% Client-Side In-Browser • Zero Server Uploads</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                Free Online Image Tools{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  That Respect Your Privacy
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Compress, remove backgrounds, resize, crop, and convert JPG, PNG, WebP, and PDF
                instantly. Fast, free, with zero watermarks and absolute confidentiality.
              </p>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/compressor"
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-200 transform active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Minimize2 className="w-5 h-5" />
                  <span>Compress Images</span>
                </Link>

                <Link
                  to="/bg-remover"
                  className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm sm:text-base rounded-2xl border border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <Scissors className="w-5 h-5 text-pink-600" />
                  <span>Remove Background</span>
                </Link>

                <Link
                  to="/image-to-pdf"
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm sm:text-base rounded-2xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-red-600" />
                  <span>Images to PDF</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No Registration
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No Watermarks
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Unlimited Batch
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Showcase */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <HeroInteractiveShowcase />
            </div>
          </div>
        </div>
      </section>

      {/* AdSense Top */}
      <div className="max-w-7xl mx-auto px-4">
        <AdBanner type="top" />
      </div>

      {/* All Tools Grid Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              All 9 Free Online Image Tools
            </h2>
            <p className="mt-3 text-slate-600 text-base sm:text-lg">
              Every tool you need to compress, remove background, filter, enhance, format, and package images—100% free and in-browser.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TOOLS_DATA.map((tool) => {
              const IconComponent = iconMap[tool.iconName] || Minimize2;
              return (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="group relative bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${tool.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
                      >
                        <IconComponent className="w-7 h-7" />
                      </div>
                      {tool.badge && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          {tool.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                      {tool.name}
                    </h3>

                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-3">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>Open Tool</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features: Fast, Secure, Free, No Upload */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
              Why Choose PicShrink
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
              Engineered for Speed, Privacy &amp; Simplicity
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1: Fast */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Blazing Fast</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Images process at hardware speeds on your local CPU and GPU. No waiting for uploads
                or congested cloud queues.
              </p>
            </div>

            {/* Feature 2: Secure */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">100% Private</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your private files and sensitive photos never touch any server. Everything happens
                in your browser sandbox.
              </p>
            </div>

            {/* Feature 3: Free */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">100% Free Forever</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                No credit card, no email signup, and no watermarks. Enjoy unlimited access to all
                tools without monthly subscription traps.
              </p>
            </div>

            {/* Feature 4: No Upload */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zero Server Storage</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We do not store, view, or retain your files. Once you close your browser tab, all
                temporary data is wiped instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works 3 Steps */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
              Simple Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
              How PicShrink Works in 3 Easy Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/25">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900">Select or Drag Images</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Choose JPG, PNG, or WebP photos from your device, or drag and drop single or multiple
                files directly into the browser.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md shadow-indigo-500/25">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900">Adjust Settings &amp; Preview</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Slide compression quality, choose target pixel dimensions, remove backgrounds, or
                crop with exact aspect ratios in real time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/25">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900">Instant Download</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Save your optimized images individually or download the entire batch bundled in a
                clean ZIP archive with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AdSense Bottom */}
      <div className="max-w-7xl mx-auto px-4">
        <AdBanner type="bottom" />
      </div>

      {/* FAQ Section */}
      <FaqSection
        faqs={homeFaqs}
        title="Frequently Asked Questions"
        subtitle="Common questions about PicShrink's free browser-based image utilities."
      />
    </div>
  );
}
