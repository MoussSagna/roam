import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PlaceRepository } from '../../src/modules/catalog/place.repository.js';
import { GeoapifyAdapter } from '../../src/modules/providers/geoapify/geoapify.adapter.js';
import { PlaceIngestionService } from '../../src/modules/providers/place-ingestion.service.js';
import { createTestClient } from './database.js';

/** Fictional key and ids: this suite never calls Geoapify (fetch is stubbed) and never uses a real key. */
const FAKE_KEY = 'geoFAKE0db0test0key0000000000000';
/** OpenStreetMap node ids far above any real one: external ids `node/99000000000<suffix>`. */
const OSM_PREFIX = '99000000000';
const PREFIX = `node/${OSM_PREFIX}`;

const feature = (suffix: string, overrides: Record<string, unknown> = {}) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [2.3708, 48.8631] },
  properties: {
    name: `Café ${suffix}`,
    city: 'Paris',
    lat: 48.8631,
    lon: 2.3708,
    formatted: `Café ${suffix}, ${suffix} Rue de Test, 75011 Paris, France`,
    address_line1: `Café ${suffix}`,
    address_line2: `${suffix} Rue de Test, 75011 Paris, France`,
    categories: ['catering', 'catering.cafe'],
    datasource: {
      sourcename: 'openstreetmap',
      url: 'https://www.openstreetmap.org/copyright',
      raw: { osm_type: 'n', osm_id: Number(`${OSM_PREFIX}${suffix}`) },
    },
    // Geoapify's place_id encodes coordinates: never used as the identity.
    place_id: `51fake${suffix}${Math.random().toString(16).slice(2)}`,
    ...overrides,
  },
});

