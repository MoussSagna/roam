import type { Experience } from '@/types';

const HERO_LIMIT = 5;
const POPULAR_LIMIT = 6;

const byRating = (a: Experience, b: Experience) => (b.rating ?? 0) - (a.rating ?? 0);
const byReviewCount = (a: Experience, b: Experience) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0);

/**
 * Home's hero carousel: the experiences flagged `isHero` (editorial mock flag). The API serves no such
 * flag (DATA-1 did not migrate it, no editorial model yet), so without any flagged experience the hero
 * shows the best-rated ones — a presentation rule on real facts (the rating), not a made-up flag; it
 * stops applying as soon as flags exist again.
 */
export function pickHeroExperiences(experiences: readonly Experience[]): Experience[] {
  const flagged = experiences.filter((experience) => experience.isHero);
  if (flagged.length > 0) return flagged;
  return [...experiences].sort(byRating).slice(0, HERO_LIMIT);
}

/**
 * "Populaires": the experiences flagged `isPopular` (mock), otherwise — API mode, no popularity signal
 * served (`popularity` stays internal to the API) — the most reviewed ones.
 */
export function pickPopularExperiences(experiences: readonly Experience[]): Experience[] {
  const flagged = experiences.filter((experience) => experience.isPopular);
  if (flagged.length > 0) return flagged;
  return [...experiences]
    .filter((experience) => (experience.reviewCount ?? 0) > 0)
    .sort(byReviewCount)
    .slice(0, POPULAR_LIMIT);
}
