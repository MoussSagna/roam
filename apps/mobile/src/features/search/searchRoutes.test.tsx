import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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
  describe('Search <-> SearchMapScreen (sprint 8, /search/map)', () => {
    async function searchRooftop() {
      const utils = await renderApp();
      await act(() => router.navigate({ pathname: '/search', params: { context: 'discover' } }));
      await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), 'rooftop');
      await fireEvent(screen.getByLabelText('Que veux-tu découvrir ?'), 'submitEditing');
      await screen.findByTestId('search-results-list');
      return utils;
    }

    it('Carte opens the dedicated /search/map screen: full-screen map, search field, one Filtres chip', async () => {
      const utils = await searchRooftop();

      await fireEvent.press(screen.getByRole('button', { name: 'Carte' }));

      expect(utils.getPathname()).toBe('/search/map');
      expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
      expect(await screen.findByTestId('roam-map')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Rooftop Sunset' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Mama Shelter' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Filtres' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Trier' })).toBeNull();
    });

    it('the map receives the exact search state: same query, filters and sort', async () => {
      const utils = await searchRooftop();

      await fireEvent.press(screen.getByRole('button', { name: 'Filtres' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Bars & Soirées' }));
      await fireEvent.press(screen.getByRole('button', { name: /Voir \d+ résultats/ }));
      await screen.findByText('1 expériences');

      await fireEvent.press(screen.getByRole('button', { name: 'Carte' }));

      expect(utils.getPathname()).toBe('/search/map');
      // Same query in the (single) field, only the filtered result pinned, the filter chip active.
      const fields = screen.getAllByLabelText('Que veux-tu découvrir ?');
      expect(fields[fields.length - 1].props.value).toBe('rooftop');
      expect(await screen.findByRole('button', { name: 'Rooftop Sunset' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Mama Shelter' })).toBeNull();
      expect(screen.getAllByRole('button', { name: 'Filtres' }).at(-1)).toBeSelected();
    });

    it('back returns to the list with the search, filters and sort untouched — and filters changed on the map carry over', async () => {
      const utils = await searchRooftop();
      await fireEvent.press(screen.getByRole('button', { name: 'Trier' }));
      await fireEvent.press(await screen.findByRole('radio', { name: 'Plus proche' }));

      await fireEvent.press(screen.getByRole('button', { name: 'Carte' }));
      await screen.findByTestId('roam-map');

      // Filter on the map ...
      await fireEvent.press(screen.getAllByRole('button', { name: 'Filtres' }).at(-1)!);
      await fireEvent.press(await screen.findByRole('button', { name: 'Bars & Soirées' }));
      await fireEvent.press(screen.getByRole('button', { name: /Voir \d+ résultats/ }));
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Mama Shelter' })).toBeNull();
      });

      // ... then come back to the list.
      await fireEvent.press(screen.getAllByRole('button', { name: 'Retour' }).at(-1)!);

      await waitFor(() => expect(utils.getPathname()).toBe('/search'));
      expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
      expect(screen.getByLabelText('Que veux-tu découvrir ?').props.value).toBe('rooftop');
      expect(screen.getByText('1 expériences')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Trier' })).toBeSelected();
      expect(screen.getByRole('button', { name: 'Filtres' })).toBeSelected();
      expect(screen.getByTestId('search-results-list')).toBeOnTheScreen();
    });

    it('a pin -> "Voir le lieu" opens Experience Detail', async () => {
      const utils = await searchRooftop();
      await fireEvent.press(screen.getByRole('button', { name: 'Carte' }));

      await fireEvent.press(await screen.findByRole('button', { name: 'Rooftop Sunset' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Voir le lieu' }));

      expect(utils.getPathname()).toBe('/experience/exp-rooftop-sunset');
      expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    });
  });
});
