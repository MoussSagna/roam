import { Module } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { JourneyFeedbackController } from './journey-feedback.controller.js';
import { JourneyFeedbackRepository } from './journey-feedback.repository.js';
import { JourneyFeedbackService } from './journey-feedback.service.js';
import { JourneyRepository } from './journey.repository.js';
import { JourneysController } from './journeys.controller.js';
import { JourneysService } from './journeys.service.js';

/**
 * Journeys and their feedback (JOURNEY.md, FEEDBACK.md): the journey endpoints (API-08, JOURNEY_API.md) on the journey
 * repository (API-04) and the catalog's experiences, and the journey feedback endpoints (API-09, JOURNEY_FEEDBACK_API.md).
 */
@Module({
  imports: [CatalogModule],
  controllers: [JourneysController, JourneyFeedbackController],
  providers: [
    JourneyRepository,
    JourneyFeedbackRepository,
    JourneysService,
    JourneyFeedbackService,
    Clock,
  ],
  exports: [JourneyRepository, JourneyFeedbackRepository],
})
export class JourneysModule {}
