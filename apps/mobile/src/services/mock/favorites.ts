import type { Experience } from '@/types';

import type { FavoriteRepository } from '../repositories/types';

/**
 * In-memory favorites seeded from the mock `isFavorite` flags — the same seed Home and "Mes favoris" read
 * today. Same contract as the API one (idempotent add/remove, list as the source of truth); not persisted.
 */
export function createMockFavoriteRepository(
  experiences: readonly Experience[],
): FavoriteRepository {
  // Most recently saved first, like the API.
  let ids = experiences
    .filter((experience) => experience.isFavorite)
    .map((experience) => experience.id);

  return {
    listExperienceIds: async () => [...ids],
    add: async (experienceId) => {
      if (!ids.includes(experienceId)) ids = [experienceId, ...ids];
    },
    remove: async (experienceId) => {
      ids = ids.filter((id) => id !== experienceId);
    },
  };
}
