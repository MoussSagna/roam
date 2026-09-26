import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { RecordNotFoundError } from '../../src/database/persistence-errors.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PlaceRepository } from '../../src/modules/catalog/place.repository.js';
import { GooglePlacesAdapter } from '../../src/modules/providers/google-places/google-places.adapter.js';
import { PlaceIngestionService } from '../../src/modules/providers/place-ingestion.service.js';
import { createTestClient } from './database.js';

/** Fictional key and ids: this suite never calls Google (fetch is stubbed) and never uses a real key. */
const FAKE_KEY = 'AIzaFAKE-db-test-key_00000000000000000';
const PREFIX = 'ChIJ-DATA2-TEST-';

const googlePlace = (suffix: string, overrides: Record<string, unknown> = {}) => ({
  id: `${PREFIX}${suffix}`,
  displayName: { text: `Café ${suffix}`, languageCode: 'fr' },
  formattedAddress: `${suffix} Rue de Test, 75011 Paris, France`,
  addressComponents: [{ longText: 'Paris', shortText: 'Paris', types: ['locality', 'political'] }],
  location: { latitude: 48.8631, longitude: 2.3708 },
  types: ['cafe', 'food', 'point_of_interest'],
  businessStatus: 'OPERATIONAL',
  googleMapsUri: `https://maps.google.com/?cid=${suffix}`,
  rating: 4.1,
  userRatingCount: 100,
  priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
  ...overrides,
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * DATA-2 end to end on PostgreSQL: Google-like response (fetch stubbed) → client → adapter → normalization →
 * ingestion → repositories → the test database. Non-destructive: no reset, no TRUNCATE; it creates only records
 * whose Google id starts with PREFIX (and the `cafe` category if missing) and removes exactly those at the end,
 * so the catalog already in the database (DATA-1) is left as it was — checked.
 */
describe('Google Places ingestion on PostgreSQL', () => {
  let db: PrismaClient;
  let ingestion: PlaceIngestionService;
  let adapter: GooglePlacesAdapter;
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
    await db.provider.deleteMany({ where: { key: 'google_places', sources: { none: {} } } });
  }

  beforeAll(async () => {
    // A fictional key, set before the configuration is loaded (setup-env.ts removed any real one): the
    // application module is imported only now, so its configuration reads this value.
    process.env.GOOGLE_PLACES_API_KEY = FAKE_KEY;
    const { AppModule } = await import('../../src/app.module.js');
    db = createTestClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    close = () => moduleRef.close();
    ingestion = moduleRef.get(PlaceIngestionService);
    adapter = moduleRef.get(GooglePlacesAdapter);
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
    // Every request went to Google's endpoint with the fictional key — never anywhere else.
    for (const [url, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(url.startsWith('https://places.googleapis.com/v1/')).toBe(true);
      // Compared as a boolean: an assertion diff must never print a key.
      expect((init.headers as Record<string, string>)['X-Goog-Api-Key'] === FAKE_KEY).toBe(true);
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await removeTestRecords();
    if (createdCafeCategory) await db.category.delete({ where: { slug: 'cafe' } });
    await close();
    await db.$disconnect();
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  it('first import creates the place with its provenance and categories', async () => {
    fetchMock.mockResolvedValue(json({ places: [googlePlace('A'), googlePlace('B')] }));

    const report = await ingestion.importNearby(adapter, {
      latitude: 48.8566,
      longitude: 2.3522,
      radiusMeters: 1000,
      maxResults: 2,
    });

    expect(report).toMatchObject({ created: 2, updated: 0 });
    const sources = await testPlaces();
    expect(sources).toHaveLength(2);
    const [a] = sources;
    expect(a.provider.key).toBe('google_places');
    expect(a).toMatchObject({
      externalId: `${PREFIX}A`,
      externalUrl: 'https://maps.google.com/?cid=A',
      providerCategories: ['cafe', 'food', 'point_of_interest'],
    });
    expect(a.place).toMatchObject({
      name: 'Café A',
      address: 'A Rue de Test, 75011 Paris, France',
      city: 'Paris',
      latitude: 48.8631,
      longitude: 2.3708,
      priceLevel: 'LOW',
      rating: 4.1,
      reviewCount: 100,
      isActive: true,
      enrichment: null,
    });
    expect(a.place?.categories).toHaveLength(1);
  });

  it('a second import of the same Google id updates the same place: no duplicate (idempotent)', async () => {
    const [before] = await testPlaces();
    // A new Response per call: a body is read once.
    fetchMock.mockImplementation(() =>
      json(
        googlePlace('A', {
          rating: 4.6,
          userRatingCount: 150,
          displayName: { text: 'Café A (renommé)' },
        }),
      ),
    );

    const result = await ingestion.importPlace(adapter, `${PREFIX}A`);
    const again = await ingestion.importPlace(adapter, `${PREFIX}A`);

    expect(result?.outcome).toBe('updated');
    expect(again?.outcome).toBe('updated');
    expect(result?.place.id).toBe(before.placeId);
    const rows = await db.externalSource.findMany({ where: { externalId: `${PREFIX}A` } });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(before.id);
    expect(rows[0].fetchedAt.getTime()).toBeGreaterThanOrEqual(before.fetchedAt.getTime());
    const place = await db.place.findUniqueOrThrow({ where: { id: before.placeId! } });
    expect(place).toMatchObject({ name: 'Café A (renommé)', rating: 4.6, reviewCount: 150 });
    expect(await testPlaces()).toHaveLength(2);
  });

  it('a Google refresh never overwrites ROAM data (enrichment, description, categories)', async () => {
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
    fetchMock.mockResolvedValue(json(googlePlace('A', { rating: 3.9, types: ['bar'] })));

    await ingestion.importPlace(adapter, `${PREFIX}A`);

    const place = await placeRepository.findById(placeId!);
    expect(place).toMatchObject({
      rating: 3.9,
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
    const [source] = await db.externalSource.findMany({ where: { externalId: `${PREFIX}A` } });
    expect(source.providerCategories).toEqual(['bar']);
  });

  it('concurrent imports of a new Google id create one place', async () => {
    fetchMock.mockImplementation(() => json(googlePlace('C')));

    const results = await Promise.all([
      ingestion.importPlace(adapter, `${PREFIX}C`),
      ingestion.importPlace(adapter, `${PREFIX}C`),
      ingestion.importPlace(adapter, `${PREFIX}C`),
    ]);

    expect(new Set(results.map((result) => result?.place.id)).size).toBe(1);
    expect(results.filter((result) => result?.outcome === 'created')).toHaveLength(1);
    expect(await db.externalSource.count({ where: { externalId: `${PREFIX}C` } })).toBe(1);
  });

  it('a permanently closed place is deactivated, not deleted', async () => {
    fetchMock.mockResolvedValue(json(googlePlace('B', { businessStatus: 'CLOSED_PERMANENTLY' })));

    const result = await ingestion.importPlace(adapter, `${PREFIX}B`);

    expect(result?.place.isActive).toBe(false);
    expect(await db.place.count({ where: { id: result!.place.id } })).toBe(1);
  });

  it('an unknown Google id (404) writes nothing', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 404, status: 'NOT_FOUND' } }), { status: 404 }),
    );
    const before = await testPlaces();

    await expect(ingestion.importPlace(adapter, `${PREFIX}GONE`)).resolves.toBeNull();
    expect(await testPlaces()).toHaveLength(before.length);
  });

  it('updateFromSource on a missing place fails cleanly (RecordNotFoundError)', async () => {
    await expect(
      placeRepository.updateFromSource(
        '00000000-0000-7000-8000-000000000000',
        { rating: 1 },
        {
          provider: { key: 'google_places', name: 'Google Places' },
          externalId: `${PREFIX}NONE`,
          fetchedAt: new Date(),
        },
      ),
    ).rejects.toBeInstanceOf(RecordNotFoundError);
  });

  it('the rest of the catalog (DATA-1) is untouched', async () => {
    expect(await untouchedCounts()).toEqual(untouchedBefore);
  });
});
