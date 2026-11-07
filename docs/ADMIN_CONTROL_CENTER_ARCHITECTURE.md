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

The R2 binding is declared in `wrangler.jsonc` as `MEDIA` and expects a bucket named `picshrinkpro-media`. Create it in the same Cloudflare account before deployment:

```bash
bunx wrangler r2 bucket create picshrinkpro-media
```

Configure the bootstrap credentials as Worker secrets (never as `VITE_*` variables):

```bash
bunx wrangler secret put ADMIN_USERNAME
bunx wrangler secret put ADMIN_PASSWORD
bunx wrangler secret put SESSION_SECRET
```

Use a long, unique session secret of at least 32 characters. For local Worker development, place the same values in an untracked `.dev.vars` file. The first successful bootstrap login creates the initial admin account with a PBKDF2-SHA-256 password hash; subsequent accounts are created through the Users & roles module.

The D1 migration is prepared but there is no D1 binding/database ID yet, and the current admin APIs have not been migrated to D1. Do not provision a placeholder ID or claim D1 is active. Apply the migration only after the D1 binding and data migration implementation are added. Do not commit account credentials.

## Implementation status on `feat/production-admin-control-center`

The following code is now present in the feature branch:

- Contact form submissions are persisted in Durable Object storage and exposed through an authenticated inbox.
- CMS records support draft/published/archived states, slug uniqueness, optimistic version checks, SEO title/description, canonical URL and Open Graph image fields.
- Published CMS records are served through a public read-only API and can render at `/blog/:slug`; the public blog index also loads managed published entries.
- SEO redirect records are validated as local paths and are applied by the Worker before static asset serving.
- Homepage section configuration records have an authenticated read/write API and an admin editor. The current public homepage components are not yet connected to these configuration records.
- Activity records are generated for implemented administrative mutations.
- Durable Object state snapshots can be created and restored. These snapshots do not include R2 objects or a D1 database.
- An R2-backed media API and responsive admin media library are implemented. Uploads are limited to JPEG, PNG, WebP, AVIF and GIF, capped at 10 MB, and checked against file signatures.
- Logout revokes the current signed session token in Durable Object state; the browser cookie is also cleared.
- The Wrangler configuration now declares an R2 binding named `MEDIA` for bucket `picshrinkpro-media`.

### Not yet complete

- The D1 migration exists but the application APIs currently use Durable Object storage for application records and user accounts. D1 provisioning, data migration and D1-backed transactional persistence remain outstanding.
- The R2 bucket must be created in the target Cloudflare account before deployment. The repository cannot create that account resource by itself.
- CMS article rendering is client-hydrated. Server-rendered/prerendered HTML and sitemap generation for managed articles still need implementation for reliable crawler discovery.
- Homepage section configuration is stored but does not yet alter the public homepage layout.
- Per-user accounts and admin/editor/viewer RBAC are implemented in Durable Object state. The first account is bootstrapped from Worker secrets; subsequent accounts use PBKDF2-SHA-256 password hashes and server-enforced roles. Admins manage accounts from the Users & roles tab. A secure self-service password change/reset flow and TOTP are still outstanding.
- Login throttling now persists hashed client keys and rolling attempt windows in Durable Object state. TOTP, session/device management UI, password reset and dedicated security-event reporting remain outstanding.
- Backup/restore currently covers Durable Object application state only. It does not back up or restore R2 media objects, D1 data, or off-account disaster recovery.
- Full content revisions, categories/tags, scheduled publishing, rich-text editing, media transformations, CSV exports, and realtime WebSocket updates remain outstanding.
- Automated tests have been added for CMS, redirect, backup, contact and session workflows, but have not yet been executed in a local/CI environment.

Do not treat this branch as a production-ready release until the outstanding items above are addressed and the build, tests, Cloudflare preview, browser regression, SEO crawl and rollback checks pass.
