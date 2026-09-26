import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import { catalogId } from '../../src/database/catalog-seed/catalog-id.js';
import {
  buildCatalogPlan,
  type CatalogPlan,
} from '../../src/database/catalog-seed/catalog-plan.js';
import {
  MIGRATION_PROVIDER,
  seedCatalog,
  SeedConflictError,
} from '../../src/database/catalog-seed/catalog-seed.js';
import { MOBILE_MOCK_CATALOG } from '../../src/database/catalog-seed/mobile-mock-catalog.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestClient, resetDatabase } from './database.js';

const plan = buildCatalogPlan(MOBILE_MOCK_CATALOG);
const expId = (mockId: string) => catalogId('experience', mockId);

type Page = { data: { items: { id: string; title: string }[]; nextCursor: string | null } };
type Recs = {
  data: {
    items: { experience: { id: string }; distanceM: number | null; reasons: string[] }[];
    relaxed: string[];
  };
};

/** Row counts of every catalog table (the numbers DATA-1 reports). */
async function catalogCounts(db: PrismaClient) {
  const [
    experiences,
    places,
    categories,
    experiencePlaces,
    experienceCategories,
    placeCategories,
    enrichments,
    events,
    providers,
    sources,
  ] = await Promise.all([
    db.experience.count(),
    db.place.count(),
    db.category.count(),
    db.experiencePlace.count(),
    db.experienceCategory.count(),
    db.placeCategory.count(),
    db.roamEnrichment.count(),
    db.event.count(),
    db.provider.count(),
    db.externalSource.count(),
  ]);
  return {
    experiences,
    places,
    categories,
    experiencePlaces,
    experienceCategories,
    placeCategories,
    enrichments,
    events,
    providers,
    sources,
  };
}

/** Every catalog row with its timestamps: equal before and after a run means the run wrote nothing. */
async function catalogSnapshot(db: PrismaClient) {
  return {
    experiences: await db.experience.findMany({
      orderBy: { id: 'asc' },
      include: { categories: true, places: true, enrichment: true, sources: true },
    }),
    places: await db.place.findMany({
      orderBy: { id: 'asc' },
      include: { categories: true, enrichment: true, sources: true },
    }),
    categories: await db.category.findMany({ orderBy: { id: 'asc' } }),
    providers: await db.provider.findMany({ orderBy: { id: 'asc' } }),
  };
}

const MIGRATED = {
  experiences: 14,
  places: 2,
  categories: 7,
  experiencePlaces: 2,
  experienceCategories: 15,
  placeCategories: 2,
  enrichments: 16,
  events: 0,
  providers: 1,
  sources: 16,
};

/**
 * DATA-1 on PostgreSQL (the test database only): the mobile mock catalog migrated into the canonical model —
 * counts, relations, provenance, idempotence, ownership, rollback — then served by the API-07 endpoints.
 */
