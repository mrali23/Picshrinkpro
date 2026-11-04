import { Link } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import { TOOLS_DATA } from '../../data/toolsData';
import { usePublicSiteSettings } from '../../utils/siteSettings';
import { LogoMark } from '../common/Logo';

export function Footer() {
  const { siteName } = usePublicSiteSettings();
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Col 1: Brand & Security Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <LogoMark size={36} title="" className="shrink-0 rounded-xl" />
              <span className="text-xl font-black tracking-tight text-white">
                {siteName}
              </span>
            </Link>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              {siteName} is a free suite of privacy-first, client-side online image tools.
              Compress, remove background, resize, crop, and convert JPG, PNG, WebP, and PDF
              with zero server uploads and zero watermarks.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-start gap-3 max-w-sm">
              <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <strong className="text-white block font-semibold mb-0.5">
                  100% Client-Side Private
                </strong>
                All operations execute inside your browser’s WebAssembly &amp; HTML5 Canvas.
                Your files never touch a remote server.
              </div>
            </div>
          </div>

          {/* Col 2: Image Tools (8) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Image Tools
            </h3>
            <ul className="space-y-2 text-sm">
              {TOOLS_DATA.map((tool) => (
                <li key={tool.id}>
                  <Link
                    to={tool.path}
                    className="text-slate-400 hover:text-white transition-colors flex items-center justify-between group"
                  >
                    <span>{tool.name}</span>
                    {tool.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-medium">
                        {tool.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Legal & Company (4) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Company &amp; Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/about"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  About Mission
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            <span>© {new Date().getFullYear()} {siteName}. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> No Image Uploads
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
