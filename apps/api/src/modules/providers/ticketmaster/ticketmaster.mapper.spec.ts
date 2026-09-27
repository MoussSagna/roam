import { geohash } from './geohash.js';
import {
  parseInstant,
  parseTicketmasterEvent,
  type TicketmasterEventDto,
} from './ticketmaster.dto.js';
import {
  mapTicketmasterEventToRoamEvent,
  MAX_IMAGES,
  segmentIdsForCategories,
  TICKETMASTER_SEGMENT_TO_CATEGORY,
} from './ticketmaster.mapper.js';

/** The ROAM categories of DATA-1 (catalog seed): the only slugs a mapping may produce. */
const ROAM_CATEGORIES = ['cafe', 'park', 'restaurant', 'bar', 'culture', 'nature', 'experience'];

const ARTS = { id: 'KZFzniwnSyZfZ7v7na', name: 'Arts & Theatre' };
const MUSIC = { id: 'KZFzniwnSyZfZ7v7nJ', name: 'Music' };

/** A complete raw event, as the real API sends it (trimmed). */
const RAW = {
  name: ' LE GRAND SHOWTIME ',
  id: 'ZkyMmBwZ1A7uwog',
  test: false,
  description: ' Un concentré explosif d’humour. ',
  url: 'https://www.ticketmaster.fr/fr/manifestation/le-grand-showtime-billet/idmanif/451056',
  images: [
    { ratio: '3_2', url: 'https://img/small.jpg', width: 640, fallback: true },
    { ratio: '16_9', url: 'https://img/large.jpg', width: 2048, fallback: true },
    { ratio: '16_9', url: 'https://img/own.jpg', width: 1024, fallback: false },
  ],
  distance: 0.38,
  dates: {
    start: { localDate: '2026-09-26', localTime: '22:30:00', dateTime: '2026-09-26T20:30:00Z' },
    end: { localDate: '2026-09-26', localTime: '23:30:00', dateTime: '2026-09-26T21:30:00Z' },
    timezone: 'Europe/Paris',
    status: { code: 'onsale' },
  },
  classifications: [
    {
      primary: true,
      segment: ARTS,
      genre: { name: 'Theatre' },
      subGenre: { name: 'Miscellaneous' },
    },
    { primary: false, segment: MUSIC, genre: { name: 'Undefined' } },
  ],
  priceRanges: [
    { type: 'vip', currency: 'EUR', min: 90, max: 150 },
    { type: 'standard', currency: 'EUR', min: 25, max: 42.5 },
  ],
  _embedded: {
    venues: [
      {
        name: 'Le Point Virgule',
        id: 'rZ6SnyZkA1',
        url: 'https://www.ticketmaster.fr/fr/salle/le-point-virgule-paris/idsite/531',
        postalCode: '75004',
        timezone: 'Europe/Paris',
        city: { name: 'Paris' },
        country: { countryCode: 'FR' },
        address: { line1: '7 rue St Croix de la Bretonnerie' },
        location: { longitude: '2.357117', latitude: '48.857799' },
      },
    ],
  },
};

const parsed = (overrides: Record<string, unknown> = {}): TicketmasterEventDto => {
  const event = parseTicketmasterEvent({ ...RAW, ...overrides });
  if (!event) throw new Error('fixture does not parse');
  return event;
};

