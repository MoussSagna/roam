import type { Place } from '../catalog/catalog.types.js';
import { assessPlaceQuality } from './place-quality.js';

const place = (overrides: Partial<Place> = {}): Place => ({
  id: 'p1',
  name: 'Café Test',
  description: null,
  address: '1 Rue Test, Paris',
  city: 'Paris',
  latitude: 48.86,
  longitude: 2.35,
  photos: [],
  openingHours: null,
  priceLevel: 'LOW',
  rating: 4.2,
  reviewCount: 12,
  attributes: null,
  website: null,
  rnbId: null,
  isActive: true,
  categorySlugs: ['cafe'],
  enrichment: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('assessPlaceQuality', () => {
  it('a complete Google-like place is recommendation-ready, nothing missing', () => {
    expect(assessPlaceQuality(place())).toEqual({
      recommendationReady: true,
      issues: [],
      missingFacts: [],
      enriched: false,
    });
  });

  it('a Geoapify-like place (no rating, reviews or price) is still ready: missing facts are reported, not filled', () => {
    const quality = assessPlaceQuality(
      place({ priceLevel: 'UNKNOWN', rating: null, reviewCount: null }),
    );
    expect(quality).toMatchObject({
      recommendationReady: true,
      issues: [],
      missingFacts: ['priceLevel', 'rating', 'reviewCount'],
    });
  });

  it.each([
    [{ name: '  ' }, 'MISSING_NAME'],
    [{ latitude: 95 }, 'INVALID_COORDINATES'],
    [{ longitude: Number.NaN }, 'INVALID_COORDINATES'],
    [{ categorySlugs: [] }, 'NO_CATEGORY'],
    [{ isActive: false }, 'INACTIVE'],
  ])('%o → not ready (%s)', (overrides, issue) => {
    const quality = assessPlaceQuality(place(overrides));
    expect(quality.recommendationReady).toBe(false);
    expect(quality.issues).toEqual([issue]);
  });

  it('reports a missing address and city', () => {
    expect(assessPlaceQuality(place({ address: null, city: null })).missingFacts).toEqual([
      'address',
      'city',
    ]);
  });

  it('reports whether the place is enriched, without blocking it', () => {
    const enriched = assessPlaceQuality(
      place({
        enrichment: {
          atmosphere: [],
          energyLevel: 'UNKNOWN',
          suitableFor: [],
          bestMoments: [],
          tags: [],
          estimatedDurationMin: 45,
          durationIsDerived: true,
          source: 'ROAM_RULES',
          confidence: null,
        },
      }),
    );
    expect(enriched).toMatchObject({ enriched: true, recommendationReady: true });
  });
});
