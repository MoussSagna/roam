import AsyncStorage from '@react-native-async-storage/async-storage';

/** Persisted keys, as documented in docs/05_THEME_AND_I18N.md. */
export const STORAGE_KEYS = {
  theme: 'roam.theme',
  language: 'roam.language',
  /** Mocked session (no backend yet), see `docs/DECISIONS.md`. */
  session: 'roam.session.isLoggedIn',
  /** Search's recent-queries list (sprint 6), see `useRecentSearches`. */
  recentSearches: 'roam.search.recent',
} as const;

/** Storage failures must never crash the app: preferences simply fall back to defaults. */
export async function readStorage(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writeStorage(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Ignored on purpose: see above.
  }
}
