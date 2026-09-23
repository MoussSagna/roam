import type { ImageSourcePropType } from 'react-native';

import type { BudgetRange, Mood } from './common';

export type ExperienceReview = {
  id: string;
  author: string;
  rating: number;
  /** Already-formatted, like the rest of the mock content (see the note below). */
  date: string;
  comment: string;
};

export type ExperienceTransport = {
  /** e.g. "Métro · Oberkampf". */
  line: string;
  /** e.g. "5 min à pied". */
  walkLabel: string;
};

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
  /**
   * Experience detail fields (sprint 5). Same "plain, already-formatted mock strings" convention as
   * the discovery fields above — no separate formatting layer for mock data.
   */
  images?: ImageSourcePropType[];
  address?: string;
  /** e.g. "18:00 – 02:00". */
  openingHoursLabel?: string;
  transport?: ExperienceTransport;
  /** "À ne pas manquer" — free-form highlights, decorative icons only (label carries the meaning). */
  highlights?: string[];
  reviews?: ExperienceReview[];
  /** Other experience ids shown under "Suggestions similaires". */
  similarExperienceIds?: string[];
  /**
   * "Mon historique" fields (sprint 5). Present only on experiences the user has already completed.
   * `visitedAt` is a plain, already-formatted display string, same convention as `ExperienceReview.date`
   * (`docs/DECISIONS.md` D-09/D-10) — not a real date, so it is never parsed. `historyPeriod` is a
   * precomputed grouping bucket rather than something derived from `visitedAt` at render time: with mock
   * dates fixed in the past, comparing them against the real "today" would only ever resolve to `earlier`
   * as time passes, so the section a mock entry belongs to is authored directly instead.
   */
  visitedAt?: string;
  historyPeriod?: 'thisWeek' | 'thisMonth' | 'earlier';
};
