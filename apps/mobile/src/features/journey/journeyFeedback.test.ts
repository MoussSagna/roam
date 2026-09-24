import { repositories } from '@/services';
import { createMockJourneyFeedbackRepository } from '@/services/mock/journeyFeedback';
import type { JourneyDraft } from '@/types';

import {
  FEEDBACK_COMMENT_MAX_LENGTH,
  JourneyNotCompletedError,
  submitJourneyFeedback,
} from './journeyFeedback';
import {
  completeCurrentStep,
  createJourney,
  resetJourneyStoreForTests,
  startJourney,
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

async function completedJourney() {
  const journey = await createJourney(DRAFT, 'Une soirée inoubliable');
  await startJourney();
  let saved = await completeCurrentStep();
  while (saved?.status === 'active') saved = await completeCurrentStep();
  return journey;
}

describe('journey feedback (sprint 12)', () => {
  beforeEach(async () => {
    await repositories.journeys.clear();
    await repositories.journeyFeedback.clear();
    resetJourneyStoreForTests();
  });

  it('the last step completes the journey (the moment feedback is asked)', async () => {
    await createJourney(DRAFT, 'A');
    await startJourney();
    expect((await completeCurrentStep())?.status).toBe('active');
    expect((await completeCurrentStep())?.status).toBe('completed');
    expect(await completeCurrentStep()).toBeNull();
  });

  it('saves the rating and comment, tied to the journey and the current user', async () => {
    const journey = await completedJourney();
    const user = await repositories.users.getCurrentUser();

    const feedback = await submitJourneyFeedback({
      journeyId: journey.id,
      rating: 4,
      comment: '  Super sélection !  ',
    });

    expect(feedback).toMatchObject({
      journeyId: journey.id,
      userId: user.id,
      rating: 4,
      comment: 'Super sélection !',
    });
    expect(feedback.id).toBeTruthy();
    expect(new Date(feedback.createdAt).toString()).not.toBe('Invalid Date');
    expect(await repositories.journeyFeedback.getForJourney(journey.id)).toEqual(feedback);
    // The journey itself is untouched: still completed.
    expect((await repositories.journeys.getCurrent())?.status).toBe('completed');
  });

  it('the comment is optional: blank is saved as null', async () => {
    const journey = await completedJourney();
    const feedback = await submitJourneyFeedback({
      journeyId: journey.id,
      rating: 5,
      comment: '   ',
    });
    expect(feedback.comment).toBeNull();
  });

  it('caps the comment at the limit', async () => {
    const journey = await completedJourney();
    const feedback = await submitJourneyFeedback({
      journeyId: journey.id,
      rating: 3,
      comment: 'a'.repeat(FEEDBACK_COMMENT_MAX_LENGTH + 50),
    });
    expect(feedback.comment).toHaveLength(FEEDBACK_COMMENT_MAX_LENGTH);
  });

  it('refuses a journey that is not completed, or unknown', async () => {
    const journey = await createJourney(DRAFT, 'En cours');
    await expect(
      submitJourneyFeedback({ journeyId: journey.id, rating: 4, comment: '' }),
    ).rejects.toBeInstanceOf(JourneyNotCompletedError);
    await expect(
      submitJourneyFeedback({ journeyId: 'unknown', rating: 4, comment: '' }),
    ).rejects.toBeInstanceOf(JourneyNotCompletedError);
    expect(await repositories.journeyFeedback.getForJourney(journey.id)).toBeNull();
  });

  it('never duplicates: a second submission returns the first feedback', async () => {
    const journey = await completedJourney();
    const first = await submitJourneyFeedback({ journeyId: journey.id, rating: 2, comment: 'Bof' });
    const second = await submitJourneyFeedback({ journeyId: journey.id, rating: 5, comment: '' });

    expect(second).toEqual(first);
    expect((await repositories.journeyFeedback.getForJourney(journey.id))?.rating).toBe(2);
  });

  it('works for a completed journey that is only in the history', async () => {
    const past = await completedJourney();
    jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 1000);
    await createJourney(DRAFT, 'Suivant');

    const feedback = await submitJourneyFeedback({ journeyId: past.id, rating: 5, comment: '' });
    expect(feedback.journeyId).toBe(past.id);
  });

  it('is persisted (a fresh repository reads it back)', async () => {
    const journey = await completedJourney();
    await submitJourneyFeedback({ journeyId: journey.id, rating: 4, comment: 'Top' });

    const fresh = createMockJourneyFeedbackRepository();
    expect((await fresh.getForJourney(journey.id))?.comment).toBe('Top');
  });
});
