import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import i18n, { getStoredLanguage } from '@/i18n';
import { fontAssets, getStoredThemePreference, type ThemePreference } from '@/theme';

type Bootstrap = {
  /** True once fonts and persisted preferences are loaded: safe to show the first screen. */
  ready: boolean;
  initialThemePreference: ThemePreference;
};

/**
 * Loads everything the first frame depends on, so there is no flash of the wrong
 * font, language or theme. The splash screen stays up until `ready`.
 */
export function useBootstrap(): Bootstrap {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function restorePreferences() {
      const [storedTheme, storedLanguage] = await Promise.all([
        getStoredThemePreference(),
        getStoredLanguage(),
      ]);
      if (storedLanguage) {
        await i18n.changeLanguage(storedLanguage);
      }
      if (!cancelled) {
        setThemePreference(storedTheme ?? 'system');
      }
    }
    void restorePreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    // A font error must not block the app: text falls back to the system font.
    ready: (fontsLoaded || fontError !== null) && themePreference !== null,
    initialThemePreference: themePreference ?? 'system',
  };
}
