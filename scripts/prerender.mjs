// Build step: turns the client build into one static HTML file per route.
//
//   vite build                                   -> dist/        (client bundle + index.html shell)
//   vite build --ssr src/entry-server.tsx ...    -> dist-ssr/    (server entry)
//   node scripts/prerender.mjs                   -> dist/*.html, dist/*.md, dist/404.html, dist/sitemap.xml
//
// Each HTML file contains the rendered page body plus its own <title>, description,
// canonical, Open Graph, Twitter tags and JSON-LD, so crawlers that do not run JavaScript
// (Bing, social scrapers, AI crawlers) see real content. The browser then hydrates it.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE_URL = 'https://picshrinkpro.com';
const root = process.cwd();
const distDir = path.join(root, 'dist');
const ssrEntry = path.join(root, 'dist-ssr', 'entry-server.js');

// Diagnostic: prove which CropperPage source the build tree actually has.
const cropperSrc = path.join(root, 'src/pages/tools/CropperPage.tsx');
if (existsSync(cropperSrc)) {
  const raw = readFileSync(cropperSrc, 'utf8');
  console.log(`[prerender] CropperPage.tsx bytes=${raw.length} head=${JSON.stringify(raw.slice(0, 80))}`);
  if (raw.includes('PLACEHOLDER') && raw.trim() === 'PLACEHOLDER') {
    console.error('[prerender] FATAL: CropperPage.tsx is still the PLACEHOLDER stub. Cloudflare is not using the latest GitHub main.');
  }
} else {
  console.error('[prerender] CropperPage.tsx missing at', cropperSrc);
}

const template = await readFile(path.join(distDir, 'index.html'), 'utf8');
if (!template.includes('<div id="root"></div>') || !template.includes('</head>')) {
  throw new Error('dist/index.html is missing <div id="root"></div> or </head>; cannot prerender.');
}

const { render, PRERENDER_ROUTES, ROUTE_DATES } = await import(pathToFileURL(ssrEntry).href);

function buildPage({ html = '', head = '' }) {
  return template.replace('</head>', `    ${head}\n  </head>`).replace('<div id="root"></div>', `<div id="root">${html}</div>`);
}

function outputFileFor(route) {
  if (route === '/') return path.join(distDir, 'index.html');
  // /compressor -> compressor.html so the URL stays slash-less (matches the canonical URL).
  return path.join(distDir, `${route.replace(/^\//, '')}.html`);
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
}

const stripTags = (value) => decodeEntities(value.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** Small HTML -> Markdown converter for the page's <main> content (headings, paragraphs, lists, links, tables). */
function htmlToMarkdown(html) {
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
  let text = main
    .replace(/<(script|style|svg|noscript|button|form|input|select|textarea)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
      const label = stripTags(inner);
      return label ? `[${label}](${href.startsWith('/') ? SITE_URL + href : href})` : '';
    })
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => `\n\n${'#'.repeat(Number(level))} ${stripTags(inner)}\n\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `\n- ${stripTags(inner)}`)
    .replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (_, inner) => {
      const cells = [...inner.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => stripTags(cell[1]));
      return `\n| ${cells.join(' | ')} |`;
    })
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => `\n\n${stripTags(inner)}\n\n`)
    .replace(/<br\s*\/?>/gi, '\n');
  text = decodeEntities(text.replace(/<(?!\/?\s*$)[^>]+>/g, ' '));
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, index, lines) => line !== '' || (lines[index - 1] ?? '') !== '')
    .join('\n')
    .trim();
}

function metaContent(head, key) {
  const pattern = new RegExp(`<meta[^>]*(?:name|property)="${key}"[^>]*content="([^"]*)"`, 'i');
  return decodeEntities(head.match(pattern)?.[1] ?? '');
}

const titleOf = (head) => decodeEntities(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');

let rendered = 0;
const failed = [];
for (const route of PRERENDER_ROUTES) {
  try {
    const { html, head } = await render(route);
    if (!html || !head) {
      failed.push(`${route}: no ${html ? 'head' : 'html'}`);
      console.warn(`[prerender] SKIP ${route}: produced no ${html ? 'head' : 'html'}`);
      // Write shell-only page so the route still exists as static HTML.
      const file = outputFileFor(route);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, buildPage({ html: '', head: `<title>PicShrink</title>` }));
      continue;
    }

    const file = outputFileFor(route);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, buildPage({ html, head }));

    // Markdown twin, served by the Worker for `Accept: text/markdown` requests.
    const markdown = [
      '---',
      `title: ${JSON.stringify(titleOf(head))}`,
      `description: ${JSON.stringify(metaContent(head, 'description'))}`,
      `url: ${SITE_URL}${route}`,
      '---',
      '',
      htmlToMarkdown(html),
      '',
    ].join('\n');
    await writeFile(route === '/' ? path.join(distDir, 'index.md') : file.replace(/\.html$/, '.md'), markdown);
    rendered += 1;
  } catch (err) {
    failed.push(`${route}: ${err instanceof Error ? err.message : String(err)}`);
    console.warn(`[prerender] SKIP ${route}:`, err instanceof Error ? err.message : err);
    try {
      const file = outputFileFor(route);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, buildPage({ html: '', head: `<title>PicShrink</title>` }));
    } catch {}
  }
}

// 404.html: served with HTTP 404 for unknown URLs (wrangler "not_found_handling": "404-page").
try {
  const notFound = await render('/this-page-does-not-exist');
  await writeFile(path.join(distDir, '404.html'), buildPage(notFound));
} catch {
  await writeFile(path.join(distDir, '404.html'), buildPage({ html: '<main><h1>Not found</h1></main>', head: '<title>Not found</title>' }));
}

// /admin: no server-rendered content, just the shell with noindex.
await writeFile(
  path.join(distDir, 'admin.html'),
  buildPage({ head: '<title>Admin | PicShrink</title>\n    <meta name="robots" content="noindex, nofollow" />' }),
);

// sitemap.xml: generated from the same route list, with the canonical URLs and real dates.
let repoDate = new Date().toISOString().slice(0, 10);
try {
  repoDate =
    execFileSync('git', ['log', '-1', '--format=%cs', '--', 'src', 'index.html'], { encoding: 'utf8' }).trim() || repoDate;
} catch {
  // Not a git checkout: fall back to the build date.
}
const urls = PRERENDER_ROUTES.map((route) => {
  const loc = route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`;
  return `  <url><loc>${loc}</loc><lastmod>${ROUTE_DATES[route] ?? repoDate}</lastmod></url>`;
});
await writeFile(
  path.join(distDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);

console.log(`Prerendered ${rendered} routes + 404.html + admin.html + sitemap.xml (${urls.length} URLs)`);
if (failed.length) {
  console.warn(`[prerender] ${failed.length} route(s) used fallback shell:`, failed.join(' | '));
}