describe('mapTicketmasterEventToRoamEvent', () => {
  it('maps a complete event: facts, provenance, category, venue as a place', () => {
    expect(mapTicketmasterEventToRoamEvent(parsed())).toEqual({
      source: {
        providerKey: 'ticketmaster',
        externalId: 'ZkyMmBwZ1A7uwog',
        externalUrl: RAW.url,
        providerCategories: [
          'segment:Arts & Theatre',
          'genre:Theatre',
          'subGenre:Miscellaneous',
          'segment:Music',
        ],
      },
      title: 'LE GRAND SHOWTIME',
      description: 'Un concentré explosif d’humour.',
      startDate: new Date('2026-09-26T20:30:00Z'),
      endDate: new Date('2026-09-26T21:30:00Z'),
      timezone: 'Europe/Paris',
      images: ['https://img/own.jpg', 'https://img/large.jpg', 'https://img/small.jpg'],
      priceMin: 25,
      priceMax: 42.5,
      currency: 'EUR',
      priceLevel: 'UNKNOWN',
      bookingUrl: RAW.url,
      isActive: true,
      categorySlug: 'culture',
      venue: {
        source: {
          providerKey: 'ticketmaster',
          externalId: 'rZ6SnyZkA1',
          externalUrl: 'https://www.ticketmaster.fr/fr/salle/le-point-virgule-paris/idsite/531',
          providerCategories: [],
        },
        name: 'Le Point Virgule',
        address: '7 rue St Croix de la Bretonnerie, 75004 Paris',
        city: 'Paris',
        latitude: 48.857799,
        longitude: 2.357117,
        priceLevel: 'UNKNOWN',
        rating: null,
        reviewCount: null,
        isActive: true,
        categorySlugs: [],
      },
    });
  });

  it('maps a minimal event: every missing fact stays null / empty / UNKNOWN', () => {
    const minimal = parseTicketmasterEvent({
      id: 'Z1',
      name: 'Minimal',
      dates: { start: { dateTime: '2026-10-01T18:00:00Z' } },
    })!;
    expect(mapTicketmasterEventToRoamEvent(minimal)).toEqual({
      source: {
        providerKey: 'ticketmaster',
        externalId: 'Z1',
        externalUrl: null,
        providerCategories: [],
      },
      title: 'Minimal',
      description: null,
      startDate: new Date('2026-10-01T18:00:00Z'),
      endDate: null,
      timezone: null,
      images: [],
      priceMin: null,
      priceMax: null,
      currency: null,
      priceLevel: 'UNKNOWN',
      bookingUrl: null,
      isActive: true,
      categorySlug: null,
      venue: null,
    });
  });

  it('dates: absolute instants; Paris local time 22:30 in summer (UTC+2) is 20:30Z, in winter (UTC+1) 21:30Z', () => {
    const summer = mapTicketmasterEventToRoamEvent(parsed());
    expect(summer.startDate!.toISOString()).toBe('2026-09-26T20:30:00.000Z');
    expect(
      new Intl.DateTimeFormat('fr-FR', {
        timeZone: summer.timezone!,
        hour: '2-digit',
        minute: '2-digit',
      }).format(summer.startDate!),
    ).toBe('22:30');

    const winter = mapTicketmasterEventToRoamEvent(
      parsed({
        dates: { ...RAW.dates, start: { dateTime: '2026-12-12T21:30:00Z' }, end: undefined },
      }),
    );
    expect(
      new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
      }).format(winter.startDate!),
    ).toBe('22:30');
  });

  it('dates: an offset instant is kept exact; an end before the start is dropped', () => {
    const offset = mapTicketmasterEventToRoamEvent(
      parsed({ dates: { start: { dateTime: '2026-09-26T22:30:00+02:00' } } }),
    );
    expect(offset.startDate!.toISOString()).toBe('2026-09-26T20:30:00.000Z');

    const backwards = mapTicketmasterEventToRoamEvent(
      parsed({
        dates: {
          start: { dateTime: '2026-09-26T20:30:00Z' },
          end: { dateTime: '2026-09-26T19:00:00Z' },
        },
      }),
    );
    expect(backwards.endDate).toBeNull();
  });

  it('parseInstant refuses a time without a zone (never parsed in the server’s local time)', () => {
    expect(parseInstant('2026-09-26T22:30:00')).toBeUndefined();
    expect(parseInstant('2026-09-26')).toBeUndefined();
    expect(parseInstant('2026-13-01T10:00:00Z')).toBeUndefined();
    expect(parseInstant('2026-09-26T20:30:00Z')).toEqual(new Date(Date.UTC(2026, 8, 26, 20, 30)));
  });

  it('categories: Arts & Theatre → culture; other or unknown segments → no category, classification kept', () => {
    const music = mapTicketmasterEventToRoamEvent(
      parsed({ classifications: [{ primary: true, segment: MUSIC, genre: { name: 'Rock' } }] }),
    );
    expect(music.categorySlug).toBeNull();
    expect(music.source.providerCategories).toEqual(['segment:Music', 'genre:Rock']);

    const unknown = mapTicketmasterEventToRoamEvent(
      parsed({ classifications: [{ segment: { id: 'NEW-SEGMENT', name: 'Nouveau' } }] }),
    );
    expect(unknown.categorySlug).toBeNull();
    expect(unknown.source.providerCategories).toEqual(['segment:Nouveau']);

    const inherited = mapTicketmasterEventToRoamEvent(
      parsed({ classifications: [{ segment: { id: 'toString' } }] }),
    );
    expect(inherited.categorySlug).toBeNull();
  });

  it('the category table only produces DATA-1 categories; slugs translate back to segment ids', () => {
    for (const slug of Object.values(TICKETMASTER_SEGMENT_TO_CATEGORY))
      expect(ROAM_CATEGORIES).toContain(slug);
    expect(segmentIdsForCategories(['culture', 'cafe'])).toEqual(['KZFzniwnSyZfZ7v7na']);
    expect(segmentIdsForCategories(['bar'])).toEqual([]);
  });

  it('cancelled events are inactive (both spellings); postponed or rescheduled ones stay active', () => {
    for (const [code, active] of [
      ['cancelled', false],
      ['canceled', false],
      ['postponed', true],
      ['rescheduled', true],
      ['offsale', true],
    ] as const)
      expect(
        mapTicketmasterEventToRoamEvent(parsed({ dates: { ...RAW.dates, status: { code } } }))
          .isActive,
      ).toBe(active);
  });

  it('venue: without coordinates or a name, no place (the event is kept)', () => {
    const noLocation = mapTicketmasterEventToRoamEvent(
      parsed({ _embedded: { venues: [{ id: 'v1', name: 'Salle', location: {} }] } }),
    );
    expect(noLocation.venue).toBeNull();
    expect(
      mapTicketmasterEventToRoamEvent(
        parsed({
          _embedded: {
            venues: [{ id: 'v1', location: { latitude: '48.8', longitude: '2.3' } }],
          },
        }),
      ).venue,
    ).toBeNull();
    expect(
      mapTicketmasterEventToRoamEvent(
        parsed({
          _embedded: {
            venues: [{ id: 'v1', name: 'Salle', location: { latitude: '99', longitude: '2.3' } }],
          },
        }),
      ).venue,
    ).toBeNull();
  });

  it('prices: never invented; incoherent ranges ignored', () => {
    const price = (priceRanges: unknown[]) => {
      const { priceMin, priceMax, currency } = mapTicketmasterEventToRoamEvent(
        parsed({ priceRanges }),
      );
      return { priceMin, priceMax, currency };
    };
    expect(price([])).toEqual({ priceMin: null, priceMax: null, currency: null });
    expect(price([{ type: 'standard', currency: 'EUR', min: 50, max: 10 }])).toEqual({
      priceMin: null,
      priceMax: null,
      currency: null,
    });
    expect(price([{ type: 'standard', min: 10, max: 20 }]).currency).toBeNull();
    expect(price([{ type: 'standard', currency: 'EUR', min: 15 }])).toEqual({
      priceMin: 15,
      priceMax: null,
      currency: 'EUR',
    });
  });

  it('images: at most MAX_IMAGES, deduplicated', () => {
    const images = Array.from({ length: 12 }, (_, index) => ({
      url: `https://img/${index % 8}.jpg`,
      width: index,
    }));
    const mapped = mapTicketmasterEventToRoamEvent(parsed({ images })).images;
    expect(mapped).toHaveLength(MAX_IMAGES);
    expect(new Set(mapped).size).toBe(MAX_IMAGES);
  });

  it('produces provider facts only: no ROAM enrichment, no raw Ticketmaster field', () => {
    const normalized = mapTicketmasterEventToRoamEvent(parsed()) as Record<string, unknown>;
    for (const field of [
      'atmosphere',
      'energyLevel',
      'suitableFor',
      'bestMoments',
      'tags',
      'score',
      'experienceId',
      'classifications',
      'priceRanges',
      'dates',
      '_embedded',
      'distance',
    ])
      expect(normalized).not.toHaveProperty(field);
  });
});

describe('geohash', () => {
  it('encodes known points (reference values)', () => {
    expect(geohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
    expect(geohash(48.8566, 2.3522, 5)).toBe('u09tv');
    expect(geohash(48.8566, 2.3522)).toHaveLength(9);
  });
});
