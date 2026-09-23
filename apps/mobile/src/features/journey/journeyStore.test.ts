import { act, renderHook, waitFor } from '@testing-library/react-native';

import { repositories } from '@/services';
import type { JourneyDraft } from '@/types';

import {
  ActiveJourneyExistsError,
  addExperienceToJourney,
  completeCurrentStep,
  createJourney,
  moveJourneyStep,
  removeJourneyStep,
  resetJourneyStoreForTests,
  startJourney,
  useJourney,
} from './journeyStore';

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

const ids = async () =>
  ((await repositories.journeys.getCurrent())?.steps ?? []).map((step) => step.experienceId);

describe('journeyStore', () => {
  beforeEach(async () => {
    await repositories.journeys.clear();
    resetJourneyStoreForTests();
  });

  it('DRAFT → ACTIVE: creating saves an active journey with a computed plan', async () => {
    const journey = await createJourney(DRAFT, 'Sortie chill');

    expect(journey.status).toBe('active');
    expect(journey.title).toBe('Sortie chill');
    expect(journey.steps.map((step) => step.experienceId)).toEqual(DRAFT.experienceIds);
    expect(journey.steps[0].estimatedArrival).toBe('18:00');
    expect(journey.estimatedDurationMin).toBeGreaterThan(0);
    expect(journey.startedAt).toBeNull();
    expect((await repositories.journeys.getCurrent())?.id).toBe(journey.id);
  });

  it('never creates a second active journey', async () => {
    await createJourney(DRAFT, 'A');
    await expect(createJourney(DRAFT, 'B')).rejects.toBeInstanceOf(ActiveJourneyExistsError);
    expect((await repositories.journeys.getCurrent())?.title).toBe('A');
  });

  it('adds an experience to the active journey once, and only to an existing one', async () => {
    expect(await addExperienceToJourney('exp-jazz-night')).toBe('noActiveJourney');
    expect(await repositories.journeys.getCurrent()).toBeNull();

    await createJourney(DRAFT, 'A');
    expect(await addExperienceToJourney('exp-jazz-night')).toBe('added');
    expect(await addExperienceToJourney('exp-jazz-night')).toBe('alreadyAdded');
    expect(await ids()).toEqual([...DRAFT.experienceIds, 'exp-jazz-night']);
  });

  it('removes and reorders steps, recomputing the plan', async () => {
    await createJourney(
      { ...DRAFT, experienceIds: ['exp-slow-afternoon', 'exp-picnic-park', 'exp-jazz-night'] },
      'A',
    );

    await moveJourneyStep(2, 0);
    expect(await ids()).toEqual(['exp-jazz-night', 'exp-slow-afternoon', 'exp-picnic-park']);
    const journey = await repositories.journeys.getCurrent();
    expect(journey?.steps.map((step) => step.order)).toEqual([0, 1, 2]);
    expect(journey?.steps[0].estimatedArrival).not.toBe(journey?.steps[1].estimatedArrival);

    await removeJourneyStep(1);
    expect(await ids()).toEqual(['exp-jazz-night', 'exp-picnic-park']);

    await moveJourneyStep(0, 5);
    expect(await ids()).toEqual(['exp-jazz-night', 'exp-picnic-park']);
  });

  it('starts, walks through the steps and completes', async () => {
    await createJourney(DRAFT, 'A');
    await completeCurrentStep();
    expect((await repositories.journeys.getCurrent())?.currentStep).toBe(0);

    await startJourney();
    await completeCurrentStep();
    expect((await repositories.journeys.getCurrent())?.currentStep).toBe(1);
    await completeCurrentStep();

    const done = await repositories.journeys.getCurrent();
    expect(done?.status).toBe('completed');
    expect(done?.completedAt).not.toBeNull();
    // A completed journey no longer takes additions, and a new one may be created.
    expect(await addExperienceToJourney('exp-jazz-night')).toBe('noActiveJourney');
    await expect(createJourney(DRAFT, 'B')).resolves.toMatchObject({
      status: 'active',
      title: 'B',
    });
  });

  it('useJourney: loading → none; error, then a reload recovers', async () => {
    const { result } = await renderHook(() => useJourney());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.state).toBe('none');

    jest.spyOn(repositories.journeys, 'getCurrent').mockRejectedValueOnce(new Error('boom'));
    await act(() => result.current.reload());
    expect(result.current.error).toBe(true);

    await act(() => result.current.reload());
    expect(result.current.error).toBe(false);

    await act(async () => {
      await createJourney(DRAFT, 'A');
    });
    expect(result.current.state).toBe('active');
  });
});
