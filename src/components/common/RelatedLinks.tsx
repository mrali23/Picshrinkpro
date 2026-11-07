import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { TOOLS_DATA } from '../../data/toolsData';
import { BLOG_POSTS } from '../../data/blogData';

/** Hand-picked related tools and guides per tool, so every tool page links to relevant pages in its main content. */
const RELATED: Record<string, { tools: string[]; guides: string[] }> = {
  compressor: {
    tools: ['resizer', 'webp-converter', 'png-to-jpg'],
    guides: ['how-to-compress-image-without-losing-quality', 'how-to-reduce-image-size-for-website-speed'],
  },
  'bg-remover': {
    tools: ['cropper', 'resizer', 'filters'],
    guides: ['how-to-remove-background-from-image-free'],
  },
  resizer: {
    tools: ['cropper', 'compressor', 'webp-converter'],
    guides: ['how-to-resize-image-for-instagram', 'how-to-reduce-image-size-for-website-speed'],
  },
  cropper: {
    tools: ['resizer', 'filters', 'compressor'],
    guides: ['how-to-resize-image-for-instagram'],
  },
  'jpg-to-png': {
    tools: ['png-to-jpg', 'webp-converter', 'compressor'],
    guides: ['jpg-vs-png-vs-webp-which-format-best'],
  },
  'png-to-jpg': {
    tools: ['jpg-to-png', 'compressor', 'webp-converter'],
    guides: ['jpg-vs-png-vs-webp-which-format-best'],
  },
  'webp-converter': {
    tools: ['compressor', 'jpg-to-png', 'png-to-jpg'],
    guides: ['jpg-vs-png-vs-webp-which-format-best', 'how-to-reduce-image-size-for-website-speed'],
  },
  'image-to-pdf': {
    tools: ['compressor', 'resizer', 'jpg-to-png'],
    guides: ['how-to-convert-image-to-pdf-on-mobile'],
  },
  filters: {
    tools: ['bg-remover', 'cropper', 'compressor'],
    guides: ['best-free-image-tools-for-bloggers'],
  },
};

/**
 * Renders related tools and guides under tool pages only (it renders nothing on any other route).
 * Gives crawlers and visitors contextual internal links inside <main>, and works in the build-time prerender
 * because it only depends on the router location.
 */
export function RelatedLinks() {
  const { pathname } = useLocation();
  const tool = TOOLS_DATA.find((item) => item.path === pathname);
  const related = tool ? RELATED[tool.id] : undefined;
  if (!tool || !related) return null;

  const tools = related.tools.map((id) => TOOLS_DATA.find((item) => item.id === id)).filter((item) => item !== undefined);
  const guides = related.guides.map((slug) => BLOG_POSTS.find((post) => post.slug === slug)).filter((post) => post !== undefined);
  if (tools.length === 0 && guides.length === 0) return null;

  return (
    <nav aria-label="Related tools and guides" className="mx-auto max-w-5xl px-4 pb-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {tools.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-slate-900">More free image tools</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {tools.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                  >
                    {item.name}
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        {guides.length > 0 && (
          <>
            <h2 className="mt-6 text-lg font-bold text-slate-900">Guides that help</h2>
            <ul className="mt-3 space-y-2">
              {guides.map((post) => (
                <li key={post.slug}>
                  <Link to={post.path} className="text-sm font-medium text-blue-700 hover:underline">
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </nav>
  );
}
