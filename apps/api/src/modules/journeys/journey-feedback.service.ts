import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiException } from '../../common/errors/api-error.js';
import type { User } from '../users/user.repository.js';
import { JourneyFeedbackRepository } from './journey-feedback.repository.js';
import { JourneyRepository } from './journey.repository.js';
import { type JourneyFeedback, JourneyFeedbackExistsError } from './journey.types.js';
import { findOwnedJourney } from './journeys.service.js';

/** The domain error codes of the journey feedback API (JOURNEY_FEEDBACK_API.md → "Errors"). */
export const JourneyFeedbackErrorCode = {
  NotCompleted: 'JOURNEY_NOT_COMPLETED',
  AlreadyExists: 'JOURNEY_FEEDBACK_ALREADY_EXISTS',
} as const;

/**
 * Feedback on a completed journey (FEEDBACK.md "Implemented", mobile D-83): 1–5 stars and an optional comment, one per
 * journey, given by its owner. Stored as given: nothing else reads it yet (no recommendation learning).
 */
@Injectable()
export class JourneyFeedbackService {
  constructor(
    private readonly journeys: JourneyRepository,
    private readonly feedbacks: JourneyFeedbackRepository,
  ) {}

  /** The feedback of one of my journeys, or `null` when none was given (skipped, not yet, or still active). */
  async get(me: User, journeyId: string): Promise<JourneyFeedback | null> {
    await findOwnedJourney(this.journeys, me, journeyId);
    return this.feedbacks.findByJourneyId(journeyId);
  }

  /**
   * Gives the feedback of one of my completed journeys. COMPLETED is final (API-08: no way back to ACTIVE), so a journey
   * read as completed stays completed. One per journey, guaranteed by the unique index: a second submission — even a
   * concurrent one — is refused with the saved feedback in `details` (the mobile answers a repeated submission with it).
   */
  async create(
    me: User,
    journeyId: string,
    input: { rating: number; comment: string | null },
  ): Promise<JourneyFeedback> {
    const journey = await findOwnedJourney(this.journeys, me, journeyId);
    if (journey.status !== 'COMPLETED') {
      throw new ApiException(
        HttpStatus.CONFLICT,
        JourneyFeedbackErrorCode.NotCompleted,
        'Feedback can only be given on a completed journey.',
      );
    }
    try {
      return await this.feedbacks.create({
        journeyId,
        userId: me.id,
        rating: input.rating,
        comment: input.comment,
      });
    } catch (error) {
      if (!(error instanceof JourneyFeedbackExistsError)) throw error;
      const saved = await this.feedbacks.findByJourneyId(journeyId);
      throw new ApiException(
        HttpStatus.CONFLICT,
        JourneyFeedbackErrorCode.AlreadyExists,
        'This journey already has its feedback.',
        saved && { feedback: toPublic(saved) },
      );
    }
  }
}

/** What the API shows of a feedback: never the author id (always the session user). */
export function toPublic(feedback: JourneyFeedback) {
  return {
    id: feedback.id,
    journeyId: feedback.journeyId,
    rating: feedback.rating,
    comment: feedback.comment,
    createdAt: feedback.createdAt.toISOString(),
  };
}
