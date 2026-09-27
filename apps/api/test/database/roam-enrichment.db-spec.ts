import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { UniqueConstraintError } from '../../src/database/persistence-errors.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PlaceRepository } from '../../src/modules/catalog/place.repository.js';
import { RoamEnrichmentRepository } from '../../src/modules/catalog/roam-enrichment.repository.js';
import { deriveRulesEnrichment } from '../../src/modules/enrichment/roam-enrichment.rules.js';
import { RoamEnrichmentService } from '../../src/modules/enrichment/roam-enrichment.service.js';
import { PlaceIngestionService } from '../../src/modules/providers/place-ingestion.service.js';
import type { NormalizedPlace } from '../../src/modules/providers/provider.types.js';
import { createTestClient } from './database.js';

/** Every external id this suite creates contains this marker (Google-, Geoapify- and DATA-1-like records). */
const MARK = 'DATA3-TEST-';
const GOOGLE = { key: 'google_places', name: 'Google Places' };
const GEOAPIFY = { key: 'geoapify', name: 'Geoapify' };
const DATA1 = {
  key: 'mobile_mock_migration',
  name: 'ROAM mobile mock data (DATA-1 migration, internal)',
};
const PROVIDER_KEYS = [GOOGLE.key, GEOAPIFY.key, DATA1.key];
const CATEGORIES = ['cafe', 'park', 'culture'];

/** The same physical place as Google and Geoapify would normalize it (DATA-2 / DATA-2.1 contract). */
const normalized = (
  providerKey: string,
  externalId: string,
  overrides: Partial<NormalizedPlace> = {},
): NormalizedPlace => ({
  source: { providerKey, externalId, externalUrl: null, providerCategories: ['park'] },
  name: 'Jardin Test',
  address: '1 Allée de Test, 75004 Paris, France',
  city: 'Paris',
  latitude: 48.8566,
  longitude: 2.3522,
  priceLevel: 'UNKNOWN',
  rating: null,
  reviewCount: null,
  isActive: true,
  categorySlugs: ['park'],
  ...overrides,
});

const PARK_RULES = deriveRulesEnrichment(['park'])!;

/**
 * DATA-3 on PostgreSQL: NormalizedPlace → PlaceIngestionService (DATA-2) → RoamEnrichmentService → repositories →
 * the test database, for Google-, Geoapify- and DATA-1-like places. Non-destructive: no reset, no TRUNCATE; it creates
 * only places whose external id contains MARK (plus missing categories/providers, removed afterwards) and checks
 * the rest of the catalog is unchanged. On a database holding the real DATA-1 catalog, it also checks that enriching
 * its curated places writes nothing.
 */
