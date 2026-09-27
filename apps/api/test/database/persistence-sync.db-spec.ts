import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { BasilicClient } from '../../src/modules/providers/basilic/basilic.client.js';
import { basilicPlacesJob } from '../../src/modules/providers/basilic/basilic.jobs.js';
import { DataEsClient } from '../../src/modules/providers/data-es/data-es.client.js';
import { dataEsPlacesJob } from '../../src/modules/providers/data-es/data-es.jobs.js';
import { DatatourismePlaceAdapter } from '../../src/modules/providers/datatourisme/datatourisme.adapter.js';
import { DatatourismeClient } from '../../src/modules/providers/datatourisme/datatourisme.client.js';
import {
  datatourismeEventsJob,
  datatourismePlacesJob,
} from '../../src/modules/providers/datatourisme/datatourisme.jobs.js';
import { GeoapifyAdapter } from '../../src/modules/providers/geoapify/geoapify.adapter.js';
import { GooglePlacesAdapter } from '../../src/modules/providers/google-places/google-places.adapter.js';
import { PlaceIngestionService } from '../../src/modules/providers/place-ingestion.service.js';
import type { NormalizedPlace } from '../../src/modules/providers/provider.types.js';
import { TicketmasterAdapter } from '../../src/modules/providers/ticketmaster/ticketmaster.adapter.js';
import { ExternalSourceRepository } from '../../src/modules/catalog/external-source.repository.js';
import { freshnessOf, ttlFor } from '../../src/modules/sync/freshness.js';
import { nearbyEventsJob, nearbyPlacesJob, stalePlacesJob } from '../../src/modules/sync/jobs.js';
import { Sleeper } from '../../src/modules/sync/sleeper.js';
import {
  SyncAlreadyRunningError,
  SyncRunRepository,
} from '../../src/modules/sync/sync-run.repository.js';
import { SyncService } from '../../src/modules/sync/sync.service.js';
import type { EventSyncJob, PlaceSyncJob, SyncBatch } from '../../src/modules/sync/sync.types.js';
import { createTestClient } from './database.js';

