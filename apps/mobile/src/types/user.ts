import type { BudgetRange, Company } from './common';

export type User = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
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
