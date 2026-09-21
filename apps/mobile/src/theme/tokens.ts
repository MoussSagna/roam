/**
 * Semantic design tokens (docs/05_THEME_AND_I18N.md, docs/06_DESIGN_SYSTEM.md).
 *
 * This file is pure (no React Native import) because `tailwind.config.ts` loads it in Node.
 * Feature code uses the tokens through NativeWind classes (`bg-background`, `text-textSecondary`…)
 * or `useTheme()` — never through raw hex values.
 */
import { hexToRgbChannels } from './color';
import { brand, derived } from './palette';

export type ThemeName = 'light' | 'dark';
export type ThemePreference = ThemeName | 'system';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export const colorTokenNames = [
  'background',
  'surface',
  'surfaceElevated',
  'text',
  'textSecondary',
  'border',
  'primary',
  'primaryForeground',
  'accent',
  'success',
  'warning',
  'error',
  'overlay',
] as const;

export type ColorToken = (typeof colorTokenNames)[number];
export type ThemeColors = Record<ColorToken, string>;

export const lightColors: ThemeColors = {
  background: brand.cream,
  surface: brand.white,
  surfaceElevated: brand.white,
  text: brand.ink,
  textSecondary: derived.stoneStrong,
  border: derived.line,
  primary: brand.forest,
  primaryForeground: brand.white,
  accent: brand.peach,
  success: derived.success,
  warning: derived.warning,
  error: derived.error,
  /** Base color of scrims; apply opacity at the call site: `bg-overlay/40`. */
  overlay: brand.ink,
};

export const darkColors: ThemeColors = {
  background: derived.night,
  surface: derived.nightSurface,
  surfaceElevated: derived.nightElevated,
  text: derived.offWhite,
  textSecondary: derived.sageMuted,
  border: derived.nightLine,
  primary: derived.forestLight,
  primaryForeground: derived.night,
  accent: brand.peach,
  success: derived.successOnDark,
  warning: derived.warningOnDark,
  error: derived.errorOnDark,
  overlay: derived.black,
};

export const themes: Record<ThemeName, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

/** CSS variable backing a token, e.g. `surfaceElevated` -> `--color-surface-elevated`. */
export function cssVarName(token: ColorToken): string {
  return `--color-${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** Variables to inject at the root of the tree for a given theme. */
export function themeCssVars(name: ThemeName): Record<string, string> {
  const colors = themes[name];
  return Object.fromEntries(
    colorTokenNames.map((token) => [cssVarName(token), hexToRgbChannels(colors[token])]),
  );
}

/** Corner radii (px). Map to `rounded-small`, `rounded-card`… */
export const radius = {
  small: '8px',
  medium: '12px',
  large: '20px',
  card: '24px',
  hero: '32px',
  pill: '999px',
} as const;
