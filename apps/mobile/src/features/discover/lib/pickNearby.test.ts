import type { Experience } from '@/types';

import { pickNearby } from './pickNearby';

const base: Pick<
  Experience,
  'description' | 'moods' | 'categoryIds' | 'placeIds' | 'estimatedDurationMin' | 'estimatedBudget'
> = {
  description: '',
  moods: [],
  categoryIds: [],
  placeIds: [],
  estimatedDurationMin: 60,
  estimatedBudget: 'free',
};

describe('pickNearby', () => {
  it('sorts experiences with a distance label, nearest first', () => {
    const experiences: Experience[] = [
      { ...base, id: 'far', title: 'Far', distanceLabel: '3,2 km' },
      { ...base, id: 'near', title: 'Near', distanceLabel: '400 m' },
      { ...base, id: 'mid', title: 'Mid', distanceLabel: '1,1 km' },
    ];

    expect(pickNearby(experiences).map((experience) => experience.id)).toEqual([
      'near',
      'mid',
      'far',
    ]);
  });

  it('excludes experiences with no distance label', () => {
    const experiences: Experience[] = [
      { ...base, id: 'no-distance', title: 'No distance' },
      { ...base, id: 'near', title: 'Near', distanceLabel: '400 m' },
    ];

    expect(pickNearby(experiences).map((experience) => experience.id)).toEqual(['near']);
  });

  it('caps the result at the given limit', () => {
    const experiences: Experience[] = Array.from({ length: 10 }, (_, index) => ({
      ...base,
      id: `exp-${index}`,
      title: `Exp ${index}`,
      distanceLabel: `${index + 1} km`,
    }));

    expect(pickNearby(experiences, 3)).toHaveLength(3);
  });
});