describe('DATA-1 catalog migration on PostgreSQL', () => {
  let db: PrismaClient;

  beforeAll(() => {
    db = createTestClient();
  });

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterAll(async () => {
    await resetDatabase(db);
    await db.$disconnect();
  });

  it('first run: the whole catalog, with its relations and provenance', async () => {
    const result = await seedCatalog(db, plan);

    expect(result).toEqual({
      categories: { created: 7, updated: 0, unchanged: 0, skipped: 0 },
      places: { created: 2, updated: 0, unchanged: 0, skipped: 0 },
      experiences: { created: 14, updated: 0, unchanged: 0, skipped: 0 },
      skipped: [],
    });
    expect(await catalogCounts(db)).toEqual(MIGRATED);

    const slow = await db.experience.findUniqueOrThrow({
      where: { id: expId('exp-slow-afternoon') },
      include: {
        places: { orderBy: { position: 'asc' }, include: { place: true } },
        categories: { include: { category: true } },
        enrichment: true,
        sources: { include: { provider: true } },
      },
    });
    expect(slow.places.map(({ place }) => place.name)).toEqual([
      'Café de la Place',
      'Parc des Buttes',
    ]);
    expect(slow.categories.map(({ category }) => category.slug).sort()).toEqual(['cafe', 'park']);
    expect(slow).toMatchObject({
      city: 'Paris',
      priceLevel: 'UNKNOWN',
      priceMin: null,
      currency: 'EUR',
    });
    expect(slow.priceMax?.toNumber()).toBe(10);
    expect(slow.enrichment).toMatchObject({
      estimatedDurationMin: 120,
      durationIsDerived: true,
      source: 'CURATED',
      tags: [],
      energyLevel: 'UNKNOWN',
      atmosphere: [],
    });
    expect(slow.sources).toEqual([
      expect.objectContaining({
        entityType: 'EXPERIENCE',
        externalId: 'exp-slow-afternoon',
        externalUrl: null,
        provider: expect.objectContaining({ key: MIGRATION_PROVIDER.key }) as unknown,
      }),
    ]);

    // Nothing invented: no image, no hours, no schedule, no popularity, no event.
    const invented = await db.experience.count({
      where: {
        OR: [
          { coverImage: { not: null } },
          { images: { isEmpty: false } },
          { startDate: { not: null } },
          { popularity: { not: null } },
          { openingHours: { not: { equals: null } } },
        ],
      },
    });
    expect(invented).toBe(0);
    // Only the internal migration provider: no Google Places / Ticketmaster / data.gouv.fr row or id.
    expect(await db.provider.findMany({ select: { key: true } })).toEqual([
      { key: MIGRATION_PROVIDER.key },
    ]);
    const externalIds = (await db.externalSource.findMany({ select: { externalId: true } })).map(
      (source) => source.externalId,
    );
    expect(externalIds.sort()).toEqual(
      [...MOBILE_MOCK_CATALOG.experiences, ...MOBILE_MOCK_CATALOG.places]
        .map((item) => item.id)
        .sort(),
    );
  });

  it('second run: nothing duplicated, nothing rewritten', async () => {
    await seedCatalog(db, plan);
    const before = await catalogSnapshot(db);

    const result = await seedCatalog(db, plan);

    expect(result).toEqual({
      categories: { created: 0, updated: 0, unchanged: 7, skipped: 0 },
      places: { created: 0, updated: 0, unchanged: 2, skipped: 0 },
      experiences: { created: 0, updated: 0, unchanged: 14, skipped: 0 },
      skipped: [],
    });
    expect(await catalogCounts(db)).toEqual(MIGRATED);
    expect(await catalogSnapshot(db)).toEqual(before);
  });

  it('deterministic ids: the same on every database and every run', async () => {
    await seedCatalog(db, plan);
    const ids = (await db.experience.findMany({ select: { id: true } })).map(({ id }) => id).sort();
    expect(ids).toEqual(MOBILE_MOCK_CATALOG.experiences.map(({ id }) => expId(id)).sort());
    const placeIds = (await db.place.findMany({ select: { id: true } })).map(({ id }) => id).sort();
    expect(placeIds).toEqual(
      [catalogId('place', 'place-cafe'), catalogId('place', 'place-park')].sort(),
    );
  });

  it('a changed mock value updates its record, and only that one', async () => {
    await seedCatalog(db, plan);
    const changed: CatalogPlan = {
      ...plan,
      experiences: plan.experiences.map((item) =>
        item.mockId === 'exp-jazz-night'
          ? { ...item, title: 'Soirée jazz (nouvelle)', categorySlugs: ['bar', 'culture'] }
          : item,
      ),
    };

    const result = await seedCatalog(db, changed);

    expect(result.experiences).toEqual({ created: 0, updated: 1, unchanged: 13, skipped: 0 });
    const jazz = await db.experience.findUniqueOrThrow({
      where: { id: expId('exp-jazz-night') },
      include: { categories: { include: { category: true } } },
    });
    expect(jazz.title).toBe('Soirée jazz (nouvelle)');
    expect(jazz.categories.map(({ category }) => category.slug).sort()).toEqual(['bar', 'culture']);
    expect(await catalogCounts(db)).toEqual({ ...MIGRATED, experienceCategories: 16 });
  });

  it('never overwrites a record changed outside the seed, nor touches data it does not own', async () => {
    const foreign = await db.experience.create({
      data: { title: 'Ajoutée à la main', city: 'Paris' },
    });
    await db.category.create({ data: { slug: 'culture' } });
    await seedCatalog(db, plan);
    // An edit made elsewhere (the API, an admin) after the migration.
    await db.experience.update({
      where: { id: expId('exp-bellevilloise') },
      data: { title: 'Édité à la main' },
    });

    const changed: CatalogPlan = {
      ...plan,
      experiences: plan.experiences.map((item) => ({ ...item, rating: 1 })),
    };
    const result = await seedCatalog(db, changed);

    expect(result.experiences).toEqual({ created: 0, updated: 13, unchanged: 0, skipped: 1 });
    expect(result.skipped).toEqual([
      expect.objectContaining({ entity: 'experience', mockId: 'exp-bellevilloise' }),
    ]);
    const edited = await db.experience.findUniqueOrThrow({
      where: { id: expId('exp-bellevilloise') },
    });
    expect(edited).toMatchObject({ title: 'Édité à la main', rating: 4.6 });
    expect(await db.experience.findUniqueOrThrow({ where: { id: foreign.id } })).toEqual(foreign);
    // The existing "culture" category was reused (its own id), not duplicated.
    expect(await db.category.count({ where: { slug: 'culture' } })).toBe(1);
    expect(await db.experience.count()).toBe(15);
  });

  it('refuses to take over a record with its id that it does not own', async () => {
    await db.experience.create({ data: { id: expId('exp-jazz-night'), title: 'Autre chose' } });

    await expect(seedCatalog(db, plan)).rejects.toThrow(SeedConflictError);
    expect(await db.experience.count()).toBe(1);
    expect(await db.category.count()).toBe(0);
  });

  it('all or nothing: a failure part-way rolls the whole run back', async () => {
    const broken: CatalogPlan = {
      ...plan,
      experiences: plan.experiences.map((item, index) =>
        index === 5 ? { ...item, currency: 'EURO' } : item,
      ),
    };

    await expect(seedCatalog(db, broken)).rejects.toThrow();
    expect(await catalogCounts(db)).toEqual({
      experiences: 0,
      places: 0,
      categories: 0,
      experiencePlaces: 0,
      experienceCategories: 0,
      placeCategories: 0,
      enrichments: 0,
      events: 0,
      providers: 0,
      sources: 0,
    });
  });
});

