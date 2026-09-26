import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import type { ErrorResponseBody } from '../src/common/errors/api-error.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { ExperienceRepository } from '../src/modules/catalog/experience.repository.js';
import { FavoriteRepository } from '../src/modules/favorites/favorite.repository.js';

/**
 * `/api/v1/favorites` over HTTP: the real application (guard, validation, service, envelope) with the session, the
 * favorite repository and the catalog mocked. On PostgreSQL: test/database/favorites.db-spec.ts.
 */
const TOKEN = 'v'.repeat(43);
const E1 = '01a0db2f-0000-7000-8000-0000000000e1';
const E2 = '01a0db2f-0000-7000-8000-0000000000e2';
const F1 = '01a0db2f-0000-7000-8000-0000000000c1';
const lea = { id: 'user-a', email: 'lea@example.com', displayName: 'Léa' };
const tom = { id: 'user-b', email: 'tom@example.com', displayName: 'Tom' };
const SAVED = new Date('2026-09-26T12:00:00.000Z');

const experience = (id: string, isActive = true) => ({
  id,
  title: `Expérience ${id.slice(-2)}`,
  description: null,
  address: null,
  city: 'Paris',
  latitude: 48.8674,
  longitude: 2.3637,
  coverImage: null,
  images: [],
  startDate: null,
  endDate: null,
  openingHours: null,
  priceLevel: 'FREE',
  priceMin: 0,
  priceMax: 0,
  currency: 'EUR',
  rating: 4.5,
  reviewCount: 3,
  popularity: 0.7,
  isActive,
  categorySlugs: ['culture'],
  placeIds: [],
  enrichment: null,
  createdAt: SAVED,
  updatedAt: SAVED,
});
const favorite = (experienceId: string, userId = lea.id) => ({
  id: F1,
  userId,
  experienceId,
  createdAt: SAVED,
});

const auth = { authenticate: vi.fn() };
const favorites = { add: vi.fn(), remove: vi.fn(), isFavorite: vi.fn(), listByUserId: vi.fn() };
const catalog = { findManyByIds: vi.fn() };

