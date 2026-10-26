# PicShrinkPro

Browser-based image tools built with React, Vite, and Cloudflare Workers.

## Local development

```sh
bun install --frozen-lockfile
bun run dev
```

## Production build

```sh
bun run build
npx wrangler@4 deploy --dry-run
```

Cloudflare Workers Builds uses `bun run build` and `npx wrangler deploy`.

## Background remover

The default background-removal mode loads the Transformers.js runtime and the `Orangebot/ormbg-ONNX` model only when the tool is used. Runtime/model files are fetched from third-party hosts on first use; the selected image is passed to the model as a local browser object URL and is not uploaded by the tool. The model's initial download can be large and browser GPU/CPU capabilities affect performance.

Color-based smart-boundary and chroma-key methods remain available for simple uniform backgrounds. The fallback is not AI segmentation and can remove similarly colored parts of a subject. Image uploads are limited in the UI to JPG/PNG/WebP, 15 MB, and 12 megapixels.

## Administrator login setup

The administrator login now uses a server-verified, signed, HttpOnly session cookie. It fails closed until the following **Worker secrets** are set for the `picshrinkpro` Worker:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET` (at least 32 characters of high-entropy random data)

Set these from the Cloudflare dashboard under **Workers & Pages → picshrinkpro → Settings → Variables and Secrets**, marking all three as secrets. Do not put them in `VITE_*` variables or commit them to GitHub. Generate your own strong admin password and a separate random session secret.

Example using Wrangler locally (each command prompts you securely):

```sh
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

The Cloudflare Worker requires the secrets at runtime. This repository intentionally contains no default admin credentials.

## Admin dashboard feature status

The login is authenticated server-side. The current dashboard's blog list is read-only, and ad/SEO configuration cards are UI previews; those panels are not yet backed by a CMS database or actual Google AdSense/Google Search Console write APIs. Local activity counters are browser-local; connect a valid GA4 Measurement ID to send events to that GA4 property. They are not site-wide counts.

## Validation

GitHub Actions runs the locked Bun dependency install, the Vite production build, and a Wrangler deployment dry run for pull requests and pushes to `main`. AI runtime/model execution still needs browser testing on target devices after deployment.
