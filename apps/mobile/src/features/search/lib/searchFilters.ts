import type { SearchFilters } from '@/types';

/** Whether any filter is actually set — drives the "Filtrer" action chip's `selected` state (sprint 8
 * §5), same idea as a filter-count badge elsewhere in the app, kept to a boolean since the chip has no
 * numeric badge slot. */
export function hasActiveFilters(filters: SearchFilters): boolean {
  return Object.values(filters).some((value) => value !== undefined && value !== false);
}
