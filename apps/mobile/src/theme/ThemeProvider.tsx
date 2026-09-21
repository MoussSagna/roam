import { vars } from 'nativewind';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, useColorScheme, View } from 'react-native';

import { storeThemePreference } from './preferences';
import {
  themeCssVars,
  themes,
  type ThemeColors,
  type ThemeName,
  type ThemePreference,
} from './tokens';

type ThemeContextValue = {
  /** What the user chose: `light`, `dark` or `system`. */
  preference: ThemePreference;
  /** What is actually displayed. */
  scheme: ThemeName;
  isDark: boolean;
  /** Resolved hex values, for the rare places that cannot use a class (icons, navigation theme). */
  colors: ThemeColors;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialPreference?: ThemePreference;
};

/**
 * Resolves Light / Dark / System and exposes the theme as CSS variables, so that
 * `bg-background`, `text-textSecondary`… switch value without any component knowing the theme.
 */
export function ThemeProvider({ children, initialPreference = 'system' }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

  const scheme: ThemeName =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  // Keep native chrome (keyboard, alerts, system dialogs) in sync with the in-app choice.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void storeThemePreference(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      scheme,
      isDark: scheme === 'dark',
      colors: themes[scheme],
      setPreference,
    }),
    [preference, scheme, setPreference],
  );

  const cssVars = useMemo(() => vars(themeCssVars(scheme)), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View className="flex-1" style={cssVars} testID="theme-root">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