const json = (features: unknown[]) =>
  new Response(JSON.stringify({ type: 'FeatureCollection', features }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * DATA-2.1 end to end on PostgreSQL: Geoapify-like responses (fetch stubbed) → client → adapter → normalization →
 * the DATA-2 ingestion → repositories → the test database. Non-destructive: no reset, no TRUNCATE; it creates only
 * records whose Geoapify external id starts with PREFIX (and the `cafe` category if missing) and removes exactly
 * those at the end, so the catalog already in the database (DATA-1) is left as it was — checked.
 */
describe('Geoapify ingestion on PostgreSQL', () => {
  let db: PrismaClient;
  let ingestion: PlaceIngestionService;
  let adapter: GeoapifyAdapter;
  let placeRepository: PlaceRepository;
  let close: () => Promise<void>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let createdCafeCategory = false;
  let untouchedBefore: { places: number; experiences: number; sources: number };

  const testPlaces = () =>
    db.externalSource.findMany({
      where: { entityType: 'PLACE', externalId: { startsWith: PREFIX } },
      include: { provider: true, place: { include: { categories: true, enrichment: true } } },
      orderBy: { externalId: 'asc' },
    });

  const untouchedCounts = async () => ({
    places: await db.place.count({
      where: { NOT: { sources: { some: { externalId: { startsWith: PREFIX } } } } },
    }),
    experiences: await db.experience.count(),
    sources: await db.externalSource.count({
      where: { NOT: { externalId: { startsWith: PREFIX } } },
    }),
  });

  async function removeTestRecords() {
    await db.place.deleteMany({
      where: { sources: { some: { externalId: { startsWith: PREFIX } } } },
    });
    await db.provider.deleteMany({ where: { key: 'geoapify', sources: { none: {} } } });
  }

  beforeAll(async () => {
    // A fictional key, set before the configuration is loaded (setup-env.ts removed any real one): the
    // application module is imported only now, so its configuration reads this value.
    process.env.GEOAPIFY_API_KEY = FAKE_KEY;
    const { AppModule } = await import('../../src/app.module.js');
    db = createTestClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    close = () => moduleRef.close();
    ingestion = moduleRef.get(PlaceIngestionService);
    adapter = moduleRef.get(GeoapifyAdapter);
    placeRepository = moduleRef.get(PlaceRepository);

    await removeTestRecords();
    if (!(await db.category.findUnique({ where: { slug: 'cafe' } }))) {
      await db.category.create({ data: { slug: 'cafe' } });
      createdCafeCategory = true;
    }
    untouchedBefore = await untouchedCounts();
  });

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    // Every request went to Geoapify with the fictional key in a header — never in the URL, never elsewhere.
    for (const [url, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(url.startsWith('https://api.geoapify.com/v2/')).toBe(true);
      expect(url.includes(FAKE_KEY)).toBe(false);
      // Compared as a boolean: an assertion diff must never print a key.
      expect((init.headers as Record<string, string>)['X-Api-Key'] === FAKE_KEY).toBe(true);
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await removeTestRecords();
    if (createdCafeCategory) await db.category.delete({ where: { slug: 'cafe' } });
    await close();
    await db.$disconnect();
    delete process.env.GEOAPIFY_API_KEY;
  });

  it('first import creates the places with their provenance and categories; absent facts stay null', async () => {
    fetchMock.mockResolvedValue(json([feature('1'), feature('2')]));

    const report = await ingestion.importNearby(adapter, {
      latitude: 48.8566,
      longitude: 2.3522,
      radiusMeters: 1000,
      maxResults: 2,
      categorySlugs: ['cafe'],
    });

    expect(report).toMatchObject({ created: 2, updated: 0 });
    const sources = await testPlaces();
    expect(sources).toHaveLength(2);
    const [first] = sources;
    expect(first.provider).toMatchObject({ key: 'geoapify', name: 'Geoapify' });
    expect(first).toMatchObject({
      externalId: `${PREFIX}1`,
      externalUrl: null,
      providerCategories: ['catering', 'catering.cafe'],
    });
    expect(first.place).toMatchObject({
      name: 'Café 1',
      address: '1 Rue de Test, 75011 Paris, France',
      city: 'Paris',
      latitude: 48.8631,
      longitude: 2.3708,
      priceLevel: 'UNKNOWN',
      rating: null,
      reviewCount: null,
      isActive: true,
      enrichment: null,
    });
    expect(first.place?.categories).toHaveLength(1);
  });

  it('a second import of the same OpenStreetMap object updates the same place, whatever its place_id', async () => {
    const [before] = await testPlaces();
    // A new Response per call (a body is read once), each with a different place_id.
    fetchMock.mockImplementation(() =>
      json([feature('1', { name: 'Café 1 (renommé)', address_line1: 'Café 1 (renommé)' })]),
    );

    const result = await ingestion.importPlace(adapter, `${PREFIX}1`);
    const nearby = await ingestion.importNearby(adapter, {
      latitude: 48.8566,
      longitude: 2.3522,
      radiusMeters: 1000,
    });

    expect(result?.outcome).toBe('updated');
    // DATA-6: the same facts again → `unchanged` (only `fetchedAt` moved).
    expect(nearby).toMatchObject({ created: 0, matched: 0, updated: 0, unchanged: 1 });
    expect(result?.place.id).toBe(before.placeId);
    const rows = await db.externalSource.findMany({ where: { externalId: `${PREFIX}1` } });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(before.id);
    expect(rows[0].fetchedAt.getTime()).toBeGreaterThanOrEqual(before.fetchedAt.getTime());
    const place = await db.place.findUniqueOrThrow({ where: { id: before.placeId! } });
    expect(place.name).toBe('Café 1 (renommé)');
    expect(await testPlaces()).toHaveLength(2);
  });

  it('a Geoapify refresh never overwrites ROAM data (enrichment, description, categories)', async () => {
    const [{ placeId }] = await testPlaces();
    await db.roamEnrichment.create({
      data: {
        placeId,
        atmosphere: ['COZY'],
        energyLevel: 'LOW',
        suitableFor: ['COUPLE'],
        bestMoments: ['MORNING'],
        tags: ['brunch'],
        estimatedDurationMin: 60,
        durationIsDerived: true,
        source: 'CURATED',
      },
    });
    await db.place.update({ where: { id: placeId! }, data: { description: 'Texte ROAM' } });
    fetchMock.mockResolvedValue(json([feature('1', { categories: ['catering', 'catering.bar'] })]));

    await ingestion.importPlace(adapter, `${PREFIX}1`);

    const place = await placeRepository.findById(placeId!);
    expect(place).toMatchObject({
      name: 'Café 1',
      description: 'Texte ROAM',
      categorySlugs: ['cafe'],
    });
    expect(place?.enrichment).toMatchObject({
      atmosphere: ['COZY'],
      energyLevel: 'LOW',
      suitableFor: ['COUPLE'],
      bestMoments: ['MORNING'],
      tags: ['brunch'],
      estimatedDurationMin: 60,
      source: 'CURATED',
    });
    const [source] = await db.externalSource.findMany({ where: { externalId: `${PREFIX}1` } });
    expect(source.providerCategories).toEqual(['catering', 'catering.bar']);
  });

  it('concurrent imports of a new OpenStreetMap object create one place', async () => {
    fetchMock.mockImplementation(() => json([feature('3')]));

    const results = await Promise.all([
      ingestion.importPlace(adapter, `${PREFIX}3`),
      ingestion.importPlace(adapter, `${PREFIX}3`),
      ingestion.importPlace(adapter, `${PREFIX}3`),
    ]);

    expect(new Set(results.map((result) => result?.place.id)).size).toBe(1);
    expect(results.filter((result) => result?.outcome === 'created')).toHaveLength(1);
    expect(await db.externalSource.count({ where: { externalId: `${PREFIX}3` } })).toBe(1);
  });

  it('an unknown place (no feature) writes nothing', async () => {
    fetchMock.mockResolvedValue(json([]));
    const before = await testPlaces();

    await expect(ingestion.importPlace(adapter, `${PREFIX}9`)).resolves.toBeNull();
    expect(await testPlaces()).toHaveLength(before.length);
  });

  it('the rest of the catalog (DATA-1, other providers) is untouched', async () => {
    expect(await untouchedCounts()).toEqual(untouchedBefore);
  });
});
