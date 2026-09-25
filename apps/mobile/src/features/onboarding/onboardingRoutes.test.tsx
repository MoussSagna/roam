import { router, type Href } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

import { ONBOARDING_STEPS, PAGER_STEPS, ROUTES } from './onboardingFlow';
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

/**
 * The questions are the slides of one pager on `/onboarding/mood`, between a fixed "Passer" and a fixed
 * footer. Jest has no native layout or scrolling, so these send what the list reports: its size, then a
 * stream of scroll events (the new slide renders and becomes "viewable" on timers).
 */
async function layOutPager() {
  const { width, height } = Dimensions.get('window');
  const pager = screen.getByTestId('onboarding-pager');
  await fireEvent(pager, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
  await fireEvent(pager, 'contentSizeChange', width * PAGER_STEPS.length, height);
}

async function scrollPagerTo(index: number) {
  const { width, height } = Dimensions.get('window');
  for (let i = 0; i < 2; i++) {
    await fireEvent.scroll(screen.getByTestId('onboarding-pager'), {
      nativeEvent: {
        contentOffset: { x: index * width, y: 0 },
        contentSize: { width: width * PAGER_STEPS.length, height },
        layoutMeasurement: { width, height },
      },
    });
    await act(() => jest.advanceTimersByTimeAsync(500));
  }
}

/** One answer per question slide, in order (each question needs one to move on, D-88). */
const ANSWERS = ['Curieux', '1 à 2 h', 'Gratuit', 'Autour de moi'];

type JsonNode = { type: string; props: Record<string, unknown>; children: JsonNode[] | null };

/**
 * `gestureEnabled` of the screen on top of the stack, as handed to the native screen
 * (`react-native-screens`' `RNSScreen`: one per mounted screen, the top one last).
 */
function topScreenGestureEnabled() {
  const nativeScreens: JsonNode[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const element = node as JsonNode;
    if (element.type === 'RNSScreen') nativeScreens.push(element);
    element.children?.forEach(walk);
  };
  walk(screen.toJSON());
  return nativeScreens.at(-1)?.props.gestureEnabled;
}

async function openPager() {
  const utils = await openWelcomeFromSplash();
  await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
  await layOutPager();
  return utils;
}

/** Welcome → the pager, then answer and "Suivant" through the slides up to `step`. */
async function openSlide(step: (typeof PAGER_STEPS)[number]) {
  const utils = await openPager();
  for (let index = 1; index <= PAGER_STEPS.indexOf(step); index++) {
    await fireEvent.press(screen.getByRole('radio', { name: ANSWERS[index - 1] }));
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    await scrollPagerTo(index);
  }
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
      // The questions after the first one bring back to the start of the pager (D-88).
      const inPagerAfterFirst = (PAGER_STEPS as readonly string[]).indexOf(step) > 0;
      expect(utils.getPathname()).toBe(inPagerAfterFirst ? ROUTES.mood : ROUTES[step]);
      expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    }
  });

  it('splash → welcome → "Suivant" shows the second onboarding screen', async () => {
    const utils = await openPager();

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

  it('mood → "Suivant" shows the time slide, on the same route', async () => {
    const utils = await openSlide('time');

    // One pager for every question: the route does not change, the slide does.
    expect(utils.getPathname()).toBe('/onboarding/mood');
    expect(screen.getByRole('header')).toHaveTextContent('Combien de temps as-tu ?');
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('time → "Suivant" shows the budget slide', async () => {
    const utils = await openSlide('budget');

    expect(utils.getPathname()).toBe('/onboarding/mood');
    expect(screen.getByRole('header')).toHaveTextContent('Quel est ton budget ?');
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('budget → "Suivant" shows the location slide', async () => {
    const utils = await openSlide('location');

    expect(utils.getPathname()).toBe('/onboarding/mood');
    expect(screen.getByRole('header')).toHaveTextContent('Où souhaites-tu sortir ?');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('location → "Suivant" shows the interests slide', async () => {
    const utils = await openSlide('interests');

    expect(utils.getPathname()).toBe('/onboarding/mood');
    expect(screen.getByRole('header')).toHaveTextContent('Qu’est-ce qui t’intéresse ?');
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
  });

  it('the other question routes bring back to the start of the pager', async () => {
    const utils = await renderApp();

    for (const step of PAGER_STEPS.slice(1)) {
      await act(() => router.navigate(ROUTES[step] as Href));
      expect(utils.getPathname()).toBe('/onboarding/mood');
      expect(screen.getByTestId('onboarding-pager')).toBeOnTheScreen();
    }
  });

  it('"Passer" from a slide still shows the final onboarding screen', async () => {
    const utils = await openSlide('budget');

    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));

    expect(utils.getPathname()).toBe('/onboarding/ready');
    expect(screen.getByRole('header')).toHaveTextContent('Prêt à explorer ?');
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

  it('interests (last slide) → "Suivant" shows the profile creation, which needs nothing from the user', async () => {
    const utils = await openSlide('interests');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Nature' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));

    expect(utils.getPathname()).toBe('/onboarding/profile-creation');
    expect(screen.getByText('On crée ton profil\nsur mesure')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Suivant' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Passer' })).toBeNull();
  });

  it('walks the whole journey: through the slides to the profile creation, then it moves on by itself', async () => {
    const utils = await openSlide('interests');
    expect(utils.getPathname()).toBe('/onboarding/mood');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Nature' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(utils.getPathname()).toBe(ROUTES.profile);

    await act(() => jest.advanceTimersByTimeAsync(PROFILE_TIMELINE.navigate - 1));
    expect(utils.getPathname()).toBe('/onboarding/profile-creation');
    await act(() => jest.advanceTimersByTimeAsync(1));

    expect(utils.getPathname()).toBe('/onboarding/ready');
    expect(screen.getByRole('header')).toHaveTextContent('Prêt à explorer ?');
    expect(screen.queryByRole('button', { name: 'Suivant' })).toBeNull();
    // The profile creation replaced itself: back from "ready" returns to the pager, still on the
    // interests slide, not to the loader.
    await act(() => router.back());
    expect(utils.getPathname()).toBe('/onboarding/mood');
    expect(screen.getByRole('header')).toHaveTextContent('Qu’est-ce qui t’intéresse ?');
  });

  it('keeps the native swipe-back off on the pager (its own horizontal swipe moves between slides)', async () => {
    await openPager();
    expect(topScreenGestureEnabled()).toBe(false);

    for (const step of PAGER_STEPS.slice(1)) {
      await act(() => router.navigate(ROUTES[step] as Href));
      expect(topScreenGestureEnabled()).toBe(false);
    }

    // The screens outside the pager keep their documented exception (no back button, D-53).
    await act(() => router.navigate(ROUTES.ready as Href));
    expect(topScreenGestureEnabled()).toBe(true);
  });
});
