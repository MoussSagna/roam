import { useEffect, useMemo, useState } from 'react';

import { repositories } from '@/services';
import type { Experience } from '@/types';

/**
 * Completed experiences for "Mon historique" (`Screen -> hook -> Repository -> mock`,
 * `DEVELOPMENT.md`). Derived from `Experience.historyPeriod` — no separate history/outing entity, same
 * "extend `Experience`, don't invent a parallel one" precedent as `isFavorite` (`docs/DECISIONS.md` D-57).
 */
export function useHistoryExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const history = useMemo(
    () => experiences.filter((experience) => !!experience.historyPeriod),
    [experiences],
  );

  return { history, isLoading };
}
