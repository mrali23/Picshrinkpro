import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  DEFAULT_THEME, contrastWithWhite, getStoredMode, onThemeModeChanged, setStoredMode, themeValidationError,
  type ThemeMode, type ThemeSettings,
} from '../../utils/theme';

const NEXT_MODE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
const MODE_LABEL: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const MODE_ICON = { light: Sun, dark: Moon, system: Monitor };

/** Cycles the admin's own light/dark preference for this browser. */
export function AdminModeToggle({ defaultMode }: { defaultMode: ThemeMode }) {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredMode('admin') ?? defaultMode);
  useEffect(() => onThemeModeChanged(() => setMode(getStoredMode('admin') ?? defaultMode)), [defaultMode]);
  const Icon = MODE_ICON[mode];
  return (
    <button
      type="button"
      onClick={() => setStoredMode('admin', NEXT_MODE[mode])}
      aria-label={`Admin color mode: ${MODE_LABEL[mode]}. Switch to ${MODE_LABEL[NEXT_MODE[mode]]}.`}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
    >
      <Icon size={17} aria-hidden="true" /> {MODE_LABEL[mode]}
    </button>
  );
}

const field = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500';

/** Theme section of the site settings form. Changes apply to the whole site after "Save site settings". */
export function ThemeSettingsSection({ theme, onChange }: { theme: ThemeSettings; onChange: (patch: Partial<ThemeSettings>) => void }) {
  const [draftColor, setDraftColor] = useState(theme.primaryColor);
  useEffect(() => setDraftColor(theme.primaryColor), [theme.primaryColor]);

  const colorError = draftColor === '' ? null : themeValidationError({ primaryColor: draftColor });
  const contrast = /^#[0-9a-f]{6}$/i.test(draftColor) ? contrastWithWhite(draftColor) : null;

  const updateColor = (value: string) => {
    setDraftColor(value);
    if (value === '' || themeValidationError({ primaryColor: value }) === null) onChange({ primaryColor: value });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Theme</h2>
      <p className="mt-1 text-sm text-slate-500">One set of colors and corner styles for the public site and this admin. Leave the color empty to keep the default PicShrink blue.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="text-sm font-medium text-slate-700">
          <label htmlFor="theme-primary">Primary color</label>
          <div className="mt-1.5 flex items-center gap-3">
            <input
              type="color" aria-label="Pick primary color" value={/^#[0-9a-f]{6}$/i.test(draftColor) ? draftColor : '#155dfc'}
              onChange={(event) => updateColor(event.target.value)} className="h-12 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
            />
            <input
              id="theme-primary" placeholder="#2563EB" maxLength={7} value={draftColor} spellCheck={false}
              onChange={(event) => updateColor(event.target.value.trim())} aria-invalid={Boolean(colorError)} aria-describedby="theme-primary-help"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono outline-none focus:border-blue-500"
            />
          </div>
          <p id="theme-primary-help" role={colorError ? 'alert' : undefined} className={`mt-1.5 text-xs ${colorError ? 'text-rose-600' : 'text-slate-500'}`}>
            {colorError ?? (contrast ? `White text contrast ${contrast.toFixed(2)}:1 (needs 4.5:1).` : 'Buttons and links use this color.')}
          </p>
        </div>
        <label className="text-sm font-medium text-slate-700">Corner style
          <select value={theme.radius} onChange={(event) => onChange({ radius: event.target.value as ThemeSettings['radius'] })} className={field}>
            <option value="sharp">Sharp</option>
            <option value="default">Default</option>
            <option value="round">Extra round</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Default color mode
          <select value={theme.defaultMode} onChange={(event) => onChange({ defaultMode: event.target.value as ThemeMode })} className={field}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">Follow the visitor’s device</option>
          </select>
        </label>
        <label className="flex items-start gap-3 text-sm font-medium text-slate-700 sm:mt-7">
          <input type="checkbox" checked={theme.publicDarkMode} onChange={(event) => onChange({ publicDarkMode: event.target.checked })} className="mt-0.5 h-4 w-4 accent-blue-600" />
          <span>Allow dark mode on the public site<span className="block text-xs font-normal text-slate-500">Off by default. When off, visitors always see the light design; the admin can still use dark mode.</span></span>
        </label>
      </div>
      <button type="button" onClick={() => onChange({ ...DEFAULT_THEME })} className="mt-5 text-sm font-semibold text-blue-700 hover:underline">Reset theme to defaults</button>
    </section>
  );
}
