import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import * as toast from '@/lib/toast';
import { repositories } from '@/services';
import { ThemeProvider } from '@/theme';
import type { JourneyDraft } from '@/types';

import { completeCurrentStep, createJourney, resetJourneyStoreForTests } from './journeyStore';
import { BUILD_TIMELINE } from './lib/building';

/** Real route tree: starting point from an experience, "Ton parcours" as the last step, progression
 * and editing of the journey in progress (sprint 12, D-86). */
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
  await act(() => router.navigate('/home'));
  return { getPathname: utils.getPathname };
}

/** The screens under the one on top stay mounted: the last match is the visible one. */
const topButton = (name: string | RegExp) => screen.getAllByRole('button', { name }).at(-1)!;
const press = (name: string | RegExp) => fireEvent.press(topButton(name));
const pressRadio = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));

async function continueThroughBuilding() {
  jest.useFakeTimers();
  try {
    await press('Continuer');
    await act(() => jest.advanceTimersByTimeAsync(BUILD_TIMELINE.navigate));
  } finally {
    jest.useRealTimers();
  }
}

const SEED = 'exp-modern-art-museum';

/** Experience detail's "Créer mon parcours" → intro → context → "On part d'où ?". */
async function startFromExperience() {
  const utils = await renderApp();
  await act(() => router.push({ pathname: '/journey/create', params: { experienceId: SEED } }));
  await press('Commencer');
  await pressRadio('Culture');
  await press('Continuer');
  await pressRadio('Demi-journée');
  await press('Continuer');
  await pressRadio('Budget moyen');
  await press('Continuer');
  expect(utils.getPathname()).toBe('/journey/create/location');
  return utils;
}

const THREE = ['exp-modern-art-museum', 'exp-slow-afternoon', 'exp-rooftop-sunset'];
const TITLES = ['Musée d’Art Moderne', 'Après-midi lente', 'Rooftop Sunset'];
const DRAFT: JourneyDraft = {
  context: { mood: 'culture', duration: 'halfDay', budget: 'medium' },
  startLocation: {
    kind: 'current',
    label: 'Ma position',
    coordinates: { latitude: 48.8674, longitude: 2.3637 },
  },
  startTime: '18:00',
  experienceIds: THREE,
};

/** A 3-step journey at its second step, opened on `/journey/[id]`, then "Modifier". */
async function openEditor() {
  const journey = await createJourney(DRAFT, 'Paris au coucher du soleil');
  await completeCurrentStep();
  const utils = await renderApp();
  await act(() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } }));
  await press('Modifier');
  await screen.findByText('Modifier le parcours');
  return { utils, journey };
}

const footerLabel = () =>
  screen.queryByRole('button', { name: 'Enregistrer' }) ? 'Enregistrer' : 'Continuer mon parcours';

jest.setTimeout(20_000);

