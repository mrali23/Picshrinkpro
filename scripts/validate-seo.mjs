import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const siteOrigin = 'https://picshrinkpro.com';
const failures = [];
const warnings = [];

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

const sitemapPath = path.join(dist, 'sitemap.xml');
if (!(await exists(sitemapPath))) {
  console.error('[seo-check] Missing dist/sitemap.xml');
  process.exit(1);
}

const sitemap = await readFile(sitemapPath, 'utf8');
const urls = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
if (urls.length === 0) failures.push('Sitemap contains no <loc> URLs.');

const seen = new Set();
for (const rawUrl of urls) {
  let url;
  try { url = new URL(rawUrl); } catch { failures.push(`Invalid sitemap URL: ${rawUrl}`); continue; }
  if (url.origin !== siteOrigin) {
    failures.push(`Unexpected sitemap origin: ${rawUrl}`);
    continue;
  }
  if (url.search || url.hash) failures.push(`Sitemap URL contains query/hash: ${rawUrl}`);
  if (url.pathname.startsWith('/admin')) failures.push(`Admin route must not be in sitemap: ${rawUrl}`);

  const route = url.pathname.replace(/^\/+|\/+$/g, '');
  const htmlPath = path.join(dist, route ? `${route}.html` : 'index.html');
  if (!(await exists(htmlPath))) {
    failures.push(`Sitemap URL has no prerendered HTML: ${rawUrl} -> ${htmlPath}`);
    continue;
  }

  const html = await readFile(htmlPath, 'utf8');
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i)?.[1]
    ?? html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];
  const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1]
    ?? html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*\/?>/i)?.[1];
  const robots = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i)?.[1]
    ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']robots["'][^>]*\/?>/i)?.[1];
  const h1Count = (html.match(/<h1(?:\s|>)/gi) ?? []).length;

  if (!title) failures.push(`Missing title: ${rawUrl}`);
  if (!description?.trim()) failures.push(`Missing meta description: ${rawUrl}`);
  if (!canonical) failures.push(`Missing canonical: ${rawUrl}`);
  else if (canonical !== rawUrl) failures.push(`Canonical mismatch on ${rawUrl}: ${canonical}`);
  if (!robots) failures.push(`Missing robots directive: ${rawUrl}`);
  else if (/noindex/i.test(robots)) failures.push(`Sitemap URL is marked noindex: ${rawUrl}`);
  if (h1Count !== 1) warnings.push(`Expected one H1, found ${h1Count}: ${rawUrl}`);

  const duplicateKey = canonical || rawUrl;
  if (seen.has(duplicateKey)) failures.push(`Duplicate canonical URL: ${duplicateKey}`);
  seen.add(duplicateKey);

  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const missingAlt = imageTags.filter((tag) => !/\balt\s*=/.test(tag)).length;
  if (missingAlt) warnings.push(`${missingAlt} image(s) without an alt attribute: ${rawUrl}`);
}

const robotsPath = path.join(dist, 'robots.txt');
if (!(await exists(robotsPath))) failures.push('Missing dist/robots.txt');
else {
  const robotsTxt = await readFile(robotsPath, 'utf8');
  if (!/Sitemap:\s*https:\/\/picshrinkpro\.com\/sitemap\.xml/i.test(robotsTxt)) {
    failures.push('robots.txt does not reference the canonical sitemap URL.');
  }
}

console.log(`[seo-check] Checked ${urls.length} sitemap URL(s).`);
for (const warning of warnings) console.warn(`[seo-check] WARN: ${warning}`);
for (const failure of failures) console.error(`[seo-check] FAIL: ${failure}`);
if (failures.length) process.exit(1);
console.log('[seo-check] Sitemap, prerendered HTML, title, description, canonical, robots and indexability checks passed.');
