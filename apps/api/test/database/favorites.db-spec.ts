import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import { catalogId } from '../../src/database/catalog-seed/catalog-id.js';
import { buildCatalogPlan } from '../../src/database/catalog-seed/catalog-plan.js';
import { seedCatalog } from '../../src/database/catalog-seed/catalog-seed.js';
import { MOBILE_MOCK_CATALOG } from '../../src/database/catalog-seed/mobile-mock-catalog.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestClient, queryCounter, resetDatabase } from './database.js';

type Auth = { Authorization: string };
type Page = {
  data: {
    items: { id: string; experienceId: string; experience: { id: string; isActive: boolean } }[];
    nextCursor: string | null;
  };
};
const plan = buildCatalogPlan(MOBILE_MOCK_CATALOG);
const ALL = plan.experiences.map((experience) => experience.id);
const exp = (mockId: string) => catalogId('experience', mockId);
const JAZZ = exp('exp-jazz-night');
const ROOFTOP = exp('exp-rooftop-sunset');
const MUSEUM = exp('exp-night-museum');

/**
 * Favorites end to end on PostgreSQL (the test database only): the real application over HTTP, the DATA-1 catalog, two
 * accounts. Plus the database's own guarantees (unique key, foreign keys, cascades), checked directly.
 */
describe('favorites API on PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  let lea: Auth;
  let tom: Auth;
  const http = () => request(app.getHttpServer());
  const add = (auth: Auth, experienceId: string) =>
    http().post('/api/v1/favorites').set(auth).send({ experienceId });
  const list = async (auth: Auth, query = '') =>
    ((await http().get(`/api/v1/favorites${query}`).set(auth).expect(200)).body as Page).data;
  const userId = async (email: string) =>
    (await db.user.findUniqueOrThrow({ where: { email } })).id;

  async function account(email: string): Promise<Auth> {
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
  });

  beforeEach(async () => {
    await resetDatabase(db);
    await seedCatalog(db, plan);
    lea = await account('lea@example.com');
    tom = await account('tom@example.com');
  });

  afterAll(async () => {
    await resetDatabase(db);
    await db.$disconnect();
    await app.close();
  });

  it('add → list (most recent first, with the experience) → remove; idempotent both ways', async () => {
    const first = await add(lea, JAZZ).expect(201);
    await add(lea, ROOFTOP).expect(201);
    const again = await add(lea, JAZZ).expect(201);
    expect(again.body).toEqual(first.body);

    const page = await list(lea);
    expect(page.items.map((item) => item.experienceId)).toEqual([ROOFTOP, JAZZ]);
    expect(page.items[1].experience).toMatchObject({ id: JAZZ, isActive: true });
    expect(await db.favorite.count()).toBe(2);

    await http().delete(`/api/v1/favorites/${JAZZ}`).set(lea).expect(204);
    await http().delete(`/api/v1/favorites/${JAZZ}`).set(lea).expect(204);
    expect((await list(lea)).items.map((item) => item.experienceId)).toEqual([ROOFTOP]);
    // The experience itself is untouched.
    expect(await db.experience.findUniqueOrThrow({ where: { id: JAZZ } })).toMatchObject({
      isActive: true,
    });
  });

  it('ownership: each user sees only their own; removing "someone else’s" favorite removes nothing', async () => {
    await add(lea, JAZZ).expect(201);
    await add(lea, MUSEUM).expect(201);
    await add(tom, ROOFTOP).expect(201);

    expect((await list(lea)).items.map((item) => item.experienceId).sort()).toEqual(
      [JAZZ, MUSEUM].sort(),
    );
    expect((await list(tom)).items.map((item) => item.experienceId)).toEqual([ROOFTOP]);

    await http().delete(`/api/v1/favorites/${JAZZ}`).set(tom).expect(204);
    await http()
      .get(`/api/v1/favorites?userId=${await userId('lea@example.com')}`)
      .set(tom)
      .expect(400);
    await http()
      .post('/api/v1/favorites')
      .set(tom)
      .send({ experienceId: JAZZ, userId: 'x' })
      .expect(400);
    expect(await db.favorite.count({ where: { userId: await userId('lea@example.com') } })).toBe(2);
  });

  it('concurrency: 5 simultaneous adds → one row, the same favorite for all; another user gets their own row', async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => add(lea, JAZZ)));
    expect(responses.map((response) => response.status)).toEqual([201, 201, 201, 201, 201]);
    expect(
      new Set(responses.map((response) => (response.body as { data: { id: string } }).data.id))
        .size,
    ).toBe(1);
    expect(await db.favorite.count({ where: { experienceId: JAZZ } })).toBe(1);

    await add(tom, JAZZ).expect(201);
    expect(await db.favorite.count({ where: { experienceId: JAZZ } })).toBe(2);
  });

  it('pagination: 14 favorites in pages of 5 to the last page; empty list; invalid queries', async () => {
    expect(await list(lea)).toEqual({ items: [], nextCursor: null });
    for (const id of ALL) await add(lea, id).expect(201);

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await list(lea, `?limit=5${cursor ? `&cursor=${cursor}` : ''}`);
      seen.push(...page.items.map((item) => item.experienceId));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);
    expect(pages).toBe(3);
    expect(seen).toEqual([...ALL].reverse()); // most recently saved first
    expect((await list(lea, '?limit=100')).items).toHaveLength(14);

    for (const query of ['?limit=0', '?limit=101', '?cursor=nope']) {
      await http().get(`/api/v1/favorites${query}`).set(lea).expect(400);
    }
  });

  it('inactive experience: kept in the list (isActive false), cannot be newly added, re-adding stays idempotent', async () => {
    await add(lea, MUSEUM).expect(201);
    await db.experience.update({ where: { id: MUSEUM }, data: { isActive: false } });

    expect((await list(lea)).items[0].experience).toMatchObject({ id: MUSEUM, isActive: false });
    await add(lea, MUSEUM).expect(201);
    const refused = await add(tom, MUSEUM).expect(422);
    expect((refused.body as { error: { code: string } }).error.code).toBe(
      'FAVORITE_EXPERIENCE_INACTIVE',
    );
    await add(tom, '01a0db2f-0000-7000-8000-000000000000').expect(404);
    expect(await db.favorite.count()).toBe(1);
  });

  it('the database guarantees uniqueness, both foreign keys and the cascades', async () => {
    const leaId = await userId('lea@example.com');
    await db.favorite.create({ data: { userId: leaId, experienceId: JAZZ } });

    await expect(
      db.favorite.create({ data: { userId: leaId, experienceId: JAZZ } }),
    ).rejects.toMatchObject({
      code: 'P2002',
    });
    await expect(
      db.favorite.create({
        data: { userId: leaId, experienceId: '01a0db2f-0000-7000-8000-000000000000' },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      db.favorite.create({
        data: { userId: '01a0db2f-0000-7000-8000-000000000000', experienceId: JAZZ },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    expect(await db.favorite.count()).toBe(1);

    // Deleting the user removes their favorites (cascade); experiences are never deleted by the app (deactivated).
    await db.user.delete({ where: { id: leaId } });
    expect(await db.favorite.count()).toBe(0);
    expect(await db.experience.count({ where: { id: JAZZ } })).toBe(1);
  });

  it('performance: SQL statements for GET with 1, 10 and 14 favorites, POST and DELETE (session included)', async () => {
    const counter = queryCounter();
    await add(lea, ALL[0]).expect(201);
    const one = await counter.measure(() => http().get('/api/v1/favorites').set(lea).expect(200));
    for (const id of ALL.slice(1, 10)) await add(lea, id).expect(201);
    const ten = await counter.measure(() => http().get('/api/v1/favorites').set(lea).expect(200));
    for (const id of ALL.slice(10)) await add(lea, id).expect(201);
    const fourteen = await counter.measure(() =>
      http().get('/api/v1/favorites?limit=100').set(lea).expect(200),
    );
    await http().delete(`/api/v1/favorites/${JAZZ}`).set(lea).expect(204);
    const post = await counter.measure(() => add(lea, JAZZ).expect(201));
    const remove = await counter.measure(() =>
      http().delete(`/api/v1/favorites/${JAZZ}`).set(lea).expect(204),
    );

    // Recorded in FAVORITES_API.md → "Performance".
    console.log(
      `SQL statements — GET 1 favorite: ${one}, 10: ${ten}, 14: ${fourteen}, POST: ${post}, DELETE: ${remove}`,
    );
    expect(ten).toBe(one);
    expect(fourteen).toBe(one);
  });
});
