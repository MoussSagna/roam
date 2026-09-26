import { parseDistanceMeters } from '@/features/home/lib/pickForYou';
import type { BudgetRange, Experience, SearchSortOption } from '@/types';

/** Ascending price rank of each budget bracket — the mock pool has no numeric price, so "Prix
 * croissant/décroissant" sorts by this bracket order instead (`02_MVP_SCOPE.md`'s own budget scale). */
const BUDGET_RANK: Record<BudgetRange, number> = {
  free: 0,
  under10: 1,
  '10to25': 2,
  '25to50': 3,
  '50plus': 4,
};

/** Bracket rank for a price sort; an unknown price (API experience without one) always sorts last. */
function compareBudget(a: Experience, b: Experience, direction: 1 | -1): number {
  if (a.estimatedBudget === undefined || b.estimatedBudget === undefined) {
    return Number(a.estimatedBudget === undefined) - Number(b.estimatedBudget === undefined);
  }
  return direction * (BUDGET_RANK[a.estimatedBudget] - BUDGET_RANK[b.estimatedBudget]);
}

/**
 * Entirely local/mocked result ordering (sprint 8 §4): a pure transform of whatever
 * `SearchRepository.search()` already returned, same "no backend logic" spirit as
 * `pickNearby`/`pickTrending`. `recommended` is a no-op — the repository's own order is the
 * recommendation. Every other option sorts a copy; ties keep the repository's original relative order
 * (`Array#sort` is stable), which is what makes `recommended` itself a valid, stable base order.
 */
export function sortResults(results: readonly Experience[], sort: SearchSortOption): Experience[] {
  switch (sort) {
    case 'recommended':
      return [...results];
    case 'nearest':
      return [...results].sort(
        (a, b) => parseDistanceMeters(a.distanceLabel) - parseDistanceMeters(b.distanceLabel),
      );
    case 'topRated':
      return [...results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'priceAsc':
      return [...results].sort((a, b) => compareBudget(a, b, 1));
    case 'priceDesc':
      return [...results].sort((a, b) => compareBudget(a, b, -1));
  }
}
