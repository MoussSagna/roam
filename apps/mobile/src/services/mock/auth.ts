import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';

import type { AuthRepository } from '../repositories/types';

/** How long a mocked login simulates a request before resolving. */
const LOGIN_DELAY_MS = 900;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock mode (`EXPO_PUBLIC_DATA_SOURCE=mock`): no backend, any credentials "succeed" after a short delay
 * (D-28, D-31). The session is only a persisted "signed in" flag — no token and no password is ever kept
 * (`docs/DECISIONS.md`). It never expires, so `onSessionExpired` never fires.
 */
export function createMockAuthRepository(): AuthRepository {
  const signIn = async () => {
    await wait(LOGIN_DELAY_MS);
    await writeStorage(STORAGE_KEYS.session, 'true');
  };

  return {
    restoreSession: async () => (await readStorage(STORAGE_KEYS.session)) === 'true',
    login: signIn,
    register: signIn,
    logout: async () => {
      await writeStorage(STORAGE_KEYS.session, 'false');
    },
    onSessionExpired: () => () => {},
  };
}
