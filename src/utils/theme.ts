/**
 * Site theme: one set of settings drives CSS variables for both the public site and /admin.
 * Pure helpers (validation, color maths) are shared with the Worker; DOM helpers only touch
 * `document` when called, so importing this file is safe on the server and during prerender.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeRadius = 'sharp' | 'default' | 'round';
export type ThemeScope = 'admin' | 'public';

export interface ThemeSettings {
  /** Brand color as #rrggbb. Empty string keeps the built-in PicShrink blue. */
  primaryColor: string;
  radius: ThemeRadius;
  defaultMode: ThemeMode;
  /** Dark mode is off for visitors unless this is enabled, so the public look never changes by surprise. */
  publicDarkMode: boolean;
}

export const DEFAULT_THEME: ThemeSettings = {
  primaryColor: '',
  radius: 'default',
  defaultMode: 'light',
  publicDarkMode: false,
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const RADII: ThemeRadius[] = ['sharp', 'default', 'round'];
const MODES: ThemeMode[] = ['light', 'dark', 'system'];
export const RADIUS_SCALE: Record<ThemeRadius, string> = { sharp: '0.25', default: '1', round: '1.5' };

/** Buttons use white text on the primary color, so it must meet WCAG AA for normal text. */
export const MIN_PRIMARY_CONTRAST = 4.5;

const BRAND_SHADES: Array<[string, string]> = [
  ['50', 'color-mix(in oklab, {c} 7%, white)'],
  ['100', 'color-mix(in oklab, {c} 14%, white)'],
  ['200', 'color-mix(in oklab, {c} 28%, white)'],
  ['300', 'color-mix(in oklab, {c} 45%, white)'],
  ['400', 'color-mix(in oklab, {c} 65%, white)'],
  ['500', 'color-mix(in oklab, {c} 85%, white)'],
  ['600', '{c}'],
  ['700', 'color-mix(in oklab, {c} 85%, black)'],
  ['800', 'color-mix(in oklab, {c} 70%, black)'],
  ['900', 'color-mix(in oklab, {c} 55%, black)'],
  ['950', 'color-mix(in oklab, {c} 40%, black)'],
];
const BRAND_VARIABLES = BRAND_SHADES.map(([shade]) => `--brand-${shade}`);

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG contrast ratio between a #rrggbb color and white (1 to 21). */
export function contrastWithWhite(hex: string): number {
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (luminance + 0.05);
}

/** Returns a user-facing error for an unusable theme, or null. Used by the admin form and the Worker. */
export function themeValidationError(input: unknown): string | null {
  if (input === undefined) return null;
  if (!input || typeof input !== 'object') return 'Theme settings are invalid.';
  const theme = input as Partial<Record<keyof ThemeSettings, unknown>>;
  if (theme.primaryColor !== undefined && theme.primaryColor !== '') {
    if (typeof theme.primaryColor !== 'string' || !HEX_COLOR.test(theme.primaryColor)) {
      return 'Primary color must be a hex color like #2563EB.';
    }
    if (contrastWithWhite(theme.primaryColor) < MIN_PRIMARY_CONTRAST) {
      return `That primary color is too light: white button text would be hard to read (contrast ${contrastWithWhite(theme.primaryColor).toFixed(2)}:1, needs ${MIN_PRIMARY_CONTRAST}:1).`;
    }
  }
  if (theme.radius !== undefined && !RADII.includes(theme.radius as ThemeRadius)) return 'Corner style is invalid.';
  if (theme.defaultMode !== undefined && !MODES.includes(theme.defaultMode as ThemeMode)) return 'Default mode is invalid.';
  if (theme.publicDarkMode !== undefined && typeof theme.publicDarkMode !== 'boolean') return 'Public dark mode must be on or off.';
  return null;
}

/** Whitelists theme fields; anything invalid falls back to the default. */
export function sanitizeTheme(input: unknown): ThemeSettings {
  const theme = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof ThemeSettings, unknown>>;
  const color = typeof theme.primaryColor === 'string' && HEX_COLOR.test(theme.primaryColor) && contrastWithWhite(theme.primaryColor) >= MIN_PRIMARY_CONTRAST
    ? theme.primaryColor.toLowerCase()
    : DEFAULT_THEME.primaryColor;
  return {
    primaryColor: color,
    radius: RADII.includes(theme.radius as ThemeRadius) ? (theme.radius as ThemeRadius) : DEFAULT_THEME.radius,
    defaultMode: MODES.includes(theme.defaultMode as ThemeMode) ? (theme.defaultMode as ThemeMode) : DEFAULT_THEME.defaultMode,
    publicDarkMode: typeof theme.publicDarkMode === 'boolean' ? theme.publicDarkMode : DEFAULT_THEME.publicDarkMode,
  };
}

/** CSS variables that re-tint Tailwind's blue scale. Empty when the default brand blue is used. */
export function brandVariables(primaryColor: string): Record<string, string> {
  if (!HEX_COLOR.test(primaryColor)) return {};
  return Object.fromEntries(BRAND_SHADES.map(([shade, template]) => [`--brand-${shade}`, template.replaceAll('{c}', primaryColor)]));
}

// ---- Mode preference (per browser) ---------------------------------------------------------------

const MODE_EVENT = 'picshrink-theme-mode-changed';
const modeKey = (scope: ThemeScope) => `picshrink_theme_mode_${scope}`;
const cacheKey = (scope: ThemeScope) => `picshrink_theme_cache_${scope}`;

export function getStoredMode(scope: ThemeScope): ThemeMode | null {
  try {
    const value = localStorage.getItem(modeKey(scope));
    return MODES.includes(value as ThemeMode) ? (value as ThemeMode) : null;
  } catch {
    return null;
  }
}

export function setStoredMode(scope: ThemeScope, mode: ThemeMode): void {
  try {
    localStorage.setItem(modeKey(scope), mode);
  } catch {
    /* storage can be blocked; the choice then lasts until reload */
  }
  window.dispatchEvent(new Event(MODE_EVENT));
}

export function onThemeModeChanged(callback: () => void): () => void {
  window.addEventListener(MODE_EVENT, callback);
  return () => window.removeEventListener(MODE_EVENT, callback);
}

/** Decides light or dark. Public visitors only ever get dark when the site owner enabled it. */
export function resolveDark(theme: ThemeSettings, scope: ThemeScope, storedMode: ThemeMode | null, prefersDark: boolean): boolean {
  if (scope === 'public' && !theme.publicDarkMode) return false;
  const mode = storedMode ?? theme.defaultMode;
  return mode === 'dark' || (mode === 'system' && prefersDark);
}

/** Applies the theme to <html> and caches the result so the next page load can paint it before React runs. */
export function applyTheme(theme: ThemeSettings, scope: ThemeScope): void {
  const root = document.documentElement;
  const vars = brandVariables(theme.primaryColor);
  for (const name of BRAND_VARIABLES) root.style.removeProperty(name);
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  const scale = RADIUS_SCALE[theme.radius];
  if (theme.radius === 'default') root.style.removeProperty('--radius-scale');
  else root.style.setProperty('--radius-scale', scale);

  const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = resolveDark(theme, scope, getStoredMode(scope), prefersDark);
  root.dataset.theme = dark ? 'dark' : 'light';

  try {
    localStorage.setItem(cacheKey(scope), JSON.stringify({ vars, scale: theme.radius === 'default' ? '' : scale, dark }));
  } catch {
    /* ignore blocked storage */
  }
}
