/**
 * Build-time prerender. Runs after `vite build` and turns the single-page-app shell
 * (dist/index.html) into one real HTML file per route, so crawlers and link-preview
 * bots see the correct <title>, description, canonical, Open Graph tags and readable
 * page content without having to run JavaScript.
 *
 * React still mounts normally with createRoot() and replaces the snapshot inside
 * #root, so nothing changes for people using the site. The head tags written here carry
 * data-rh="true", which makes react-helmet-async take them over instead of duplicating.
 *
 * Output (Cloudflare Workers static assets serve `/foo` from `foo.html`):
 *   dist/index.html, dist/compressor.html, dist/blog.html, dist/blog/<slug>.html, ...
 *   dist/404.html     real 404 page (wrangler: not_found_handling = "404-page")
 *   dist/admin.html   noindex shell for /admin
 *   dist/sitemap.xml  generated from the same data
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { BLOG_POSTS } from '../src/data/blogData';
import { RELATED_LINKS } from '../src/data/relatedLinks';
import { DEFAULT_OG_IMAGE, SITE_URL } from '../src/data/siteConfig';
import { TOOLS_DATA } from '../src/data/toolsData';
import { PAGE_META } from '../src/data/pagesMeta';

const DIST = join(process.cwd(), 'dist');
const SITE_NAME = 'PicShrink';

interface Route {
  /** URL path, e.g. "/compressor" */
  path: string;
  title: string;
  description: string;
  /** HTML placed inside <div id="root"> */
  body: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
  /** Include in sitemap.xml */
  sitemap?: boolean;
  lastmod?: string;
}

const esc = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const abs = (urlOrPath: string): string => (urlOrPath.startsWith('http') ? urlOrPath : `${SITE_URL}${urlOrPath}`);

const link = (href: string, text: string): string => `<a href="${esc(href)}">${esc(text)}</a>`;

// ---------- shared page chrome (kept plain: React replaces it as soon as it mounts) ----------

const nav = (): string => `<header><nav aria-label="Primary"><ul>
<li>${link('/', 'PicShrink home')}</li>
${TOOLS_DATA.map((tool) => `<li>${link(tool.path, tool.name)}</li>`).join('\n')}
<li>${link('/blog', 'Blog')}</li>
<li>${link('/about', 'About')}</li>
</ul></nav></header>`;

const footer = (): string => `<footer><nav aria-label="Footer"><ul>
<li>${link('/about', 'About')}</li>
<li>${link('/privacy-policy', 'Privacy Policy')}</li>
<li>${link('/terms', 'Terms of Service')}</li>
<li>${link('/contact', 'Contact')}</li>
</ul></nav></footer>`;

const shell = (main: string): string => `${nav()}<main>${main}</main>${footer()}`;

const toolList = (): string =>
  `<ul>${TOOLS_DATA.map((tool) => `<li>${link(tool.path, tool.name)}: ${esc(tool.description)}</li>`).join('')}</ul>`;

const postList = (): string =>
  `<ul>${BLOG_POSTS.map((post) => `<li>${link(post.path, post.title)}: ${esc(post.description)}</li>`).join('')}</ul>`;

// ---------- route builders ----------

function homeRoute(): Route {
  const meta = PAGE_META['/'];
  return {
    ...meta,
    sitemap: true,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'All',
      description: meta.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    body: shell(`<h1>PicShrink: Free Online Image Tools</h1>
<p>${esc(meta.description)}</p>
<h2>Image tools</h2>${toolList()}
<h2>Guides and tutorials</h2>${postList()}`),
  };
}

