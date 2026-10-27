# PicShrinkPro

Browser-based image tools built with React, Vite, and Cloudflare Workers.

## Local development

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000/admin` for the admin panel. Local admin credentials are read from a `.dev.vars` file in the project root (it is git-ignored):

```text
ADMIN_USERNAME=your-admin-name
ADMIN_PASSWORD=your-strong-local-password
SESSION_SECRET=replace-with-at-least-32-random-characters
```

The Vite development server exposes the same admin API with in-memory storage, so local settings and counts reset when the dev server restarts. The deployed Worker uses Durable Object storage and persists settings and site-wide analytics.

The admin credentials are Worker secrets, not fields in the site settings page. In production, set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET` under the Cloudflare Worker settings as described below.

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

## Admin dashboard, analytics, and ads

Open `/admin` and sign in with the Worker credentials. The dashboard stores site name/description, the GA4 Measurement ID, and AdSense publisher/placement IDs in a Cloudflare Durable Object. The Durable Object is configured in `wrangler.jsonc`; deploy the Worker with Wrangler so its SQLite-backed namespace is provisioned.

The dashboard's live counters are site-wide page views, image-tool runs, popular tools, recent activity, and anonymous browsers active in the last five minutes. Events contain a random browser ID, event type, page path, and timestamp; image files are never sent. The admin page itself is excluded from visitor counts. A configured GA4 ID also sends page-view and tool-use events to Google Analytics; detailed GA4 reports remain in Google Analytics and are not pulled into this dashboard.

For AdSense, enter your approved `ca-pub-…` publisher ID and the ad unit slot ID for each placement, then enable ads and save. Ads render only where both IDs are configured. Google must approve the site and ad units before live ads can serve; the site cannot activate or approve an AdSense account on your behalf.

For privacy, update the site's privacy policy to reflect the analytics and advertising services you enable and the jurisdictions where you operate.

## Validation

GitHub Actions runs the locked Bun dependency install, the Vite production build, and a Wrangler deployment dry run for pull requests and pushes to `main`. AI runtime/model execution still needs browser testing on target devices after deployment.
