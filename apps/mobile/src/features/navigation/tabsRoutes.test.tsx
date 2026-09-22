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

  // The scroll-driven collapse-to-bubble morph (previously tested here) is paused for this sprint 3
  // visual-design pass (docs/DECISIONS.md D-41) and will come back once the static pill is validated.
});
