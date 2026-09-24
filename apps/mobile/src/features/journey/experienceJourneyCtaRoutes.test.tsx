import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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
  removeJourneyStep,
  resetJourneyStoreForTests,
  startJourney,
} from './journeyStore';

/** Real route tree: Experience detail's journey CTA against the active journey (sprint 12 fix). */
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
  return utils;
}

const IN_JOURNEY = ['exp-modern-art-museum', 'exp-slow-afternoon'];
const OUTSIDER = 'exp-rooftop-sunset';

const DRAFT: JourneyDraft = {
  context: { mood: 'culture', duration: 'halfDay', budget: 'medium' },
  startLocation: {
    kind: 'current',
    label: 'Ma position',
    coordinates: { latitude: 48.8674, longitude: 2.3637 },
  },
  startTime: '18:00',
  experienceIds: IN_JOURNEY,
};

async function openDetail(id: string) {
  await act(() => router.push({ pathname: '/experience/[id]', params: { id } }));
  await screen.findAllByTestId('experience-detail-scroll');
}

/** The detail on top (screens under it stay mounted). */
const topScroll = () => screen.getAllByTestId('experience-detail-scroll').at(-1)!;
const addButton = () => screen.queryByRole('button', { name: 'Ajouter au parcours' });
const createButton = () => screen.queryByRole('button', { name: 'Créer mon parcours' });

jest.setTimeout(20_000);

describe('Experience detail — journey CTA vs. the active journey', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
    await repositories.journeys.clear();
    resetJourneyStoreForTests();
  });

  it('1. no active journey: the footer is shown (unchanged: "Créer mon parcours")', async () => {
    await renderApp();
    await openDetail(IN_JOURNEY[0]);

    expect(await screen.findByRole('button', { name: 'Créer mon parcours' })).toBeOnTheScreen();
    expect(addButton()).toBeNull();
  });

  it('2. active journey without this experience: "Ajouter au parcours" is shown', async () => {
    await createJourney(DRAFT, 'Paris au coucher du soleil');
    await renderApp();
    await openDetail(OUTSIDER);

    expect(await screen.findByRole('button', { name: 'Ajouter au parcours' })).toBeOnTheScreen();
  });

  it('3–5. active journey: each experience already in it has no footer; one outside keeps it', async () => {
    await createJourney(DRAFT, 'Paris au coucher du soleil');
    await renderApp();

    for (const id of IN_JOURNEY) {
      await openDetail(id);
      await waitFor(() => {
        expect(addButton()).toBeNull();
        expect(createButton()).toBeNull();
      });
      expect(screen.queryByText('Déjà dans ton parcours')).toBeNull();
      // No room kept for a footer that isn't there: only the safe area + a small margin.
      expect(topScroll().props.contentContainerStyle).toMatchObject({ paddingBottom: 34 + 24 });
      await act(() => router.back());
    }

    await openDetail(OUTSIDER);
    expect(await screen.findByRole('button', { name: 'Ajouter au parcours' })).toBeOnTheScreen();
  });

  it('6–8. added → footer gone, also when coming back; removed → footer back; never twice', async () => {
    await createJourney(DRAFT, 'Paris au coucher du soleil');
    await renderApp();
    await openDetail(OUTSIDER);

    await fireEvent.press(await screen.findByRole('button', { name: 'Ajouter au parcours' }));
    expect(await screen.findByText('Ajouté à ton parcours ✓')).toBeOnTheScreen();
    await waitFor(() => expect(addButton()).toBeNull());

    // Leave and come back: still hidden.
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
    await act(() => router.back());
    await openDetail(OUTSIDER);
    await waitFor(() => expect(addButton()).toBeNull());

    // No duplicate was created.
    const ids = (await repositories.journeys.getCurrent())!.steps.map((step) => step.experienceId);
    expect(ids.filter((id) => id === OUTSIDER)).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);

    // Removed from the journey → coming back, the footer is offered again.
    await act(() => router.back());
    await act(() => removeJourneyStep(ids.indexOf(OUTSIDER)));
    await openDetail(OUTSIDER);
    expect(await screen.findByRole('button', { name: 'Ajouter au parcours' })).toBeOnTheScreen();
  });

  it('a completed journey is not an active one: the footer is unchanged ("Créer mon parcours")', async () => {
    await createJourney(DRAFT, 'Terminé');
    await startJourney();
    await completeCurrentStep();
    await completeCurrentStep();
    await renderApp();
    await openDetail(IN_JOURNEY[0]);

    expect(await screen.findByRole('button', { name: 'Créer mon parcours' })).toBeOnTheScreen();
  });
});
