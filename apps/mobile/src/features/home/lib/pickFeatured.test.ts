import type { Experience } from '@/types';

import { pickHeroExperiences, pickPopularExperiences } from './pickFeatured';

const experience = (id: string, extra: Partial<Experience> = {}): Experience => ({
  id,
  title: id,
  description: '',
  moods: [],
  categoryIds: [],
  placeIds: [],
  ...extra,
});

describe('pickHeroExperiences', () => {
  it('keeps the editorial flag when there is one (mock data)', () => {
    const pool = [experience('a', { rating: 5 }), experience('b', { isHero: true, rating: 3 })];
    expect(pickHeroExperiences(pool).map((item) => item.id)).toEqual(['b']);
  });

  it('without any flag (API data), shows the best-rated, at most five', () => {
    const pool = [1, 4.9, 3, 4.5, 2, 4, 4.8].map((rating, index) =>
      experience(`e${index}`, { rating }),
    );
    expect(pickHeroExperiences(pool).map((item) => item.rating)).toEqual([4.9, 4.8, 4.5, 4, 3]);
  });

  it('is empty for an empty pool', () => {
    expect(pickHeroExperiences([])).toEqual([]);
  });
});

describe('pickPopularExperiences', () => {
  it('keeps the mock flag when there is one', () => {
    const pool = [experience('a', { reviewCount: 900 }), experience('b', { isPopular: true })];
    expect(pickPopularExperiences(pool).map((item) => item.id)).toEqual(['b']);
  });

  it('without any flag, shows the most reviewed; never an experience without reviews', () => {
    const pool = [
      experience('few', { reviewCount: 10 }),
      experience('none'),
      experience('many', { reviewCount: 400 }),
    ];
    expect(pickPopularExperiences(pool).map((item) => item.id)).toEqual(['many', 'few']);
  });
});
