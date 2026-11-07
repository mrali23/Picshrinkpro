# PicShrinkPro Admin Control Center

## Scope

This is an extension of the existing React 19 + TypeScript + Vite application and Cloudflare Worker. Existing image-processing routes and client-side processing remain intact. Store-only modules (products, inventory, orders, coupons) are intentionally excluded because PicShrinkPro is an image-tools website, not an ecommerce store.

## Existing architecture

- React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4.
- Cloudflare Worker serves the API and static assets.
- Durable Object `AdminData` currently persists basic settings and a bounded analytics event list.
- Public content currently includes locally defined blog data.
- Existing admin route: `/admin`.
- Existing UI uses a slate background, white cards, blue primary actions, indigo accents, rounded 2xl/3xl surfaces, slate borders, and subtle shadows.

## Target architecture

- Cloudflare D1: normalized CMS data, administrator accounts, sessions, site settings, content revisions, messages, redirects, activity, analytics, and backup metadata.
- Cloudflare R2: media objects; D1 stores object keys and metadata only.
- Cloudflare Durable Objects: WebSocket fan-out and presence; D1 remains the source of truth.
- Cloudflare Worker: authentication, server-side RBAC, validation, mutations, upload authorization, cache versioning/invalidation, sitemap and redirect responses.
- React public clients: subscribe to public-safe change events and update only affected content.
- Admin client: optimistic mutations, rollback on failure, version preconditions, conflict warnings, and reconnect/resync.

## Real-time consistency

Every mutable row carries a monotonically increasing `version`. Mutations must include `expectedVersion`; the Worker performs a conditional update and returns HTTP 409 with the latest safe record when the version does not match. The database transaction commits before a Durable Object publishes an event. On reconnect, clients fetch the current versioned snapshot before resuming events. Public cache entries are version-keyed or purged after commit.

## Database schema

The initial D1 migration is `migrations/0001_admin_cms.sql`. It creates:

- `admin_users`, `admin_sessions`
- `site_settings`
- `content`, `content_revisions`, `categories`, `tags`, `content_tags`
- `media_assets`
- `navigation_menus`, `homepage_sections`
- `form_messages`
- `redirects`
- `activity_log`
- `analytics_events`
- `backup_snapshots`

All sensitive routes must authorize on the Worker. UI visibility is not an authorization boundary. Password hashes, TOTP secrets, and session tokens must never be returned to browser clients. Audit records should redact secrets and personal data not required for accountability.

## Role policy

- Admin: all site, user, security, backup, and content operations.
- Editor: create/update/publish content, manage media, menus, and homepage sections; cannot manage users, credentials, or security settings.
- Viewer: read-only dashboard and content visibility; cannot mutate data or export private message details unless explicitly granted.

## PicShrinkPro-specific modules

- Dashboard: page views, active anonymous visitors, tool runs, popular tools, recent activity, Worker/storage health.
- CMS: blog posts and editable public pages, categories, tags, SEO metadata, drafts, scheduling, revisions and restore.
- Media: R2 uploads, WebP derivatives, alt text, rename/delete/search.
- Layout: header/footer navigation, homepage sections, announcements and banners.
- Settings: site identity, logo/favicon, contact/social links, GA4, AdSense, safe script allowlist, maintenance state, robots and sitemap controls.
- Inbox: real contact submissions, status, CSV export and response workflow.
- SEO: generated sitemap, redirects and crawl/link diagnostics.
- Audit and backups: before/after changes, JSON/CSV export and validated restore.

## Security baseline

- No credentials in `VITE_*` variables.
- Secure, HttpOnly, SameSite cookies; CSRF/origin validation on writes.
- Password hashing with a supported password KDF; no plaintext credential comparison in the final implementation.
- Persistent login throttling, short-lived/revocable sessions, optional TOTP.
- Strict schema validation, HTML sanitization, parameterized SQL, MIME/signature/size checks for uploads.
- No public access to drafts, private messages, audit logs, sessions, or backups.
- CSP and other response security headers; admin noindex.
- Secrets configured as Cloudflare Worker secrets, never committed.

## Infrastructure provisioning required before deployment

The repository does not currently contain a D1 database ID or R2 bucket binding. Create the D1 database and R2 bucket in the target Cloudflare account, then add their generated identifiers to `wrangler.jsonc`. Do not commit account credentials. Apply migrations with Wrangler before deploying the Worker.
