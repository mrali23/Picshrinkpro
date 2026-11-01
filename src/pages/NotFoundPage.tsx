import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TOOLS_DATA } from '../data/toolsData';

// Shown for any URL that does not exist. It is marked noindex so search engines never
// index it, and the host serves it with a real 404 status (see wrangler.jsonc).
export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24 text-center">
      <Helmet>
        <title>Page not found - PicShrink</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Error 404</p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">We couldn't find that page</h1>
      <p className="mt-4 text-slate-600">
        The link may be broken or the page may have moved. Try one of our free image tools instead.
      </p>

      <ul className="mt-8 flex flex-wrap justify-center gap-3">
        {TOOLS_DATA.map((tool) => (
          <li key={tool.id}>
            <Link
              to={tool.path}
              className="inline-block rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
            >
              {tool.name}
            </Link>
          </li>
        ))}
      </ul>

      <Link to="/" className="mt-10 inline-block font-semibold text-blue-600 hover:text-blue-700">
        Back to the homepage
      </Link>
    </div>
  );
}
