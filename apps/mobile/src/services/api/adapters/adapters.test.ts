import i18n from '@/i18n';
import { categories } from '@/services/mock/data';

import type { ExperienceDto, UserDto } from '../dto';

import { budgetRangeFromPrice, formatPriceLabel, mapExperienceDto } from './experience';
import { mapUserDto } from './user';

const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key as never, options as never) as unknown as string;
const context = { categories, t };

function experienceDto(overrides: Partial<ExperienceDto> = {}): ExperienceDto {
  return {
    id: '5f0c2d6a-0000-5000-8000-000000000001',
    title: 'Soirée jazz',
    description: 'Un club intimiste.',
    categories: ['bar', 'culture'],
    city: 'Paris',
    address: '12 rue des Lombards, 75004 Paris',
    coordinates: { latitude: 48.8594, longitude: 2.3488 },
    coverImage: null,
    images: [],
    priceLevel: 'unknown',
    priceMin: 10,
    priceMax: 25,
    currency: 'EUR',
    rating: 4.7,
    reviewCount: 320,
    placeIds: [],
    isActive: true,
    roam: {
      atmosphere: [],
      energyLevel: 'unknown',
      suitableFor: [],
      bestMoments: [],
      tags: ['jazz', 'live'],
      estimatedDurationMin: 150,
      durationIsDerived: true,
      source: 'curated',
    },
    ...overrides,
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('fr');
});

describe('mapExperienceDto', () => {
  it('maps every served field to the app model and formats the labels', () => {
    expect(mapExperienceDto(experienceDto(), context)).toEqual({
      id: '5f0c2d6a-0000-5000-8000-000000000001',
      title: 'Soirée jazz',
      description: 'Un club intimiste.',
      moods: [],
      categoryIds: ['cat-bar', 'cat-culture'],
      placeIds: [],
      estimatedDurationMin: 150,
      estimatedBudget: '10to25',
      coverImage: undefined,
      images: undefined,
      location: 'Paris',
      coordinates: { latitude: 48.8594, longitude: 2.3488 },
      durationLabel: '2 h 30',
      priceLabel: '10–25 €',
      rating: 4.7,
      reviewCount: 320,
      tags: ['jazz', 'live'],
      address: '12 rue des Lombards, 75004 Paris',
    });
  });

  it('invents nothing the API does not serve', () => {
    const experience = mapExperienceDto(experienceDto(), context);

    expect(experience.moods).toEqual([]);
    for (const field of [
      'distanceLabel',
      'openingHoursLabel',
      'transport',
      'highlights',
      'reviews',
      'similarExperienceIds',
      'isHero',
      'isPopular',
      'isFavorite',
      'visitedAt',
      'historyPeriod',
    ] as const) {
      expect(experience[field]).toBeUndefined();
    }
  });

  it('turns image URLs into image sources, and keeps no image when there is none', () => {
    const withImages = mapExperienceDto(
      experienceDto({
        coverImage: 'https://img.test/a.jpg',
        images: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
      }),
      context,
    );
    expect(withImages.coverImage).toEqual({ uri: 'https://img.test/a.jpg' });
    expect(withImages.images).toEqual([
      { uri: 'https://img.test/a.jpg' },
      { uri: 'https://img.test/b.jpg' },
    ]);

    const without = mapExperienceDto(experienceDto(), context);
    expect(without.coverImage).toBeUndefined();
    expect(without.images).toBeUndefined();
  });

  it('keeps nulls as absent values (no enrichment, no price, no place facts)', () => {
    const experience = mapExperienceDto(
      experienceDto({
        description: null,
        city: null,
        address: null,
        coordinates: null,
        priceMin: null,
        priceMax: null,
        currency: null,
        rating: null,
        reviewCount: null,
        roam: null,
      }),
      context,
    );

    expect(experience).toMatchObject({ description: '', moods: [] });
    for (const field of [
      'location',
      'address',
      'coordinates',
      'estimatedBudget',
      'priceLabel',
      'estimatedDurationMin',
      'durationLabel',
      'rating',
      'reviewCount',
      'tags',
    ] as const) {
      expect(experience[field]).toBeUndefined();
    }
  });

  it('keeps an unknown category slug as its own id instead of dropping it', () => {
    expect(
      mapExperienceDto(experienceDto({ categories: ['museum'] }), context).categoryIds,
    ).toEqual(['museum']);
  });
});

describe('budgetRangeFromPrice (inverse of the DATA-1 bracket → bounds mapping)', () => {
  it.each([
    [0, 0, 'free', 'free'],
    [null, 10, 'unknown', 'under10'],
    [10, 25, 'unknown', '10to25'],
    [25, 50, 'unknown', '25to50'],
    [50, null, 'unknown', '50plus'],
    [12, 12, 'medium', '10to25'],
    [30, null, 'unknown', '25to50'],
    [null, null, 'free', 'free'],
    [null, null, 'unknown', undefined],
  ] as const)('min %p max %p level %p → %p', (priceMin, priceMax, level, expected) => {
    expect(budgetRangeFromPrice(priceMin, priceMax, level)).toBe(expected);
  });
});

describe('formatPriceLabel', () => {
  const label = (overrides: Partial<ExperienceDto>) =>
    formatPriceLabel(experienceDto(overrides), t);

  it('formats from the price facts, in the current language', () => {
    expect(label({ priceMin: 0, priceMax: 0, priceLevel: 'free' })).toBe('Gratuit');
    expect(label({ priceMin: 12, priceMax: 12 })).toBe('12 €');
    expect(label({ priceMin: 10, priceMax: 25 })).toBe('10–25 €');
    expect(label({ priceMin: null, priceMax: 10 })).toBe("Jusqu'à 10 €");
    expect(label({ priceMin: 50, priceMax: null })).toBe('À partir de 50 €');
    expect(label({ priceMin: null, priceMax: null })).toBeUndefined();
  });

  it('follows the language and the currency', async () => {
    await i18n.changeLanguage('en');
    expect(label({ priceMin: 0, priceMax: 0 })).toBe('Free');
    expect(label({ priceMin: null, priceMax: 10, currency: 'CHF' })).toBe('Up to 10 CHF');
  });
});

describe('mapUserDto', () => {
  const dto: UserDto = {
    id: 'u1',
    email: 'lea@example.com',
    displayName: 'Léa',
    avatarUrl: null,
    age: 28,
    city: null,
    bio: null,
  };

  it('maps the public profile; nulls become absent fields; stats are not served', () => {
    expect(mapUserDto(dto)).toEqual({
      id: 'u1',
      email: 'lea@example.com',
      displayName: 'Léa',
      avatarUrl: undefined,
      age: 28,
      city: undefined,
      bio: undefined,
    });
    expect(mapUserDto(dto).stats).toBeUndefined();
  });
});
