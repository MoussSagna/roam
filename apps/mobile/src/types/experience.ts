import type { ImageSourcePropType } from 'react-native';

import type { BudgetRange, Mood } from './common';

/** A composed outing (several places), not a single place. */
export type Experience = {
  id: string;
  title: string;
  description: string;
  moods: Mood[];
  categoryIds: string[];
  /** Ordered ids of the places it is made of. */
  placeIds: string[];
  estimatedDurationMin: number;
  estimatedBudget: BudgetRange;
  coverImage?: ImageSourcePropType;
  /**
   * Discovery-card display fields (Home, sprint 5). Plain, already-formatted strings, like the rest
   * of the mock content (`docs/DECISIONS.md` D-09/D-10) — no separate formatting layer for mock data.
   */
  location?: string;
  distanceLabel?: string;
  durationLabel?: string;
  priceLabel?: string;
  rating?: number;
  reviewCount?: number;
  isPopular?: boolean;
  /** Featured in the Home hero carousel. */
  isHero?: boolean;
  isFavorite?: boolean;
  tags?: string[];
};
