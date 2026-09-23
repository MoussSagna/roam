import type { Experience } from '@/types';

import { pickTrending } from './pickTrending';

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

describe('pickTrending', () => {
  it('sorts experiences by rating, highest first', () => {
    const experiences: Experience[] = [
      { ...base, id: 'low', title: 'Low', rating: 4.1 },
      { ...base, id: 'high', title: 'High', rating: 4.9 },
      { ...base, id: 'mid', title: 'Mid', rating: 4.5 },
    ];

    expect(pickTrending(experiences).map((experience) => experience.id)).toEqual([
      'high',
      'mid',
      'low',
    ]);
  });

  it('treats a missing rating as the lowest', () => {
    const experiences: Experience[] = [
      { ...base, id: 'no-rating', title: 'No rating' },
      { ...base, id: 'rated', title: 'Rated', rating: 3.5 },
    ];

    expect(pickTrending(experiences).map((experience) => experience.id)).toEqual([
      'rated',
      'no-rating',
    ]);
  });

  it('caps the result at the given limit', () => {
    const experiences: Experience[] = Array.from({ length: 10 }, (_, index) => ({
      ...base,
      id: `exp-${index}`,
      title: `Exp ${index}`,
      rating: index,
    }));

    expect(pickTrending(experiences, 3)).toHaveLength(3);
  });
});
