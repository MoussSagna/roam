import { act, renderHook, waitFor } from '@testing-library/react-native';

import { STORAGE_KEYS, writeStorage } from '@/lib/storage';
import { repositories } from '@/services';
import { createMockJourneyRepository } from '@/services/mock/journey';
import type { JourneyDraft } from '@/types';

import {
  ActiveJourneyExistsError,
  addExperienceToJourney,
  completeCurrentStep,
  createJourney,
  findJourney,
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

  describe('history (sprint 11)', () => {
    async function finish() {
      await startJourney();
      let journey = await repositories.journeys.getCurrent();
      while (journey?.status === 'active') {
        await completeCurrentStep();
        journey = await repositories.journeys.getCurrent();
      }
    }

    it('a completed journey is kept in the history, once', async () => {
      const created = await createJourney(DRAFT, 'Paris au coucher du soleil');
      expect(await repositories.journeys.listCompleted()).toEqual([]);

      await finish();

      const history = await repositories.journeys.listCompleted();
      expect(history.map((journey) => journey.id)).toEqual([created.id]);
      expect(history[0].status).toBe('completed');
      expect(history[0].completedAt).not.toBeNull();
    });

    it('a new journey replaces the completed current one, which stays in the history', async () => {
      const first = await createJourney(DRAFT, 'Premier');
      await finish();
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 1000);
      const second = await createJourney(DRAFT, 'Second');

      expect(second.id).not.toBe(first.id);
      expect((await repositories.journeys.getCurrent())?.id).toBe(second.id);
      expect((await repositories.journeys.getCurrent())?.status).toBe('active');
      expect((await repositories.journeys.listCompleted()).map((j) => j.id)).toEqual([first.id]);
    });

    it('lists the most recently completed first, without duplicates', async () => {
      const first = await createJourney(DRAFT, 'Premier');
      await finish();
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 1000);
      const second = await createJourney(DRAFT, 'Second');
      await finish();

      const ids = (await repositories.journeys.listCompleted()).map((j) => j.id);
      expect(ids).toEqual([second.id, first.id]);
    });

    it('useJourney exposes the history, and findJourney finds current and past journeys', async () => {
      const first = await createJourney(DRAFT, 'Premier');
      await finish();
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 1000);
      const second = await createJourney(DRAFT, 'Second');
      resetJourneyStoreForTests();

      const { result } = await renderHook(() => useJourney());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.state).toBe('active');
      expect(result.current.history.map((j) => j.id)).toEqual([first.id]);
      expect(findJourney(result.current, second.id)?.title).toBe('Second');
      expect(findJourney(result.current, first.id)?.title).toBe('Premier');
      expect(findJourney(result.current, 'unknown')).toBeNull();
      expect(findJourney(result.current, undefined)).toBeNull();
    });

    it('picks up a journey completed before the history existed (sprint 10 storage)', async () => {
      const created = await createJourney(DRAFT, 'Ancien');
      await finish();
      const completed = await repositories.journeys.getCurrent();
      // Sprint 10 storage: only the current journey, no history key.
      await repositories.journeys.clear();
      await writeStorage(STORAGE_KEYS.journey, JSON.stringify(completed));

      const fresh = createMockJourneyRepository();
      expect((await fresh.listCompleted()).map((j) => j.id)).toEqual([created.id]);
    });
  });
});
