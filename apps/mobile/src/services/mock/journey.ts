import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';
import type { Journey } from '@/types';

import type { JourneyRepository } from '../repositories/types';

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const byMostRecent = (a: Journey, b: Journey) =>
  (b.completedAt ?? '').localeCompare(a.completedAt ?? '');

/**
 * Mock journey store (sprint 10): no backend, so the current journey is kept in memory and persisted
 * with the app's storage helper (`roam.journey.current`), so it survives a restart like the session
 * does. Completed journeys are also kept (`roam.journey.history`, sprint 11), upserted by id when a
 * completed journey is saved, so a new journey replacing the current one never loses the previous
 * one. Returns copies, like a real API would.
 */
export function createMockJourneyRepository(): JourneyRepository {
  let current: Journey | null | undefined;
  let history: Journey[] | undefined;

  async function loadCurrent(): Promise<Journey | null> {
    if (current !== undefined) return current;
    current = parse<Journey | null>(await readStorage(STORAGE_KEYS.journey), null);
    return current;
  }

  async function loadHistory(): Promise<Journey[]> {
    if (history !== undefined) return history;
    history = parse<Journey[]>(await readStorage(STORAGE_KEYS.journeyHistory), []);
    // A journey completed before the history existed (sprint 10) is only the current one.
    const saved = await loadCurrent();
    if (saved?.status === 'completed' && !history.some((item) => item.id === saved.id)) {
      history = [saved, ...history];
    }
    return history;
  }

  async function addToHistory(journey: Journey) {
    const others = (await loadHistory()).filter((item) => item.id !== journey.id);
    history = [journey, ...others].sort(byMostRecent);
    await writeStorage(STORAGE_KEYS.journeyHistory, JSON.stringify(history));
  }

  return {
    getCurrent: async () => structuredClone(await loadCurrent()),
    save: async (journey) => {
      current = structuredClone(journey);
      await writeStorage(STORAGE_KEYS.journey, JSON.stringify(current));
      if (current.status === 'completed') await addToHistory(current);
      return structuredClone(current);
    },
    listCompleted: async () => structuredClone([...(await loadHistory())].sort(byMostRecent)),
    clear: async () => {
      current = null;
      history = [];
      await removeStorage(STORAGE_KEYS.journey);
      await removeStorage(STORAGE_KEYS.journeyHistory);
    },
  };
}
