import { hasActiveFilters } from './searchFilters';

describe('hasActiveFilters', () => {
  it('is false for no filters', () => {
    expect(hasActiveFilters({})).toBe(false);
  });

  it('is false when every value is explicitly unset/false', () => {
    expect(hasActiveFilters({ openNow: false, walkable: undefined })).toBe(false);
  });

  it('is true for a string/number filter', () => {
    expect(hasActiveFilters({ categoryId: 'cat-bar' })).toBe(true);
    expect(hasActiveFilters({ maxDistanceKm: 5 })).toBe(true);
  });

  it('is true for a boolean filter set to true', () => {
    expect(hasActiveFilters({ openNow: true })).toBe(true);
  });
});
