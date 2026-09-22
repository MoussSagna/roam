import { useCallback, useMemo, useState } from 'react';

import type { Experience } from '@/types';

/**
 * Local, in-memory favorite toggle for the Home experience cards (sprint 5 §20): mock only, no
 * backend and no persistence — replace with the real favorites system once it exists. Only the ids
 * the user actually toggled are kept in state (`overrides`); everything else falls back to the mock
 * data's own `isFavorite` seed, so the derived set never needs a `setState` inside an effect.
 */
export function useFavoriteExperienceIds(experiences: readonly Experience[]) {
  const [overrides, setOverrides] = useState<Readonly<Record<string, boolean>>>({});

  const favoriteIds = useMemo(() => {
    const ids = new Set(
      experiences.filter((experience) => experience.isFavorite).map((experience) => experience.id),
    );
    for (const [id, isFavorite] of Object.entries(overrides)) {
      if (isFavorite) {
        ids.add(id);
      } else {
        ids.delete(id);
      }
    }
    return ids;
  }, [experiences, overrides]);

  const toggleFavorite = useCallback(
    (id: string) => {
      setOverrides((current) => {
        const base = experiences.find((experience) => experience.id === id)?.isFavorite ?? false;
        const currentlyFavorite = id in current ? current[id] : base;
        return { ...current, [id]: !currentlyFavorite };
      });
    },
    [experiences],
  );

  return { favoriteIds, toggleFavorite };
}
