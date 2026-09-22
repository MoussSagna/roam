import type { Experience } from '@/types';

import { pickForYou } from './pickForYou';

const experiences: Experience[] = [
  {
    id: 'calm-1',
    title: 'Calm pick',
    description: '',
    moods: ['calm'],
    categoryIds: ['cat-park'],
    placeIds: [],
    estimatedDurationMin: 60,
    estimatedBudget: 'free',
    distanceLabel: '5 km',
  },
  {
    id: 'culture-1',
    title: 'Culture pick',
    description: '',
    moods: ['culture'],
    categoryIds: ['cat-culture'],
    placeIds: [],
    estimatedDurationMin: 60,
    estimatedBudget: 'under10',
    distanceLabel: '3 km',
  },
  {
    id: 'popular-1',
    title: 'Most popular',
    description: '',
    moods: ['festive'],
    categoryIds: ['cat-bar'],
    placeIds: [],
    estimatedDurationMin: 60,
    estimatedBudget: '10to25',
    isPopular: true,
    rating: 4.9,
    distanceLabel: '10 km',
  },
  {
    id: 'popular-2',
    title: 'Less popular',
    description: '',
    moods: ['festive'],
    categoryIds: ['cat-bar'],
    placeIds: [],
    estimatedDurationMin: 60,
    estimatedBudget: '10to25',
    isPopular: true,
    rating: 4.2,
    distanceLabel: '2 km',
  },
  {
    id: 'nearest-1',
    title: 'Nearest',
    description: '',
    moods: ['discover'],
    categoryIds: ['cat-park'],
    placeIds: [],
    estimatedDurationMin: 60,
    estimatedBudget: 'free',
    distanceLabel: '200 m',
  },
];

describe('pickForYou', () => {
  it('picks a mood match, a culture-category match, the top-rated popular pick and the nearest one', () => {
    const picks = pickForYou(experiences, 'calm');

    expect(picks.map((experience) => experience.id)).toEqual([
      'calm-1',
      'culture-1',
      'popular-1',
      'nearest-1',
    ]);
  });

  it('never returns the same experience twice', () => {
    const onlyOne = pickForYou([experiences[0]], 'calm');
    expect(onlyOne).toHaveLength(1);
  });

  it('tops up with the remaining pool when fewer than the limit match a rule', () => {
    const picks = pickForYou(experiences, 'romantic', 5);
    const ids = picks.map((experience) => experience.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(picks).toHaveLength(5);
  });

  it('returns an empty array for an empty pool', () => {
    expect(pickForYou([], 'calm')).toEqual([]);
  });
});
