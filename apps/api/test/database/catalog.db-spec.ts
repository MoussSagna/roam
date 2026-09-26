import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestClient, resetDatabase } from './database.js';

type Page = { data: { items: { id: string; title: string }[]; nextCursor: string | null } };
type Recs = {
  data: {
    context: Record<string, unknown>;
    items: { experience: { id: string }; distanceM: number | null; reasons: string[] }[];
    relaxed: string[];
  };
};

const CENTER = { latitude: 48.8566, longitude: 2.3522 };
/** A point `km` north of the center (1° of latitude ≈ 111.195 km). */
const north = (km: number) => ({
  latitude: CENTER.latitude + km / 111.195,
  longitude: CENTER.longitude,
});

/**
 * The catalog and the recommendations end to end: the real application over HTTP on PostgreSQL (the test
 * database), with a small catalog created by the test and two accounts with different preferences.
 */
describe('experience catalog and recommendations on PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  const http = () => request(app.getHttpServer());
  const ids: Record<'museum' | 'market' | 'woods' | 'old' | 'lyon', string> = {} as never;
  let lea: { Authorization: string };
  let tom: { Authorization: string };

  async function account(email: string) {
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ displayName: 'Test', email, password: 'fictional-Passw0rd' })
      .expect(201);
    const { token } = (response.body as { data: { session: { token: string } } }).data.session;
    return { Authorization: `Bearer ${token}` };
  }

  beforeAll(async () => {
    db = createTestClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    await resetDatabase(db);

    await db.category.createMany({ data: [{ slug: 'culture' }, { slug: 'food' }] });
    const [cafe, museum] = await Promise.all([
      db.place.create({ data: { name: 'Café', ...north(1.1) } }),
      db.place.create({ data: { name: 'Musée', ...north(1.2), priceLevel: 'MEDIUM' } }),
    ]);
    const culture = { create: [{ category: { connect: { slug: 'culture' } } }] };
    const food = { create: [{ category: { connect: { slug: 'food' } } }] };

    // Created one after the other: ids are time-ordered (UUID v7), so the list order is this order.
    ids.museum = (
      await db.experience.create({
        data: {
          title: 'Musée puis café',
          city: 'Paris',
          ...north(1.2),
          priceMin: 12,
          priceLevel: 'MEDIUM',
          currency: 'EUR',
          rating: 4.6,
          categories: culture,
          places: {
            create: [
              { placeId: museum.id, position: 0 },
              { placeId: cafe.id, position: 1 },
            ],
          },
          enrichment: {
            create: {
              suitableFor: ['COUPLE', 'FRIENDS'],
              estimatedDurationMin: 120,
              confidence: { x: 1 },
            },
          },
        },
      })
    ).id;
    ids.market = (
      await db.experience.create({
        data: {
          title: 'Marché couvert',
          city: 'Paris',
          ...north(3),
          priceMin: 0,
          priceLevel: 'FREE',
          rating: 4.2,
          categories: food,
          enrichment: { create: { suitableFor: ['FAMILY'], estimatedDurationMin: 60 } },
        },
      })
    ).id;
    ids.woods = (
      await db.experience.create({
        data: { title: 'Balade au bois', city: 'Paris', ...north(7), categories: culture },
      })
    ).id;
    ids.old = (
      await db.experience.create({
        data: {
          title: 'Ancienne expo',
          city: 'Paris',
          ...north(1),
          isActive: false,
          categories: culture,
        },
      })
    ).id;
    ids.lyon = (
      await db.experience.create({ data: { title: 'Traboules', city: 'Lyon', priceMin: 30 } })
    ).id;

    lea = await account('lea@example.com');
    tom = await account('tom@example.com');
    await http()
      .patch('/api/v1/users/me/preferences')
      .set(lea)
      .send({ usualBudget: 'free', usualCompany: 'family', maxDistanceKm: 5 })
      .expect(200);
  });

  afterAll(async () => {
    await resetDatabase(db);
    await db.$disconnect();
    await app.close();
  });

  const list = async (query = '') =>
    ((await http().get(`/api/v1/experiences${query}`).set(lea).expect(200)).body as Page).data;
  const recommend = async (auth: { Authorization: string }, query: string) =>
    ((await http().get(`/api/v1/recommendations?${query}`).set(auth).expect(200)).body as Recs)
      .data;
  const at = `latitude=${CENTER.latitude}&longitude=${CENTER.longitude}`;

  describe('GET /experiences', () => {
    it('active experiences only, in a stable order, paginated to the last page', async () => {
      const all = await list();
      expect(all.items.map((item) => item.id)).toEqual([
        ids.museum,
        ids.market,
        ids.woods,
        ids.lyon,
      ]);
      expect(all.nextCursor).toBeNull();

      const first = await list('?limit=3');
      const second = await list(`?limit=3&cursor=${first.nextCursor}`);
      expect(first.items).toHaveLength(3);
      expect(first.nextCursor).toBe(ids.woods);
      expect(second).toEqual({
        items: [expect.objectContaining({ id: ids.lyon })],
        nextCursor: null,
      });
    });

    it('filters: category, city, budget (unknown price kept), text (case-insensitive), none matching', async () => {
      const titles = async (query: string) => (await list(query)).items.map((item) => item.title);

      expect(await titles('?category=culture')).toEqual(['Musée puis café', 'Balade au bois']);
      expect(await titles('?city=Lyon')).toEqual(['Traboules']);
      expect(await titles('?budget=under10')).toEqual(['Marché couvert', 'Balade au bois']);
      expect(await titles('?budget=25to50')).toEqual([
        'Musée puis café',
        'Marché couvert',
        'Balade au bois',
        'Traboules',
      ]);
      expect(await titles('?q=MARCH')).toEqual(['Marché couvert']);
      expect(await list('?category=food&city=Lyon')).toEqual({ items: [], nextCursor: null });
    });
  });

  describe('GET /experiences/:id', () => {
    it('the detail: places in order, provider facts, ROAM context apart — no internals', async () => {
      const response = await http().get(`/api/v1/experiences/${ids.museum}`).set(lea).expect(200);
      const detail = (response.body as { data: Record<string, unknown> }).data;

      expect(detail).toMatchObject({
        id: ids.museum,
        categories: ['culture'],
        priceMin: 12,
        priceLevel: 'medium',
        roam: {
          suitableFor: ['couple', 'friends'],
          estimatedDurationMin: 120,
          source: 'roamRules',
        },
        places: [{ name: 'Musée', priceLevel: 'medium' }, { name: 'Café' }],
      });
      expect(JSON.stringify(detail)).not.toMatch(/confidence|popularity|createdAt|passwordHash/);
    });

    it('no enrichment → roam null; inactive → still readable, isActive false; unknown → 404', async () => {
      const woods = await http().get(`/api/v1/experiences/${ids.woods}`).set(lea).expect(200);
      expect(woods.body).toMatchObject({ data: { roam: null, places: [] } });

      const old = await http().get(`/api/v1/experiences/${ids.old}`).set(lea).expect(200);
      expect(old.body).toMatchObject({ data: { isActive: false } });

      await http()
        .get('/api/v1/experiences/01a0db2f-0000-7000-8000-000000000000')
        .set(lea)
        .expect(404);
    });
  });

  describe('GET /recommendations', () => {
    it('Léa: her saved preferences apply (free, family, 5 km), and the context says so', async () => {
      const result = await recommend(lea, at);

      expect(result.context).toMatchObject({
        budget: 'free',
        company: 'family',
        maxDistanceKm: 5,
        fromPreferences: ['budget', 'maxDistanceKm', 'company'],
      });
      // museum: 12 € > free; lyon: 30 € > free; woods: 7 km > 5 km.
      expect(result.items.map((item) => item.experience.id)).toEqual([ids.market]);
      expect(result.items[0]).toMatchObject({ reasons: ['budget', 'company'] });
      expect(result.items[0].distanceM).toBeGreaterThan(2900);
      expect(result.relaxed).toEqual([]);
    });

    it('Tom (no preferences), same place: nearest and best rated first; never Léa’s preferences', async () => {
      const result = await recommend(tom, at);

      expect(result.context).toMatchObject({ budget: null, company: null, fromPreferences: [] });
      expect(result.items.map((item) => item.experience.id)).toEqual([
        ids.museum,
        ids.market,
        ids.woods,
        ids.lyon,
      ]);
      expect(result.items[0].reasons).toEqual(['nearby']);

      // A userId cannot switch identity.
      await http().get(`/api/v1/recommendations?userId=${ids.museum}`).set(tom).expect(400);
    });

    it('no perfect match: constraints dropped in order, and listed', async () => {
      const result = await recommend(lea, `${at}&maxDistanceKm=1&category=culture`);

      // Free + 1 km + family: nothing. Budget alone dropped: the museum is 1.2 km away. Distance alone dropped
      // (still free): the museum costs 12 €, the woods (price and audience unknown) fit.
      expect(result.relaxed).toEqual(['distance']);
      expect(result.items.map((item) => item.experience.id)).toEqual([ids.woods]);
    });

    it('without a location: no distance, no "nearby"; inactive experiences never proposed', async () => {
      const result = await recommend(tom, 'availableMinutes=90');
      const proposed = result.items.map((item) => item.experience.id);

      expect(proposed).not.toContain(ids.old);
      expect(proposed).not.toContain(ids.museum); // 120 min > 90
      expect(result.items.every((item) => item.distanceM === null)).toBe(true);
      expect(result.items.flatMap((item) => item.reasons)).not.toContain('nearby');
    });
  });
});
