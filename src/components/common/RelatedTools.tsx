import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { TOOLS_DATA } from '../../data/toolsData';
import { BLOG_POSTS } from '../../data/blogData';
import { RELATED_LINKS } from '../../data/relatedLinks';

interface RelatedToolsProps {
  toolId: string;
}

// Crawlable internal links at the bottom of every tool page: three sibling tools with
// descriptive anchor text, plus the blog guide that covers the same topic.
export function RelatedTools({ toolId }: RelatedToolsProps) {
  const config = RELATED_LINKS[toolId];
  if (!config) return null;

  const tools = config.tools
    .map((id) => TOOLS_DATA.find((tool) => tool.id === id))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));
  const guide = BLOG_POSTS.find((post) => post.slug === config.guideSlug);

  return (
    <section aria-labelledby="related-tools-heading" className="mt-12 sm:mt-16">
      <h2 id="related-tools-heading" className="text-xl sm:text-2xl font-bold text-slate-900">
        More free image tools
      </h2>
      <p className="mt-2 text-sm sm:text-base text-slate-600">
        Keep going with another private, browser-based tool. No uploads, no watermarks.
      </p>

      <ul className="mt-5 grid gap-4 sm:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link
              to={tool.path}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <span className="font-semibold text-slate-900 group-hover:text-blue-700">{tool.name}</span>
              <span className="mt-1.5 line-clamp-3 text-sm text-slate-600">{tool.description}</span>
              <span className="mt-auto flex items-center gap-1 pt-3 text-sm font-medium text-blue-600">
                Open tool <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {guide && (
        <Link
          to={guide.path}
          className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 transition hover:border-blue-300"
        >
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <span>
            <span className="block text-xs font-semibold uppercase tracking-wide text-blue-700">Read the guide</span>
            <span className="block font-semibold text-slate-900">{guide.title}</span>
          </span>
        </Link>
      )}
    </section>
  );
}
