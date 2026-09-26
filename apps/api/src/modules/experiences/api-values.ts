/**
 * The API's vocabularies are the apps' ones: database enum values (`VERY_HIGH`, `ROAM_RULES`) become camelCase
 * (`veryHigh`, `roamRules`) — the mapping DATABASE_SCHEMA.md puts in the API layer, as users/dto does for the
 * preference values.
 */
export function apiValue(value: string): string {
  return value.toLowerCase().replace(/_([a-z0-9])/g, (_, next: string) => next.toUpperCase());
}

/**
 * The MVP budget brackets (MVP_SCOPE.md §3: Free, < 10 €, 10–25 €, 25–50 €, 50 €+) as the highest lowest-price an
 * experience may have to fit; `undefined`: no ceiling. The catalog is in euros (Paris MVP scope).
 */
export const BUDGET_CEILING_EUR = {
  free: 0,
  under10: 10,
  '10to25': 25,
  '25to50': 50,
  '50plus': undefined,
} as const;

export type Budget = keyof typeof BUDGET_CEILING_EUR;
export const BUDGETS = Object.keys(BUDGET_CEILING_EUR) as Budget[];
