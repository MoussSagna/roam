import type { GeoapifyPlaceDto } from './geoapify.dto.js';
import {
  GEOAPIFY_CATEGORY_TO_CATEGORY,
  geoapifyCategoriesForCategories,
  mapGeoapifyPlaceToRoamPlace,
  parseGeoapifyExternalId,
} from './geoapify.mapper.js';

/** The ROAM categories of DATA-1 (catalog seed): the only slugs a mapping may produce. */
const ROAM_CATEGORIES = ['cafe', 'park', 'restaurant', 'bar', 'culture', 'nature', 'experience'];

const PLACE: GeoapifyPlaceDto = {
  osmType: 'node',
  osmId: '2152981900',
  name: '  Café Beaubourg ',
  lat: 48.8600106,
  lon: 2.3509612,
  formatted: 'Café Beaubourg, 43 Rue Saint-Merri, 75004 Paris, France',
  addressLine1: 'Café Beaubourg',
  addressLine2: '43 Rue Saint-Merri, 75004 Paris, France',
  city: 'Paris',
  categories: ['catering', 'catering.cafe', 'wheelchair', 'wheelchair.yes'],
};

describe('mapGeoapifyPlaceToRoamPlace', () => {
  it('maps the Geoapify facts to the normalized place, with provenance', () => {
    expect(mapGeoapifyPlaceToRoamPlace(PLACE)).toEqual({
      source: {
        providerKey: 'geoapify',
        externalId: 'node/2152981900',
        externalUrl: null,
        providerCategories: ['catering', 'catering.cafe', 'wheelchair', 'wheelchair.yes'],
      },
      name: 'Café Beaubourg',
      address: '43 Rue Saint-Merri, 75004 Paris, France',
      city: 'Paris',
      latitude: 48.8600106,
      longitude: 2.3509612,
      priceLevel: 'UNKNOWN',
      rating: null,
      reviewCount: null,
      isActive: true,
      categorySlugs: ['cafe'],
    });
  });

  it('address: `formatted` when its first line is not the place name', () => {
    const place = {
      ...PLACE,
      addressLine1: '43 Rue Saint-Merri',
      formatted: '43 Rue Saint-Merri, Paris',
    };
    expect(mapGeoapifyPlaceToRoamPlace(place).address).toBe('43 Rue Saint-Merri, Paris');
  });

  it('missing optional facts stay null: never a made-up address, city, rating, price or URL', () => {
    const place: GeoapifyPlaceDto = {
      osmType: 'way',
      osmId: '42',
      name: 'Parc sans adresse',
      lat: 48.85,
      lon: 2.35,
    };
    expect(mapGeoapifyPlaceToRoamPlace(place)).toEqual({
      source: {
        providerKey: 'geoapify',
        externalId: 'way/42',
        externalUrl: null,
        providerCategories: [],
      },
      name: 'Parc sans adresse',
      address: null,
      city: null,
      latitude: 48.85,
      longitude: 2.35,
      priceLevel: 'UNKNOWN',
      rating: null,
      reviewCount: null,
      isActive: true,
      categorySlugs: [],
    });
  });

  it('categories: explicit table, sub-categories covered, unknown ones kept only as provider categories', () => {
    const place = {
      ...PLACE,
      categories: [
        'catering',
        'catering.cafe.coffee',
        'catering.restaurant.pizza',
        'catering.pub',
        'leisure.park.garden',
        'entertainment.culture.theatre',
        'entertainment.museum',
        'natural.forest',
        'national_park',
        'commercial.supermarket',
        'catering.cafeteria',
      ],
    };
    const normalized = mapGeoapifyPlaceToRoamPlace(place);
    expect(normalized.categorySlugs).toEqual([
      'cafe',
      'restaurant',
      'bar',
      'park',
      'culture',
      'nature',
    ]);
    expect(normalized.source.providerCategories).toEqual(place.categories);
  });

  it('the table only produces DATA-1 categories', () => {
    for (const slug of Object.values(GEOAPIFY_CATEGORY_TO_CATEGORY))
      expect(ROAM_CATEGORIES).toContain(slug);
  });

  it('produces provider facts only: no ROAM enrichment, no raw Geoapify field', () => {
    const normalized = mapGeoapifyPlaceToRoamPlace(PLACE) as Record<string, unknown>;
    for (const field of [
      'atmosphere',
      'mood',
      'energyLevel',
      'suitableFor',
      'bestMoments',
      'estimatedDurationMin',
      'tags',
      'score',
      'description',
      'place_id',
      'datasource',
      'osmType',
      'lat',
      'lon',
      'formatted',
    ])
      expect(normalized).not.toHaveProperty(field);
  });
});

describe('geoapifyCategoriesForCategories', () => {
  it('translates ROAM slugs into Geoapify categories; unknown slugs give none', () => {
    expect(geoapifyCategoriesForCategories(['bar'])).toEqual(['catering.bar', 'catering.pub']);
    expect(geoapifyCategoriesForCategories(['culture', 'cafe'])).toEqual([
      'catering.cafe',
      'entertainment.museum',
      'entertainment.culture',
    ]);
    expect(geoapifyCategoriesForCategories(['experience', 'unknown'])).toEqual([]);
  });
});

describe('Geoapify external id', () => {
  it('round-trips the OpenStreetMap object', () => {
    expect(parseGeoapifyExternalId('node/2152981900')).toEqual({
      osmType: 'node',
      osmId: '2152981900',
    });
    expect(parseGeoapifyExternalId('relation/7')).toEqual({ osmType: 'relation', osmId: '7' });
  });

  it.each(['ChIJ-google', '51bf51e1bec4ce0240', 'node/', 'node/12a', 'area/1', ' node/1'])(
    'refuses %s',
    (id) => {
      expect(parseGeoapifyExternalId(id)).toBeNull();
    },
  );
});
