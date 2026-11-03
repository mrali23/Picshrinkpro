import { prerender } from 'react-dom/static';
import { HelmetProvider } from 'react-helmet-async';
import { StaticRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import { BLOG_POSTS } from './data/blogData';
import { TOOLS_DATA } from './data/toolsData';

/** Every URL that gets a static HTML file at build time. */
export const PRERENDER_ROUTES: string[] = [
  '/',
  ...TOOLS_DATA.map((tool) => tool.path),
  '/about',
  '/privacy-policy',
  '/terms',
  '/contact',
  '/blog',
  ...BLOG_POSTS.map((post) => post.path),
];

/** Dates used for <lastmod> in the generated sitemap (posts only; other pages use the repo date). */
export const ROUTE_DATES: Record<string, string> = Object.fromEntries(BLOG_POSTS.map((post) => [post.path, post.date]));

/**
 * React 19 emits <title>/<meta>/<link> from <Helmet> at the very start of the render output.
 * Split them off so the build script can place them in <head>, where crawlers and the
 * hydration step expect them.
 */
const HOISTED_HEAD_TAGS = /^(?:<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*\/?>|<link\b[^>]*\/?>)+/;

export async function render(url: string): Promise<{ html: string; head: string }> {
  const { prelude } = await prerender(
    <HelmetProvider>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </HelmetProvider>,
    // Inline every Suspense boundary (the lazy route chunk) instead of streaming it in
    // with a script, so the saved file is plain, complete HTML.
    { progressiveChunkSize: Number.MAX_SAFE_INTEGER },
  );
  const output = await new Response(prelude).text();
  const head = output.match(HOISTED_HEAD_TAGS)?.[0] ?? '';
  return { html: output.slice(head.length), head };
}
