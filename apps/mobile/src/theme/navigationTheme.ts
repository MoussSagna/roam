import { DarkTheme, DefaultTheme } from 'expo-router';

import type { ThemeColors, ThemeName } from './tokens';

/** Maps ROAM tokens onto React Navigation's theme so headers/transitions never flash white. */
export function createNavigationTheme(scheme: ThemeName, colors: ThemeColors) {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
}
