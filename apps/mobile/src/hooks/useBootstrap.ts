import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { getStoredSession } from '@/auth';
import i18n, { getStoredLanguage } from '@/i18n';
import { fontAssets, getStoredThemePreference, type ThemePreference } from '@/theme';

type Bootstrap = {
  /** True once fonts and persisted preferences are loaded: safe to show the first screen. */
  ready: boolean;
  initialThemePreference: ThemePreference;
  /** Restored mocked session: whether the splash should head to Home or Welcome. */
  initialIsLoggedIn: boolean;
};

/**
 * Loads everything the first frame depends on, so there is no flash of the wrong
 * font, language, theme or session. The splash screen stays up until `ready`.
 */
export function useBootstrap(): Bootstrap {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function restorePreferences() {
      const [storedTheme, storedLanguage, storedSession] = await Promise.all([
        getStoredThemePreference(),
        getStoredLanguage(),
        getStoredSession(),
      ]);
      if (storedLanguage) {
        await i18n.changeLanguage(storedLanguage);
      }
      if (!cancelled) {
        setThemePreference(storedTheme ?? 'system');
        setIsLoggedIn(storedSession);
      }
    }
    void restorePreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    // A font error must not block the app: text falls back to the system font.
    ready: (fontsLoaded || fontError !== null) && themePreference !== null && isLoggedIn !== null,
    initialThemePreference: themePreference ?? 'system',
    initialIsLoggedIn: isLoggedIn ?? false,
  };
}
