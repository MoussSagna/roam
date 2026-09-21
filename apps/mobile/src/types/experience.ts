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
  coverImageUrl?: string;
};
