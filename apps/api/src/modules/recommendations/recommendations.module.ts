import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module.js';
import { UsersModule } from '../users/users.module.js';
import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationsService } from './recommendations.service.js';

/** The first recommendation layer (API-07): catalog candidates + the user's saved preferences. */
@Module({
  imports: [CatalogModule, UsersModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
