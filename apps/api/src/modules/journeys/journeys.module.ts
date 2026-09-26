import { Module } from '@nestjs/common';

import { JourneyFeedbackRepository } from './journey-feedback.repository.js';
import { JourneyRepository } from './journey.repository.js';

/**
 * Journeys and their feedback (JOURNEY.md, FEEDBACK.md). Persistence only for now (API-04): the journey and
 * feedback services and their endpoints come with the next steps.
 */
@Module({
  providers: [JourneyRepository, JourneyFeedbackRepository],
  exports: [JourneyRepository, JourneyFeedbackRepository],
})
export class JourneysModule {}
