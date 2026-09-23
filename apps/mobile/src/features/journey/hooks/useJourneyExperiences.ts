import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getCategoryLabel } from '@/features/experiences/lib/categoryLabel';
import { useCategories } from '@/hooks/useCategories';
import { repositories } from '@/services';
import type { Experience } from '@/types';

/**
 * The experience pool a journey is built from (`Screen -> hook -> ExperienceRepository -> mock`), with
 * lookup by id and category labels. Unlike Home's loader it surfaces errors and can retry, since the
 * creation flow has a real error state.
 */
export function useJourneyExperiences() {
  const { t } = useTranslation();
  const categories = useCategories();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    repositories.experiences
      .list()
      .then((result) => {
        if (!active) return;
        setExperiences(result);
        setError(false);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
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

  const byId = useMemo(
    () => new Map(experiences.map((experience) => [experience.id, experience])),
    [experiences],
  );

  const categoryLabelFor = useCallback(
    (experience: Experience) => {
      const category = categories.find((item) => experience.categoryIds.includes(item.id));
      return category ? getCategoryLabel(t, category.slug) : null;
    },
    [categories, t],
  );

  return { experiences, byId, isLoading, error, retry, categoryLabelFor };
}
