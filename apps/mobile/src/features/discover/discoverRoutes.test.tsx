import { within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

/**
 * Mounts the real `src/app` route tree (see `experienceRoutes.test.tsx` / `tabsRoutes.test.tsx`), so a
 * broken route file would actually fail here. Covers the sprint 6 navigation chain: Discover ->
 * Experience Detail, Discover -> Collection placeholder, Discover -> Map.
 */
function TestLayout() {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ThemeProvider initialPreference="light">
        <AuthProvider initialIsLoggedIn>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderApp() {
  const utils = renderRouter({ appDir: './src/app', overrides: { _layout: TestLayout } });
  await utils;
  return { getPathname: utils.getPathname };
}

describe('Discover navigation (sprint 6)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('Discover -> Experience Detail, with no "Unmatched Route"', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/discover'));

    const nearby = screen.getByTestId('discover-section-nearby');
    await fireEvent.press(within(nearby).getByRole('button', { name: 'Balade panoramique' }));

    expect(utils.getPathname()).toBe('/experience/exp-panoramic-walk');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByRole('header')).toHaveTextContent('Balade panoramique');
  });

  it('Discover -> Collection placeholder, with no "Unmatched Route"', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/discover'));

    await fireEvent.press(screen.getByRole('button', { name: 'Les plus beaux rooftops de Paris' }));

    expect(utils.getPathname()).toBe('/collection/col-rooftops');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByText('Les plus beaux rooftops de Paris')).toBeOnTheScreen();
    expect(screen.getByText('Cet écran arrive bientôt.')).toBeOnTheScreen();
  });

  it('Discover -> Map, with no "Unmatched Route"', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/discover'));

    await fireEvent.press(screen.getByRole('button', { name: 'Voir la carte' }));

    expect(utils.getPathname()).toBe('/map');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByText('Ton parcours')).toBeOnTheScreen();
    expect(await screen.findByTestId('roam-map')).toBeOnTheScreen();
  });
});
