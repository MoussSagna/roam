import { ApiException } from '../../common/errors/api-error.js';
import { DatabaseUnavailableError } from '../../database/persistence-errors.js';
import type { User } from '../users/user.repository.js';
import type { JourneyFeedbackRepository } from './journey-feedback.repository.js';
import { JourneyFeedbackService } from './journey-feedback.service.js';
import type { JourneyRepository } from './journey.repository.js';
import { JourneyFeedbackExistsError } from './journey.types.js';

const me = { id: 'user-a' } as User;
const other = { id: 'user-b' } as User;
const CREATED = new Date('2026-09-26T12:00:00.000Z');
const saved = {
  id: 'f1',
  journeyId: 'j1',
  userId: 'user-a',
  rating: 4,
  comment: 'Bien',
  createdAt: CREATED,
};

function setup(status: 'ACTIVE' | 'COMPLETED' | null = 'COMPLETED') {
  const journeys = {
    findById: vi.fn().mockResolvedValue(status && { id: 'j1', userId: 'user-a', status }),
  };
  const feedbacks = { findByJourneyId: vi.fn(), create: vi.fn() };
  const service = new JourneyFeedbackService(
    journeys as unknown as JourneyRepository,
    feedbacks as unknown as JourneyFeedbackRepository,
  );
  return { service, journeys, feedbacks };
}

async function apiError(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ApiException);
  const caught = error as ApiException;
  return { status: caught.getStatus(), code: caught.code, details: caught.details };
}

describe('JourneyFeedbackService (repositories mocked)', () => {
  describe('create', () => {
    it('on my completed journey: stored with me as the author', async () => {
      const { service, feedbacks } = setup();
      feedbacks.create.mockResolvedValue(saved);

      expect(await service.create(me, 'j1', { rating: 4, comment: 'Bien' })).toBe(saved);
      expect(feedbacks.create).toHaveBeenCalledWith({
        journeyId: 'j1',
        userId: 'user-a',
        rating: 4,
        comment: 'Bien',
      });
    });

    it('404 NOT_FOUND: unknown journey, or another user’s — nothing written', async () => {
      const unknown = setup(null);
      expect(
        await apiError(unknown.service.create(me, 'j1', { rating: 5, comment: null })),
      ).toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
      const foreign = setup();
      expect(
        await apiError(foreign.service.create(other, 'j1', { rating: 5, comment: null })),
      ).toMatchObject({
        status: 404,
      });
      expect(unknown.feedbacks.create).not.toHaveBeenCalled();
      expect(foreign.feedbacks.create).not.toHaveBeenCalled();
    });

    it('409 JOURNEY_NOT_COMPLETED on an active journey — the journey is not touched', async () => {
      const { service, feedbacks, journeys } = setup('ACTIVE');
      expect(await apiError(service.create(me, 'j1', { rating: 5, comment: null }))).toMatchObject({
        status: 409,
        code: 'JOURNEY_NOT_COMPLETED',
      });
      expect(feedbacks.create).not.toHaveBeenCalled();
      expect(Object.keys(journeys)).toEqual(['findById']);
    });

    it('409 JOURNEY_FEEDBACK_ALREADY_EXISTS (unique index, concurrent too), with the saved feedback', async () => {
      const { service, feedbacks } = setup();
      feedbacks.create.mockRejectedValue(new JourneyFeedbackExistsError());
      feedbacks.findByJourneyId.mockResolvedValue(saved);

      expect(await apiError(service.create(me, 'j1', { rating: 1, comment: null }))).toEqual({
        status: 409,
        code: 'JOURNEY_FEEDBACK_ALREADY_EXISTS',
        details: {
          feedback: {
            id: 'f1',
            journeyId: 'j1',
            rating: 4,
            comment: 'Bien',
            createdAt: CREATED.toISOString(),
          },
        },
      });
    });

    it('repository errors pass through (the global filter maps them: 503, 422 for a CHECK…)', async () => {
      const { service, feedbacks } = setup();
      feedbacks.create.mockRejectedValue(new DatabaseUnavailableError());
      await expect(service.create(me, 'j1', { rating: 5, comment: null })).rejects.toBeInstanceOf(
        DatabaseUnavailableError,
      );
    });
  });

  describe('get', () => {
    it('my journey’s feedback, or null when none', async () => {
      const { service, feedbacks } = setup();
      feedbacks.findByJourneyId.mockResolvedValueOnce(saved).mockResolvedValueOnce(null);
      expect(await service.get(me, 'j1')).toBe(saved);
      expect(await service.get(me, 'j1')).toBeNull();
    });

    it('404 for an unknown journey or another user’s: the feedback is never read', async () => {
      const unknown = setup(null);
      expect(await apiError(unknown.service.get(me, 'j1'))).toMatchObject({ status: 404 });
      const foreign = setup();
      expect(await apiError(foreign.service.get(other, 'j1'))).toMatchObject({ status: 404 });
      expect(foreign.feedbacks.findByJourneyId).not.toHaveBeenCalled();
    });
  });
});
