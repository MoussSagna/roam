import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';

import { THEME_PREFERENCES, type ThemePreference } from './tokens';

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

export async function getStoredThemePreference(): Promise<ThemePreference | null> {
  const value = await readStorage(STORAGE_KEYS.theme);
  return isThemePreference(value) ? value : null;
}

export async function storeThemePreference(preference: ThemePreference): Promise<void> {
  await writeStorage(STORAGE_KEYS.theme, preference);
}
