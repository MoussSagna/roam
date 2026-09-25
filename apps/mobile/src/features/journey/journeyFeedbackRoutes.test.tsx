import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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

import {
  completeCurrentStep,
  createJourney,
  resetJourneyStoreForTests,
  startJourney,
} from './journeyStore';

/** Real route tree (same harness as `journeyRoutes.test.tsx`): feedback after a journey, sprint 12. */
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

/** A started journey whose current step is the last one. */
async function journeyAtLastStep() {
  const journey = await createJourney(DRAFT, 'Une soirée inoubliable');
  await startJourney();
  await completeCurrentStep();
  return journey;
}

async function completedJourney() {
  const journey = await journeyAtLastStep();
  await completeCurrentStep();
  return journey;
}

/** The screens under the one on top stay mounted: the last match is the visible one. */
const topButton = (name: string | RegExp) => screen.getAllByRole('button', { name }).at(-1)!;
const press = (name: string | RegExp) => fireEvent.press(topButton(name));
const submitButton = () => topButton('Envoyer mon avis');

async function openFeedback(journeyId: string) {
  const utils = await renderApp();
  await act(() => router.navigate('/journey'));
  await act(() => router.push({ pathname: '/journey/[id]', params: { id: journeyId } }));
  await act(() => router.push({ pathname: '/journey/[id]/feedback', params: { id: journeyId } }));
  await screen.findByText('Comment as-tu trouvé cette sortie ?');
  return utils;
}

jest.setTimeout(20_000);

