import type { Repositories } from '../repositories/types';

import { createMockAuthRepository } from './auth';
import { categories, experiences, places } from './data';

/** In-memory implementation used until the backend exists. Returns copies, like a real API would. */
export function createMockRepositories(): Repositories {
  return {
    categories: {
      list: async () => structuredClone(categories),
    },
    places: {
      getById: async (id) => structuredClone(places.find((place) => place.id === id) ?? null),
    },
    experiences: {
      list: async () => structuredClone(experiences),
      getById: async (id) =>
        structuredClone(experiences.find((experience) => experience.id === id) ?? null),
    },
    auth: createMockAuthRepository(),
  };
}
