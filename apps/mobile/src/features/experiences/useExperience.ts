import { useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { Experience } from '@/types';

/** Loads one experience by id (`Screen -> hook -> Repository`, `DEVELOPMENT.md`). Shared by the detail
 * and gallery screens so both read the same fields the same way. `experience: null` without `error` is
 * "no such experience"; `error` is a failed request (API mode), so the screen can tell them apart. */
export function useExperience(id: string | undefined) {
  const [experience, setExperience] = useState<Experience | null>(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    repositories.experiences
      .getById(id)
      .then((result) => {
        if (!active) return;
        setExperience(result);
        setError(null);
        setIsLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return { experience, isLoading, error };
}
