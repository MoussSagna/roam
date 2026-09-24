import type { Experience } from '@/types';

/**
 * Deterministic "Ce qui fait envie en ce moment" pool (Discover, sprint 6 §"Section 5"): highest-rated
 * first. Simple, explainable rule, no scoring model — same spirit as `pickForYou`/`pickNearby`.
 */
export function pickTrending(experiences: readonly Experience[], limit = 8): Experience[] {
  return [...experiences].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, limit);
}