describe('Journey flow and editing (sprint 12)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
    await repositories.journeys.clear();
    resetJourneyStoreForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('starting point', () => {
    it('1–4. from an experience: pre-selected, its name and address shown, the map centred on its marker', async () => {
      const experience = (await repositories.experiences.getById(SEED))!;
      await startFromExperience();

      expect(await screen.findByRole('radio', { name: TITLES[0] })).toBeChecked();
      const card = screen.getByTestId('journey-start-experience');
      expect(within(card).getByText(TITLES[0])).toBeOnTheScreen();
      expect(within(card).getByText(experience.address!)).toBeOnTheScreen();

      const map = screen.getByTestId('journey-map');
      expect(within(map).getByRole('button', { name: TITLES[0] })).toBeOnTheScreen();
      const region = within(map).getByTestId('mock-map-view').props.initialRegion;
      expect(region.latitude).toBeCloseTo(experience.coordinates!.latitude, 5);
      expect(region.longitude).toBeCloseTo(experience.coordinates!.longitude, 5);
      // "Continuer" is available right away.
      expect(topButton('Continuer')).toBeEnabled();
    });

    it('kept: the journey starts from the experience', async () => {
      await startFromExperience();
      await screen.findByRole('radio', { name: TITLES[0] });
      await continueThroughBuilding();
      await screen.findByTestId('journey-suggestions-list');
      await press('Construire mon parcours');
      await press('Créer mon parcours');

      await waitFor(async () =>
        expect((await repositories.journeys.getCurrent())?.startLocation).toMatchObject({
          kind: 'experience',
          label: TITLES[0],
        }),
      );
    });

    it('5–6. changed: another choice replaces it — one starting point only', async () => {
      await startFromExperience();
      await screen.findByRole('radio', { name: TITLES[0] });

      await pressRadio('Choisir un lieu');
      await press('République');
      expect(screen.getByRole('radio', { name: TITLES[0] })).not.toBeChecked();
      expect(screen.queryByTestId('journey-start-experience')).toBeNull();

      jest.useFakeTimers();
      try {
        await press('Continuer');
        await act(() => jest.advanceTimersByTimeAsync(BUILD_TIMELINE.start));
        expect(screen.getByText('Départ : République')).toBeOnTheScreen();
        await act(() => jest.advanceTimersByTimeAsync(BUILD_TIMELINE.navigate));
      } finally {
        jest.useRealTimers();
      }
      await screen.findByTestId('journey-suggestions-list');
      await press('Construire mon parcours');
      await press('Créer mon parcours');

      await waitFor(async () =>
        expect((await repositories.journeys.getCurrent())?.startLocation).toMatchObject({
          kind: 'place',
          label: 'République',
        }),
      );
    });

    it('opened without an experience: no pre-filled choice', async () => {
      await renderApp();
      await act(() => router.push('/journey/create'));
      await press('Commencer');
      await pressRadio('Chill');
      await press('Continuer');
      await pressRadio('2 h');
      await press('Continuer');
      await pressRadio('Gratuit');
      await press('Continuer');

      expect(screen.queryByTestId('journey-start-experience')).toBeNull();
      expect(topButton('Continuer')).toBeDisabled();
    });
  });

  describe('creation', () => {
    it('7–11. "Ton parcours" is the last step: "Créer mon parcours" creates ONE active journey and opens it', async () => {
      const { getPathname } = await startFromExperience();
      await screen.findByRole('radio', { name: TITLES[0] });
      await continueThroughBuilding();
      await screen.findByTestId('journey-suggestions-list');
      await press('Construire mon parcours');

      expect(getPathname()).toBe('/journey/create/builder');
      expect(screen.getByText('Ton parcours')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Voir mon parcours' })).toBeNull();
      expect(await repositories.journeys.getCurrent()).toBeNull();

      await press('Créer mon parcours');

      await waitFor(() => expect(getPathname()).toMatch(/^\/journey\/journey-/));
      const saved = await repositories.journeys.getCurrent();
      expect(saved?.status).toBe('active');
      expect(getPathname()).toBe(`/journey/${saved!.id}`);
      expect(await screen.findByText('Mon parcours')).toBeOnTheScreen();
      expect(saved?.steps.map((step) => step.experienceId)).toContain(SEED);
    });
  });

  describe('editing', () => {
    it('17–18. "Modifier" opens the editor; untouched, the CTA is "Continuer mon parcours" and goes back', async () => {
      const { utils, journey } = await openEditor();

      expect(utils.getPathname()).toBe(`/journey/${journey.id}/edit`);
      expect(footerLabel()).toBe('Continuer mon parcours');
      THREE.forEach((id) => expect(screen.getByTestId(`journey-step-${id}`)).toBeOnTheScreen());

      await press('Continuer mon parcours');
      expect(utils.getPathname()).toBe(`/journey/${journey.id}`);
    });

    it('19–22. removing, reordering or adding turns the CTA into "Enregistrer" (and back when undone)', async () => {
      await openEditor();

      await press(`Descendre ${TITLES[0]}`);
      expect(footerLabel()).toBe('Enregistrer');
      await press(`Monter ${TITLES[0]}`);
      expect(footerLabel()).toBe('Continuer mon parcours');

      await press(`Retirer ${TITLES[2]}`);
      expect(footerLabel()).toBe('Enregistrer');
      expect(screen.queryByTestId(`journey-step-${THREE[2]}`)).toBeNull();
    });

    it('20. adding an experience from the suggestions marks the journey as changed', async () => {
      await openEditor();

      await press('Ajouter une expérience');
      const list = await screen.findByTestId('journey-edit-suggestions');
      const [add] = within(list).getAllByRole('button', { name: /^Ajouter .* au parcours$/ });
      const title = add.props.accessibilityLabel.replace(/^Ajouter (.*) au parcours$/, '$1');
      await fireEvent.press(add);

      expect(footerLabel()).toBe('Enregistrer');
      expect(
        within(screen.getAllByTestId('journey-timeline').at(-1)!).getByRole('button', {
          name: `Ouvrir ${title}`,
        }),
      ).toBeOnTheScreen();
    });

    it('23–27. "Enregistrer" saves (same journey, still ACTIVE, progress kept), toasts and goes back', async () => {
      const showToast = jest.spyOn(toast, 'showToast').mockImplementation(() => {});
      const { utils, journey } = await openEditor();

      // Current step (2) moves last; step 3 moves up.
      await press(`Descendre ${TITLES[1]}`);
      await press('Enregistrer');

      await waitFor(() => expect(utils.getPathname()).toBe(`/journey/${journey.id}`));
      expect(showToast).toHaveBeenCalledWith('success', {
        title: 'Parcours mis à jour',
        message: 'Tes modifications ont bien été prises en compte.',
      });
      const saved = (await repositories.journeys.getCurrent())!;
      expect(saved.id).toBe(journey.id);
      expect(saved.status).toBe('active');
      expect(saved.steps.map((step) => step.experienceId)).toEqual([THREE[0], THREE[2], THREE[1]]);
      // The current step is still "Après-midi lente", now third.
      expect(saved.currentStep).toBe(2);
      expect(await screen.findByText('Étape 3 sur 3')).toBeOnTheScreen();
    });

    it('removing the current step keeps a coherent progress (never past the end)', async () => {
      const { utils, journey } = await openEditor();

      await press(`Retirer ${TITLES[1]}`);
      await press(`Retirer ${TITLES[2]}`);
      await press('Enregistrer');

      await waitFor(() => expect(utils.getPathname()).toBe(`/journey/${journey.id}`));
      const saved = (await repositories.journeys.getCurrent())!;
      expect(saved.steps).toHaveLength(1);
      expect(saved.currentStep).toBe(0);
    });

    it('28. back with no change returns at once', async () => {
      const { utils, journey } = await openEditor();
      await press('Retour');
      expect(utils.getPathname()).toBe(`/journey/${journey.id}`);
      expect(screen.queryByText('Quitter sans enregistrer ?')).toBeNull();
    });

    it('29–30. back with changes asks first; "Continuer l\'édition" stays, "Quitter" drops the changes', async () => {
      const { utils, journey } = await openEditor();
      await press(`Retirer ${TITLES[2]}`);

      await press('Retour');
      expect(await screen.findByText('Quitter sans enregistrer ?')).toBeOnTheScreen();
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: "Continuer l'édition" }));
      });
      expect(utils.getPathname()).toBe(`/journey/${journey.id}/edit`);
      expect(footerLabel()).toBe('Enregistrer');

      await press('Retour');
      await screen.findByText('Quitter sans enregistrer ?');
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Quitter' }));
      });
      await waitFor(() => expect(utils.getPathname()).toBe(`/journey/${journey.id}`));
      expect((await repositories.journeys.getCurrent())?.steps).toHaveLength(3);
      // The journey was never touched while editing.
      expect((await repositories.journeys.getCurrent())?.currentStep).toBe(1);
    });
  });
});
