import { useCallback, useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { Experience } from '@/types';

/** Loads the experience pool once (`Screen -> hook -> Repository`, `DEVELOPMENT.md`). A failed load (API
 * mode: offline, 429, server error) ends loading with `error` set — never an endless "Chargement…" — and
 * `retry` asks again. */
export function useHomeExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    repositories.experiences
      .list()
      .then((result) => {
        if (!active) return;
        setExperiences(result);
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
  }, [attempt]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setAttempt((value) => value + 1);
  }, []);

  return { experiences, isLoading, error, retry };
}
