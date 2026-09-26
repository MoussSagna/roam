import { catalogId } from './catalog-id.js';
import {
  buildCatalogPlan,
  CatalogPlanError,
  cityFromAddress,
  placeKey,
  pricingFromBudget,
} from './catalog-plan.js';
import { MOBILE_MOCK_CATALOG, type MockCatalog } from './mobile-mock-catalog.js';

const plan = buildCatalogPlan(MOBILE_MOCK_CATALOG);
const experience = (mockId: string) => plan.experiences.find((item) => item.mockId === mockId)!;

describe('DATA-1 catalog plan (mobile mocks → canonical model)', () => {
  it('maps every mock experience, place and category — none dropped, none added', () => {
    expect(plan.experiences.map((item) => item.mockId)).toEqual(
      MOBILE_MOCK_CATALOG.experiences.map((item) => item.id),
    );
    expect(plan.places.flatMap((place) => place.mockIds)).toEqual(['place-cafe', 'place-park']);
    expect(plan.categories.map((category) => category.slug)).toEqual([
      'cafe',
      'park',
      'restaurant',
      'bar',
      'culture',
      'nature',
      'experience',
    ]);
  });

  it('gives deterministic ids derived from the mobile ids', () => {
    expect(experience('exp-jazz-night').id).toBe(catalogId('experience', 'exp-jazz-night'));
    expect(plan.places[0].id).toBe(catalogId('place', 'place-cafe'));
    expect(plan.categories[0].id).toBe(catalogId('category', 'cafe'));
    expect(buildCatalogPlan(MOBILE_MOCK_CATALOG)).toEqual(plan);
    const ids = [...plan.experiences, ...plan.places, ...plan.categories].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps mobile categories to canonical slugs and links them', () => {
    expect(experience('exp-slow-afternoon').categorySlugs).toEqual(['cafe', 'park']);
    expect(experience('exp-night-museum').categorySlugs).toEqual(['culture']);
    expect(plan.places.map((place) => place.categorySlugs)).toEqual([['cafe'], ['park']]);
  });

  it('links an experience to its places in order, and only when the mock does', () => {
    expect(experience('exp-slow-afternoon').placeIds).toEqual([
      catalogId('place', 'place-cafe'),
      catalogId('place', 'place-park'),
    ]);
    const withoutPlaces = plan.experiences.filter((item) => item.placeIds.length === 0);
    expect(withoutPlaces).toHaveLength(13);
  });

  it('copies the facts the mocks carry, as they are', () => {
    expect(experience('exp-jazz-night')).toMatchObject({
      title: 'Soirée jazz',
      description: 'Une ambiance feutrée et des standards de jazz jusqu’au bout de la nuit.',
      address: '5 rue Saint-Benoît, 75006 Paris',
      city: 'Paris',
      latitude: 48.854,
      longitude: 2.3339,
      rating: 4.6,
      reviewCount: 198,
    });
    expect(plan.places[1]).toMatchObject({
      name: 'Parc des Buttes',
      description: 'Un grand parc pour se promener.',
      address: 'Rue Botzaris, Paris',
      city: 'Paris',
      latitude: 48.8809,
      longitude: 2.3828,
    });
  });

  it('reads the city from the address, never guesses it', () => {
    expect(cityFromAddress('12 place de la République, 75011 Paris')).toBe('Paris');
    expect(cityFromAddress('Route de Saint-Cyr, 78000 Versailles')).toBe('Versailles');
    expect(cityFromAddress('Rue Botzaris, Paris')).toBe('Paris');
    expect(cityFromAddress('Parvis du Sacré-Cœur')).toBeNull();
    expect(cityFromAddress(undefined)).toBeNull();
    expect(plan.experiences.map((item) => item.city)).toEqual([
      ...Array<string>(4).fill('Paris'),
      'Versailles',
      'Paris',
      'Paris',
      'Trappes',
      ...Array<string>(6).fill('Paris'),
    ]);
  });

  it('turns a budget bracket into its own bounds, never into an invented price', () => {
    expect(pricingFromBudget('free')).toEqual({
      priceLevel: 'FREE',
      priceMin: 0,
      priceMax: 0,
      currency: 'EUR',
    });
    expect(pricingFromBudget('under10')).toEqual({
      priceLevel: 'UNKNOWN',
      priceMin: null,
      priceMax: 10,
      currency: 'EUR',
    });
    expect(pricingFromBudget('10to25')).toMatchObject({
      priceLevel: 'UNKNOWN',
      priceMin: 10,
      priceMax: 25,
    });
    expect(pricingFromBudget('25to50')).toMatchObject({
      priceLevel: 'UNKNOWN',
      priceMin: 25,
      priceMax: 50,
    });
    expect(pricingFromBudget('50plus')).toMatchObject({
      priceLevel: 'UNKNOWN',
      priceMin: 50,
      priceMax: null,
    });
    // The display label ("12 €") is not read: the bracket (under10) decides.
    expect(experience('exp-modern-art-museum')).toMatchObject({ priceMin: null, priceMax: 10 });
    expect(plan.places.map((place) => place.priceLevel)).toEqual(['UNKNOWN', 'FREE']);
  });

  it('keeps the duration in minutes, as ROAM enrichment marked derived', () => {
    expect(plan.experiences.map((item) => item.enrichment.estimatedDurationMin)).toEqual(
      MOBILE_MOCK_CATALOG.experiences.map((item) => item.estimatedDurationMin),
    );
    for (const item of plan.experiences) {
      expect(item.enrichment).toMatchObject({ durationIsDerived: true, source: 'CURATED' });
    }
  });

  it('keeps the mobile tags as ROAM tags and records their basis', () => {
    expect(experience('exp-dinner-view').enrichment).toEqual({
      tags: ['food', 'romantic'],
      estimatedDurationMin: 120,
      durationIsDerived: true,
      source: 'CURATED',
      confidence: {
        tags: { basis: 'mobile_mock_migration', note: 'hand-authored mobile mock value' },
        estimatedDurationMin: {
          basis: 'mobile_mock_migration',
          note: 'hand-authored mobile mock value',
        },
      },
    });
    // No tags on the mock: none invented, the duration still makes an enrichment.
    expect(experience('exp-slow-afternoon').enrichment.tags).toEqual([]);
    expect(plan.places.map((place) => place.enrichment?.tags)).toEqual([['calm'], ['nature']]);
    expect(plan.places[0].enrichment).toMatchObject({
      estimatedDurationMin: null,
      durationIsDerived: false,
    });
  });

  it('reports what it cannot migrate instead of dropping it: moods and place price brackets', () => {
    const moods = plan.notMigrated.filter((item) => item.field === 'moods');
    expect(moods).toHaveLength(14);
    expect(moods[0]).toMatchObject({
      entity: 'experience',
      mockId: 'exp-slow-afternoon',
      value: ['calm'],
    });
    expect(plan.notMigrated.filter((item) => item.field === 'price')).toEqual([
      expect.objectContaining({ entity: 'place', mockId: 'place-cafe', value: 'under10' }),
    ]);
    expect(plan.notMigrated).toHaveLength(15);
  });

  it('invents nothing: no image, schedule, hours or ROAM context the mocks do not carry', () => {
    for (const item of plan.experiences) {
      expect(item).not.toHaveProperty('coverImage');
      expect(item).not.toHaveProperty('images');
      expect(item).not.toHaveProperty('openingHours');
      expect(item).not.toHaveProperty('startDate');
      expect(item).not.toHaveProperty('popularity');
      expect(item.enrichment).not.toHaveProperty('atmosphere');
    }
  });

  it('deduplicates places on normalized name + coordinates and keeps both provenances', () => {
    const duplicated: MockCatalog = {
      ...MOBILE_MOCK_CATALOG,
      places: [
        ...MOBILE_MOCK_CATALOG.places,
        { ...MOBILE_MOCK_CATALOG.places[0], id: 'place-cafe-bis', name: '  CAFE de la  place ' },
      ],
      experiences: [
        { ...MOBILE_MOCK_CATALOG.experiences[0], placeIds: ['place-cafe-bis', 'place-cafe'] },
      ],
    };
    const deduplicated = buildCatalogPlan(duplicated);
    expect(deduplicated.places).toHaveLength(2);
    expect(deduplicated.places[0].mockIds).toEqual(['place-cafe', 'place-cafe-bis']);
    expect(deduplicated.experiences[0].placeIds).toEqual([catalogId('place', 'place-cafe')]);
    // Same name elsewhere is another place.
    expect(placeKey({ name: 'Café', coordinates: { latitude: 48.1, longitude: 2.1 } })).not.toBe(
      placeKey({ name: 'Café', coordinates: { latitude: 48.2, longitude: 2.1 } }),
    );
  });

  it('refuses a catalog with unknown references, unmapped slugs or duplicate ids', () => {
    const broken: MockCatalog = {
      categories: [...MOBILE_MOCK_CATALOG.categories, { id: 'cat-spa', slug: 'spa' }],
      places: MOBILE_MOCK_CATALOG.places,
      experiences: [
        {
          ...MOBILE_MOCK_CATALOG.experiences[0],
          categoryIds: ['cat-unknown'],
          placeIds: ['place-unknown'],
        },
        MOBILE_MOCK_CATALOG.experiences[1],
        MOBILE_MOCK_CATALOG.experiences[1],
      ],
    };
    expect(() => buildCatalogPlan(broken)).toThrow(CatalogPlanError);
    try {
      buildCatalogPlan(broken);
    } catch (error) {
      expect((error as CatalogPlanError).problems).toEqual([
        'duplicate experience id "exp-dinner-view"',
        'category "cat-spa": no mapping for slug "spa"',
        'experience "exp-slow-afternoon": unknown place "place-unknown"',
        'experience "exp-slow-afternoon": unknown category "cat-unknown"',
      ]);
    }
  });
});
