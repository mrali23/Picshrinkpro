# Technical SEO hardening

This change set addresses accuracy and adds a build-time SEO smoke test.

## Implemented

- Corrected JPG-to-PNG copy: PNG uses lossless encoding, but conversion cannot restore data already discarded by JPEG compression.
- Removed blanket compression guarantees and unsupported universal size-reduction claims from primary compressor metadata and UI copy.
- Clarified that compression results depend on source image, output format, and quality settings.
- Updated background-remover metadata to distinguish AI segmentation from browser-based color-boundary methods.
- Replaced broad privacy/confidentiality slogans with a precise explanation of local image processing and supporting network services.
- Added `scripts/validate-seo.mjs`, which validates generated sitemap URLs against prerendered HTML, title, meta description, canonical, robots directives, indexability, and robots.txt sitemap reference.
- Added the validator to the production build pipeline.

## Build and test

Run:

```bash
bun install --frozen-lockfile
bun run lint
bun run test
bun run build
```

The build now fails if a sitemap URL has no generated HTML, lacks required metadata, has a mismatched canonical, is marked noindex, or if robots.txt does not reference the canonical sitemap.

Warnings report pages with an unexpected H1 count or images without alt attributes. These warnings should be reviewed in the generated build output.

## Still requires account access or external measurement

These checks cannot be honestly completed by a repository-only change:

- Google Search Console: Page Indexing, Sitemaps, Crawl Stats, and URL Inspection exports.
- Bing Webmaster Tools: sitemap processing, crawl errors, URL inspection, and IndexNow status.
- PageSpeed Insights / Lighthouse mobile and desktop lab reports and CrUX field data.
- Backlink/referring-domain exports from a reputable backlink index.
- Live HTTP crawl/redirect validation after deployment.

After deployment, submit `https://picshrinkpro.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools, then capture fresh PageSpeed reports for the homepage and representative tools.
