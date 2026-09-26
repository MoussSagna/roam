import { parseGooglePlace } from './google-places.dto.js';
import {
  GOOGLE_TYPE_TO_CATEGORY,
  googleTypesForCategories,
  mapGooglePlaceToRoamPlace,
} from './google-places.mapper.js';

/** A Google-like place carrying every field of the field mask (fictional values). */
const FULL = {
  id: 'ChIJ-fake-full',
  displayName: { text: '  Le Petit Café  ', languageCode: 'fr' },
  formattedAddress: '12 Rue de Test, 75011 Paris, France',
  addressComponents: [
    { longText: '12', shortText: '12', types: ['street_number'] },
    { longText: 'Paris', shortText: 'Paris', types: ['locality', 'political'] },
    { longText: 'Île-de-France', shortText: 'IDF', types: ['administrative_area_level_1'] },
  ],
  location: { latitude: 48.8631, longitude: 2.3708 },
  types: ['cafe', 'coffee_shop', 'food', 'point_of_interest', 'establishment'],
  businessStatus: 'OPERATIONAL',
  googleMapsUri: 'https://maps.google.com/?cid=123',
  rating: 4.4,
  userRatingCount: 312,
  priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
  // Fields outside the mask must never reach ROAM, even if Google sent them.
  reviews: [{ text: 'secret review' }],
  photos: [{ name: 'places/x/photos/y' }],
};

const parse = (value: unknown) => {
  const place = parseGooglePlace(value);
  if (!place) throw new Error('invalid fixture');
  return place;
};

describe('Google place → ROAM normalized place', () => {
  it('maps every retained fact, with the provider identity', () => {
    expect(mapGooglePlaceToRoamPlace(parse(FULL))).toEqual({
      source: {
        providerKey: 'google_places',
        externalId: 'ChIJ-fake-full',
        externalUrl: 'https://maps.google.com/?cid=123',
        providerCategories: ['cafe', 'coffee_shop', 'food', 'point_of_interest', 'establishment'],
      },
      name: 'Le Petit Café',
      address: '12 Rue de Test, 75011 Paris, France',
      city: 'Paris',
      latitude: 48.8631,
      longitude: 2.3708,
      priceLevel: 'LOW',
      rating: 4.4,
      reviewCount: 312,
      isActive: true,
      categorySlugs: ['cafe'],
    });
  });

  it('exposes no raw Google field and no ROAM enrichment', () => {
    const place = mapGooglePlaceToRoamPlace(parse(FULL)) as Record<string, unknown>;
    const json = JSON.stringify(place);

    for (const googleField of [
      'displayName',
      'formattedAddress',
      'addressComponents',
      'location',
      'userRatingCount',
      'businessStatus',
      'googleMapsUri',
      'reviews',
      'photos',
    ])
      expect(place).not.toHaveProperty(googleField);
    expect(json).not.toContain('secret review');
    for (const roamField of [
      'atmosphere',
      'energyLevel',
      'suitableFor',
      'bestMoments',
      'estimatedDurationMin',
      'tags',
      'score',
    ])
      expect(place).not.toHaveProperty(roamField);
  });

  it('only the required fields: optional facts stay null / UNKNOWN, never guessed', () => {
    const minimal = mapGooglePlaceToRoamPlace(
      parse({
        id: 'ChIJ-min',
        displayName: { text: 'Lieu' },
        location: { latitude: 48.85, longitude: 2.35 },
      }),
    );

    expect(minimal).toEqual({
      source: {
        providerKey: 'google_places',
        externalId: 'ChIJ-min',
        externalUrl: null,
        providerCategories: [],
      },
      name: 'Lieu',
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

  it('coordinates are kept as given (0 is a valid coordinate)', () => {
    const place = mapGooglePlaceToRoamPlace(
      parse({
        id: 'x',
        displayName: { text: 'Null Island' },
        location: { latitude: 0, longitude: 0 },
      }),
    );
    expect([place.latitude, place.longitude]).toEqual([0, 0]);
  });

  it.each([
    ['PRICE_LEVEL_FREE', 'FREE'],
    ['PRICE_LEVEL_INEXPENSIVE', 'LOW'],
    ['PRICE_LEVEL_MODERATE', 'MEDIUM'],
    ['PRICE_LEVEL_EXPENSIVE', 'HIGH'],
    ['PRICE_LEVEL_VERY_EXPENSIVE', 'VERY_HIGH'],
    ['PRICE_LEVEL_UNSPECIFIED', 'UNKNOWN'],
    ['SOMETHING_NEW', 'UNKNOWN'],
  ])('price level %s → %s', (google, roam) => {
    expect(mapGooglePlaceToRoamPlace(parse({ ...FULL, priceLevel: google })).priceLevel).toBe(roam);
  });

  it('a permanently closed place is inactive; a temporarily closed one stays active', () => {
    const map = (businessStatus: string) =>
      mapGooglePlaceToRoamPlace(parse({ ...FULL, businessStatus })).isActive;
    expect(map('CLOSED_PERMANENTLY')).toBe(false);
    expect(map('CLOSED_TEMPORARILY')).toBe(true);
  });

  it('out-of-range or wrongly typed rating / count are dropped, not clamped', () => {
    const place = mapGooglePlaceToRoamPlace(parse({ ...FULL, rating: 7, userRatingCount: 'many' }));
    expect([place.rating, place.reviewCount]).toEqual([null, null]);
  });

  it('types: explicit table, unknown types give no category, duplicates collapse', () => {
    const place = mapGooglePlaceToRoamPlace(
      parse({ ...FULL, types: ['museum', 'art_gallery', 'tourist_attraction', 'bar', 'pub'] }),
    );
    expect(place.categorySlugs).toEqual(['culture', 'bar']);
    expect(place.source.providerCategories).toContain('tourist_attraction');
  });

  it('only maps to existing DATA-1 category slugs, and back to Google types', () => {
    const dataOneSlugs = ['cafe', 'park', 'restaurant', 'bar', 'culture', 'nature', 'experience'];
    for (const slug of Object.values(GOOGLE_TYPE_TO_CATEGORY)) expect(dataOneSlugs).toContain(slug);
    expect(googleTypesForCategories(['bar'])).toEqual(['bar', 'pub', 'wine_bar']);
    expect(googleTypesForCategories(['experience'])).toEqual([]);
  });

  it('validation: rejects a place without id, name or valid coordinates', () => {
    const base = { id: 'x', displayName: { text: 'A' }, location: { latitude: 1, longitude: 2 } };
    expect(parseGooglePlace(base)).not.toBeNull();
    expect(parseGooglePlace({ ...base, id: '' })).toBeNull();
    expect(parseGooglePlace({ ...base, displayName: { text: '   ' } })).toBeNull();
    expect(parseGooglePlace({ ...base, location: { latitude: '48', longitude: 2 } })).toBeNull();
    expect(parseGooglePlace({ ...base, location: { latitude: 1, longitude: 200 } })).toBeNull();
    expect(parseGooglePlace(null)).toBeNull();
  });
});
