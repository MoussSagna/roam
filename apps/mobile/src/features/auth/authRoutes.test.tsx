import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

/**
 * Mounts the real `src/app` route tree (see `onboardingRoutes.test.tsx`), because mocking
 * `useRouter` cannot tell whether a path has a route file.
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

const SPLASH_DURATION_MS = 2600;

async function renderApp() {
  const utils = renderRouter({ appDir: './src/app', overrides: { _layout: TestLayout } });
  await utils;
  return { getPathname: utils.getPathname };
}

describe('authentication routes', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reaches the entry screen from the welcome screen\'s "Se connecter" link', async () => {
    const utils = await renderApp();
    await act(() => jest.advanceTimersByTimeAsync(SPLASH_DURATION_MS));
    expect(utils.getPathname()).toBe('/welcome');

    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(utils.getPathname()).toBe('/auth');
    expect(screen.getByRole('header')).toHaveTextContent('ROAM');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
  });

  it('"Se connecter" on the entry screen opens the login placeholder without crashing', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth'));

    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(utils.getPathname()).toBe('/auth/login');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByText('Écran à venir')).toBeOnTheScreen();
  });

  it('"Créer un compte" on the entry screen opens the register placeholder without crashing', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth'));

    await fireEvent.press(screen.getByRole('button', { name: 'Créer un compte' }));

    expect(utils.getPathname()).toBe('/auth/register');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
  });

  it("the login placeholder's back button returns to the entry screen", async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth'));
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));

    expect(utils.getPathname()).toBe('/auth');
  });
});
