import type { FavoriteRepository } from '../../repositories/types';
import type { ApiClient } from '../apiClient';
import type { FavoriteDto } from '../dto';
import { fetchAllPages } from '../pagination';

/**
 * `FavoriteRepository` on the favorites API (`apps/api/apidocs/FAVORITES_API.md`): the list is the source
 * of truth for "is this a favorite" — there is no per-experience check endpoint, and none is called.
 * Prepared in DATA-8; no screen uses it yet (the Favorites UI migration is a later sprint).
 */
export function createApiFavoriteRepository(client: ApiClient): FavoriteRepository {
  return {
    async listExperienceIds() {
      const favorites = await fetchAllPages<FavoriteDto>(client, '/favorites');
      return favorites.map((favorite) => favorite.experienceId);
    },
    async add(experienceId) {
      await client.post<FavoriteDto>('/favorites', { experienceId });
    },
    async remove(experienceId) {
      await client.delete(`/favorites/${encodeURIComponent(experienceId)}`);
    },
  };
}