describe('Journey feedback (sprint 12)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
    await repositories.journeys.clear();
    await repositories.journeyFeedback.clear();
    resetJourneyStoreForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('finishing the last step opens the feedback; the journey is COMPLETED', async () => {
    const journey = await journeyAtLastStep();
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));
    await act(() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } }));

    await press('Terminer le parcours');

    await waitFor(() => expect(utils.getPathname()).toBe(`/journey/${journey.id}/feedback`));
    expect(await screen.findByText("Alors, comment c'était ?")).toBeOnTheScreen();
    expect(screen.getByText('Une soirée inoubliable')).toBeOnTheScreen();
    expect((await repositories.journeys.getCurrent())?.status).toBe('completed');
  });

  it('a journey that is not finished never shows the feedback', async () => {
    const journey = await createJourney(DRAFT, 'En cours');
    await startJourney();
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));

    // Opening it, or moving to the next step, stays on the journey.
    await act(() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } }));
    await press('Continuer mon parcours');
    expect(utils.getPathname()).toBe(`/journey/${journey.id}`);

    // Even reached by a link, the form is not offered.
    await act(() =>
      router.push({ pathname: '/journey/[id]/feedback', params: { id: journey.id } }),
    );
    expect(await screen.findByText(/pas encore terminé/)).toBeOnTheScreen();
    expect(screen.queryByTestId('star-1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Envoyer mon avis' })).toBeNull();
  });

  it('stars: none at first (send disabled), a tap fills up to it, the rating can change', async () => {
    const journey = await completedJourney();
    await openFeedback(journey.id);

    expect(screen.getByText('Touche une étoile pour noter')).toBeOnTheScreen();
    expect(submitButton()).toBeDisabled();

    await fireEvent.press(screen.getByTestId('star-4'));
    expect(screen.getByRole('radio', { name: '4 étoiles' })).toBeChecked();
    expect(screen.getByText('4/5')).toBeOnTheScreen();
    expect(screen.getByText('Très bien !')).toBeOnTheScreen();
    expect(submitButton()).toBeEnabled();

    await fireEvent.press(screen.getByTestId('star-2'));
    expect(screen.getByRole('radio', { name: '2 étoiles' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '4 étoiles' })).not.toBeChecked();
    expect(screen.getByText('Bof')).toBeOnTheScreen();

    for (const [star, label] of [
      [1, 'Décevant'],
      [3, 'Correct'],
      [5, 'Inoubliable !'],
    ] as const) {
      await fireEvent.press(screen.getByTestId(`star-${star}`));
      expect(screen.getByText(`${star}/5`)).toBeOnTheScreen();
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
  });

  it('sends a rating without a comment, then thanks in place; the journey stays COMPLETED', async () => {
    const journey = await completedJourney();
    const utils = await openFeedback(journey.id);

    await fireEvent.press(screen.getByTestId('star-5'));
    await press('Envoyer mon avis');

    expect(await screen.findByText('Merci pour ton retour ✨')).toBeOnTheScreen();
    expect(screen.getByTestId('feedback-recap')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Envoyer mon avis' })).toBeNull();
    const saved = await repositories.journeyFeedback.getForJourney(journey.id);
    expect(saved).toMatchObject({ journeyId: journey.id, rating: 5, comment: null });
    expect(saved?.userId).toBe((await repositories.users.getCurrentUser()).id);
    expect((await repositories.journeys.getCurrent())?.status).toBe('completed');

    // "Voir mon parcours" → the completed journey.
    await press('Voir mon parcours');
    expect(utils.getPathname()).toBe(`/journey/${journey.id}`);
  });

  it('the comment can be typed (with a counter) and is saved', async () => {
    const journey = await completedJourney();
    await openFeedback(journey.id);

    expect(screen.getByText('0/300')).toBeOnTheScreen();
    await fireEvent(screen.getByTestId('feedback-comment'), 'focus');
    await fireEvent.changeText(screen.getByTestId('feedback-comment'), 'Super sélection !');
    expect(screen.getByText('17/300')).toBeOnTheScreen();
    // A comment alone is not enough: the rating is the minimum.
    expect(submitButton()).toBeDisabled();

    await fireEvent.press(screen.getByTestId('star-4'));
    await press('Envoyer mon avis');

    expect(await screen.findByText('« Super sélection ! »')).toBeOnTheScreen();
    expect((await repositories.journeyFeedback.getForJourney(journey.id))?.comment).toBe(
      'Super sélection !',
    );
  });

  it('"Retour à mes parcours" goes back to the Parcours tab', async () => {
    const journey = await completedJourney();
    const utils = await openFeedback(journey.id);
    await fireEvent.press(screen.getByTestId('star-3'));
    await press('Envoyer mon avis');
    await screen.findByText('Merci pour ton retour ✨');

    await press('Retour à mes parcours');
    await waitFor(() => expect(utils.getPathname()).toBe('/journey'));
  });

  it('"Passer" with nothing entered continues at once, and saves nothing', async () => {
    const journey = await completedJourney();
    const utils = await openFeedback(journey.id);

    await press('Passer');

    expect(utils.getPathname()).toBe(`/journey/${journey.id}`);
    expect(screen.queryByText('Passer sans envoyer ?')).toBeNull();
    expect(await repositories.journeyFeedback.getForJourney(journey.id)).toBeNull();
    expect((await repositories.journeys.getCurrent())?.status).toBe('completed');
  });

  it('"Passer" after choosing a rating asks first, then continues without saving', async () => {
    const journey = await completedJourney();
    const utils = await openFeedback(journey.id);
    await fireEvent.press(screen.getByTestId('star-4'));

    await press('Passer');
    expect(await screen.findByText('Passer sans envoyer ?')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getAllByRole('button', { name: 'Passer' }).at(-1)!);
    });

    await waitFor(() => expect(utils.getPathname()).toBe(`/journey/${journey.id}`));
    expect(await repositories.journeyFeedback.getForJourney(journey.id)).toBeNull();
  });

  it('a double tap sends only once', async () => {
    const journey = await completedJourney();
    const submit = jest.spyOn(repositories.journeyFeedback, 'submit');
    await openFeedback(journey.id);
    await fireEvent.press(screen.getByTestId('star-5'));

    await act(async () => {
      fireEvent.press(submitButton());
      fireEvent.press(submitButton());
    });

    await screen.findByText('Merci pour ton retour ✨');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('feedback already given: its recap, no second form', async () => {
    const journey = await completedJourney();
    await repositories.journeyFeedback.submit({
      journeyId: journey.id,
      userId: 'user-1',
      rating: 4,
      comment: 'Déjà dit',
    });
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));
    await act(() =>
      router.push({ pathname: '/journey/[id]/feedback', params: { id: journey.id } }),
    );

    expect(await screen.findByText('Tu as déjà donné ton avis')).toBeOnTheScreen();
    expect(screen.getByText('« Déjà dit »')).toBeOnTheScreen();
    expect(screen.queryByTestId('star-1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Envoyer mon avis' })).toBeNull();
    expect(utils.getPathname()).toBe(`/journey/${journey.id}/feedback`);
  });

  it('a failed send shows an error and keeps the form, then a retry works', async () => {
    const journey = await completedJourney();
    const showToast = jest.spyOn(toast, 'showToast').mockImplementation(() => {});
    jest.spyOn(repositories.journeyFeedback, 'submit').mockRejectedValueOnce(new Error('offline'));
    await openFeedback(journey.id);
    await fireEvent.press(screen.getByTestId('star-4'));

    await press('Envoyer mon avis');

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ title: 'Envoi impossible' }),
      ),
    );
    expect(screen.queryByText('Merci pour ton retour ✨')).toBeNull();
    expect(submitButton()).toBeEnabled();
    expect(screen.getByRole('radio', { name: '4 étoiles' })).toBeChecked();

    await press('Envoyer mon avis');
    expect(await screen.findByText('Merci pour ton retour ✨')).toBeOnTheScreen();
  });

  it('loading the saved feedback can fail, with a retry', async () => {
    const journey = await completedJourney();
    jest
      .spyOn(repositories.journeyFeedback, 'getForJourney')
      .mockRejectedValueOnce(new Error('offline'));
    await renderApp();
    await act(() => router.navigate('/journey'));
    await act(() =>
      router.push({ pathname: '/journey/[id]/feedback', params: { id: journey.id } }),
    );

    expect(await screen.findByText('Impossible de charger ton parcours.')).toBeOnTheScreen();
    await press('Réessayer');
    expect(await screen.findByText('Comment as-tu trouvé cette sortie ?')).toBeOnTheScreen();
  });
});
