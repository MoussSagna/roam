import type { BudgetRange, Company, Coordinates, Mood } from './common';
import type { Experience } from './experience';

/** Why an item was recommended: the constraints it actually matched (API-07 → "Reasons"). */
export type RecommendationReason = 'nearby' | 'budget' | 'duration' | 'company';

/** A constraint dropped to find alternatives when nothing matched them all (API-07 → "No perfect match"). */
export type RecommendationConstraint = 'budget' | 'distance' | 'duration' | 'company';

/**
 * What the app knows of the user's situation right now. Every field is optional: the API completes budget,
 * company and distance from the saved preferences, and an unknown fact never excludes an experience.
 */
export type RecommendationContext = {
  location?: Coordinates;
  /** 1–50 km; only with a `location`. */
  maxDistanceKm?: number;
  budget?: BudgetRange;
  /** 15–1440 minutes. */
  availableMinutes?: number;
  company?: Company;
  /** The app's category id (`cat-culture`). */
  categoryId?: string;
  /** Mock only: the API has no mood model yet (EXPERIENCE_CATALOG_API.md → "What this layer does not do"). */
  mood?: Mood;
  /** 1–20. */
  limit?: number;
};

export type Recommendation = {
  experience: Experience;
  /** Straight-line distance from `context.location`, when both are known. */
  distanceM?: number;
  reasons: RecommendationReason[];
};

export type Recommendations = {
  items: Recommendation[];
  /** Empty: every constraint matched. */
  relaxed: RecommendationConstraint[];
};
