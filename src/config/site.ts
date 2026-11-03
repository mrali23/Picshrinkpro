/** Canonical origin. Used for canonical URLs, Open Graph and JSON-LD so they never depend on the host serving the page. */
export const SITE_URL = 'https://picshrinkpro.com';
export const SITE_NAME = 'PicShrink';
export const DEFAULT_OG_IMAGE = '/og-image.png';
export const LOGO_URL = '/logo-512.png';

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}
