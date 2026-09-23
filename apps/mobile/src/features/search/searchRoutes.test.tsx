import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

/**
 * Mounts the real `src/app` route tree (same pattern as `discoverRoutes.test.tsx`), covering the
 * sprint 6 global search navigation chain: Home -> Search, Discover -> Search, Search -> Experience
 * Detail, and back navigation — both `SearchBar`s must land on the exact same `/search` route.
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

describe('Search navigation (sprint 6)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('Home -> Search, with no "Unmatched Route"', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/home'));

    // Two live `SearchBar`s once sticky search (D-69) is in place — in-flow + `HomeHeader`'s docked
    // one — either must land on the same `/search` route.
    const [firstSearchBar] = screen.getAllByRole('search');
    await fireEvent.press(firstSearchBar);

    expect(utils.getPathname()).toBe('/search');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByLabelText('Explorer un lieu, une activité…')).toBeOnTheScreen();
  });

  it('Discover -> Search, with no "Unmatched Route"', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/discover'));

    // Two live `SearchBar`s (in-flow + `StickyRevealHeader`'s `centerSlot`, D-69).
    const [firstSearchBar] = screen.getAllByRole('search');
    await fireEvent.press(firstSearchBar);

    expect(utils.getPathname()).toBe('/search');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByLabelText('Que veux-tu découvrir ?')).toBeOnTheScreen();
  });

  it('Search -> Experience Detail, with no "Unmatched Route"', async () => {
    const utils = await renderApp();
    await act(() => router.navigate({ pathname: '/search', params: { context: 'discover' } }));

    await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), 'rooftop');
    await fireEvent(screen.getByLabelText('Que veux-tu découvrir ?'), 'submitEditing');

    await fireEvent.press(await screen.findByRole('button', { name: 'Rooftop Sunset' }));

    expect(utils.getPathname()).toBe('/experience/exp-rooftop-sunset');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
  });

  it('Search back button returns to the screen it was opened from', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/discover'));
    const [firstSearchBar] = screen.getAllByRole('search');
    await fireEvent.press(firstSearchBar);
    expect(utils.getPathname()).toBe('/search');

    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));

    expect(utils.getPathname()).toBe('/discover');
  });

  it('Discover -> Map renders the real map (RoamMap) with pins', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/discover'));

    await fireEvent.press(screen.getByRole('button', { name: 'Voir la carte' }));

    expect(utils.getPathname()).toBe('/map');
    expect(await screen.findByTestId('roam-map')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Balade panoramique' })).toBeOnTheScreen();
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
  });
});
