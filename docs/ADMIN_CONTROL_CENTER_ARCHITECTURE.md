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

## Implementation status on `feat/production-admin-control-center`

The following code is now present in the feature branch:

- Contact form submissions are persisted in Durable Object storage and exposed through an authenticated inbox.
- CMS records support draft/published/archived states, slug uniqueness, optimistic version checks, SEO title/description, canonical URL and Open Graph image fields.
- Published CMS records are served through a public read-only API and can render at `/blog/:slug`; the public blog index also loads managed published entries.
- SEO redirect records are validated as local paths and are applied by the Worker before static asset serving.
- Homepage section configuration records have an authenticated read/write API and an admin editor. The current public homepage components are not yet connected to these configuration records.
- Activity records are generated for implemented administrative mutations.
- Durable Object state snapshots can be created and restored. Phase 2 also copies associated R2 media objects into a backup prefix and restores them with the metadata; D1 is not yet provisioned.
- An R2-backed media API and responsive admin media library are implemented. Uploads are limited to JPEG, PNG, WebP, AVIF and GIF, capped at 10 MB, and checked against file signatures.
- Logout revokes the current signed session token in Durable Object state; the browser cookie is also cleared.
- The Wrangler configuration now declares an R2 binding named `MEDIA` for bucket `picshrinkpro-media`.

### Not yet complete

- The D1 migration exists but the application APIs currently use Durable Object storage for application records and user accounts. D1 provisioning, data migration and D1-backed transactional persistence remain outstanding.
- The R2 bucket must be created in the target Cloudflare account before deployment. The repository cannot create that account resource by itself.
- CMS article rendering is client-hydrated. Server-rendered/prerendered HTML and sitemap generation for managed articles still need implementation for reliable crawler discovery.
- Homepage section configuration is stored but does not yet alter the public homepage layout.
- Per-user accounts and admin/editor/viewer RBAC are implemented in Durable Object state. The first account is bootstrapped from Worker secrets; subsequent accounts use PBKDF2-SHA-256 password hashes and server-enforced roles. Admins manage accounts from the Users & roles tab. A secure self-service password change/reset flow and TOTP are still outstanding.
- Login throttling still uses in-memory Worker state rather than a persistent shared rate limiter. TOTP, session/device management UI, password reset and dedicated security-event reporting remain outstanding.
- Backup/restore includes application state and R2 media object copies, but does not yet include D1 data or off-account disaster recovery.
- Full content revisions, categories/tags, scheduled publishing, rich-text editing, media transformations, CSV exports, and realtime WebSocket updates remain outstanding.
- Automated tests cover CMS, redirects, scheduled publishing, sitemap, navigation, backups, contact, media restore and session workflows; the GitHub Actions build pipeline is used for verification.

Do not treat this branch as a production-ready release until the outstanding items above are addressed and the build, tests, Cloudflare preview, browser regression, SEO crawl and rollback checks pass.

## Phase 2 implementation update

Additional implementation now present in `feat/admin-control-center-phase-2`:

- The homepage's hero, tools and feature sections load published configuration from a public-safe Worker endpoint. Admin visibility and text edits now affect the public homepage.
- Header navigation links are editable in the Website Builder and are delivered to desktop/mobile navigation through a public-safe endpoint. Only same-site paths are accepted.
- CMS articles can be scheduled. A Cloudflare Cron trigger runs every minute and publishes due articles through a Worker-internal endpoint protected by the Worker session secret.
- Published CMS articles are added to the runtime XML sitemap. Editors can opt individual articles out of the sitemap.
- Managed CMS article routes are served as crawler-readable HTML with title, description, canonical URL, Open Graph/Twitter metadata, BlogPosting JSON-LD and article body content. The response uses the existing site's built CSS when available.
- CMS revision snapshots are created on initial save and before each edit. Editors can inspect revision metadata and restore a prior version as a draft; a stale-version check prevents overwriting concurrent edits.
- Media records support folder assignment, filename editing and accessible alt text in addition to R2 upload, preview and deletion.
- Slug normalization uses Unicode mark removal and preserves ordinary letters such as `u`; a regression was caught and covered by the scheduled-publishing test.

The GitHub Actions build pipeline has passed type-checking, automated tests, the production Vite/prerender build, SEO validation and Worker configuration/bundle validation on the current phase-2 branch head.

### Remaining release blockers

- The D1 migration is prepared but no D1 database/binding is configured. Admin APIs still use the existing Durable Object JSON state and have not been migrated to normalized D1 transactions.
- The R2 bucket `picshrinkpro-media` must be created in the target Cloudflare account. The application has not been deployed against a provisioned R2 bucket or verified with live uploads.
- Backup/restore now copies R2 media bytes into per-backup object prefixes and restores them with the application snapshot. D1 backups, off-account replication and disaster-recovery drills remain outstanding.
- Navigation menu editing, WebSocket realtime updates, session/device management UI, TOTP, password reset and more detailed security event logs remain outstanding.
- Managed article pages are server-rendered by the Worker as a safe HTML document, but full React SSR parity and a visual cross-browser review of the dynamic article template are still required.
- Full browser E2E, accessibility, mobile visual regression, Cloudflare preview, production smoke tests and rollback validation remain outstanding.

The passing CI checks are not a substitute for Cloudflare account provisioning or production preview testing. Do not merge/deploy until the infrastructure blockers and release checks are completed.
