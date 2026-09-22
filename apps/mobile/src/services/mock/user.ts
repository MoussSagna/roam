import type { UserRepository } from '../repositories/types';

import { currentUser } from './data';

/** No backend yet: always resolves the same mocked profile. */
export function createMockUserRepository(): UserRepository {
  return {
    getCurrentUser: async () => structuredClone(currentUser),
  };
}
