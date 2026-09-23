import { useCallback, useEffect, useMemo, useState } from 'react';

import { repositories } from '@/services';
import type { Experience } from '@/types';

/**
 * Favorited experiences for "Mes favoris" (`Screen -> hook -> Repository -> mock`,
 * `DEVELOPMENT.md`). Seeded from `Experience.isFavorite` like Home's own toggle
 * (`useFavoriteExperienceIds`, `docs/DECISIONS.md` D-45); removals are local-only state on top of
 * that seed, not a shared favorites store — this screen and Home do not sync with each other today
 * (no backend, no global store), same known gap as Home's own local-only toggle.
 */
export function useFavoriteExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let active = true;
    void repositories.experiences.list().then((result) => {
      if (active) {
        setExperiences(result);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const favorites = useMemo(
    () =>
      experiences.filter((experience) => experience.isFavorite && !removedIds.has(experience.id)),
    [experiences, removedIds],
  );

  const removeFavorite = useCallback((id: string) => {
    setRemovedIds((current) => new Set(current).add(id));
  }, []);

  return { favorites, isLoading, removeFavorite };
}
