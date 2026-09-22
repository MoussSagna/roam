import type { BudgetRange, Company } from './common';

/** Profile summary counters shown on the main Profile screen (sprint 5). */
export type UserStats = {
  outings: number;
  placesDiscovered: number;
  favorites: number;
};

export type User = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  /** Optional profile display fields (sprint 5): plain mock content, like place/experience
   * descriptions (docs/DECISIONS.md D-09), not i18n. */
  age?: number;
  city?: string;
  bio?: string;
  stats?: UserStats;
};

/** Onboarding answers (docs/02_MVP_SCOPE.md → Onboarding). */
export type UserPreference = {
  userId: string;
  interests: string[];
  activities: string[];
  usualBudget: BudgetRange;
  maxDistanceKm: number;
  usualCompany: Company;
};