describe('favorites endpoints (repositories mocked)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  const bearer = { Authorization: `Bearer ${TOKEN}` };
  const errorOf = (body: unknown) => (body as ErrorResponseBody).error;
  const fields = (body: unknown) =>
    ((errorOf(body).details ?? []) as { field: string }[]).map((detail) => detail.field).sort();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ onModuleInit: vi.fn(), onModuleDestroy: vi.fn(), isReachable: vi.fn() })
      .overrideProvider(AuthService)
      .useValue(auth)
      .overrideProvider(FavoriteRepository)
      .useValue(favorites)
      .overrideProvider(ExperienceRepository)
      .useValue(catalog)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    auth.authenticate.mockResolvedValue({ sessionId: 's1', user: lea });
    catalog.findManyByIds.mockImplementation((ids: string[]) =>
      Promise.resolve(ids.map((id) => experience(id))),
    );
    favorites.add.mockImplementation((userId: string, experienceId: string) =>
      Promise.resolve(favorite(experienceId, userId)),
    );
    favorites.remove.mockResolvedValue(true);
    favorites.isFavorite.mockResolvedValue(false);
  });

  it('401 without a session on every route', async () => {
    for (const route of [
      () => http().get('/api/v1/favorites'),
      () => http().post('/api/v1/favorites').send({ experienceId: E1 }),
      () => http().delete(`/api/v1/favorites/${E1}`),
    ]) {
      expect(errorOf((await route().expect(401)).body).code).toBe('AUTH_UNAUTHORIZED');
    }
    expect(favorites.add).not.toHaveBeenCalled();
  });

  describe('POST /favorites', () => {
    it('201: the favorite with its experience; owner from the session, never returned', async () => {
      const response = await http()
        .post('/api/v1/favorites')
        .set(bearer)
        .send({ experienceId: E1 })
        .expect(201);

      expect(favorites.add).toHaveBeenCalledWith('user-a', E1);
      expect(response.body).toMatchObject({
        data: {
          id: F1,
          experienceId: E1,
          createdAt: SAVED.toISOString(),
          experience: { id: E1, isActive: true },
        },
      });
      expect(JSON.stringify(response.body)).not.toMatch(/userId|user-a|popularity|passwordHash/);
    });

    it('idempotent: saving it again answers the same favorite', async () => {
      const first = await http()
        .post('/api/v1/favorites')
        .set(bearer)
        .send({ experienceId: E1 })
        .expect(201);
      const second = await http()
        .post('/api/v1/favorites')
        .set(bearer)
        .send({ experienceId: E1 })
        .expect(201);
      expect(second.body).toEqual(first.body);
    });

    it('400: experienceId required and a UUID; server-controlled and unknown fields refused', async () => {
      for (const body of [
        {},
        { experienceId: 'nope' },
        { experienceId: 42 },
        { experienceId: null },
      ]) {
        expect(
          fields((await http().post('/api/v1/favorites').set(bearer).send(body).expect(400)).body),
        ).toEqual(['experienceId']);
      }
      const spoof = await http()
        .post('/api/v1/favorites')
        .set(bearer)
        .send({
          experienceId: E1,
          userId: 'user-b',
          id: F1,
          createdAt: SAVED.toISOString(),
          updatedAt: SAVED.toISOString(),
          journeyId: F1,
          status: 'active',
        })
        .expect(400);
      expect(fields(spoof.body)).toEqual([
        'createdAt',
        'id',
        'journeyId',
        'status',
        'updatedAt',
        'userId',
      ]);
      expect(favorites.add).not.toHaveBeenCalled();
    });

    it('404 unknown experience; 422 FAVORITE_EXPERIENCE_INACTIVE for a new inactive one', async () => {
      catalog.findManyByIds.mockResolvedValueOnce([]);
      expect(
        errorOf(
          (
            await http()
              .post('/api/v1/favorites')
              .set(bearer)
              .send({ experienceId: E1 })
              .expect(404)
          ).body,
        ).code,
      ).toBe('NOT_FOUND');
      catalog.findManyByIds.mockResolvedValueOnce([experience(E2, false)]);
      expect(
        errorOf(
          (
            await http()
              .post('/api/v1/favorites')
              .set(bearer)
              .send({ experienceId: E2 })
              .expect(422)
          ).body,
        ).code,
      ).toBe('FAVORITE_EXPERIENCE_INACTIVE');
      expect(favorites.add).not.toHaveBeenCalled();
    });
  });

  describe('GET /favorites', () => {
    it('the session user’s page with experiences; empty; query validated (userId refused)', async () => {
      favorites.listByUserId.mockResolvedValueOnce({
        items: [favorite(E2), favorite(E1)],
        nextCursor: F1,
      });
      const page = await http()
        .get(`/api/v1/favorites?limit=2&cursor=${F1}`)
        .set(bearer)
        .expect(200);
      expect(favorites.listByUserId).toHaveBeenCalledWith('user-a', { limit: 2, cursor: F1 });
      expect(page.body).toMatchObject({
        data: { items: [{ experience: { id: E2 } }, { experience: { id: E1 } }], nextCursor: F1 },
      });

      favorites.listByUserId.mockResolvedValueOnce({ items: [], nextCursor: null });
      expect((await http().get('/api/v1/favorites').set(bearer).expect(200)).body).toEqual({
        data: { items: [], nextCursor: null },
      });

      for (const query of ['limit=0', 'limit=101', 'limit=x', 'cursor=nope', 'userId=user-b']) {
        expect(
          errorOf((await http().get(`/api/v1/favorites?${query}`).set(bearer).expect(400)).body)
            .code,
        ).toBe('VALIDATION_ERROR');
      }
    });

    it('another user gets their own list, never Léa’s', async () => {
      auth.authenticate.mockResolvedValue({ sessionId: 's2', user: tom });
      favorites.listByUserId.mockResolvedValue({ items: [], nextCursor: null });
      await http().get('/api/v1/favorites').set(bearer).expect(200);
      expect(favorites.listByUserId).toHaveBeenCalledWith('user-b', {});
    });
  });

  describe('DELETE /favorites/:experienceId', () => {
    it('204 whether it was a favorite or not (idempotent), only the session user’s', async () => {
      favorites.remove.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      const removed = await http().delete(`/api/v1/favorites/${E1}`).set(bearer).expect(204);
      expect(removed.body).toEqual({});
      await http().delete(`/api/v1/favorites/${E1}`).set(bearer).expect(204);

      auth.authenticate.mockResolvedValue({ sessionId: 's2', user: tom });
      await http().delete(`/api/v1/favorites/${E1}?userId=user-a`).set(bearer).expect(204);
      expect(favorites.remove.mock.calls).toEqual([
        ['user-a', E1],
        ['user-a', E1],
        ['user-b', E1],
      ]);
    });

    it('400 when the experience id is not a UUID; no check route (GET /favorites/:id) exists', async () => {
      await http().delete('/api/v1/favorites/nope').set(bearer).expect(400);
      await http().get(`/api/v1/favorites/${E1}`).set(bearer).expect(404);
      expect(favorites.remove).not.toHaveBeenCalled();
    });
  });
});
