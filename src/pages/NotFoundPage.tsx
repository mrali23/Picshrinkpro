import { Link } from 'react-router-dom';
import { SEOHead } from '../components/common/SEOHead';
import { TOOLS_DATA } from '../data/toolsData';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] bg-slate-50 py-16">
      <SEOHead
        title="Page not found | PicShrink"
        description="The page you are looking for does not exist. Try one of our free image tools instead."
        path="/404"
        noindex
      />
      <div className="max-w-3xl mx-auto px-4 text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Error 404</p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Page not found</h1>
        <p className="mt-4 text-slate-600">
          This page does not exist or has moved. Pick a tool below or head back to the home page.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {TOOLS_DATA.map((tool) => (
            <Link
              key={tool.id}
              to={tool.path}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            >
              {tool.name}
            </Link>
          ))}
        </div>
        <Link to="/" className="mt-8 inline-block text-sm font-bold text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
