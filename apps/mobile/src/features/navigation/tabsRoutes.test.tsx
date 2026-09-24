import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

/**
 * Mounts the real `src/app` route tree (see `onboardingRoutes.test.tsx` / `authRoutes.test.tsx`),
 * because mocking `useRouter` cannot tell whether a path has a route file. `(tabs)` is gated behind
 * a mocked session (`AppRoutes`), so these tests start already logged in.
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

const TABS = [
  // Home's one `header` is the hero carousel's active slide title, not a static page title
  // (sprint 5): `exp-dinner-view` ("Dîners avec vue") is the mock data's first hero experience.
  { label: 'Accueil', path: '/home', title: 'Dîners avec vue' },
  { label: 'Découvrir', path: '/discover', title: 'Découvrir' },
  // Sprint 11: "Parcours" replaced "Favoris" in the bar. With no journey at all the hub shows its
  // empty state, whose header is its title.
  { label: 'Parcours', path: '/journey', title: 'Ton prochain parcours commence ici' },
  // Profile has no static page title in the body (only the sticky reveal header's, off-screen at rest).
  { label: 'Profil', path: '/profile', title: null },
] as const;

function scrollTo(testID: string, y: number) {
  return fireEvent.scroll(screen.getByTestId(testID), { nativeEvent: { contentOffset: { y } } });
}

describe('main navigation (tabs)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('has a route for each of the four tabs', async () => {
    const utils = await renderApp();

    for (const tab of TABS) {
      await act(() => router.navigate(tab.path));
      expect(utils.getPathname()).toBe(tab.path);
      expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    }
  });

  it('shows the floating tab bar with the right tab marked active on each screen', async () => {
    const utils = await renderApp();

    for (const tab of TABS) {
      await act(() => router.navigate(tab.path));
      expect(utils.getPathname()).toBe(tab.path);
      if (tab.title) {
        // The journey hub loads its store first (async), so wait for the header.
        expect(await screen.findByRole('header')).toHaveTextContent(tab.title);
      } else {
        expect(screen.queryByRole('header')).toBeNull();
      }
      expect(screen.getByRole('button', { name: tab.label })).toBeSelected();
    }
  });

  it('tapping a tab navigates to its screen and keeps the tab bar in sync', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/home'));

    await fireEvent.press(screen.getByRole('button', { name: 'Découvrir' }));

    expect(utils.getPathname()).toBe('/discover');
    expect(screen.getByRole('header')).toHaveTextContent('Découvrir');
    expect(screen.getByRole('button', { name: 'Découvrir' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Accueil' })).not.toBeSelected();
  });

  it('collapses the tab bar into a bubble on scroll down, and the bubble shows the active tab', async () => {
    await renderApp();
    await act(() => router.navigate('/discover'));

    await scrollTo('discover-scroll', 200);

    expect(screen.queryByRole('button', { name: 'Découvrir' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Agrandir la barre de navigation' })).toBeVisible();
  });

  it('expands the tab bar back once the scroll reaches the top', async () => {
    await renderApp();
    await act(() => router.navigate('/home'));

    await scrollTo('home-scroll', 200);
    expect(screen.getByRole('button', { name: 'Agrandir la barre de navigation' })).toBeVisible();

    // A small scroll up (still not at the top) is not enough to expand it back — avoids flip-flopping.
    await scrollTo('home-scroll', 150);
    expect(screen.getByRole('button', { name: 'Agrandir la barre de navigation' })).toBeVisible();

    await scrollTo('home-scroll', 0);
    expect(screen.getByRole('button', { name: 'Accueil' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accueil' })).toBeSelected();
  });

  it('tapping the collapsed bubble redeploys the tab bar without navigating away', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));
    await screen.findByTestId('journey-hub-empty');
    await scrollTo('journey-hub-scroll', 200);

    await fireEvent.press(screen.getByRole('button', { name: 'Agrandir la barre de navigation' }));

    expect(utils.getPathname()).toBe('/journey');
    expect(screen.getByRole('button', { name: 'Parcours' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Parcours' })).toBeSelected();
  });

  it('shows Parcours instead of Favoris in the bar, in order', async () => {
    await renderApp();
    await act(() => router.navigate('/home'));

    const labels = screen
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel)
      .filter((label) => ['Accueil', 'Découvrir', 'Parcours', 'Favoris', 'Profil'].includes(label));
    expect(labels).toEqual(['Accueil', 'Découvrir', 'Parcours', 'Profil']);
  });

  it('keeps the /favorites route (not deleted, only out of the tab bar)', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/favorites'));

    expect(utils.getPathname()).toBe('/favorites');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByRole('header')).toHaveTextContent('Mes favoris');
    expect(screen.queryByRole('button', { name: 'Favoris' })).toBeNull();
  });
});
