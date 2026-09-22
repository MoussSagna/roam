import { contrastRatio, hexToRgbChannels } from './color';
import { brand, derived } from './palette';
import {
  colorTokenNames,
  cssVarName,
  darkColors,
  lightColors,
  themeCssVars,
  themes,
  type ThemeName,
} from './tokens';

describe('theme tokens', () => {
  it('exposes the documented semantic tokens in both themes', () => {
    expect(Object.keys(lightColors).sort()).toEqual([...colorTokenNames].sort());
    expect(Object.keys(darkColors).sort()).toEqual([...colorTokenNames].sort());
  });

  it('builds the light theme from the ROAM palette', () => {
    expect(lightColors.background).toBe(brand.cream);
    expect(lightColors.surface).toBe(brand.white);
    expect(lightColors.text).toBe(derived.inkDeep);
    expect(lightColors.primary).toBe(derived.forestDeep);
    expect(lightColors.textSecondary).toBe(derived.slate);
    expect(lightColors.accent).toBe(brand.peach);
  });

  it('has a genuine dark theme, not an inversion of the light one', () => {
    for (const token of ['background', 'surface', 'surfaceElevated', 'text', 'primary'] as const) {
      expect(darkColors[token]).not.toBe(lightColors[token]);
    }
    // Dark surfaces get lighter as they rise; the light theme keeps cards white.
    expect(contrastRatio(darkColors.surface, darkColors.background)).toBeGreaterThan(1);
    expect(contrastRatio(darkColors.surfaceElevated, darkColors.background)).toBeGreaterThan(
      contrastRatio(darkColors.surface, darkColors.background),
    );
  });

  it.each<ThemeName>(['light', 'dark'])('meets WCAG AA for text in the %s theme', (name) => {
    const colors = themes[name];
    const AA = 4.5;
    for (const surface of ['background', 'surface', 'surfaceElevated'] as const) {
      expect(contrastRatio(colors.text, colors[surface])).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(colors.textSecondary, colors[surface])).toBeGreaterThanOrEqual(AA);
    }
    expect(contrastRatio(colors.primaryForeground, colors.primary)).toBeGreaterThanOrEqual(AA);
    for (const status of ['success', 'warning', 'error', 'primary'] as const) {
      expect(contrastRatio(colors[status], colors.background)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('maps tokens to CSS variables holding RGB channels', () => {
    expect(cssVarName('surfaceElevated')).toBe('--color-surface-elevated');
    expect(themeCssVars('light')['--color-primary']).toBe('26 62 48');
    expect(themeCssVars('dark')['--color-background']).toBe(
      hexToRgbChannels(darkColors.background),
    );
  });

  it('rejects invalid hex colors', () => {
    expect(() => hexToRgbChannels('#12')).toThrow();
  });
});