function toolRoute(toolId: string): Route {
  const tool = TOOLS_DATA.find((t) => t.id === toolId)!;
  const related = RELATED_LINKS[tool.id];
  const relatedTools = (related?.tools ?? [])
    .map((id) => TOOLS_DATA.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const guide = BLOG_POSTS.find((post) => post.slug === related?.guideSlug);

  return {
    path: tool.path,
    title: tool.title,
    description: tool.description,
    sitemap: true,
    body: shell(`<h1>${esc(tool.title)}</h1>
<p>${esc(tool.description)}</p>
<h2>Frequently asked questions</h2>
${tool.faqs.map((faq) => `<h3>${esc(faq.question)}</h3><p>${esc(faq.answer)}</p>`).join('\n')}
<h2>More free image tools</h2>
<ul>${relatedTools.map((t) => `<li>${link(t.path, t.name)}</li>`).join('')}</ul>
${guide ? `<p>Read the guide: ${link(guide.path, guide.title)}</p>` : ''}`),
  };
}

function simpleRoute(key: Exclude<keyof typeof PAGE_META, '/'>): Route {
  const meta = PAGE_META[key];
  const isBlog = key === '/blog';
  return {
    ...meta,
    sitemap: true,
    body: shell(`<h1>${esc(meta.title)}</h1>
<p>${esc(meta.description)}</p>
${isBlog ? postList() : `<h2>Free image tools</h2>${toolList()}`}`),
  };
}

function postRoute(slug: string): Route {
  const post = BLOG_POSTS.find((p) => p.slug === slug)!;
  const sections = post.content.sections
    .map((section) => {
      const paragraphs = section.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
      const bullets = section.bullets ? `<ul>${section.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : '';
      const table = section.table
        ? `<table><thead><tr>${section.table.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${section.table.rows
            .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`
        : '';
      const callout = section.callout?.link ? `<p>${link(section.callout.link.url, section.callout.link.text)}</p>` : '';
      return `<section><h2>${esc(section.h2)}</h2>${paragraphs}${bullets}${table}${callout}</section>`;
    })
    .join('\n');
  const references = post.references?.length
    ? `<h2>Further reading</h2><ul>${post.references
        .map((ref) => `<li><a href="${esc(ref.url)}" rel="noopener noreferrer">${esc(ref.title)}</a> (${esc(ref.source)})</li>`)
        .join('')}</ul>`
    : '';
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return {
    path: post.path,
    title: `${post.title} | ${SITE_NAME}`,
    description: post.description,
    ogType: 'article',
    ogImage: post.image,
    sitemap: true,
    lastmod: post.date,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      image: [post.image],
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Organization', name: post.author, url: `${SITE_URL}/about` },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${post.path}` },
    },
    body: shell(`<article><h1>${esc(post.title)}</h1>
<p>${esc(post.content.lead)}</p>
${sections}
${references}
<h2>Related articles</h2>
<ul>${others.map((o) => `<li>${link(o.path, o.title)}</li>`).join('')}</ul></article>`),
  };
}

const notFoundRoute = (): Route => ({
  path: '/404',
  title: `Page not found - ${SITE_NAME}`,
  description: 'The page you were looking for could not be found.',
  noindex: true,
  body: shell(`<h1>We couldn't find that page</h1>
<p>The link may be broken or the page may have moved. Try one of our free image tools:</p>${toolList()}`),
});

const adminRoute = (): Route => ({
  path: '/admin',
  title: `Admin - ${SITE_NAME}`,
  description: 'Administration area.',
  noindex: true,
  body: '',
});

// ---------- HTML assembly ----------

/** Remove the tags that each route re-declares, so there is exactly one of each. */
function stripManagedHead(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/g, '')
    .replace(/<link rel="canonical"[^>]*>\s*/g, '')
    .replace(/<meta name="description"[^>]*>\s*/g, '')
    .replace(/<meta property="og:(?:title|description|type|image|image:width|image:height|url)"[^>]*>\s*/g, '')
    .replace(/<meta name="twitter:(?:title|description|image)"[^>]*>\s*/g, '')
    .replace(/<script type="application\/ld\+json">(?:(?!<\/script>)[\s\S])*"WebApplication"[\s\S]*?<\/script>\s*/g, '');
}

function headBlock(route: Route): string {
  const url = `${SITE_URL}${route.path === '/' ? '/' : route.path}`;
  const image = abs(route.ogImage ?? DEFAULT_OG_IMAGE);
  const rh = ' data-rh="true"';
  const tags: string[] = [
    `<title>${esc(route.title)}</title>`,
    `<meta${rh} name="description" content="${esc(route.description)}" />`,
  ];
  if (route.noindex) {
    tags.push(`<meta${rh} name="robots" content="noindex, nofollow" />`);
  } else {
    tags.push(
      `<link${rh} rel="canonical" href="${esc(url)}" />`,
      `<meta${rh} property="og:type" content="${route.ogType ?? 'website'}" />`,
      `<meta${rh} property="og:url" content="${esc(url)}" />`,
      `<meta${rh} property="og:title" content="${esc(route.title)}" />`,
      `<meta${rh} property="og:description" content="${esc(route.description)}" />`,
      `<meta${rh} property="og:image" content="${esc(image)}" />`,
      `<meta${rh} name="twitter:title" content="${esc(route.title)}" />`,
      `<meta${rh} name="twitter:description" content="${esc(route.description)}" />`,
      `<meta${rh} name="twitter:image" content="${esc(image)}" />`,
    );
  }
  if (route.jsonLd) {
    // "<" is escaped so the JSON can never close the script tag early
    tags.push(`<script${rh} type="application/ld+json">${JSON.stringify(route.jsonLd).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.map((tag) => `    ${tag}`).join('\n') + '\n';
}

function render(template: string, route: Route): string {
  const html = stripManagedHead(template).replace('</head>', `${headBlock(route)}  </head>`);
  if (!html.includes('<div id="root"></div>')) throw new Error('index.html has no empty <div id="root">');
  return html.replace('<div id="root"></div>', `<div id="root">${route.body}</div>`);
}

function outputFile(route: Route): string {
  if (route.path === '/') return join(DIST, 'index.html');
  return join(DIST, `${route.path.replace(/^\//, '')}.html`);
}

function write(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

function sitemap(routes: Route[]): string {
  const entries = routes
    .filter((route) => route.sitemap)
    .map((route) => {
      const loc = route.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${route.path}`;
      return `  <url>\n    <loc>${esc(loc)}</loc>${route.lastmod ? `\n    <lastmod>${route.lastmod}</lastmod>` : ''}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

// ---------- main ----------

const template = readFileSync(join(DIST, 'index.html'), 'utf8');

const routes: Route[] = [
  homeRoute(),
  ...TOOLS_DATA.map((tool) => toolRoute(tool.id)),
  simpleRoute('/about'),
  simpleRoute('/privacy-policy'),
  simpleRoute('/terms'),
  simpleRoute('/contact'),
  simpleRoute('/blog'),
  ...BLOG_POSTS.map((post) => postRoute(post.slug)),
];

for (const route of routes) write(outputFile(route), render(template, route));
write(join(DIST, '404.html'), render(template, notFoundRoute()));
write(join(DIST, 'admin.html'), render(template, adminRoute()));
write(join(DIST, 'sitemap.xml'), sitemap(routes));

// Self-check: every indexable page must have exactly one title, description and canonical.
for (const route of routes) {
  const html = readFileSync(outputFile(route), 'utf8');
  const count = (re: RegExp): number => (html.match(re) ?? []).length;
  const problems = [
    count(/<title>/g) !== 1 && 'title',
    count(/<meta[^>]*name="description"/g) !== 1 && 'description',
    count(/<link[^>]*rel="canonical"/g) !== 1 && 'canonical',
    count(/<h1[ >]/g) !== 1 && 'h1',
  ].filter(Boolean);
  if (problems.length) throw new Error(`Prerender check failed for ${route.path}: ${problems.join(', ')}`);
}

console.log(`Prerendered ${routes.length} routes + 404.html + admin.html + sitemap.xml`);
