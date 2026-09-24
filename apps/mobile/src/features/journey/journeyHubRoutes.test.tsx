import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { repositories } from '@/services';
import { ThemeProvider } from '@/theme';
import type { JourneyDraft } from '@/types';

import {
  completeCurrentStep,
  createJourney,
  resetJourneyStoreForTests,
  startJourney,
} from './journeyStore';
import { BUILD_TIMELINE } from './lib/building';

/** Real route tree (same harness as `journeyRoutes.test.tsx`): the Parcours tab's hub, sprint 11. */
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

const DRAFT: JourneyDraft = {
  context: { mood: 'calm', duration: 'halfDay', budget: 'medium' },
  startLocation: {
    kind: 'current',
    label: 'Ma position',
    coordinates: { latitude: 48.8674, longitude: 2.3637 },
  },
  startTime: '18:00',
  experienceIds: ['exp-slow-afternoon', 'exp-picnic-park'],
};

let idSeed = Date.now();
/** Distinct ids for journeys created in the same millisecond. */
async function seedJourney(title: string) {
  idSeed += 1000;
  jest.spyOn(Date, 'now').mockReturnValueOnce(idSeed);
  return createJourney(DRAFT, title);
}

async function finishCurrentJourney() {
  await startJourney();
  let journey = await repositories.journeys.getCurrent();
  while (journey?.status === 'active') {
    await completeCurrentStep();
    journey = await repositories.journeys.getCurrent();
  }
}

/** The tab stays mounted under pushed screens: the last match is the screen on top. */
const topButton = (name: string | RegExp) => screen.getAllByRole('button', { name }).at(-1)!;
const press = (name: string | RegExp) => fireEvent.press(topButton(name));
const pressRadio = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));

/** "On prépare ton parcours" (sprint 12, D-84) plays ~3.6 s before the suggestions: "Continuer" on
 * "On part d'où ?", then fast-forward it (fake timers only for that step). */
async function continueThroughBuilding() {
  jest.useFakeTimers();
  try {
    await press('Continuer');
    expect(screen.getByTestId('journey-building')).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTimeAsync(BUILD_TIMELINE.navigate));
  } finally {
    jest.useRealTimers();
  }
}

/** The whole creation flow with its defaults, from the intro to "Créer mon parcours". */
async function createThroughFlow() {
  await press('Commencer');
  await pressRadio('Chill');
  await press('Continuer');
  await pressRadio('Demi-journée');
  await press('Continuer');
  await pressRadio('Budget moyen');
  await press('Continuer');
  await pressRadio('Ma position actuelle');
  await continueThroughBuilding();
  await screen.findByTestId('journey-suggestions-list');
  await press('Construire mon parcours');
  await press('Créer mon parcours');
}

jest.setTimeout(20_000);

