import { useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { Experience } from '@/types';

/** Loads the mock experience pool once (`Screen -> hook -> Repository -> mock`, `DEVELOPMENT.md`). */
export function useHomeExperiences() {
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

  return { experiences, isLoading };
}
