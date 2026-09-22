import type { AuthRepository } from '../repositories/types';

/** How long a mocked login simulates a request before resolving. */
const LOGIN_DELAY_MS = 900;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** No backend yet: login always succeeds after a short delay, logout resolves immediately. */
export function createMockAuthRepository(): AuthRepository {
  return {
    login: () => wait(LOGIN_DELAY_MS),
    logout: async () => {},
  };
}
