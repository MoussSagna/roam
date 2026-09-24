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

/**
 * Profile → "Mes préférences" (sprint 5): a purpose-built shape, not `UserPreference` — the budget
 * here is a continuous per-person amount (a slider), not the onboarding's discrete `BudgetRange`
 * bucket, and `ambiance` mixes mood- and company-like tags that don't map to `Mood`/`Company`. Local
 * screen state only for now (docs/DECISIONS.md); no repository, nothing persisted.
 */
export type ProfilePreferences = {
  experienceTypes: string[];
  ambiance: string[];
  budgetPerPerson: number;
  maxDistanceKm: number;
};
