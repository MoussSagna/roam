import { useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { Experience } from '@/types';

/** Loads one experience by id (`Screen -> hook -> Repository -> mock`, `DEVELOPMENT.md`). Shared by
 * the detail and gallery screens so both read the same fields the same way. */
export function useExperience(id: string | undefined) {
  const [experience, setExperience] = useState<Experience | null>(null);
  const [isLoading, setIsLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void repositories.experiences.getById(id).then((result) => {
      if (active) {
        setExperience(result);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  return { experience, isLoading };
}