/** Every external id this suite creates contains MARK (Geoapify ids: the numeric OSM_PREFIX); job keys contain JOB. */
const MARK = 'DATA6-TEST-';
const OSM_PREFIX = '99606';
const JOB = 'data6-test';
/** Fictional keys: fetch is stubbed, no test calls a provider. */
const KEYS = {
  GOOGLE_PLACES_API_KEY: 'gpFAKE0data6',
  GEOAPIFY_API_KEY: 'gaFAKE0data6',
  TICKETMASTER_API_KEY: 'tmFAKE0data6',
  DATATOURISME_API_KEY: 'dtFAKE0data6',
};
const PROVIDER_KEYS = [
  'google_places',
  'geoapify',
  'ticketmaster',
  'datatourisme',
  'basilic',
  'data_es',
];
const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const RNB = 'DATA6RNB0001';
const PERSONAL = {
  declarant_nom: 'Dupont-Data6',
  declarant_prenom: 'Jeanne-Data6',
  declarant_mail: 'jeanne.data6@example.fr',
  declarant_telephone: '0612345678',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// ─── Provider-shaped payloads (shapes of the real APIs; values fictional) ─────────────────────────

const dtUuid = (n: number) => `00000000-0000-3000-8000-${String(n).padStart(12, '0')}`;
const dtPoi = (n: number, overrides: Record<string, unknown> = {}) => ({
  uuid: dtUuid(n),
  uri: `https://data.datatourisme.fr/19/${MARK}${n}`,
  label: { '@fr': `Musée ${MARK}${n}` },
  type: ['PointOfInterest', 'Museum', 'CulturalSite', 'PlaceOfInterest'],
  lastUpdate: '2026-09-01',
  hasBeenCreatedBy: { legalName: "Paris je t'aime - Office de Tourisme" },
  isLocatedAt: [
    {
      geo: { latitude: 48.87 + n / 1000, longitude: 2.3 },
      address: [
        {
          streetAddress: [`${n} rue de Test`],
          postalCode: '75008',
          addressLocality: 'Paris',
          hasAddressCity: { insee: '75108', isPartOfDepartment: { insee: '75' } },
        },
      ],
      openingHoursSpecification: [{ opens: '10:00', closes: '18:00' }],
    },
  ],
  hasDescription: [{ description: { '@fr': `Description DATAtourisme ${n}` } }],
  hasContact: [{ homepage: ['https://musee.test/'] }],
  hasMainRepresentation: [
    {
      hasAnnotation: [
        { credits: ['© Photo Data6'], isCoveredBy: 'CC BY 4.0', rightsEndDate: '2030-12-31' },
      ],
      hasRelatedResource: [{ locator: [`https://img.test/${MARK}${n}.jpg`] }],
    },
    {
      hasAnnotation: [{ credits: ['© NC'], isCoveredBy: 'By-NC-ND 4.0' }],
      hasRelatedResource: [{ locator: [`https://img.test/${MARK}${n}-nc.jpg`] }],
    },
  ],
  ...overrides,
});
const dtPage = (objects: unknown[], next: string | null = null) => ({
  objects,
  meta: { total: objects.length, page: 1, page_size: 100, total_pages: 1, next, previous: null },
});

/** A pool described by DATAtourisme and by Data ES: same building (RNB), names that designate the same place. */
const POOL = { latitude: 48.8401, longitude: 2.3905 };
const dtPool = dtPoi(90, {
  label: { '@fr': `Piscine Pontoise ${MARK}` },
  type: ['PointOfInterest', 'SportsAndLeisurePlace', 'SwimmingPool', 'PlaceOfInterest'],
  isLocatedAt: [
    {
      geo: POOL,
      address: [
        {
          postalCode: '75005',
          addressLocality: 'Paris',
          hasAddressCity: { isPartOfDepartment: { insee: '75' } },
        },
      ],
    },
  ],
  hasExternalReference: [
    {
      hasExternalPlatform: [{ hasExternalPlatformUrl: 'https://rnb.beta.gouv.fr' }],
      hasExternalIdentifier: RNB,
    },
  ],
  hasMainRepresentation: [],
});
const esEquipment = (inst: string, n: number, overrides: Record<string, unknown> = {}) => ({
  equip_numero: `E00${n}${inst}`,
  inst_numero: inst,
  inst_nom: `PISCINE MUNICIPALE PONTOISE ${MARK}`,
  equip_nom: `BASSIN ${n}`,
  inst_adresse: '19 RUE DE PONTOISE',
  inst_cp: '75005',
  new_name: 'Paris 5e Arrondissement',
  new_code: '75105',
  dep_code: '75',
  equip_type_name: 'Bassin sportif de natation',
  equip_type_famille: 'Bassin de natation',
  aps_name: ['Natation sportive'],
  equip_x: POOL.longitude + 0.0005,
  equip_y: POOL.latitude,
  equip_url: 'www.piscine.test',
  equip_acc_libre: 'false',
  equip_rnb: RNB,
  equip_maj_date: '2026-02-01',
  inst_hs_bool: null,
  // What the other dataset exposes — must never be stored.
  ...PERSONAL,
  ...overrides,
});
const BASILIC_HEADER =
  'Nom;Adresse;Code Postal;libelle_geographique;code_insee;Identifiant_deps_a_partir_de_2022;Rang;Type équipement ou lieu;Label et appellation;Domaine;Sous_domaine;Latitude;Longitude;N_Département;Demographie_detail_sortie';
const basilicLine = (id: string, type: string, name: string, lat: number) =>
  `${name};1 r. de Test;75011;Paris 11e Arrondissement;75111;${id};1;${type};Théâtre hors label;Arts du spectacle;Théâtre;${lat};2.38;75;`;

/**
 * DATA-6 end to end on PostgreSQL: provider-shaped responses (fetch stubbed) → clients → adapters → generic sync
 * (SyncService) → ingestion (dedup, ownership, freshness, obsolescence) → the test database, for the six providers.
 * Non-destructive: no reset, no TRUNCATE; it only creates records whose external id contains MARK (or OSM_PREFIX) and
 * sync runs whose job key contains JOB, removes exactly those, and checks the rest (DATA-1 catalog included) unchanged.
 */
describe('DATA-6 persistence & synchronization on PostgreSQL', () => {
  let db: PrismaClient;
  let close: () => Promise<void>;
  let sync: SyncService;
  let runs: SyncRunRepository;
  let places: PlaceIngestionService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let respond: (url: URL) => Response | Promise<Response>;
  let createdCategories: string[] = [];
  let createdProviders: string[] = [];
  let untouchedBefore: Awaited<ReturnType<typeof untouched>>;
  const get = <T>(type: new (...args: never[]) => T): T => moduleRef.get(type);
  let moduleRef: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>>;

  const marked = {
    sources: {
      some: {
        OR: [
          { externalId: { contains: MARK } },
          { externalId: { startsWith: `node/${OSM_PREFIX}` } },
          { externalId: { startsWith: '00000000-0000-3000-8000-' } },
          { externalId: { contains: 'I7510599' } },
        ],
      },
    },
  };
  const untouched = async () => ({
    places: JSON.stringify(
      await db.place.findMany({
        where: { NOT: marked },
        select: { id: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
    ),
    events: await db.event.count({ where: { NOT: marked } }),
    experiences: JSON.stringify(
      await db.experience.findMany({
        select: { id: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
    ),
    enrichments: JSON.stringify(
      await db.roamEnrichment.findMany({
        where: { NOT: { place: marked } },
        select: { id: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
    ),
    sources: await db.externalSource.count({ where: { NOT: { OR: marked.sources.some.OR } } }),
    internalSources: await db.externalSource.count({
      where: { provider: { key: 'mobile_mock_migration' } },
    }),
  });

  async function removeTestRecords() {
    await db.event.deleteMany({ where: marked });
    await db.place.deleteMany({ where: marked });
    await db.syncRun.deleteMany({ where: { jobKey: { contains: JOB } } });
  }

  const sourceOf = (externalId: string) =>
    db.externalSource.findFirstOrThrow({
      where: { externalId },
      include: {
        provider: true,
        place: { include: { sources: true, enrichment: true } },
        event: true,
      },
    });

  /** A job over fixed batches (orchestrator tests on a real database). */
  const fixedPlaceJob = (
    key: string,
    provider: { key: string; name: string },
    batches: SyncBatch<NormalizedPlace>[],
  ): PlaceSyncJob => ({
    key,
    provider,
    entity: 'PLACE',
    open: (cursor) => {
      let index = typeof cursor === 'number' ? cursor : 0;
      return {
        next: () => {
          const batch = batches[index];
          if (!batch) return Promise.resolve(null);
          index += 1;
          return Promise.resolve({ ...batch, cursor: index < batches.length ? index : null });
        },
      };
    },
  });

  beforeAll(async () => {
    Object.assign(process.env, KEYS);
    const { AppModule } = await import('../../src/app.module.js');
    db = createTestClient();
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Sleeper)
      .useValue({ sleep: () => Promise.resolve() })
      .compile();
    await moduleRef.init();
    close = () => moduleRef.close();
    sync = get(SyncService);
    runs = get(SyncRunRepository);
    places = get(PlaceIngestionService);

    await removeTestRecords();
    const existing = new Set((await db.category.findMany()).map(({ slug }) => slug));
    createdCategories = ['culture', 'cafe', 'park'].filter((slug) => !existing.has(slug));
    for (const slug of createdCategories) await db.category.create({ data: { slug } });
    const known = new Set((await db.provider.findMany()).map(({ key }) => key));
    createdProviders = PROVIDER_KEYS.filter((key) => !known.has(key));
    untouchedBefore = await untouched();
  });

  beforeEach(() => {
    respond = () => json({}, 404);
    fetchMock = vi.fn(async (input: string) => respond(new URL(input)));
    vi.stubGlobal('fetch', fetchMock);
    for (const level of ['log', 'warn', 'debug'] as const)
      vi.spyOn(Logger.prototype, level).mockImplementation(() => undefined);
  });

  afterEach(() => {
    // No request ever carries the DATAtourisme key in its URL.
    for (const [url] of fetchMock.mock.calls as [string][])
      expect(url.includes(KEYS.DATATOURISME_API_KEY)).toBe(false);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await removeTestRecords();
    for (const key of createdProviders)
      await db.provider.deleteMany({ where: { key, sources: { none: {} } } });
    for (const slug of createdCategories)
      await db.category.deleteMany({ where: { slug, places: { none: {} }, events: { none: {} } } });
    await close();
    await db.$disconnect();
    for (const key of Object.keys(KEYS)) delete process.env[key];
  });

  // ─── The generic sync over the existing providers ──────────────────────────────────────────────

  it('1. Google through the generic sync: place created, run journaled SUCCEEDED with its counters', async () => {
    respond = () =>
      json({
        places: [
          {
            id: `${MARK}g1`,
            displayName: { text: `Café Sync ${MARK}` },
            formattedAddress: '1 Rue de Test, 75011 Paris, France',
            addressComponents: [{ longText: 'Paris', types: ['locality'] }],
            location: { latitude: 48.8631, longitude: 2.3708 },
            types: ['cafe'],
            businessStatus: 'OPERATIONAL',
            rating: 4.1,
            userRatingCount: 100,
          },
        ],
      });
    const result = await sync.run(
      nearbyPlacesJob(`google_places:places:${JOB}`, get(GooglePlacesAdapter), {
        ...PARIS,
        radiusMeters: 2000,
      }),
    );

    expect(result).toMatchObject({ status: 'SUCCEEDED', created: 1, fetched: 1, failed: 0 });
    const run = await db.syncRun.findUniqueOrThrow({ where: { id: result.runId } });
    expect(run).toMatchObject({
      status: 'SUCCEEDED',
      providerKey: 'google_places',
      created: 1,
      cursor: null,
    });
    expect((await sourceOf(`${MARK}g1`)).place).toMatchObject({
      name: `Café Sync ${MARK}`,
      rating: 4.1,
    });
  });

  it('2. Geoapify through the same sync: an unrelated place stays its own place', async () => {
    respond = () =>
      json({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [2.36, 48.85] },
            properties: {
              name: `Square ${MARK}`,
              city: 'Paris',
              lat: 48.85,
              lon: 2.36,
              formatted: `Square ${MARK}, Paris`,
              categories: ['leisure', 'leisure.park'],
              datasource: {
                sourcename: 'openstreetmap',
                raw: { osm_type: 'n', osm_id: Number(`${OSM_PREFIX}1`) },
              },
              place_id: '51fake',
            },
          },
        ],
      });
    const result = await sync.run(
      nearbyPlacesJob(`geoapify:places:${JOB}`, get(GeoapifyAdapter), {
        ...PARIS,
        radiusMeters: 2000,
      }),
    );
    expect(result).toMatchObject({ status: 'SUCCEEDED', created: 1, matched: 0 });
  });

  it('3/16. Ticketmaster through the sync: the exact instant kept, the local date/time derived in Paris', async () => {
    respond = () =>
      json({
        _embedded: {
          events: [
            {
              id: `${MARK}tm1`,
              name: `Concert ${MARK}`,
              test: false,
              distance: 0.5,
              dates: {
                start: {
                  localDate: '2026-12-12',
                  localTime: '22:30:00',
                  dateTime: '2026-12-12T21:30:00Z',
                },
                timezone: 'Europe/Paris',
                status: { code: 'onsale' },
              },
              classifications: [
                { primary: true, segment: { id: 'KZFzniwnSyZfZ7v7na', name: 'Arts & Theatre' } },
              ],
            },
          ],
        },
        page: { number: 0 },
      });
    const result = await sync.run(
      nearbyEventsJob(`ticketmaster:events:${JOB}`, get(TicketmasterAdapter), {
        ...PARIS,
        radiusMeters: 2000,
      }),
    );
    expect(result.errors).toEqual({});
    expect(result).toMatchObject({ status: 'SUCCEEDED', created: 1 });
    const { event } = await sourceOf(`${MARK}tm1`);
    expect(event?.startDate?.toISOString()).toBe('2026-12-12T21:30:00.000Z');
    const [row] = await db.$queryRaw<{ paris: string; day: string; time: string }[]>`
      SELECT to_char("startDate" AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI') AS paris,
             "localStartDate"::text AS day, "localStartTime" AS time
      FROM events WHERE id = ${event!.id}::uuid`;
    expect(row).toEqual({ paris: '2026-12-12 22:30', day: '2026-12-12', time: '22:30' });
  });

  // ─── Open data ─────────────────────────────────────────────────────────────────────────────────

  it('4/11/12. DATAtourisme places over two pages (next link with a key, sanitized): attribution, image rights, hours, obsolete record', async () => {
    const next = `http://api.datatourisme.fr/v1/placeOfInterest?api_key=${KEYS.DATATOURISME_API_KEY}&page=2&page_size=100`;
    respond = (url) =>
      url.searchParams.get('page') === '2'
        ? json(dtPage([dtPoi(2, { isObsolete: true }), dtPool]))
        : json(dtPage([dtPoi(1), { ...dtPoi(3), label: {} }], next));
    const result = await sync.run(
      datatourismePlacesJob(get(DatatourismeClient), {
        name: JOB,
        near: { ...PARIS, radiusMeters: 5000 },
      }),
    );

    expect(result).toMatchObject({
      status: 'SUCCEEDED',
      batches: 2,
      created: 3,
      skipped: 1,
      errors: { 'skipped:no_name': 1 },
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.datatourisme.fr/v1/placeOfInterest?page=2&page_size=100',
    );
    const one = await sourceOf(dtUuid(1));
    expect(one).toMatchObject({
      attribution: "Paris je t'aime - Office de Tourisme",
      providerUpdatedAt: new Date('2026-09-01T00:00:00.000Z'),
      externalUrl: `https://data.datatourisme.fr/19/${MARK}1`,
      obsoleteAt: null,
    });
    // Images keep their rights; the non-commercial one is not stored; Place.photos (other providers) untouched.
    expect(one.images).toEqual([
      {
        url: `https://img.test/${MARK}1.jpg`,
        license: 'CC BY 4.0',
        credit: '© Photo Data6',
        rightsStartDate: null,
        rightsEndDate: '2030-12-31',
      },
    ]);
    expect(one.place).toMatchObject({
      description: 'Description DATAtourisme 1',
      website: 'https://musee.test/',
      photos: [],
      openingHours: {
        periods: [
          { days: [], opens: '10:00', closes: '18:00', validFrom: null, validThrough: null },
        ],
        note: null,
      },
      isActive: true,
    });
    // 14. The provider said "obsolete": the record is marked, the single-source place deactivated — never deleted.
    const obsolete = await sourceOf(dtUuid(2));
    expect(obsolete.obsoleteAt).not.toBeNull();
    expect(obsolete.place?.isActive).toBe(false);
  });

  it('5. Basilic: streamed file, visitable venues only, publisher id and attribution', async () => {
    const csv = [
      BASILIC_HEADER,
      basilicLine(`THHL_75056_${MARK}1`, 'Théâtre', `Théâtre ${MARK}`, 48.8557),
      basilicLine(`BIBL_75056_${MARK}2`, 'Bibliothèque', `Bibliothèque ${MARK}`, 48.851),
    ].join('\n');
    respond = () =>
      new Response(csv, { headers: { 'last-modified': 'Wed, 18 Feb 2026 08:43:42 GMT' } });
    const result = await sync.run(
      basilicPlacesJob(get(BasilicClient), { name: JOB, departments: ['75'] }),
    );

    expect(result).toMatchObject({
      status: 'SUCCEEDED',
      created: 1,
      skipped: 1,
      errors: { 'skipped:type_not_an_outing': 1 },
    });
    const theatre = await sourceOf(`THHL_75056_${MARK}1`);
    expect(theatre).toMatchObject({
      attribution: 'Ministère de la Culture (DEPS) — base Basilic',
      providerUpdatedAt: new Date('2026-02-18T08:43:42Z'),
    });
    expect(theatre.place).toMatchObject({ city: 'Paris', address: '1 r. de Test, 75011 Paris' });
  });

  it('6/7/8/18. Data ES: same building as a DATAtourisme pool (RNB) → the same ROAM place, two sources; no personal data stored', async () => {
    respond = () =>
      json({
        total_count: 2,
        results: [esEquipment('I751059901', 1), esEquipment('I751059901', 2)],
      });
    const result = await sync.run(
      dataEsPlacesJob(get(DataEsClient), { name: JOB, departments: ['75'] }),
    );
    expect(result).toMatchObject({ status: 'SUCCEEDED', matched: 1, created: 0 });

    const es = await sourceOf('I751059901');
    const dt = await sourceOf(dtUuid(90));
    expect(es.placeId).toBe(dt.placeId);
    expect(es.place?.sources).toHaveLength(2);
    expect(await db.place.count({ where: { rnbId: RNB } })).toBe(1);
    // The primary source (DATAtourisme, first) keeps its facts; Data ES only fills what was missing.
    expect(es.place).toMatchObject({
      name: `Piscine Pontoise ${MARK}`,
      rnbId: RNB,
      // DATAtourisme's website: the primary (first) source; Data ES only fills empty fields.
      website: 'https://musee.test/',
      attributes: { equipmentCount: 2, freeAccess: false },
    });
    // 18. Nothing personal anywhere: columns, place, source.
    const stored = JSON.stringify([es, await db.place.findUnique({ where: { id: es.placeId! } })]);
    for (const value of Object.values(PERSONAL)) expect(stored).not.toContain(value);
    const columns = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name ILIKE '%declarant%'`;
    expect(columns).toEqual([]);
    // The request asked for the data-es dataset and explicit, non-personal fields.
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toMatch(/\/datasets\/data-es\/records$/);
    expect(url.searchParams.get('select')).not.toMatch(/declarant/);
  });

  it('9/10. a provider refresh never overwrites ROAM enrichment or curated data (description, categories)', async () => {
    const { placeId } = await sourceOf(dtUuid(1));
    await db.place.update({ where: { id: placeId! }, data: { description: 'Texte ROAM curé' } });
    await db.roamEnrichment.create({
      data: {
        placeId: placeId!,
        atmosphere: ['CULTURAL'],
        tags: ['curated'],
        source: 'CURATED',
        estimatedDurationMin: 90,
      },
    });
    const before = await db.roamEnrichment.findUniqueOrThrow({ where: { placeId: placeId! } });

    respond = () =>
      json(
        dtPoi(1, {
          hasDescription: [{ description: { '@fr': 'Nouvelle description' } }],
          label: { '@fr': `Musée renommé ${MARK}` },
        }),
      );
    const refreshed = await places.importPlace(get(DatatourismePlaceAdapter), dtUuid(1));

    expect(refreshed?.outcome).toBe('updated');
    const place = await db.place.findUniqueOrThrow({
      where: { id: placeId! },
      include: { categories: { include: { category: true } } },
    });
    expect(place.name).toBe(`Musée renommé ${MARK}`); // a provider fact, its primary source
    expect(place.description).toBe('Texte ROAM curé');
    expect(place.categories.map(({ category }) => category.slug)).toEqual(['culture']);
    expect(await db.roamEnrichment.findUniqueOrThrow({ where: { placeId: placeId! } })).toEqual(
      before,
    );
  });

  it('13. freshness: FRESH after import, STALE past its TTL, refreshed by the stale job (DB is the cache)', async () => {
    const source = await sourceOf(dtUuid(1));
    const ttl = ttlFor('datatourisme', 'PLACE');
    expect(freshnessOf(source, ttl, new Date())).toBe('FRESH');
    await db.externalSource.update({
      where: { id: source.id },
      data: { fetchedAt: new Date(Date.now() - ttl - 60_000) },
    });
    const stale = await db.externalSource.findUniqueOrThrow({ where: { id: source.id } });
    expect(freshnessOf(stale, ttl, new Date())).toBe('STALE');

    respond = () =>
      json(
        dtPoi(1, {
          label: { '@fr': `Musée renommé ${MARK}` },
          hasDescription: [{ description: { '@fr': 'Nouvelle description' } }],
        }),
      );
    const job = {
      ...stalePlacesJob(get(DatatourismePlaceAdapter), get(ExternalSourceRepository), 10),
      key: `datatourisme:places:${JOB}-stale`,
    };
    const result = await sync.run(job);
    expect(result.status).toBe('SUCCEEDED');
    expect(result.unchanged + result.updated).toBeGreaterThanOrEqual(1);
    expect(
      freshnessOf(
        await db.externalSource.findUniqueOrThrow({ where: { id: source.id } }),
        ttl,
        new Date(),
      ),
    ).toBe('FRESH');
    // An obsolete record is never picked by a TTL refresh.
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes(dtUuid(2)))).toBe(false);
  });

  it('14. obsolete: one obsolete source does not deactivate a place another provider still sees', async () => {
    const obsolete = { ...dtPool, isObsolete: true };
    respond = () => json(obsolete);
    await places.importPlace(get(DatatourismePlaceAdapter), dtUuid(90));
    const dt = await sourceOf(dtUuid(90));
    expect(dt.obsoleteAt).not.toBeNull();
    expect(dt.place?.isActive).toBe(true); // Data ES still lists it
  });

  it('15. DATAtourisme events: date only (no time invented) and local time → instant in Paris', async () => {
    respond = () =>
      json(
        dtPage([
          dtPoi(50, {
            type: ['EntertainmentAndEvent', 'Exhibition'],
            takesPlaceAt: [{ startDate: '2026-11-04', endDate: '2027-05-03' }],
          }),
          dtPoi(51, {
            type: ['EntertainmentAndEvent', 'Concert'],
            takesPlaceAt: [{ startDate: '2026-07-14', startTime: '22:30' }],
          }),
          dtPoi(52, {
            type: ['EntertainmentAndEvent'],
            takesPlaceAt: [{ startDate: '2026-11-04', endDate: '2026-05-03' }],
          }),
        ]),
      );
    const job: EventSyncJob = datatourismeEventsJob(get(DatatourismeClient), {
      name: JOB,
      near: { ...PARIS, radiusMeters: 5000 },
    });
    const result = await sync.run({
      ...job,
      open: (cursor, context) =>
        job.open(cursor, { ...context, now: new Date('2026-07-01T10:00:00Z') }),
    });
    expect(result).toMatchObject({
      status: 'SUCCEEDED',
      created: 2,
      skipped: 1,
      errors: { 'skipped:end_before_start': 1 },
    });

    const [dateOnly] = await db.$queryRaw<
      { start: Date | null; day: string; time: string | null; endday: string; lat: number }[]
    >`
      SELECT e."startDate" AS start, e."localStartDate"::text AS day, e."localStartTime" AS time,
             e."localEndDate"::text AS endday, e.latitude AS lat
      FROM events e JOIN external_sources s ON s."eventId" = e.id WHERE s."externalId" = ${dtUuid(50)}`;
    expect(dateOnly).toMatchObject({
      start: null,
      day: '2026-11-04',
      time: null,
      endday: '2027-05-03',
    });
    expect(dateOnly.lat).toBeCloseTo(48.92, 6);
    const timed = await sourceOf(dtUuid(51));
    expect(timed.event?.startDate?.toISOString()).toBe('2026-07-14T20:30:00.000Z'); // 22:30 Paris, summer
    expect(timed.event?.placeId).toBeNull();
    expect(timed.event?.address).toBe('51 rue de Test, 75008 Paris');

    // The database refuses an event with no start at all.
    await expect(db.event.create({ data: { title: `x ${MARK}` } })).rejects.toThrow();
  });

  it('17. concurrency: same record ×5 → one place, one source; same place from two providers at once → one place, two sources', async () => {
    const normalized = (
      providerKey: string,
      externalId: string,
      name = `Café Concurrent ${MARK}`,
    ): NormalizedPlace => ({
      source: { providerKey, externalId, externalUrl: null, providerCategories: [] },
      name,
      address: null,
      city: 'Paris',
      latitude: 48.8611,
      longitude: 2.3611,
      priceLevel: 'UNKNOWN',
      rating: null,
      reviewCount: null,
      isActive: true,
      categorySlugs: [],
    });
    const google = { key: 'google_places', name: 'Google Places' };
    const geoapify = { key: 'geoapify', name: 'Geoapify' };
    const same = await Promise.all(
      Array.from({ length: 5 }, () =>
        places.upsert(google, normalized('google_places', `${MARK}race`)),
      ),
    );
    expect(new Set(same.map(({ place }) => place.id)).size).toBe(1);
    expect(same.filter(({ outcome }) => outcome === 'created')).toHaveLength(1);
    expect(await db.externalSource.count({ where: { externalId: `${MARK}race` } })).toBe(1);

    const bistrot = `Bistrot Concurrent ${MARK}`;
    const [a, b] = await Promise.all([
      places.upsert(google, normalized('google_places', `${MARK}race-g`, bistrot)),
      places.upsert(geoapify, normalized('geoapify', `node/${OSM_PREFIX}77`, bistrot)),
    ]);
    // Serialized on the name lock: one creates, the other finds it and attaches its record.
    expect(a.place.id).toBe(b.place.id);
    expect([a.outcome, b.outcome].sort()).toEqual(['created', 'matched']);
    expect(await db.place.count({ where: { name: bistrot } })).toBe(1);
    expect(await db.externalSource.count({ where: { placeId: a.place.id } })).toBe(2);

    // Two runs of one provider never overlap; a crashed run's lease is taken over.
    const now = new Date();
    const held = await runs.acquire({
      jobKey: `x:${JOB}`,
      providerKey: 'basilic',
      now,
      leaseUntil: new Date(now.getTime() + 60_000),
    });
    await expect(
      runs.acquire({ jobKey: `y:${JOB}`, providerKey: 'basilic', now, leaseUntil: now }),
    ).rejects.toBeInstanceOf(SyncAlreadyRunningError);
    await db.syncRun.update({
      where: { id: held.id },
      data: { leaseUntil: new Date(now.getTime() - 1000) },
    });
    await expect(
      runs.acquire({
        jobKey: `y:${JOB}`,
        providerKey: 'basilic',
        now,
        leaseUntil: new Date(now.getTime() + 60_000),
      }),
    ).resolves.toHaveProperty('id');
    expect(await db.syncRun.findUniqueOrThrow({ where: { id: held.id } })).toMatchObject({
      status: 'FAILED',
      errors: { lease_expired: 1 },
    });
    await db.syncRun.updateMany({
      where: { jobKey: { contains: JOB }, status: 'RUNNING' },
      data: { status: 'FAILED' },
    });
  });

  it('partial failure and resume on the database: a failing item never loses the others; the run resumes from its cursor', async () => {
    const provider = { key: 'data_es', name: 'Data ES (Ministère chargé des Sports)' };
    const place = (n: number, overrides: Partial<NormalizedPlace> = {}): NormalizedPlace => ({
      source: {
        providerKey: 'data_es',
        externalId: `I7510599${String(n).padStart(2, '0')}`,
        externalUrl: null,
        providerCategories: [],
      },
      name: `Terrain ${MARK}${n}`,
      address: null,
      city: 'Paris',
      latitude: 48.83 + n / 100,
      longitude: 2.3,
      priceLevel: 'UNKNOWN',
      rating: null,
      reviewCount: null,
      isActive: true,
      categorySlugs: [],
      ...overrides,
    });
    // A value PostgreSQL refuses (an unknown price level) makes exactly one item fail.
    const broken = place(11, { priceLevel: 'NOT_A_LEVEL' as never });
    const job = fixedPlaceJob(`data_es:places:${JOB}-partial`, provider, [
      { items: [place(10), broken, place(12)], skipped: {}, cursor: null },
      { items: [place(13)], skipped: {}, cursor: null },
    ]);

    const first = await sync.run(job, { maxBatches: 1 });
    expect(first).toMatchObject({
      status: 'PARTIAL',
      created: 2,
      failed: 1,
      stoppedBy: 'max_batches',
      cursor: 1,
    });
    expect(Object.keys(first.errors).some((reason) => reason.startsWith('failed:'))).toBe(true);
    expect(
      await db.externalSource.count({
        where: { externalId: { in: ['I751059910', 'I751059912'] } },
      }),
    ).toBe(2);

    const resumed = await sync.run(job, { resume: true });
    expect(resumed).toMatchObject({ status: 'SUCCEEDED', created: 1, batches: 1 });
    expect(await db.externalSource.count({ where: { externalId: 'I751059913' } })).toBe(1);
    expect(await runs.lastSuccessAt(job.key)).toEqual(resumed.startedAt);
  });

  it('19. the rest of the catalog — DATA-1 experiences, places, enrichments, provenance — is untouched', async () => {
    expect(await untouched()).toEqual(untouchedBefore);
    // On a database holding the DATA-1 catalog, its 16 internal records are still there.
    if (untouchedBefore.internalSources > 0) expect(untouchedBefore.internalSources).toBe(16);
  });
});
