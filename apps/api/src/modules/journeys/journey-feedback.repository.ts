import { Injectable } from '@nestjs/common';

import { persist, UniqueConstraintError } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { JourneyFeedback as JourneyFeedbackRow } from '../../generated/prisma/client.js';
import {
  type JourneyFeedback,
  JourneyFeedbackExistsError,
  type NewJourneyFeedback,
} from './journey.types.js';

function toJourneyFeedback(row: JourneyFeedbackRow): JourneyFeedback {
  return {
    id: row.id,
    journeyId: row.journeyId,
    userId: row.userId,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt,
  };
}

/**
 * Journey feedback (FEEDBACK.md): one per journey. Whether feedback may be given (a COMPLETED journey of the
 * same user) is the feedback service's rule; PostgreSQL guarantees the rating range (CHECK) and uniqueness.
 */
@Injectable()
export class JourneyFeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByJourneyId(journeyId: string): Promise<JourneyFeedback | null> {
    return persist(async () => {
      const row = await this.prisma.journeyFeedback.findUnique({ where: { journeyId } });
      return row && toJourneyFeedback(row);
    });
  }

  /**
   * Throws `JourneyFeedbackExistsError` when the journey already has one (the service can then return it: the
   * mobile repository answers a repeated submission with the saved feedback).
   */
  async create(feedback: NewJourneyFeedback): Promise<JourneyFeedback> {
    try {
      return await persist(async () =>
        toJourneyFeedback(
          await this.prisma.journeyFeedback.create({
            data: { ...feedback, comment: feedback.comment ?? null },
          }),
        ),
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw new JourneyFeedbackExistsError();
      throw error;
    }
  }
}
