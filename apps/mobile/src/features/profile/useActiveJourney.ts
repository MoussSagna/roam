import { useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { Experience } from '@/types';

import { ACTIVE_JOURNEY } from './data/activeJourney';

export type ActiveJourney = {
  experience: Experience;
  currentStep: number;
  totalSteps: number;
  nextStep: { title: string; categoryId: string; distanceLabel: string };
};

/**
 * "Parcours en cours" (`Screen -> hook -> Repository -> mock`, `DEVELOPMENT.md`). `journey` is `null`
 * both while loading and if the mock pool ever drops the referenced experience — the same value the
 * empty state (no active journey) renders for, since there is no real "has an active journey"
 * signal to distinguish them from yet.
 */
export function useActiveJourney() {
  const [experience, setExperience] = useState<Experience | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void repositories.experiences.getById(ACTIVE_JOURNEY.experienceId).then((result) => {
      if (active) {
        setExperience(result);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const journey: ActiveJourney | null = experience
    ? {
        experience,
        currentStep: ACTIVE_JOURNEY.currentStep,
        totalSteps: ACTIVE_JOURNEY.totalSteps,
        nextStep: ACTIVE_JOURNEY.nextStep,
      }
    : null;

  return { journey, isLoading };
}
