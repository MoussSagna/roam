import type { Experience } from '@/types';

import { sortResults } from './sortResults';

function makeExperience(overrides: Partial<Experience> & { id: string }): Experience {
  return {
    title: overrides.id,
    description: '',
    moods: [],
    categoryIds: [],
    placeIds: [],
    estimatedDurationMin: 60,
    estimatedBudget: 'free',
    ...overrides,
  };
}

const A = makeExperience({
  id: 'a',
  distanceLabel: '3 km',
  rating: 4.0,
  estimatedBudget: '25to50',
});
const B = makeExperience({ id: 'b', distanceLabel: '1 km', rating: 4.8, estimatedBudget: 'free' });
const C = makeExperience({
  id: 'c',
  distanceLabel: '2 km',
  rating: 4.4,
  estimatedBudget: '50plus',
});
const RESULTS = [A, B, C];

function ids(experiences: readonly Experience[]): string[] {
  return experiences.map((experience) => experience.id);
}

describe('sortResults', () => {
  it('recommended: returns a copy, unchanged order', () => {
    const sorted = sortResults(RESULTS, 'recommended');
    expect(ids(sorted)).toEqual(['a', 'b', 'c']);
    expect(sorted).not.toBe(RESULTS);
  });

  it('nearest: ascending distance', () => {
    expect(ids(sortResults(RESULTS, 'nearest'))).toEqual(['b', 'c', 'a']);
  });

  it('topRated: descending rating', () => {
    expect(ids(sortResults(RESULTS, 'topRated'))).toEqual(['b', 'c', 'a']);
  });

  it('priceAsc: ascending budget bracket', () => {
    expect(ids(sortResults(RESULTS, 'priceAsc'))).toEqual(['b', 'a', 'c']);
  });

  it('priceDesc: descending budget bracket', () => {
    expect(ids(sortResults(RESULTS, 'priceDesc'))).toEqual(['c', 'a', 'b']);
  });

  it('treats a missing rating/distance as worst-ranked, without crashing', () => {
    const bare = makeExperience({ id: 'bare' });
    expect(ids(sortResults([...RESULTS, bare], 'nearest'))).toEqual(['b', 'c', 'a', 'bare']);
    expect(ids(sortResults([...RESULTS, bare], 'topRated'))).toEqual(['b', 'c', 'a', 'bare']);
  });

  it('does not mutate the input array', () => {
    const copy = [...RESULTS];
    sortResults(RESULTS, 'nearest');
    expect(RESULTS).toEqual(copy);
  });
});
