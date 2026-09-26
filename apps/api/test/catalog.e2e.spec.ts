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
import { UserRepository } from '../src/modules/users/user.repository.js';

/**
 * `/api/v1/experiences` and `/api/v1/recommendations` over HTTP: the real application (guard, validation,
 * services, envelope) with the session, the catalog and the user repository mocked. The same flows on
 * PostgreSQL: test/database/catalog.db-spec.ts.
 */
const TOKEN = 'd'.repeat(43);
const ID = '01a0db2f-0000-7000-8000-00000000000a';
const me = { id: 'user-a', email: 'lea@example.com', displayName: 'Léa' };

const experience = {
  id: ID,
  title: 'Musée puis café',
  description: 'Une après-midi au Marais.',
  address: null,
  city: 'Paris',
  latitude: 48.8606,
  longitude: 2.3376,
  coverImage: null,
  images: [],
  startDate: null,
  endDate: null,
  openingHours: null,
  priceLevel: 'LOW',
  priceMin: 8,
  priceMax: 15,
  currency: 'EUR',
  rating: 4.5,
  reviewCount: 12,
  popularity: 0.9,
  isActive: true,
  categorySlugs: ['culture'],
  placeIds: [],
  enrichment: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const auth = { authenticate: vi.fn() };
const experiences = { listActive: vi.fn(), findById: vi.fn(), findCandidates: vi.fn() };
const users = { findPreference: vi.fn() };

describe('catalog and recommendations endpoints (repositories mocked)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  const get = (path: string) => http().get(path).set('Authorization', `Bearer ${TOKEN}`);
  const errorOf = (body: unknown) => (body as ErrorResponseBody).error;
  const fields = (body: unknown) =>
    ((errorOf(body).details ?? []) as { field: string }[]).map((detail) => detail.field).sort();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ onModuleInit: vi.fn(), onModuleDestroy: vi.fn(), isReachable: vi.fn() })
      .overrideProvider(AuthService)
      .useValue(auth)
      .overrideProvider(ExperienceRepository)
      .useValue(experiences)
      .overrideProvider(UserRepository)
      .useValue(users)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    auth.authenticate.mockResolvedValue({ sessionId: 's1', user: me });
    users.findPreference.mockResolvedValue(null);
  });

  it('every route requires a session → 401', async () => {
    for (const path of [
      '/api/v1/experiences',
      `/api/v1/experiences/${ID}`,
      '/api/v1/recommendations',
    ]) {
      const response = await http().get(path).expect(401);
      expect(errorOf(response.body).code).toBe('AUTH_UNAUTHORIZED');
    }
  });

  describe('GET /experiences', () => {
    it('200 { data: { items, nextCursor } } with the filters passed to the repository', async () => {
      experiences.listActive.mockResolvedValue({ items: [experience], nextCursor: ID });

      const response = await get(
        `/api/v1/experiences?category=culture&city=Paris&budget=10to25&q=mus%C3%A9e&limit=1&cursor=${ID}`,
      ).expect(200);

      expect(experiences.listActive).toHaveBeenCalledWith(
        { categorySlug: 'culture', city: 'Paris', maxPrice: 25, text: 'musée' },
        { limit: 1, cursor: ID },
      );
      const body = response.body as {
        data: { items: Record<string, unknown>[]; nextCursor: string };
      };
      expect(body.data.nextCursor).toBe(ID);
      expect(body.data.items[0]).toMatchObject({
        id: ID,
        priceLevel: 'low',
        categories: ['culture'],
        coordinates: { latitude: 48.8606, longitude: 2.3376 },
        roam: null,
      });
      expect(JSON.stringify(body)).not.toMatch(/popularity|createdAt|passwordHash|token/);
    });

    it('empty catalog, last page → 200 { items: [], nextCursor: null }', async () => {
      experiences.listActive.mockResolvedValue({ items: [], nextCursor: null });
      const response = await get('/api/v1/experiences').expect(200);
      expect(response.body).toEqual({ data: { items: [], nextCursor: null } });
    });

    it('invalid query → 400 VALIDATION_ERROR (limit, cursor, budget, category, unknown params)', async () => {
      const response = await get(
        '/api/v1/experiences?limit=0&cursor=abc&budget=cheap&category=Not%20A%20Slug&userId=user-b',
      ).expect(400);
      expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
      expect(fields(response.body)).toEqual(['budget', 'category', 'cursor', 'limit', 'userId']);

      const tooBig = await get('/api/v1/experiences?limit=101&q=a').expect(400);
      expect(fields(tooBig.body)).toEqual(['limit', 'q']);
      expect(experiences.listActive).not.toHaveBeenCalled();
    });
  });

  describe('GET /experiences/:id', () => {
    it('200 the detail with its places', async () => {
      experiences.findById.mockResolvedValue({ ...experience, places: [] });
      const response = await get(`/api/v1/experiences/${ID}`).expect(200);
      expect(response.body).toMatchObject({ data: { id: ID, places: [], isActive: true } });
    });

    it('unknown → 404 NOT_FOUND; not a UUID → 400 before any query', async () => {
      experiences.findById.mockResolvedValue(null);
      const missing = await get(`/api/v1/experiences/${ID}`).expect(404);
      expect(errorOf(missing.body)).toEqual({
        code: 'NOT_FOUND',
        message: 'Experience not found.',
      });

      const invalid = await get('/api/v1/experiences/not-a-uuid').expect(400);
      expect(errorOf(invalid.body).code).toBe('BAD_REQUEST');
      expect(experiences.findById).toHaveBeenCalledOnce();
    });
  });

  describe('GET /recommendations', () => {
    it('200 context + items + relaxed; the session user’s preferences, never another id', async () => {
      experiences.findCandidates.mockResolvedValue([experience]);

      const response = await get(
        '/api/v1/recommendations?latitude=48.8566&longitude=2.3522&maxDistanceKm=5&budget=under10&availableMinutes=120&company=couple',
      ).expect(200);

      expect(users.findPreference).toHaveBeenCalledWith('user-a');
      expect(response.body).toMatchObject({
        data: {
          context: {
            location: { latitude: 48.8566, longitude: 2.3522 },
            maxDistanceKm: 5,
            budget: 'under10',
            availableMinutes: 120,
            company: 'couple',
            fromPreferences: [],
          },
          items: [{ experience: { id: ID }, reasons: ['nearby', 'budget'] }],
          relaxed: [],
        },
      });
    });

    it('validation: coordinates go together, a distance needs a location, ranges, enums, no userId', async () => {
      const response = await get(
        '/api/v1/recommendations?latitude=48.85&maxDistanceKm=5&availableMinutes=5&company=colleagues&limit=50&userId=user-b',
      ).expect(400);
      expect(fields(response.body)).toEqual([
        'availableMinutes',
        'company',
        'limit',
        'longitude',
        'userId',
      ]);

      const distanceOnly = await get('/api/v1/recommendations?maxDistanceKm=5').expect(400);
      expect(fields(distanceOnly.body)).toEqual(['maxDistanceKm']);
      expect(experiences.findCandidates).not.toHaveBeenCalled();
    });
  });
});
