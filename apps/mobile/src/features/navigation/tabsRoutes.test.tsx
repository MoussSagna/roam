import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

/**
 * Mounts the real `src/app` route tree (see `onboardingRoutes.test.tsx` / `authRoutes.test.tsx`),
 * because mocking `useRouter` cannot tell whether a path has a route file.
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
        <Stack screenOptions={{ headerShown: false }} />
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
  { label: 'Accueil', path: '/home', title: "Qu'est-ce que tu veux faire aujourd'hui ?" },
  { label: 'Découvrir', path: '/discover', title: 'Découvrir' },
  { label: 'Favoris', path: '/favorites', title: 'Mes favoris' },
  { label: 'Profil', path: '/profile', title: 'Profil' },
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
      expect(screen.getByRole('header')).toHaveTextContent(tab.title);
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
    expect(screen.queryByRole('button', { name: 'Accueil' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Agrandir la barre de navigation' }),
    ).toBeOnTheScreen();
  });

  it('expands the tab bar back on scroll up', async () => {
    await renderApp();
    await act(() => router.navigate('/home'));

    await scrollTo('home-scroll', 200);
    expect(
      screen.getByRole('button', { name: 'Agrandir la barre de navigation' }),
    ).toBeOnTheScreen();

    await scrollTo('home-scroll', 60);

    expect(screen.getByRole('button', { name: 'Accueil' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Accueil' })).toBeSelected();
  });

  it('tapping the collapsed bubble redeploys the tab bar without navigating away', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/favorites'));
    await scrollTo('favorites-scroll', 200);

    await fireEvent.press(screen.getByRole('button', { name: 'Agrandir la barre de navigation' }));

    expect(utils.getPathname()).toBe('/favorites');
    expect(screen.getByRole('button', { name: 'Favoris' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Favoris' })).toBeSelected();
  });
});
