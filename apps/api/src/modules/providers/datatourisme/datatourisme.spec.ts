import { Logger } from '@nestjs/common';

import type { AppConfigService } from '../../../config/app-config.service.js';
import {
  ProviderAuthenticationError,
  ProviderConfigurationError,
  ProviderNotFoundError,
  ProviderRateLimitError,
  ProviderResponseError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../provider.errors.js';
import { DatatourismeEventAdapter, DatatourismePlaceAdapter } from './datatourisme.adapter.js';
import { DatatourismeClient, sanitizeNextLink } from './datatourisme.client.js';
import { datatourismeEventsJob, datatourismePlacesJob } from './datatourisme.jobs.js';
import {
  currentPeriod,
  mapDatatourismeEvent,
  mapDatatourismePlace,
} from './datatourisme.mapper.js';
import { parseDatatourismePoi } from './datatourisme.dto.js';

/** A DATAtourisme POI as the API returns it (shapes observed on the real API, 2026-09-27; values fictional). */
const RAW_PLACE = {
  uuid: '000f4902-82e0-3826-a93d-1351c681a002',
  uri: 'https://data.datatourisme.fr/19/662f0e7f-af6f-3eda-bc88-8245cb659a1d',
  label: { '@fr': 'Musée Test' },
  type: ['PointOfInterest', 'CulturalSite', 'Museum', 'PlaceOfInterest'],
  lastUpdate: '2026-09-01',
  lastUpdateDatatourisme: '2026-09-01T16:02:03.566Z',
  hasBeenCreatedBy: { legalName: "Paris je t'aime - Office de Tourisme" },
  isLocatedAt: [
    {
      geo: { latitude: 48.8601, longitude: 2.3266 },
      address: [
        {
          streetAddress: ['1 rue de la Légion d’Honneur'],
          postalCode: '75007',
          addressLocality: 'Paris',
          hasAddressCity: { insee: '75107', isPartOfDepartment: { insee: '75' } },
        },
      ],
      openingHoursSpecification: [
        {
          opens: '09:30',
          closes: '18:00',
          validFrom: '2025-12-31T23:00:00Z',
          validThrough: '2026-12-31T22:59:59Z',
          dayOfWeek: [{ label: { '@fr': 'Mardi' } }],
        },
        { additionalInformation: { '@fr': 'Fermé le 1er mai.' } },
      ],
    },
  ],
  hasDescription: [{ description: { '@fr': 'Un musée.' }, shortDescription: { '@fr': 'Court.' } }],
  hasContact: [{ homepage: ['https://musee.test/'] }],
  hasMainRepresentation: [
    {
      hasAnnotation: [
        { credits: ['© Photographe'], isCoveredBy: 'CC BY 4.0', rightsEndDate: '2027-12-31' },
      ],
      hasRelatedResource: [{ locator: ['https://img.test/ok.jpg'] }],
    },
    {
      hasAnnotation: [{ credits: ['© Autre'], isCoveredBy: 'By-NC-ND 4.0' }],
      hasRelatedResource: [{ locator: ['https://img.test/nc.jpg'] }],
    },
  ],
  hasExternalReference: [
    {
      hasExternalPlatform: [
        { hasExternalPlatformUrl: 'https://rnb.beta.gouv.fr', label: { '@fr': 'RNB' } },
      ],
      hasExternalIdentifier: '9KAC1ZWWCE1E',
    },
  ],
};

const RAW_EVENT = {
  ...RAW_PLACE,
  uuid: '01b16c66-fd1e-3a1f-aae4-d9c33fb5e90d',
  label: { '@fr': 'Exposition Test' },
  type: ['EntertainmentAndEvent', 'Event', 'Exhibition', 'CulturalEvent'],
  hasMainRepresentation: [],
  takesPlaceAt: [
    { startDate: '2026-01-10', endDate: '2026-02-10' },
    { startDate: '2026-11-04', endDate: '2027-05-03' },
  ],
  offers: [{ priceSpecification: [{ priceCurrency: 'EUR', minPrice: [22], maxPrice: [22] }] }],
};

const page = (objects: unknown[], next: string | null = null, total = objects.length) => ({
  objects,
  meta: { total, page: 1, page_size: objects.length, total_pages: 1, next, previous: null },
});

const FAKE_KEY = 'dtFAKE0unit0test0key000000000000';
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
const poi = (raw: unknown) => {
  const parsed = parseDatatourismePoi(raw);
  if (!('poi' in parsed)) throw new Error(parsed.skipped);
  return parsed.poi;
};

function setup(key: string | null = FAKE_KEY) {
  const config = { providers: { datatourismeApiKey: key ?? undefined } } as AppConfigService;
  const client = new DatatourismeClient(config);
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return { client, fetchMock };
}

describe('DATAtourisme provider', () => {
  let logs: string[];
  beforeEach(() => {
    logs = [];
    for (const level of ['log', 'warn', 'debug'] as const)
      vi.spyOn(Logger.prototype, level).mockImplementation(
        (message: unknown) => void logs.push(String(message)),
      );
  });
  afterEach(() => {
    // Never a key in a log line (compared as a boolean: a diff must never print it).
    expect(logs.some((line) => line.includes(FAKE_KEY))).toBe(false);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('client', () => {
    it('sends the key in the X-API-Key header only, never in the URL; explicit fields, page size ≤ 100', async () => {
      const { client, fetchMock } = setup();
      fetchMock.mockResolvedValue(json(page([RAW_PLACE])));
      await client.listPage(
        {
          endpoint: 'placeOfInterest',
          near: { latitude: 48.8566, longitude: 2.3522, radiusMeters: 2000 },
          pageSize: 100,
          updatedSince: '2026-09-20',
        },
        null,
      );
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(
        'https://api.datatourisme.fr/v1/placeOfInterest',
      );
      expect(url.includes(FAKE_KEY)).toBe(false);
      expect((init.headers as Record<string, string>)['X-API-Key'] === FAKE_KEY).toBe(true);
      expect(parsed.searchParams.get('geo_distance')).toBe('48.8566,2.3522,2000m');
      expect(parsed.searchParams.get('page_size')).toBe('100');
      expect(parsed.searchParams.get('update')).toBe('2026-09-20');
      expect(parsed.searchParams.get('fields')).toContain('hasBeenCreatedBy.legalName');
      await expect(
        client.listPage({ endpoint: 'placeOfInterest', pageSize: 101 }, null),
      ).rejects.toThrow(RangeError);
    });

    it('next links: key stripped, same host and endpoint only — a foreign link is never followed', () => {
      expect(
        sanitizeNextLink(
          `http://api.datatourisme.fr/v1/placeOfInterest?api_key=${FAKE_KEY}&page=2&page_size=100`,
          'placeOfInterest',
        ),
      ).toBe('/v1/placeOfInterest?page=2&page_size=100');
      expect(
        sanitizeNextLink('/v1/placeOfInterest?APIKEY=x&search_after=abc', 'placeOfInterest'),
      ).toBe('/v1/placeOfInterest?search_after=abc');
      expect(
        sanitizeNextLink('https://evil.example/v1/placeOfInterest?page=2', 'placeOfInterest'),
      ).toBeNull();
      expect(
        sanitizeNextLink('https://api.datatourisme.fr/v1/catalog?page=2', 'placeOfInterest'),
      ).toBeNull();
    });

    it('follows next links past 10 000 results; the stored cursor never holds the key', async () => {
      const { client, fetchMock } = setup();
      const next = `http://api.datatourisme.fr/v1/placeOfInterest?api_key=${FAKE_KEY}&page=101&page_size=100`;
      fetchMock
        .mockResolvedValueOnce(json(page([RAW_PLACE], next, 25_000)))
        .mockResolvedValueOnce(json(page([RAW_PLACE])));
      const first = await client.listPage({ endpoint: 'placeOfInterest', pageSize: 100 }, null);
      expect(first.nextCursor).toBe('/v1/placeOfInterest?page=101&page_size=100');
      await client.listPage({ endpoint: 'placeOfInterest', pageSize: 100 }, first.nextCursor);
      const [url] = fetchMock.mock.calls[1] as [string];
      expect(url).toBe('https://api.datatourisme.fr/v1/placeOfInterest?page=101&page_size=100');
    });

    it('a next link to another host is refused (ProviderResponseError), nothing is sent there', async () => {
      const { client, fetchMock } = setup();
      fetchMock.mockResolvedValue(
        json(page([RAW_PLACE], 'https://evil.example/v1/placeOfInterest?page=2')),
      );
      await expect(
        client.listPage({ endpoint: 'placeOfInterest', pageSize: 10 }, null),
      ).rejects.toBeInstanceOf(ProviderResponseError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('typed errors: no key (no request), 401, 404, 429 with its reset, 5xx, timeout, invalid body', async () => {
      const { client, fetchMock } = setup(null);
      await expect(
        client.listPage({ endpoint: 'placeOfInterest', pageSize: 10 }, null),
      ).rejects.toBeInstanceOf(ProviderConfigurationError);
      expect(fetchMock).not.toHaveBeenCalled();

      const { client: ok, fetchMock: mock } = setup();
      const req = { endpoint: 'placeOfInterest' as const, pageSize: 10 };
      mock.mockResolvedValueOnce(json({ message: 'Invalid API key in request' }, 401));
      await expect(ok.listPage(req, null)).rejects.toBeInstanceOf(ProviderAuthenticationError);
      mock.mockResolvedValueOnce(json({ error: 'Unknown object : x' }, 404));
      await expect(ok.getPoi('00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(
        ProviderNotFoundError,
      );
      mock.mockResolvedValueOnce(json({}, 429, { 'x-ratelimit-reset': '1200.5' }));
      await expect(ok.listPage(req, null)).rejects.toMatchObject({ retryAfterSeconds: 1201 });
      mock.mockResolvedValueOnce(json({}, 503));
      await expect(ok.listPage(req, null)).rejects.toBeInstanceOf(ProviderUnavailableError);
      mock.mockRejectedValueOnce(Object.assign(new Error('t'), { name: 'TimeoutError' }));
      await expect(ok.listPage(req, null)).rejects.toBeInstanceOf(ProviderTimeoutError);
      mock.mockResolvedValueOnce(json({ unexpected: true }));
      await expect(ok.listPage(req, null)).rejects.toBeInstanceOf(ProviderResponseError);
      expect(ProviderRateLimitError).toBeDefined();
    });
  });

  describe('mapping', () => {
    it('place: facts, category, description, website, hours, RNB, attribution (producer + lastUpdate), rights-checked images', () => {
      const place = mapDatatourismePlace(poi(RAW_PLACE));
      expect(place).toMatchObject({
        source: {
          providerKey: 'datatourisme',
          externalId: RAW_PLACE.uuid,
          externalUrl: RAW_PLACE.uri,
          providerCategories: RAW_PLACE.type,
        },
        name: 'Musée Test',
        address: '1 rue de la Légion d’Honneur, 75007 Paris',
        city: 'Paris',
        latitude: 48.8601,
        rating: null,
        isActive: true,
        categorySlugs: ['culture'],
        description: 'Un musée.',
        website: 'https://musee.test/',
        rnbId: '9KAC1ZWWCE1E',
        attribution: "Paris je t'aime - Office de Tourisme",
        providerUpdatedAt: new Date('2026-09-01T00:00:00.000Z'),
        openingHours: {
          periods: [
            {
              days: ['Tuesday'],
              opens: '09:30',
              closes: '18:00',
              validFrom: '2026-01-01',
              validThrough: '2026-12-31',
            },
          ],
          note: 'Fermé le 1er mai.',
        },
      });
      // The NC-ND image is dropped; the other keeps its licence, credit and rights period.
      expect(place.images).toEqual([
        {
          url: 'https://img.test/ok.jpg',
          license: 'CC BY 4.0',
          credit: '© Photographe',
          rightsStartDate: null,
          rightsEndDate: '2027-12-31',
        },
      ]);
    });

    it('obsolete POI → inactive; no name / no coordinates → skipped with a reason', () => {
      expect(mapDatatourismePlace(poi({ ...RAW_PLACE, isObsolete: true })).isActive).toBe(false);
      expect(parseDatatourismePoi({ ...RAW_PLACE, label: {} })).toEqual({ skipped: 'no_name' });
      expect(parseDatatourismePoi({ ...RAW_PLACE, isLocatedAt: [{}] })).toEqual({
        skipped: 'no_coordinates',
      });
      expect(parseDatatourismePoi({ ...RAW_PLACE, uuid: undefined })).toEqual({ skipped: 'no_id' });
    });

    it('event: the current period as local dates (no time invented), the Paris zone, its own location, price', () => {
      const mapped = mapDatatourismeEvent(poi(RAW_EVENT), '2026-09-27');
      expect(mapped).toMatchObject({
        event: {
          title: 'Exposition Test',
          startDate: null,
          timezone: 'Europe/Paris',
          localStartDate: '2026-11-04',
          localStartTime: null,
          localEndDate: '2027-05-03',
          location: { city: 'Paris', latitude: 48.8601 },
          priceMin: 22,
          currency: 'EUR',
          categorySlug: 'culture',
          venue: null,
          images: [],
          attribution: "Paris je t'aime - Office de Tourisme",
        },
      });
    });

    it('event with a time: kept as a local time (the ingestion derives the instant)', () => {
      const mapped = mapDatatourismeEvent(
        poi({ ...RAW_EVENT, takesPlaceAt: [{ startDate: '2026-10-10', startTime: '20:30' }] }),
        '2026-09-27',
      );
      expect(mapped).toMatchObject({
        event: { localStartDate: '2026-10-10', localStartTime: '20:30', localEndDate: null },
      });
    });

    it('events skipped: every period over, end before start (observed on the real API), no dates', () => {
      expect(
        mapDatatourismeEvent(
          poi({ ...RAW_EVENT, takesPlaceAt: [{ startDate: '2026-01-01', endDate: '2026-01-02' }] }),
          '2026-09-27',
        ),
      ).toEqual({ skipped: 'past' });
      expect(
        mapDatatourismeEvent(
          poi({ ...RAW_EVENT, takesPlaceAt: [{ startDate: '2026-11-04', endDate: '2026-05-03' }] }),
          '2026-09-27',
        ),
      ).toEqual({ skipped: 'end_before_start' });
      expect(mapDatatourismeEvent(poi({ ...RAW_EVENT, takesPlaceAt: [] }), '2026-09-27')).toEqual({
        skipped: 'no_dates',
      });
      expect(currentPeriod([], '2026-09-27')).toBeNull();
    });
  });

  describe('adapters and jobs', () => {
    it('getPlace: unknown uuid → null; searchNearby filters ROAM categories after the search', async () => {
      const { client, fetchMock } = setup();
      const adapter = new DatatourismePlaceAdapter(client);
      fetchMock.mockResolvedValueOnce(json({ error: 'Unknown object' }, 404));
      await expect(adapter.getPlace('00000000-0000-0000-0000-000000000000')).resolves.toBeNull();
      fetchMock.mockResolvedValueOnce(json(page([RAW_PLACE])));
      await expect(
        adapter.searchNearby({
          latitude: 48.86,
          longitude: 2.33,
          radiusMeters: 500,
          categorySlugs: ['bar'],
        }),
      ).resolves.toEqual([]);
      await expect(
        adapter.searchNearby({ latitude: 48.86, longitude: 2.33, radiusMeters: 60_000 }),
      ).rejects.toThrow(RangeError);
    });

    it('events adapter keeps only mappable events', async () => {
      const { client, fetchMock } = setup();
      const adapter = new DatatourismeEventAdapter(client, {
        now: () => new Date('2026-09-27T10:00:00Z'),
      });
      fetchMock.mockResolvedValue(json(page([RAW_EVENT, { ...RAW_EVENT, takesPlaceAt: [] }])));
      await expect(
        adapter.searchNearby({ latitude: 48.86, longitude: 2.33, radiusMeters: 500 }),
      ).resolves.toHaveLength(1);
      expect(new URL((fetchMock.mock.calls[0] as [string])[0]).searchParams.get('start')).toBe(
        '2026-09-27',
      );
    });

    it('places job: pages through next links, sanitized cursor; incremental after a successful run', async () => {
      const { client, fetchMock } = setup();
      fetchMock
        .mockResolvedValueOnce(
          json(
            page(
              [RAW_PLACE, { ...RAW_PLACE, label: {} }],
              `https://api.datatourisme.fr/v1/placeOfInterest?api_key=${FAKE_KEY}&page=2`,
            ),
          ),
        )
        .mockResolvedValueOnce(json(page([RAW_PLACE])));
      const job = datatourismePlacesJob(client, {
        name: 't',
        near: { latitude: 48.86, longitude: 2.35, radiusMeters: 1000 },
      });
      const reader = job.open(null, {
        lastSuccessAt: new Date('2026-09-20T03:00:00Z'),
        now: new Date('2026-09-27T03:00:00Z'),
        pace: () => Promise.resolve(),
      });
      const first = await reader.next();
      expect(first).toMatchObject({
        skipped: { no_name: 1 },
        cursor: '/v1/placeOfInterest?page=2',
      });
      expect(first!.items).toHaveLength(1);
      expect(new URL((fetchMock.mock.calls[0] as [string])[0]).searchParams.get('update')).toBe(
        '2026-09-19',
      );
      expect(await reader.next()).toMatchObject({ cursor: null });
      expect(await reader.next()).toBeNull();
    });

    it('events job: past or incoherent events counted as skipped', async () => {
      const { client, fetchMock } = setup();
      fetchMock.mockResolvedValueOnce(
        json(page([RAW_EVENT, { ...RAW_EVENT, takesPlaceAt: [{ startDate: '2025-01-01' }] }])),
      );
      const reader = datatourismeEventsJob(client, {
        name: 't',
        near: { latitude: 48.86, longitude: 2.35, radiusMeters: 1000 },
      }).open(null, {
        lastSuccessAt: null,
        now: new Date('2026-09-27T10:00:00Z'),
        pace: () => Promise.resolve(),
      });
      expect(await reader.next()).toMatchObject({ skipped: { past: 1 }, cursor: null });
    });
  });
});
