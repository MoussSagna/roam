import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { repositories } from '@/services';
import { ThemeProvider } from '@/theme';

import {
  addExperienceToJourney,
  createJourney,
  removeJourneyStep,
  resetJourneyStoreForTests,
} from './journeyStore';
import { BUILD_TIMELINE } from './lib/building';

/** Real route tree (same harness as `searchRoutes.test.tsx`), sprint 10 journey flow. */
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

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const pressRadio = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));

/** Intro → context (3 questions) → starting point → suggestions. */
async function goToSuggestions() {
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
}

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

const selectedSuggestions = () =>
  screen.getAllByRole('button', { name: /^Retirer .* du parcours$/ });

// These walk the whole real route tree through up to seven screens; under coverage with parallel
// suites the first one (cold module load) can pass Jest's 5 s default.
jest.setTimeout(20_000);

describe('Journey creation flow (sprint 10)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
    await repositories.journeys.clear();
    resetJourneyStoreForTests();
  });

  it('creates a journey from A to Z: DRAFT stays unsaved until "Créer mon parcours", then ACTIVE', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/home'));
    await act(() => router.push('/journey/create'));

    expect(utils.getPathname()).toBe('/journey/create');
    expect(screen.getByText('Créons ton parcours')).toBeOnTheScreen();

    // Context: "Continuer" stays disabled until the question is answered.
    await press('Commencer');
    expect(utils.getPathname()).toBe('/journey/create/context');
    expect(screen.getByText("Quelle ambiance tu veux aujourd'hui ?")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    await pressRadio('Chill');
    expect(screen.getByRole('radio', { name: 'Chill' })).toBeChecked();
    await press('Continuer');
    expect(screen.getByText('Combien de temps tu as ?')).toBeOnTheScreen();
    await pressRadio('Demi-journée');
    await press('Continuer');
    expect(screen.getByText('Quel budget ?')).toBeOnTheScreen();
    await pressRadio('Budget moyen');
    await press('Continuer');

    // Starting point.
    expect(utils.getPathname()).toBe('/journey/create/location');
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    await pressRadio('Choisir un lieu');
    await press('République');
    expect(screen.getByTestId('journey-map')).toBeOnTheScreen();
    await continueThroughBuilding();

    // Suggestions: ROAM pre-selects some, each card explains why.
    expect(utils.getPathname()).toBe('/journey/create/suggestions');
    await screen.findByTestId('journey-suggestions-list');
    expect(screen.getByText("Voici ce qu'on a imaginé pour toi")).toBeOnTheScreen();
    const preselected = selectedSuggestions().length;
    expect(preselected).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Parce que tu as envie de quelque chose de chill/).length,
    ).toBeGreaterThan(0);

    // Nothing saved while drafting.
    expect(await repositories.journeys.getCurrent()).toBeNull();

    // Add one more.
    const [firstAdd] = screen.getAllByRole('button', { name: /^Ajouter .* au parcours$/ });
    await fireEvent.press(firstAdd);
    expect(selectedSuggestions()).toHaveLength(preselected + 1);

    await press('Construire mon parcours');
    expect(utils.getPathname()).toBe('/journey/create/builder');
    const timeline = screen.getByTestId('journey-timeline');
    expect(within(timeline).getAllByRole('button', { name: /^Ouvrir / })).toHaveLength(
      preselected + 1,
    );

    // Sprint 12 (D-86): "Ton parcours" is the last step — its CTA creates the journey.
    expect(screen.getByText('Ton parcours')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Voir mon parcours' })).toBeNull();
    await press('Créer mon parcours');

    await waitFor(() => expect(utils.getPathname()).toMatch(/^\/journey\/journey-/));
    const saved = await repositories.journeys.getCurrent();
    expect(saved?.status).toBe('active');
    expect(saved?.steps).toHaveLength(preselected + 1);
    expect(saved?.startLocation.label).toBe('République');
    expect(saved?.context).toEqual({ mood: 'calm', duration: 'halfDay', budget: 'medium' });
    expect(await screen.findByText('Mon parcours')).toBeOnTheScreen();
    // Started at creation: step 1 is current, no "Commencer".
    expect(screen.getByText(`Étape 1 sur ${preselected + 1}`)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Commencer' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Continuer mon parcours' })).toBeOnTheScreen();

    // The creation flow is gone from history: back returns to Home, not to the builder.
    await press('Retour');
    expect(utils.getPathname()).toBe('/home');
  });

  it('builder: reorders and removes steps', async () => {
    await renderApp();
    await act(() => router.push('/journey/create'));
    await goToSuggestions();
    const names = () =>
      within(screen.getByTestId('journey-timeline'))
        .getAllByRole('button', { name: /^Ouvrir / })
        .map((node) => node.props.accessibilityLabel as string);

    await press('Construire mon parcours');
    const before = names();
    expect(before.length).toBeGreaterThan(1);

    await fireEvent.press(
      screen.getByRole('button', { name: `Descendre ${before[0].replace('Ouvrir ', '')}` }),
    );
    expect(names()).toEqual([before[1], before[0], ...before.slice(2)]);

    await fireEvent.press(
      screen.getByRole('button', { name: `Retirer ${before[1].replace('Ouvrir ', '')}` }),
    );
    expect(names()).toEqual([before[0], ...before.slice(2)]);
  });

  it('opened from an experience, that experience starts in the selection', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/experience/exp-lake-hike'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Créer mon parcours' }));
    expect(utils.getPathname()).toBe('/journey/create');

    await goToSuggestions();
    expect(
      screen.getByRole('button', { name: 'Retirer Randonnée au lac bleu du parcours' }),
    ).toBeOnTheScreen();
  });

  it('leaving: no question asked before any input; a confirmation once something was chosen', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/home'));

    // Nothing entered yet: "Annuler" leaves at once.
    await act(() => router.push('/journey/create'));
    await press('Annuler');
    expect(utils.getPathname()).toBe('/home');
    expect(screen.queryByText('Quitter la création ?')).toBeNull();

    // Something entered: asked first; "Continuer" stays.
    await act(() => router.push('/journey/create'));
    await press('Commencer');
    await pressRadio('Gourmand');
    await press('Quitter la création');
    expect(screen.getByText('Quitter la création ?')).toBeOnTheScreen();
    expect(screen.getByText("Ton parcours n'est pas encore créé.")).toBeOnTheScreen();
    // The dialog's "Continuer" (stay) is the last one; the screen's own sits behind it.
    const continueButtons = screen.getAllByRole('button', { name: 'Continuer' });
    await fireEvent.press(continueButtons[continueButtons.length - 1]);
    await waitFor(() => expect(screen.queryByText('Quitter la création ?')).toBeNull());
    expect(utils.getPathname()).toBe('/journey/create/context');

    // "Quitter" leaves the whole flow, and nothing was saved.
    await press('Quitter la création');
    await press('Quitter');
    await waitFor(() => expect(utils.getPathname()).toBe('/home'));
    expect(await repositories.journeys.getCurrent()).toBeNull();
  });

  it('with an active journey, Experience detail adds to it — once — and links to it', async () => {
    const utils = await renderApp();
    await act(() => router.push('/journey/create'));
    await goToSuggestions();
    await press('Construire mon parcours');
    await press('Créer mon parcours');
    await waitFor(() => expect(utils.getPathname()).toMatch(/^\/journey\/journey-/));
    const journey = await repositories.journeys.getCurrent();
    const stepsBefore = journey!.steps.length;
    const outsider = ['exp-hasard-ludique', 'exp-lake-hike', 'exp-mama-shelter'].find(
      (id) => !journey!.steps.some((step) => step.experienceId === id),
    )!;

    await act(() => router.push({ pathname: '/experience/[id]', params: { id: outsider } }));
    // "Créer mon parcours" became "Ajouter au parcours".
    expect(await screen.findByRole('button', { name: 'Ajouter au parcours' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Créer mon parcours' })).toBeNull();

    await press('Ajouter au parcours');
    expect(await screen.findByText('Ajouté à ton parcours ✓')).toBeOnTheScreen();
    expect((await repositories.journeys.getCurrent())?.steps).toHaveLength(stepsBefore + 1);
    expect((await repositories.journeys.getCurrent())?.id).toBe(journey!.id);

    // Now in the journey: the CTA is gone (sprint 12), so it can't be offered twice; the store
    // refuses a duplicate anyway.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Ajouter au parcours' })).toBeNull(),
    );
    expect(await addExperienceToJourney(outsider)).toBe('alreadyAdded');
    expect((await repositories.journeys.getCurrent())?.steps).toHaveLength(stepsBefore + 1);

    await press('Voir mon parcours');
    await waitFor(() => expect(utils.getPathname()).toBe(`/journey/${journey!.id}`));
    expect(await screen.findByText('Mon parcours')).toBeOnTheScreen();
    expect(screen.getByTestId(`journey-step-${outsider}`)).toBeOnTheScreen();
  });

  it('active journey: Continuer → … → Terminer le parcours → completed → feedback', async () => {
    const utils = await renderApp();
    await act(() => router.push('/journey/create'));
    await goToSuggestions();
    await press('Construire mon parcours');
    await press('Créer mon parcours');
    await waitFor(() => expect(utils.getPathname()).toMatch(/^\/journey\/journey-/));
    const total = (await repositories.journeys.getCurrent())!.steps.length;
    expect(total).toBeGreaterThan(1);

    // Each "Continuer mon parcours" moves one step on, persisted in the journey.
    expect(await screen.findByText(`Étape 1 sur ${total}`)).toBeOnTheScreen();
    for (let step = 1; step < total; step += 1) {
      await press('Continuer mon parcours');
      expect(await screen.findByText(`Étape ${step + 1} sur ${total}`)).toBeOnTheScreen();
      expect((await repositories.journeys.getCurrent())?.currentStep).toBe(step);
    }
    // Last step: no more "Continuer", "Terminer le parcours" instead.
    expect(screen.queryByRole('button', { name: 'Continuer mon parcours' })).toBeNull();
    await press('Terminer le parcours');

    // Sprint 12: finishing opens the feedback; skipping it lands on the completed journey.
    await waitFor(() => expect(utils.getPathname()).toMatch(/\/feedback$/));
    expect((await repositories.journeys.getCurrent())?.status).toBe('completed');
    await press('Passer');
    await waitFor(() => expect(utils.getPathname()).not.toMatch(/\/feedback$/));
    expect(await screen.findAllByText('Parcours terminé')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Créer un nouveau parcours' })).toBeOnTheScreen();
  });

  it('suggestions: error with retry, and an empty pool', async () => {
    const list = jest.spyOn(repositories.experiences, 'list');
    await renderApp();
    await act(() => router.push('/journey/create'));
    list.mockRejectedValueOnce(new Error('offline'));
    await press('Commencer');
    await pressRadio('Chill');
    await press('Continuer');
    await pressRadio('2 h');
    await press('Continuer');
    await pressRadio('Gratuit');
    await press('Continuer');
    await pressRadio('Ma position actuelle');
    await continueThroughBuilding();

    expect(await screen.findByText('Impossible de charger les idées.')).toBeOnTheScreen();
    list.mockResolvedValueOnce([]);
    await press('Réessayer');
    expect(await screen.findByText('Aucune expérience disponible')).toBeOnTheScreen();
    list.mockRestore();
  });

  it('"Explorer d\'autres idées" opens Search and coming back keeps the draft', async () => {
    const utils = await renderApp();
    await act(() => router.push('/journey/create'));
    await goToSuggestions();
    const before = selectedSuggestions().length;

    await press("Explorer d'autres idées");
    expect(utils.getPathname()).toBe('/search');
    await press('Retour');

    expect(utils.getPathname()).toBe('/journey/create/suggestions');
    expect(selectedSuggestions()).toHaveLength(before);
  });

  it('an active journey emptied of its steps shows the empty state', async () => {
    const journey = await createJourney(
      {
        context: { mood: 'calm', duration: '2h', budget: 'free' },
        startLocation: {
          kind: 'current',
          label: 'Ma position',
          coordinates: { latitude: 48.8566, longitude: 2.3522 },
        },
        startTime: '10:00',
        experienceIds: ['exp-picnic-park'],
      },
      'Sortie Chill',
    );
    await removeJourneyStep(0);
    await renderApp();
    await act(() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } }));

    expect(await screen.findByText('Ton parcours est vide')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ajouter une expérience' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Commencer' })).toBeNull();
  });

  it('an unknown journey id shows a way back, no crash', async () => {
    await renderApp();
    await act(() => router.push('/journey/nope'));

    expect(await screen.findByText("Ce parcours n'existe plus.")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retour' })).toBeOnTheScreen();
  });
});
