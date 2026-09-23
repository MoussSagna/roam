import type { Repositories } from '../repositories/types';

import { createMockAuthRepository } from './auth';
import { categories, collections, experiences, places } from './data';
import { createMockSearchRepository } from './search';
import { createMockUserRepository } from './user';

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
    collections: {
      list: async () => structuredClone(collections),
      getById: async (id) =>
        structuredClone(collections.find((collection) => collection.id === id) ?? null),
    },
    auth: createMockAuthRepository(),
    users: createMockUserRepository(),
    search: createMockSearchRepository(experiences, categories),
  };
}
