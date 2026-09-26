import { Module } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { JourneyFeedbackRepository } from './journey-feedback.repository.js';
import { JourneyRepository } from './journey.repository.js';
import { JourneysController } from './journeys.controller.js';
import { JourneysService } from './journeys.service.js';

/**
 * Journeys and their feedback (JOURNEY.md, FEEDBACK.md): the journey endpoints (API-08, JOURNEY_API.md) on the journey
 * repository (API-04) and the catalog's experiences. The feedback repository is ready; its endpoints come later.
 */
@Module({
  imports: [CatalogModule],
  controllers: [JourneysController],
  providers: [JourneyRepository, JourneyFeedbackRepository, JourneysService, Clock],
  exports: [JourneyRepository, JourneyFeedbackRepository],
})
export class JourneysModule {}
