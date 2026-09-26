import { useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { Experience } from '@/types';

import { useExperience } from './useExperience';

/** The main experience plus the "Suggestions similaires" it points to, resolved through the same
 * repository (`similarExperienceIds` -> `getById`, not a second list endpoint). */
export function useExperienceDetail(id: string | undefined) {
  const { experience, isLoading: isLoadingExperience, error } = useExperience(id);
  const [similarExperiences, setSimilarExperiences] = useState<Experience[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(true);

  useEffect(() => {
    // Wait until `experience` has definitely resolved (found or not) before deciding what to fetch.
    if (isLoadingExperience) return;
    let active = true;
    const ids = experience?.similarExperienceIds ?? [];
    Promise.all(ids.map((similarId) => repositories.experiences.getById(similarId)))
      .then((results) => {
        if (!active) return;
        setSimilarExperiences(results.filter((result): result is Experience => result !== null));
        setIsLoadingSimilar(false);
      })
      .catch(() => {
        // Optional section: the experience itself still shows, without suggestions.
        if (!active) return;
        setSimilarExperiences([]);
        setIsLoadingSimilar(false);
      });
    return () => {
      active = false;
    };
  }, [isLoadingExperience, experience]);

  return {
    experience,
    similarExperiences,
    error,
    isLoading: isLoadingExperience || isLoadingSimilar,
  };
}
