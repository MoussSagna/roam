import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { repositories } from '@/services';
import { ThemeProvider } from '@/theme';

import { resetJourneyStoreForTests } from './journeyStore';
import { BUILD_TIMELINE } from './lib/building';

/** Real route tree (same harness as `journeyRoutes.test.tsx`), with fake timers like the onboarding's
 * route tests: "On prépare ton parcours", sprint 12. */
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

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const pressRadio = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const advance = (ms: number) => act(() => jest.advanceTimersByTimeAsync(ms));

/** Intro → context → "On part d'où ?" (République), then "Continuer". */
async function continueFromLocation() {
  const utils = await renderApp();
  // Let the splash (`/`, 2.6 s timer) hand over to Home first, or it fires mid-sequence.
  await advance(3000);
  expect(utils.getPathname()).toBe('/home');
  await act(() => router.push('/journey/create'));
  await press('Commencer');
  await pressRadio('Chill');
  await press('Continuer');
  await pressRadio('Demi-journée');
  await press('Continuer');
  await pressRadio('Budget moyen');
  await press('Continuer');
  await pressRadio('Choisir un lieu');
  await press('République');
  await press('Continuer');
  return utils;
}

jest.setTimeout(20_000);

describe('Journey creation — "On prépare ton parcours" (sprint 12)', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await act(() => i18n.changeLanguage('fr'));
    await repositories.journeys.clear();
    resetJourneyStoreForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('comes right after "On part d\'où ?", with nothing to press', async () => {
    const utils = await continueFromLocation();

    expect(utils.getPathname()).toBe('/journey/create/building');
    expect(screen.getByText('On prépare ton parcours')).toBeOnTheScreen();
    expect(screen.getByText('On assemble les meilleures expériences pour toi…')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'ROAM prépare ton parcours' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continuer' })).toBeNull();
  });

  it("shows the draft's own values, one line at a time, then the journey being built", async () => {
    await continueFromLocation();

    // Nothing at first: the lines come in one by one.
    expect(screen.queryByTestId('build-line-start')).toBeNull();

    await advance(BUILD_TIMELINE.start);
    expect(screen.getByText('Départ : République')).toBeOnTheScreen();
    expect(screen.queryByTestId('build-line-mood')).toBeNull();

    await advance(BUILD_TIMELINE.mood - BUILD_TIMELINE.start);
    expect(screen.getByText('Ambiance chill')).toBeOnTheScreen();
    await advance(BUILD_TIMELINE.duration - BUILD_TIMELINE.mood);
    expect(screen.getByText('Temps disponible : Demi-journée')).toBeOnTheScreen();
    await advance(BUILD_TIMELINE.budget - BUILD_TIMELINE.duration);
    expect(screen.getByText('Budget moyen')).toBeOnTheScreen();

    await advance(BUILD_TIMELINE.building - BUILD_TIMELINE.budget);
    expect(screen.getByText('Construction de ton parcours')).toBeOnTheScreen();
    expect(screen.getByTestId('build-pending-building')).toBeOnTheScreen();

    await advance(BUILD_TIMELINE.done - BUILD_TIMELINE.building);
    expect(screen.getByText('Ton parcours est prêt')).toBeOnTheScreen();
    expect(screen.getByTestId('build-done-building')).toBeOnTheScreen();
  });

  it('moves on to the suggestions by itself; no journey is created, the draft is kept', async () => {
    const utils = await continueFromLocation();

    await advance(BUILD_TIMELINE.navigate - 1);
    expect(utils.getPathname()).toBe('/journey/create/building');
    // Still a draft: nothing saved while building.
    expect(await repositories.journeys.getCurrent()).toBeNull();

    await advance(1);
    expect(utils.getPathname()).toBe('/journey/create/suggestions');
    expect(await screen.findByTestId('journey-suggestions-list')).toBeOnTheScreen();
    // The suggestions are built from the same draft (ambiance chill).
    expect(
      screen.getAllByText(/Parce que tu as envie de quelque chose de chill/).length,
    ).toBeGreaterThan(0);
    expect(await repositories.journeys.getCurrent()).toBeNull();

    // It replaced itself: back returns to "On part d'où ?", with République still chosen.
    await press('Retour');
    expect(utils.getPathname()).toBe('/journey/create/location');
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeEnabled();
  });

  it('leaving it (Android back) stops the sequence', async () => {
    const utils = await continueFromLocation();
    await advance(1000);

    await act(() => router.back());
    expect(utils.getPathname()).toBe('/journey/create/location');
    await advance(10_000);
    expect(utils.getPathname()).toBe('/journey/create/location');
  });
});
