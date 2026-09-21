import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { ThemePreference } from '@/theme';

const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Renders a component with the same providers as the app (safe area, theme, i18n). */
export async function renderWithProviders(
  ui: ReactElement,
  { themePreference = 'light' }: { themePreference?: ThemePreference } = {},
) {
  return await render(
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider initialPreference={themePreference}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}
