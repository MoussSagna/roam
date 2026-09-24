import type { Experience } from '@/types';

import { pickImmersiveExperience } from './pickImmersiveExperience';

const base: Pick<
  Experience,
  'description' | 'categoryIds' | 'placeIds' | 'estimatedDurationMin' | 'estimatedBudget'
> = {
  description: '',
  categoryIds: [],
  placeIds: [],
  estimatedDurationMin: 60,
  estimatedBudget: 'free',
};

describe('pickImmersiveExperience', () => {
  it('picks the first festive-mood experience', () => {
    const experiences: Experience[] = [
      { ...base, id: 'calm-1', title: 'Calm', moods: ['calm'] },
      { ...base, id: 'festive-1', title: 'Festive', moods: ['festive'] },
      { ...base, id: 'festive-2', title: 'Also festive', moods: ['festive'] },
    ];

    expect(pickImmersiveExperience(experiences)?.id).toBe('festive-1');
  });

  it('falls back to the first experience when none is festive', () => {
    const experiences: Experience[] = [
      { ...base, id: 'calm-1', title: 'Calm', moods: ['calm'] },
      { ...base, id: 'culture-1', title: 'Culture', moods: ['culture'] },
    ];

    expect(pickImmersiveExperience(experiences)?.id).toBe('calm-1');
  });

  it('returns undefined for an empty pool', () => {
    expect(pickImmersiveExperience([])).toBeUndefined();
  });
});
