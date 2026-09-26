import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module.js';
import { FavoriteRepository } from './favorite.repository.js';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';

/**
 * Favorite experiences (mobile D-57): the favorites endpoints (API-10, FAVORITES_API.md) on the favorite repository
 * (API-04) and the catalog's experiences.
 */
@Module({
  imports: [CatalogModule],
  controllers: [FavoritesController],
  providers: [FavoriteRepository, FavoritesService],
  exports: [FavoriteRepository],
})
export class FavoritesModule {}