/** API-07 on the migrated catalog: the endpoints now serve the canonical data from PostgreSQL. */
describe('API-07 on the DATA-1 catalog', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  let auth: { Authorization: string };
  const http = () => request(app.getHttpServer());
  const republique = 'latitude=48.8674&longitude=2.3637';

  beforeAll(async () => {
    db = createTestClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    await resetDatabase(db);
    await seedCatalog(db, plan);

    const response = await http()
      .post('/api/v1/auth/register')
      .send({ displayName: 'Test', email: 'data1@example.com', password: 'fictional-Passw0rd' })
      .expect(201);
    const { token } = (response.body as { data: { session: { token: string } } }).data.session;
    auth = { Authorization: `Bearer ${token}` };
  });

  afterAll(async () => {
    await resetDatabase(db);
    await db.$disconnect();
    await app.close();
  });

  const list = async (query = '') =>
    ((await http().get(`/api/v1/experiences${query}`).set(auth).expect(200)).body as Page).data;
  const titles = async (query: string) =>
    (await list(query)).items.map((item) => item.title).sort();
  const recommend = async (query: string) =>
    ((await http().get(`/api/v1/recommendations?${query}`).set(auth).expect(200)).body as Recs)
      .data;

  it('lists the 14 migrated experiences, paginated to the last page', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await list(`?limit=5${cursor ? `&cursor=${cursor}` : ''}`);
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect(seen.sort()).toEqual(plan.experiences.map((item) => item.id).sort());
  });

  it('filters on the migrated values: category, city, text, budget', async () => {
    expect(await titles('?category=culture')).toEqual([
      'La Bellevilloise',
      'Musée d’Art Moderne',
      'Musée nocturne',
    ]);
    expect(await titles('?city=Versailles')).toEqual(['Escapade nature']);
    expect(await titles('?q=jazz')).toEqual(['Soirée jazz']);
    // free (price 0) + under10 (lowest price unknown: API-07 never excludes an unknown price).
    expect(await titles('?budget=free')).toEqual([
      'Après-midi lente',
      'Balade panoramique',
      'Escapade nature',
      'Musée d’Art Moderne',
      'Musée nocturne',
      'Pique-nique au parc',
      'Randonnée au lac bleu',
    ]);
  });

  it('the detail: ordered places, facts at the top, the migrated ROAM context under roam', async () => {
    const response = await http()
      .get(`/api/v1/experiences/${expId('exp-slow-afternoon')}`)
      .set(auth)
      .expect(200);
    const detail = (response.body as { data: Record<string, unknown> }).data;

    expect(detail).toMatchObject({
      title: 'Après-midi lente',
      categories: expect.arrayContaining(['cafe', 'park']) as unknown,
      city: 'Paris',
      coordinates: { latitude: 48.8674, longitude: 2.3637 },
      coverImage: null,
      images: [],
      priceLevel: 'unknown',
      priceMin: null,
      priceMax: 10,
      currency: 'EUR',
      rating: 4.5,
      reviewCount: 64,
      roam: { estimatedDurationMin: 120, durationIsDerived: true, source: 'curated', tags: [] },
      places: [
        { name: 'Café de la Place', city: 'Paris', roam: { tags: ['calm'] } },
        { name: 'Parc des Buttes', priceLevel: 'free', roam: { tags: ['nature'] } },
      ],
    });
    expect(JSON.stringify(detail)).not.toMatch(/mobile_mock_migration|confidence|popularity/);

    const dinner = await http()
      .get(`/api/v1/experiences/${expId('exp-dinner-view')}`)
      .set(auth)
      .expect(200);
    expect(dinner.body).toMatchObject({
      data: { places: [], priceMin: 25, priceMax: 50, roam: { tags: ['food', 'romantic'] } },
    });
  });

  it('recommendations near République: within 2 km, nearest first among equal scores, with reasons', async () => {
    const result = await recommend(`${republique}&maxDistanceKm=2`);

    expect(result.relaxed).toEqual([]);
    expect(result.items.map((item) => item.experience.id)).toEqual(
      ['exp-rooftop-sunset', 'exp-dinner-view', 'exp-slow-afternoon', 'exp-night-museum'].map(
        expId,
      ),
    );
    expect(result.items.every((item) => item.reasons.includes('nearby'))).toBe(true);
    expect(
      result.items.find((item) => item.experience.id === expId('exp-slow-afternoon'))?.distanceM,
    ).toBe(0);
  });

  it('budget reasons only for a known price; no perfect match relaxes the duration', async () => {
    const free = await recommend(`${republique}&maxDistanceKm=3&budget=free`);
    const reasons = Object.fromEntries(
      free.items.map((item) => [item.experience.id, item.reasons]),
    );
    expect(reasons[expId('exp-picnic-park')]).toContain('budget');
    expect(reasons[expId('exp-slow-afternoon')]).not.toContain('budget');

    // No experience lasts 60 minutes or less (90 min at least).
    const short = await recommend(`${republique}&availableMinutes=60`);
    expect(short.relaxed).toEqual(['duration']);
    expect(short.items.length).toBeGreaterThan(0);
  });
});
