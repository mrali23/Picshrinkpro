import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_THEME, brandVariables, contrastWithWhite, resolveDark, sanitizeTheme, themeValidationError } from './theme';

test('contrast with white matches known WCAG values', () => {
  assert.equal(Math.round(contrastWithWhite('#000000')), 21);
  assert.equal(contrastWithWhite('#ffffff').toFixed(1), '1.0');
  assert.ok(contrastWithWhite('#2563eb') >= 4.5, 'standard blue-600 must be accepted');
  assert.ok(contrastWithWhite('#facc15') < 4.5, 'light yellow must be rejected');
});

test('theme validation rejects bad colors, light colors and unknown options', () => {
  assert.equal(themeValidationError(undefined), null);
  assert.equal(themeValidationError({ primaryColor: '' }), null);
  assert.equal(themeValidationError({ primaryColor: '#2563EB', radius: 'round', defaultMode: 'system', publicDarkMode: true }), null);
  assert.match(themeValidationError({ primaryColor: 'red' }) ?? '', /hex color/);
  assert.match(themeValidationError({ primaryColor: 'javascript:alert(1)' }) ?? '', /hex color/);
  assert.match(themeValidationError({ primaryColor: '#ffff00' }) ?? '', /too light/);
  assert.ok(themeValidationError({ radius: 'huge' }));
  assert.ok(themeValidationError({ defaultMode: 'blue' }));
  assert.ok(themeValidationError({ publicDarkMode: 'yes' }));
  assert.ok(themeValidationError('nope'));
});

test('sanitizeTheme falls back to defaults and never keeps unsafe values', () => {
  assert.deepEqual(sanitizeTheme(undefined), DEFAULT_THEME);
  assert.deepEqual(sanitizeTheme({ primaryColor: 'url(x)', radius: 'x', defaultMode: 'x', publicDarkMode: 1 }), DEFAULT_THEME);
  assert.equal(sanitizeTheme({ primaryColor: '#ABCDEF' }).primaryColor, DEFAULT_THEME.primaryColor, 'too light, so reset');
  assert.equal(sanitizeTheme({ primaryColor: '#7C3AED' }).primaryColor, '#7c3aed');
});

test('brand variables cover the whole scale only when a color is set', () => {
  assert.deepEqual(brandVariables(''), {});
  const vars = brandVariables('#7c3aed');
  assert.equal(Object.keys(vars).length, 11);
  assert.equal(vars['--brand-600'], '#7c3aed');
  assert.ok(vars['--brand-50'].includes('#7c3aed'));
});

test('public visitors only get dark mode when the owner enabled it', () => {
  const dark = { ...DEFAULT_THEME, defaultMode: 'dark' as const };
  assert.equal(resolveDark(dark, 'public', null, true), false, 'publicDarkMode off wins');
  assert.equal(resolveDark({ ...dark, publicDarkMode: true }, 'public', null, false), true);
  assert.equal(resolveDark({ ...dark, publicDarkMode: true }, 'public', 'light', false), false, 'stored light choice wins');
  assert.equal(resolveDark(dark, 'admin', null, false), true, 'admin may always use dark');
  assert.equal(resolveDark({ ...DEFAULT_THEME, defaultMode: 'system' }, 'admin', null, true), true);
  assert.equal(resolveDark({ ...DEFAULT_THEME, defaultMode: 'system' }, 'admin', null, false), false);
});
