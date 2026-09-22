import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

import { AppRoutes } from './AppRoutes';

/**
 * Cross-cutting tests for the mocked session's route protection (sprint 3 "mocked auth session
 * flow"): `AppRoutes`'s `Stack.Protected` guards, not any individual screen. Mounts the real
 * `src/app` route tree, like `authRoutes.test.tsx` / `onboardingRoutes.test.tsx` / `tabsRoutes.test.tsx`
 * (only the root `_layout` is replaced, to skip font loading).
 */
function makeTestLayout(initialIsLoggedIn: boolean) {
  return function TestLayout() {
    return (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ThemeProvider initialPreference="light">
          <AuthProvider initialIsLoggedIn={initialIsLoggedIn}>
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  };
}

async function renderApp(initialIsLoggedIn = false) {
  const utils = renderRouter({
    appDir: './src/app',
    overrides: { _layout: makeTestLayout(initialIsLoggedIn) },
  });
  await utils;
  return { getPathname: utils.getPathname };
}

describe('AppRoutes (mocked session route protection)', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Scenario 1
  it('Welcome → "Se connecter" → back cannot return to Welcome', async () => {
    const utils = await renderApp(false);
    await act(() => router.navigate('/welcome'));

    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
    expect(utils.getPathname()).toBe('/auth');

    // Welcome was replaced, not pushed over: going back (if possible at all — e.g. to the splash)
    // never resurfaces it.
    if (router.canGoBack()) {
      await act(() => router.back());
    }
    expect(utils.getPathname()).not.toBe('/welcome');
  });

  // Scenario 2
  it('Login → sign in → Home → back cannot return to Login', async () => {
    const utils = await renderApp(false);
    await act(() => router.navigate('/auth/login'));

    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'password123');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(utils.getPathname()).toBe('/home');
    expect(router.canGoBack()).toBe(false);
  });

  // Scenario 3
  it('once signed in, the four tabs navigate normally', async () => {
    const utils = await renderApp(true);
    await act(() => router.navigate('/home'));

    await fireEvent.press(screen.getByRole('button', { name: 'Découvrir' }));
    expect(utils.getPathname()).toBe('/discover');

    await fireEvent.press(screen.getByRole('button', { name: 'Favoris' }));
    expect(utils.getPathname()).toBe('/favorites');

    await fireEvent.press(screen.getByRole('button', { name: 'Profil' }));
    expect(utils.getPathname()).toBe('/profile');
  });

  // Scenario 4
  it('Home → Profil → logout → Login, and back cannot return to Home', async () => {
    const utils = await renderApp(true);
    await act(() => router.navigate('/profile'));

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(utils.getPathname()).toBe('/auth/login');
    expect(router.canGoBack()).toBe(false);
  });

  // Scenario 5
  it('an already-logged-in session is not sent through Welcome/Login on navigation', async () => {
    await renderApp(true);

    await act(() => router.navigate('/welcome'));

    // Welcome is guarded out while logged in: navigating to it lands somewhere in the authenticated
    // app instead, never on Welcome itself.
    expect(screen.queryByRole('button', { name: 'Se connecter' })).toBeNull();
  });

  // Scenario 6
  it('a logged-out session cannot reach the authenticated tabs directly', async () => {
    await renderApp(false);

    await act(() => router.navigate('/home'));

    // (tabs) is guarded out while logged out: the Home content never renders.
    expect(screen.queryByText('Explorer un lieu, une activité…')).toBeNull();
  });
});
