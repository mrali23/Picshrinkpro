// Single source of truth for the public site URL. Used by the canonical tags in the
// app and by the build-time prerender script, so every URL points at the real domain
// even when the site is opened through a workers.dev or www address.
export const SITE_URL = 'https://picshrinkpro.com';
export const DEFAULT_OG_IMAGE = '/og-image.png';
