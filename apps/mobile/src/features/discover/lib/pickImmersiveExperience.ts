import type { Experience } from '@/types';

/**
 * Deterministic pick for Discover's single immersive editorial card ("Pour une soirée qui change",
 * sprint 6 §"Section 3"): the first festive-mood experience, or simply the first experience when none
 * matches — same "one simple, explainable rule, no scoring model" precedent as Home's `pickForYou`
 * (`07_DATA_AND_RECOMMENDATION.md`).
 */
export function pickImmersiveExperience(
  experiences: readonly Experience[],
): Experience | undefined {
  return experiences.find((experience) => experience.moods.includes('festive')) ?? experiences[0];
}