describe('ROAM enrichment on PostgreSQL', () => {
  let db: PrismaClient;
  let ingestion: PlaceIngestionService;
  let enrichment: RoamEnrichmentService;
  let enrichments: RoamEnrichmentRepository;
  let places: PlaceRepository;
  let close: () => Promise<void>;
  let createdCategories: string[] = [];
  let createdProviders: string[] = [];
  let untouchedBefore: { places: number; enrichments: string; sources: number };

  const testFilter = { sources: { some: { externalId: { contains: MARK } } } };

  const untouched = async () => ({
    places: await db.place.count({ where: { NOT: testFilter } }),
    // Every enrichment outside the suite, with its last write: nothing else may change.
    enrichments: JSON.stringify(
      await db.roamEnrichment.findMany({
        where: { NOT: { place: testFilter } },
        select: { id: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
    ),
    sources: await db.externalSource.count({
      where: { NOT: { externalId: { contains: MARK } } },
    }),
  });

  const ingest = async (provider: { key: string; name: string }, place: NormalizedPlace) =>
    (await ingestion.upsert(provider, place)).place.id;

  const enrichmentRow = (placeId: string) => db.roamEnrichment.findUnique({ where: { placeId } });

  async function removeTestRecords() {
    await db.place.deleteMany({ where: testFilter });
  }

  beforeAll(async () => {
    const { AppModule } = await import('../../src/app.module.js');
    db = createTestClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    close = () => moduleRef.close();
    ingestion = moduleRef.get(PlaceIngestionService);
    enrichment = moduleRef.get(RoamEnrichmentService);
    enrichments = moduleRef.get(RoamEnrichmentRepository);
    places = moduleRef.get(PlaceRepository);

    await removeTestRecords();
    const existingCategories = new Set(
      (await db.category.findMany({ select: { slug: true } })).map(({ slug }) => slug),
    );
    createdCategories = CATEGORIES.filter((slug) => !existingCategories.has(slug));
    for (const slug of createdCategories) await db.category.create({ data: { slug } });
    const existingProviders = new Set(
      (await db.provider.findMany({ where: { key: { in: PROVIDER_KEYS } } })).map(({ key }) => key),
    );
    createdProviders = PROVIDER_KEYS.filter((key) => !existingProviders.has(key));
    untouchedBefore = await untouched();
  });

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  afterAll(async () => {
    await removeTestRecords();
    await db.provider.deleteMany({
      where: { key: { in: createdProviders }, sources: { none: {} } },
    });
    for (const slug of createdCategories) await db.category.delete({ where: { slug } });
    await close();
    await db.$disconnect();
  });

  it('pipeline, Google-like place: ingested, then enriched by the rules; provider facts untouched', async () => {
    const placeId = await ingest(
      GOOGLE,
      normalized(GOOGLE.key, `${MARK}google-1`, {
        rating: 4.5,
        reviewCount: 800,
        priceLevel: 'FREE',
      }),
    );
    const before = await db.place.findUniqueOrThrow({ where: { id: placeId } });

    const result = await enrichment.enrichPlace(placeId);

    expect(result).toMatchObject({
      outcome: 'created',
      quality: { recommendationReady: true, enriched: true, missingFacts: [] },
    });
    expect(await enrichmentRow(placeId)).toMatchObject({
      placeId,
      experienceId: null,
      atmosphere: ['OUTDOOR'],
      energyLevel: 'UNKNOWN',
      suitableFor: [],
      bestMoments: [],
      tags: [],
      estimatedDurationMin: 60,
      durationIsDerived: true,
      source: 'ROAM_RULES',
      confidence: PARK_RULES.confidence,
    });
    const after = await places.findById(placeId);
    expect(after).toMatchObject({
      rating: 4.5,
      reviewCount: 800,
      priceLevel: 'FREE',
      name: 'Jardin Test',
    });
    expect(after?.updatedAt).toEqual(before.updatedAt);
  });

  it('pipeline, Geoapify-like place: the same rules, missing provider facts stay null', async () => {
    const placeId = await ingest(GEOAPIFY, normalized(GEOAPIFY.key, `node/${MARK}1`));

    const result = await enrichment.enrichPlace(placeId);

    expect(result).toMatchObject({
      outcome: 'created',
      quality: {
        recommendationReady: true,
        missingFacts: ['priceLevel', 'rating', 'reviewCount'],
      },
    });
    const place = await places.findById(placeId);
    expect(place).toMatchObject({ rating: null, reviewCount: null, priceLevel: 'UNKNOWN' });
    expect(place?.enrichment).toMatchObject({ atmosphere: ['OUTDOOR'], estimatedDurationMin: 60 });
  });

  it('several providers: the same physical place stays two places (no cross-provider merge), enriched identically', async () => {
    const rows = await db.externalSource.findMany({
      where: { externalId: { in: [`${MARK}google-1`, `node/${MARK}1`] } },
      include: { place: { include: { enrichment: true } } },
    });

    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.placeId)).size).toBe(2);
    const [a, b] = rows.map(({ place }) => {
      const { atmosphere, estimatedDurationMin, source, confidence } = place!.enrichment!;
      return { atmosphere, estimatedDurationMin, source, confidence };
    });
    expect(a).toEqual(b);
  });

  it('second enrichment: nothing written (idempotent); an outdated rules enrichment is updated in place', async () => {
    const [{ placeId }] = await db.externalSource.findMany({
      where: { externalId: `${MARK}google-1` },
    });
    const first = await enrichmentRow(placeId!);

    await expect(enrichment.enrichPlace(placeId!)).resolves.toMatchObject({ outcome: 'unchanged' });
    const second = await enrichmentRow(placeId!);
    expect(second?.id).toBe(first?.id);
    expect(second?.updatedAt).toEqual(first?.updatedAt);

    await db.roamEnrichment.update({
      where: { placeId: placeId! },
      data: { estimatedDurationMin: 15, atmosphere: [] },
    });
    await expect(enrichment.enrichPlace(placeId!)).resolves.toMatchObject({ outcome: 'updated' });
    const third = await enrichmentRow(placeId!);
    expect(third).toMatchObject({
      id: first?.id,
      estimatedDurationMin: 60,
      atmosphere: ['OUTDOOR'],
    });
    expect(await db.roamEnrichment.count({ where: { placeId: placeId! } })).toBe(1);
  });

  it('a provider refresh leaves the enrichment as it is', async () => {
    const [{ placeId }] = await db.externalSource.findMany({
      where: { externalId: `node/${MARK}1` },
    });
    const before = await enrichmentRow(placeId!);

    const refreshed = await ingestion.upsert(
      GEOAPIFY,
      normalized(GEOAPIFY.key, `node/${MARK}1`, {
        name: 'Jardin Test (renommé)',
        categorySlugs: ['cafe'],
      }),
    );

    expect(refreshed.outcome).toBe('updated');
    expect(await enrichmentRow(placeId!)).toEqual(before);
  });

  it('curated data wins: a curated enrichment survives both a provider refresh and the rules', async () => {
    const placeId = await ingest(GOOGLE, normalized(GOOGLE.key, `${MARK}google-curated`));
    await db.roamEnrichment.create({
      data: {
        placeId,
        atmosphere: ['COZY', 'QUIET'],
        energyLevel: 'LOW',
        suitableFor: ['COUPLE'],
        bestMoments: ['MORNING'],
        tags: ['lecture'],
        estimatedDurationMin: 40,
        source: 'CURATED',
      },
    });
    const curated = await enrichmentRow(placeId);

    await ingestion.upsert(
      GOOGLE,
      normalized(GOOGLE.key, `${MARK}google-curated`, { rating: 3.1 }),
    );
    const result = await enrichment.enrichPlace(placeId);

    expect(result.outcome).toBe('kept_curated');
    expect(await enrichmentRow(placeId)).toEqual(curated);
    // The conditional rewrite itself refuses a curated row.
    await expect(enrichments.replaceRulesEnrichmentOfPlace(placeId, PARK_RULES)).resolves.toBe(
      false,
    );
    expect(await enrichmentRow(placeId)).toEqual(curated);
  });

  it('pipeline, DATA-1-like place (internal provenance, curated enrichment): kept exactly', async () => {
    const created = await places.create({
      name: 'Café DATA-1 Test',
      latitude: 48.85,
      longitude: 2.34,
      categorySlugs: ['cafe'],
      source: { provider: DATA1, externalId: `${MARK}mock-place`, fetchedAt: new Date() },
    });
    await db.roamEnrichment.create({
      data: {
        placeId: created.id,
        atmosphere: [],
        tags: ['brunch', 'cosy'],
        source: 'CURATED',
        confidence: { tags: { basis: 'mobile_mock_migration' } },
      },
    });
    const before = await enrichmentRow(created.id);

    await expect(enrichment.enrichPlace(created.id)).resolves.toMatchObject({
      outcome: 'kept_curated',
      enrichment: { tags: ['brunch', 'cosy'], source: 'CURATED', estimatedDurationMin: null },
    });
    expect(await enrichmentRow(created.id)).toEqual(before);
  });

  it('the real DATA-1 places, when present: their curated enrichments are kept, nothing written', async () => {
    const data1 = await db.place.findMany({
      where: {
        NOT: testFilter,
        sources: { some: { provider: { key: DATA1.key } } },
        enrichment: { source: { not: 'ROAM_RULES' } },
      },
      select: { id: true },
    });

    const report = await enrichment.enrichPlaces(data1.map(({ id }) => id));

    expect(report.kept_curated).toBe(data1.length);
    expect(report.created + report.updated).toBe(0);
  });

  it('concurrent first enrichments of a place create one enrichment', async () => {
    const placeId = await ingest(
      GOOGLE,
      normalized(GOOGLE.key, `${MARK}google-race`, { categorySlugs: ['culture'] }),
    );

    const results = await Promise.all([
      enrichment.enrichPlace(placeId),
      enrichment.enrichPlace(placeId),
      enrichment.enrichPlace(placeId),
    ]);

    expect(results.filter((result) => result.outcome === 'created')).toHaveLength(1);
    expect(results.every((result) => ['created', 'unchanged'].includes(result.outcome))).toBe(true);
    expect(await db.roamEnrichment.count({ where: { placeId } })).toBe(1);
    expect(await enrichmentRow(placeId)).toMatchObject({
      atmosphere: ['CULTURAL'],
      estimatedDurationMin: 90,
    });
  });

  it('unique constraint: a second enrichment row for a place is refused', async () => {
    const placeId = await ingest(GOOGLE, normalized(GOOGLE.key, `${MARK}google-unique`));
    await enrichments.createForPlace(placeId, PARK_RULES);

    await expect(enrichments.createForPlace(placeId, PARK_RULES)).rejects.toBeInstanceOf(
      UniqueConstraintError,
    );
  });

  it('a place with no rule (no category) gets no enrichment row and is reported not ready', async () => {
    const placeId = await ingest(
      GEOAPIFY,
      normalized(GEOAPIFY.key, `node/${MARK}2`, { categorySlugs: [] }),
    );

    await expect(enrichment.enrichPlace(placeId)).resolves.toMatchObject({
      outcome: 'no_rule',
      enrichment: null,
      quality: { recommendationReady: false, issues: ['NO_CATEGORY'] },
    });
    expect(await enrichmentRow(placeId)).toBeNull();
  });

  it('the rest of the catalog (DATA-1 and other places, their enrichments and sources) is untouched', async () => {
    expect(await untouched()).toEqual(untouchedBefore);
  });
});
