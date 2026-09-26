import type { ExperienceDetail } from '../../catalog/catalog.types.js';
import { apiValue } from '../api-values.js';
import { ExperienceDetailResponse, ExperienceResponse } from './experience.dto.js';

const place = {
  id: 'p1',
  name: 'Café',
  description: null,
  address: null,
  city: 'Paris',
  latitude: 48.86,
  longitude: 2.34,
  photos: [],
  openingHours: null,
  priceLevel: 'LOW' as const,
  rating: null,
  reviewCount: null,
  attributes: { wifi: true },
  isActive: true,
  categorySlugs: ['cafe'],
  enrichment: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const detail: ExperienceDetail = {
  id: 'x1',
  title: 'Musée puis café',
  description: null,
  address: null,
  city: 'Paris',
  latitude: null,
  longitude: null,
  coverImage: null,
  images: [],
  startDate: null,
  endDate: null,
  openingHours: null,
  priceLevel: 'VERY_HIGH',
  priceMin: 12.5,
  priceMax: null,
  currency: 'EUR',
  rating: 4.5,
  reviewCount: 10,
  popularity: 0.93,
  isActive: true,
  categorySlugs: ['culture'],
  placeIds: ['p1'],
  enrichment: {
    atmosphere: ['COZY'],
    energyLevel: 'LOW',
    suitableFor: ['COUPLE'],
    bestMoments: ['EVENING'],
    tags: [],
    estimatedDurationMin: 90,
    durationIsDerived: true,
    source: 'ROAM_RULES',
    confidence: { energyLevel: { confidence: 0.8 } },
  },
  places: [place],
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

describe('experience DTOs', () => {
  it('database enum values become the apps’ camelCase values', () => {
    expect(['VERY_HIGH', 'ROAM_RULES', 'USER_FEEDBACK', 'LOW'].map(apiValue)).toEqual([
      'veryHigh',
      'roamRules',
      'userFeedback',
      'low',
    ]);
  });

  it('provider facts at the top, ROAM context grouped under `roam`; internals left out', () => {
    const response = ExperienceDetailResponse.fromDetail(detail);

    expect(response).toMatchObject({
      priceLevel: 'veryHigh',
      categories: ['culture'],
      coordinates: null,
      roam: {
        energyLevel: 'low',
        suitableFor: ['couple'],
        bestMoments: ['evening'],
        estimatedDurationMin: 90,
        durationIsDerived: true,
        source: 'roamRules',
      },
    });
    // Internal: ranking metric, rule confidence, provider attributes, timestamps.
    const text = JSON.stringify(response);
    for (const internal of ['popularity', 'confidence', 'attributes', 'createdAt', 'updatedAt']) {
      expect(text).not.toContain(internal);
    }
    expect(response.places[0]).toMatchObject({
      id: 'p1',
      coordinates: { latitude: 48.86, longitude: 2.34 },
      categories: ['cafe'],
      roam: null,
    });
  });

  it('no enrichment: `roam` is null (nothing invented)', () => {
    expect(ExperienceResponse.from({ ...detail, enrichment: null }).roam).toBeNull();
  });
});