describe('Parcours tab — journey hub (sprint 11)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
    await repositories.journeys.clear();
    resetJourneyStoreForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('state 3 — nothing at all: an empty state whose CTA opens the creation flow', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));

    expect(await screen.findByTestId('journey-hub-empty')).toBeOnTheScreen();
    expect(screen.getByRole('header')).toHaveTextContent('Ton prochain parcours commence ici');
    expect(
      screen.getByText('Crée une sortie personnalisée et laisse ROAM construire ton itinéraire.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('current-journey-card')).toBeNull();
    expect(screen.queryByTestId('journey-history-list')).toBeNull();

    await press('Créer mon parcours');
    expect(utils.getPathname()).toBe('/journey/create');
    expect(screen.getByText('Créons ton parcours')).toBeOnTheScreen();
  });

  it('state 1 — a journey in progress comes first; "Continuer mon parcours" opens it, back returns', async () => {
    const journey = await seedJourney('Paris au coucher du soleil');
    await startJourney();
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));

    const card = await screen.findByTestId('current-journey-card');
    expect(screen.getByRole('header')).toHaveTextContent('Paris au coucher du soleil');
    // Hero (sprint 12, D-85): state, title, experiences · duration · distance, progress.
    expect(within(card).getByText('Parcours en cours')).toBeOnTheScreen();
    expect(within(card).getByText('2 expériences')).toBeOnTheScreen();
    expect(within(card).getByText('0 / 2 étapes')).toBeOnTheScreen();
    expect(within(card).getByTestId('journey-progress-bar')).toBeOnTheScreen();
    // Edge-to-edge hero from the very top: its height includes the status bar (top inset 47).
    expect(within(card).getByTestId('current-journey-hero')).toHaveStyle({ height: 47 + 320 });
    expect(within(card).getByText('Étape actuelle')).toBeOnTheScreen();
    expect(within(card).getByTestId('journey-mini-map')).toBeOnTheScreen();
    expect(within(card).getByText('Prochaine étape')).toBeOnTheScreen();
    expect(screen.queryByTestId('journey-hub-empty')).toBeNull();

    await fireEvent.press(within(card).getByRole('button', { name: 'Continuer mon parcours' }));
    expect(utils.getPathname()).toBe(`/journey/${journey.id}`);
    // The existing active journey screen, not a copy: it progresses the step.
    expect(await screen.findByText('Étape 1 sur 2')).toBeOnTheScreen();

    await press('Retour');
    expect(utils.getPathname()).toBe('/journey');
    expect(screen.getByTestId('current-journey-card')).toBeOnTheScreen();
  });

  it('state 1 — only the journey in progress: no history, no "Créer un nouveau parcours"', async () => {
    await seedJourney('Premier');
    await finishCurrentJourney();
    await seedJourney('Second');
    await renderApp();
    await act(() => router.navigate('/journey'));

    const card = await screen.findByTestId('current-journey-card');
    expect(within(card).getByText('Second')).toBeOnTheScreen();
    expect(within(card).getByRole('button', { name: 'Continuer mon parcours' })).toBeOnTheScreen();
    // A past journey exists, but this state is only about the current one.
    expect(screen.queryByTestId('journey-history-list')).toBeNull();
    expect(screen.queryByText('Mes parcours précédents')).toBeNull();
    expect(screen.queryByText('Premier')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Créer un nouveau parcours' })).toBeNull();
    expect(screen.queryByTestId('journey-hub-empty')).toBeNull();
  });

  it('state 2 — no journey in progress, some completed: "Mes parcours", history, create', async () => {
    const journey = await seedJourney('Paris au coucher du soleil');
    await finishCurrentJourney();
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));

    const list = await screen.findByTestId('journey-history-list');
    expect(screen.getAllByRole('header')[0]).toHaveTextContent('Mes parcours');
    expect(screen.getByText('Mes parcours précédents')).toBeOnTheScreen();
    expect(screen.queryByTestId('current-journey-card')).toBeNull();
    const item = within(list).getByRole('button', {
      name: 'Ouvrir le parcours Paris au coucher du soleil',
    });
    expect(within(item).getByText(/^2 expériences · /)).toBeOnTheScreen();
    expect(within(item).getByText(/^Terminé le /)).toBeOnTheScreen();
    expect(within(item).getByText('Terminé')).toBeOnTheScreen();

    // A past journey opens on the existing journey screen, in its completed state.
    await fireEvent.press(item);
    expect(utils.getPathname()).toBe(`/journey/${journey.id}`);
    // Title + progress label.
    expect((await screen.findAllByText('Parcours terminé')).length).toBeGreaterThan(0);
    await press('Retour');

    await press('Créer un nouveau parcours');
    expect(utils.getPathname()).toBe('/journey/create');
  });

  it('an older completed journey still opens on /journey/[id] while another one is in progress', async () => {
    const past = await seedJourney('Premier');
    await finishCurrentJourney();
    await seedJourney('Second');
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));
    await screen.findByTestId('current-journey-card');

    await act(() => router.push({ pathname: '/journey/[id]', params: { id: past.id } }));
    expect(utils.getPathname()).toBe(`/journey/${past.id}`);
    expect((await screen.findAllByText('Parcours terminé')).length).toBeGreaterThan(0);
    // Another journey is under way: no "Créer un nouveau parcours" on a past one.
    expect(screen.queryByRole('button', { name: 'Créer un nouveau parcours' })).toBeNull();
  });

  it('from the tab: create → active → completed → in the history → a new one becomes active, no duplicate', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));
    await screen.findByTestId('journey-hub-empty');

    // 1. Create from the empty state.
    await press('Créer mon parcours');
    await createThroughFlow();
    await waitFor(() => expect(utils.getPathname()).toMatch(/^\/journey\/journey-/));
    const first = await repositories.journeys.getCurrent();
    expect(first?.status).toBe('active');

    // 2. Back on the tab, it is the journey in progress.
    await press('Retour');
    expect(utils.getPathname()).toBe('/journey');
    expect(await screen.findByTestId('current-journey-card')).toBeOnTheScreen();

    // 3. Completed → it moves to the history.
    await act(() => finishCurrentJourney());
    const list = await screen.findByTestId('journey-history-list');
    expect(within(list).getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByTestId('current-journey-card')).toBeNull();

    // 4. A new one from the hub: it becomes active, the first stays in the history, once.
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_000);
    await press('Créer un nouveau parcours');
    await createThroughFlow();
    await waitFor(() => expect(utils.getPathname()).not.toBe(`/journey/${first!.id}`));
    await waitFor(() => expect(utils.getPathname()).toMatch(/^\/journey\/journey-/));
    const second = await repositories.journeys.getCurrent();
    expect(second?.id).not.toBe(first?.id);
    expect(second?.status).toBe('active');
    const history = await repositories.journeys.listCompleted();
    expect(history.map((journey) => journey.id)).toEqual([first!.id]);

    await press('Retour');
    expect(utils.getPathname()).toBe('/journey');
    expect(await screen.findByTestId('current-journey-card')).toBeOnTheScreen();
    // In progress: the hub shows only the current journey (the first one is still in the history).
    expect(screen.queryByTestId('journey-history-list')).toBeNull();
  });

  it('the journey state survives a restart (persisted through the repository)', async () => {
    await seedJourney('Paris au coucher du soleil');
    // A cold start: the store reloads from the repository.
    resetJourneyStoreForTests();
    await renderApp();
    await act(() => router.navigate('/journey'));

    expect(await screen.findByTestId('current-journey-card')).toBeOnTheScreen();
  });

  it('switching tabs keeps the hub reachable and in sync', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/home'));

    await press('Parcours');
    expect(utils.getPathname()).toBe('/journey');
    await screen.findByTestId('journey-hub-empty');

    await press('Profil');
    expect(utils.getPathname()).toBe('/profile');
    await press('Parcours');
    expect(utils.getPathname()).toBe('/journey');
    expect(screen.getByRole('button', { name: 'Parcours' })).toBeSelected();
  });
});
