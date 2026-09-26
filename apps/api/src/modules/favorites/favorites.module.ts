import { Module } from '@nestjs/common';

import { FavoriteRepository } from './favorite.repository.js';

/** Favorite experiences (mobile D-57). Persistence only for now (API-04). */
@Module({
  providers: [FavoriteRepository],
  exports: [FavoriteRepository],
})
export class FavoritesModule {}
