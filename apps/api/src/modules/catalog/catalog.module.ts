import { Module } from '@nestjs/common';

import { CategoryRepository } from './category.repository.js';
import { EventRepository } from './event.repository.js';
import { ExperienceRepository } from './experience.repository.js';
import { PlaceRepository } from './place.repository.js';

/**
 * The catalog: experiences, places, events, categories, with their provenance (EXPERIENCE.md, PLACE.md,
 * EVENT.md). Persistence only for now (API-04): read by the future experience / recommendation services,
 * written by the provider pipeline (DATA-1 → DATA-6).
 */
@Module({
  providers: [ExperienceRepository, PlaceRepository, EventRepository, CategoryRepository],
  exports: [ExperienceRepository, PlaceRepository, EventRepository, CategoryRepository],
})
export class CatalogModule {}
