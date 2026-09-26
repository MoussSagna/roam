import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module.js';
import { ExperiencesController } from './experiences.controller.js';
import { ExperiencesService } from './experiences.service.js';

/** The experience catalog endpoints (API-07), on the catalog repositories (API-04). */
@Module({
  imports: [CatalogModule],
  controllers: [ExperiencesController],
  providers: [ExperiencesService],
})
export class ExperiencesModule {}
