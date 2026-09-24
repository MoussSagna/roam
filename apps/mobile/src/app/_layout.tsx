import '@/lib/knownWarnings';
import '@/global.css';
import '@/i18n';

import { ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider } from '@/auth';
import { AppToast } from '@/components/ui';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import { useBootstrap } from '@/hooks/useBootstrap';
import { createNavigationTheme, ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, initialThemePreference, initialIsLoggedIn } = useBootstrap();

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider initialPreference={initialThemePreference}>
      <AuthProvider initialIsLoggedIn={initialIsLoggedIn}>
        <AppChrome />
      </AuthProvider>
    </ThemeProvider>
  );
}

/** Native chrome (nav bar theme, status bar) around the guarded route table (`AppRoutes`). */
function AppChrome() {
  const { scheme, colors, isDark } = useTheme();

  return (
    <NavigationThemeProvider value={createNavigationTheme(scheme, colors)}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppRoutes />
      <AppToast />
    </NavigationThemeProvider>
  );
}
