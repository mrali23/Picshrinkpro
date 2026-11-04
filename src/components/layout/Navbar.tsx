import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Menu,
  X,
  Minimize2,
  Scissors,
  Maximize2,
  Crop,
  FileType2,
  FileImage,
  Zap,
  FileText,
  Wand2,
  ShieldCheck,
} from 'lucide-react';
import { TOOLS_DATA } from '../../data/toolsData';
import { usePublicSiteSettings } from '../../utils/siteSettings';
import { LogoMark } from '../common/Logo';

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

export function Navbar() {
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { siteName } = usePublicSiteSettings();

  // Close menus on route change
  useEffect(() => {
    setToolsDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <LogoMark
              size={40}
              title=""
              className="shrink-0 rounded-xl shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200"
            />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                {siteName}
              </span>
              <span className="text-[10px] font-medium tracking-wide text-slate-400 -mt-1 hidden sm:block">
                Free Online Image Tools
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Quick Link 1: Compressor */}
            <Link
              to="/compressor"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/compressor'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              Compress
            </Link>

            {/* Quick Link 2: BG Remover */}
            <Link
              to="/bg-remover"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/bg-remover'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              Remove BG
            </Link>

            {/* Quick Link 3: Resizer */}
            <Link
              to="/resizer"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/resizer'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              Resize
            </Link>

            {/* All Tools Mega Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  toolsDropdownOpen || TOOLS_DATA.some((t) => t.path === location.pathname)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
                }`}
                aria-expanded={toolsDropdownOpen}
              >
                <span>All Tools</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    toolsDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {toolsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 grid grid-cols-2 gap-1 z-50">
                  <div className="col-span-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Free Browser-Based Tools
                  </div>
                  {TOOLS_DATA.map((tool) => {
                    const IconComponent = iconMap[tool.iconName] || Minimize2;
                    return (
                      <Link
                        key={tool.id}
                        to={tool.path}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all ${
                          location.pathname === tool.path
                            ? 'bg-blue-50/80 text-blue-700'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${tool.color} text-white flex items-center justify-center flex-shrink-0 shadow-xs`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">
                            {tool.shortName}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {tool.name}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Blog */}
            <Link
              to="/blog"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname.startsWith('/blog')
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              Blog
            </Link>

            {/* About */}
            <Link
              to="/about"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/about'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              About
            </Link>
          </nav>

          {/* Right badge: 100% Private */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Private &amp; In-Browser</span>
            </div>
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
            Image Tools (8)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TOOLS_DATA.map((tool) => {
              const IconComponent = iconMap[tool.iconName] || Minimize2;
              return (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-xs font-semibold text-slate-800"
                >
                  <div
                    className={`w-6 h-6 rounded-md bg-gradient-to-tr ${tool.color} text-white flex items-center justify-center flex-shrink-0`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{tool.shortName}</span>
                </Link>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-3 flex flex-col space-y-1">
            <Link
              to="/blog"
              className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-50"
            >
              Blog &amp; Guides
            </Link>
            <Link
              to="/about"
              className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-50"
            >
              About PicShrink
            </Link>
            <Link
              to="/contact"
              className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-50"
            >
              Contact Support
            </Link>
            <Link
              to="/privacy-policy"
              className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-50"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
