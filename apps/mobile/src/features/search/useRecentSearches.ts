import { useCallback, useEffect, useState } from 'react';

import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';
import type { RecentSearch } from '@/types';

const MAX_RECENT_SEARCHES = 10;

function normalizeId(query: string): string {
  return query.trim().toLowerCase();
}

async function persist(recentSearches: readonly RecentSearch[]): Promise<void> {
  await writeStorage(STORAGE_KEYS.recentSearches, JSON.stringify(recentSearches));
}

/**
 * Recent searches (sprint 6 brief §13): add / list / remove / relaunch, persisted locally through the
 * existing `lib/storage.ts` `AsyncStorage` wrapper (same abstraction as theme/language) — no backend.
 * Newest first, capped at `MAX_RECENT_SEARCHES`, deduped by normalized query text (a repeat search
 * moves back to the front rather than creating a second entry).
 */
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    let active = true;
    readStorage(STORAGE_KEYS.recentSearches).then((raw) => {
      if (!active || !raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      } catch {
        // Corrupted/legacy value: ignored, same defensive style as the rest of `lib/storage.ts`.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setRecentSearches((current) => {
      const id = normalizeId(trimmed);
      const withoutDuplicate = current.filter((entry) => entry.id !== id);
      const next = [
        { id, query: trimmed, searchedAt: new Date().toISOString() },
        ...withoutDuplicate,
      ].slice(0, MAX_RECENT_SEARCHES);
      void persist(next);
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback((id: string) => {
    setRecentSearches((current) => {
      const next = current.filter((entry) => entry.id !== id);
      void persist(next);
      return next;
    });
  }, []);

  return { recentSearches, addRecentSearch, removeRecentSearch };
}
