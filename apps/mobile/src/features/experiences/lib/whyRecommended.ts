import type { BudgetRange, Experience } from '@/types';

export type WhyReason = 'interests' | 'budget' | 'nearby' | 'openNow';

const IN_BUDGET: readonly BudgetRange[] = ['free', 'under10', '10to25'];
/** Above this, an experience no longer counts as "nearby" for this reason (matches Home's own scale). */
const NEARBY_METERS = 5000;

/** Parses the leading number of a mock distance label ("900 m", "1,2 km"). Same shape as `pickForYou`'s
 * own parser — duplicated rather than imported to keep this feature independent from Home's. */
function parseDistanceMeters(distanceLabel: string | undefined): number {
  if (!distanceLabel) return Number.POSITIVE_INFINITY;
  const value = parseFloat(distanceLabel.replace(',', '.'));
  if (Number.isNaN(value)) return Number.POSITIVE_INFINITY;
  return distanceLabel.includes('km') ? value * 1000 : value;
}

/**
 * Deterministic, explainable "Pourquoi ROAM te le propose ?" reasons (`07_DATA_AND_RECOMMENDATION.md`:
 * human-readable reasons based on actual matched constraints, no numeric score). Each reason is
 * derived from the experience's own data, not a fixed per-item list in the mock content.
 */
export function getWhyRecommended(experience: Experience): WhyReason[] {
  const reasons: WhyReason[] = [];

  if (experience.moods.length > 0) {
    reasons.push('interests');
  }
  if (IN_BUDGET.includes(experience.estimatedBudget)) {
    reasons.push('budget');
  }
  if (parseDistanceMeters(experience.distanceLabel) <= NEARBY_METERS) {
    reasons.push('nearby');
  }
  if (experience.openingHoursLabel) {
    reasons.push('openNow');
  }

  return reasons;
}
