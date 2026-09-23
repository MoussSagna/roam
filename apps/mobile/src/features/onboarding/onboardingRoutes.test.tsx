import { router, type Href } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

import { ONBOARDING_STEPS, ROUTES } from './onboardingFlow';
import { PROFILE_TIMELINE } from './profileCreation';

/**
 * These tests mount the real `src/app` route tree (only the root layout is replaced by a light one
 * without font loading), because mocking `useRouter` cannot tell whether a path has a route file.
 * `AppRoutes` is the exact same guarded stack the app itself renders.
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
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const SPLASH_DURATION_MS = 2600;

/** RNTL 14 renders asynchronously: `renderRouter` returns a promise carrying the router helpers. */
async function renderApp() {
  const utils = renderRouter({ appDir: './src/app', overrides: { _layout: TestLayout } });
  await utils;
  // Not `utils` itself: it is thenable, so an async function would unwrap it and drop the helpers.
  return { getPathname: utils.getPathname };
}

async function openWelcomeFromSplash() {
  const utils = await renderApp();
  expect(utils.getPathname()).toBe('/');
  await act(() => jest.advanceTimersByTimeAsync(SPLASH_DURATION_MS));
  expect(utils.getPathname()).toBe('/welcome');
  return utils;
}

describe('onboarding routes', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('has a route file for every onboarding step', async () => {
    const utils = await renderApp();

    for (const step of ONBOARDING_STEPS) {
      await act(() => router.navigate(ROUTES[step] as Href));
      expect(utils.getPathname()).toBe(ROUTES[step]);
      expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    }
  });

  it('splash → welcome → "Suivant" shows the second onboarding screen', async () => {
    const utils = await openWelcomeFromSplash();

    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));

    expect(utils.getPathname()).toBe('/onboarding/mood');
    expect(screen.getByRole('header')).toHaveTextContent('Quelle est ton humeur aujourd’hui ?');
    expect(screen.getAllByRole('radio')).toHaveLength(9);
  });

  it('splash → welcome → "Passer" shows the final onboarding screen', async () => {
    const utils = await openWelcomeFromSplash();

    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));

    expect(utils.getPathname()).toBe('/onboarding/ready');
    expect(screen.getByRole('header')).toHaveTextContent('Prêt à explorer ?');
  });

  it('going back from the second screen returns to the welcome screen', async () => {
    const utils = await openWelcomeFromSplash();
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));

    // The mockup has no back button on this screen: back is the native gesture / hardware button.
    await act(() => router.back());

    expect(utils.getPathname()).toBe('/welcome');
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeOnTheScreen();
  });

  it('mood → "Suivant" shows the time screen', async () => {
    const utils = await openWelcomeFromSplash();
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));

    expect(utils.getPathname()).toBe('/onboarding/time');
    expect(screen.getByRole('header')).toHaveTextContent('Combien de temps as-tu ?');
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('time → "Suivant" shows the budget screen', async () => {
    const utils = await openWelcomeFromSplash();
    for (let i = 0; i < 3; i++) {
      await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    }

    expect(utils.getPathname()).toBe('/onboarding/budget');
    expect(screen.getByRole('header')).toHaveTextContent('Quel est ton budget ?');
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('budget → "Suivant" shows the location screen', async () => {
    const utils = await openWelcomeFromSplash();
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    }

    expect(utils.getPathname()).toBe('/onboarding/location');
    expect(screen.getByRole('header')).toHaveTextContent('Où souhaites-tu sortir ?');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('location → "Suivant" shows the interests screen', async () => {
    const utils = await openWelcomeFromSplash();
    for (let i = 0; i < 5; i++) {
      await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    }

    expect(utils.getPathname()).toBe('/onboarding/interests');
    expect(screen.getByRole('header')).toHaveTextContent('Qu’est-ce qui t’intéresse ?');
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
  });

  it('"Commencer" ends the onboarding on the home screen', async () => {
    const utils = await openWelcomeFromSplash();
    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));

    // Single `act()`: "Commencer" now also grants the mocked session (`useAuth().login()`), which
    // awaits a fake timer — awaiting the press alone would deadlock on it.
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Commencer' }));
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(utils.getPathname()).toBe('/home');
    // Two live `SearchBar`s on Home since sticky search (D-69) — in-flow + `HomeHeader`'s docked one.
    expect(screen.getAllByText('Explorer un lieu, une activité…').length).toBeGreaterThan(0);
    // The onboarding is replaced, not stacked: back does not return to it.
    expect(router.canGoBack()).toBe(false);
  });

  it('interests → "Suivant" shows the profile creation, which needs nothing from the user', async () => {
    const utils = await openWelcomeFromSplash();
    for (let i = 0; i < 6; i++) {
      await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    }

    expect(utils.getPathname()).toBe('/onboarding/profile-creation');
    expect(screen.getByText('On crée ton profil\nsur mesure')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Suivant' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Passer' })).toBeNull();
  });

  it('walks the whole journey: "Suivant" to the profile creation, then it moves on by itself', async () => {
    const utils = await openWelcomeFromSplash();

    for (const step of ONBOARDING_STEPS.slice(1, ONBOARDING_STEPS.indexOf('profile') + 1)) {
      await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
      expect(utils.getPathname()).toBe(ROUTES[step]);
    }

    await act(() => jest.advanceTimersByTimeAsync(PROFILE_TIMELINE.navigate - 1));
    expect(utils.getPathname()).toBe('/onboarding/profile-creation');
    await act(() => jest.advanceTimersByTimeAsync(1));

    expect(utils.getPathname()).toBe('/onboarding/ready');
    expect(screen.getByRole('header')).toHaveTextContent('Prêt à explorer ?');
    expect(screen.queryByRole('button', { name: 'Suivant' })).toBeNull();
    // The profile creation replaced itself: back from "ready" goes to the interests, not to the loader.
    await act(() => router.back());
    expect(utils.getPathname()).toBe('/onboarding/interests');
  });
});
