import '@/lib/knownWarnings';
import '@/global.css';
import '@/i18n';

import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useBootstrap } from '@/hooks/useBootstrap';
import { createNavigationTheme, ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, initialThemePreference } = useBootstrap();

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
      <AppNavigator />
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { scheme, colors, isDark } = useTheme();

  return (
    <NavigationThemeProvider value={createNavigationTheme(scheme, colors)}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </NavigationThemeProvider>
  );
}
