import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';
import type { Journey } from '@/types';

import type { JourneyRepository } from '../repositories/types';

/**
 * Mock journey store (sprint 10): no backend, so the current journey is kept in memory and persisted
 * with the app's storage helper (`roam.journey.current`), so it survives a restart like the session
 * does. Returns copies, like a real API would.
 */
export function createMockJourneyRepository(): JourneyRepository {
  let current: Journey | null | undefined;

  async function load(): Promise<Journey | null> {
    if (current !== undefined) return current;
    const raw = await readStorage(STORAGE_KEYS.journey);
    try {
      current = raw ? (JSON.parse(raw) as Journey) : null;
    } catch {
      current = null;
    }
    return current;
  }

  return {
    getCurrent: async () => structuredClone(await load()),
    save: async (journey) => {
      current = structuredClone(journey);
      await writeStorage(STORAGE_KEYS.journey, JSON.stringify(current));
      return structuredClone(current);
    },
    clear: async () => {
      current = null;
      await removeStorage(STORAGE_KEYS.journey);
    },
  };
}
