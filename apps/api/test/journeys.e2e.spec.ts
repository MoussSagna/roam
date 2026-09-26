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
import { JourneyRepository } from '../src/modules/journeys/journey.repository.js';

/**
 * `/api/v1/journeys` over HTTP: the real application (guard, validation, service, envelope) with the session, the
 * journey repository and the catalog mocked. The same flows on PostgreSQL: test/database/journeys.db-spec.ts.
 */
const TOKEN = 'j'.repeat(43);
const J1 = '01a0db2f-0000-7000-8000-0000000000f1';
const E1 = '01a0db2f-0000-7000-8000-0000000000e1';
const E2 = '01a0db2f-0000-7000-8000-0000000000e2';
const lea = { id: 'user-a', email: 'lea@example.com', displayName: 'Léa' };
const tom = { id: 'user-b', email: 'tom@example.com', displayName: 'Tom' };
const NOW = new Date('2026-09-26T12:00:00.000Z');

const experience = (id: string) => ({
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
  isActive: true,
  categorySlugs: ['culture'],
  placeIds: [],
  enrichment: {
    atmosphere: [],
    energyLevel: 'UNKNOWN',
    suitableFor: [],
    bestMoments: [],
    tags: [],
    estimatedDurationMin: 60,
    durationIsDerived: true,
    source: 'CURATED',
    confidence: { internal: true },
  },
  createdAt: NOW,
  updatedAt: NOW,
});

const journey = (change: Record<string, unknown> = {}) => ({
  id: J1,
  userId: lea.id,
  status: 'ACTIVE',
  title: 'Parcours calme',
  mood: 'CALM',
  duration: 'HALF_DAY',
  budget: 'FREE',
  startLocation: {
    kind: 'PLACE',
    label: 'République',
    detail: null,
    latitude: 48.8674,
    longitude: 2.3637,
  },
  startTime: '14:00',
  endTime: '16:00',
  estimatedDurationMin: 120,
  estimatedBudgetEur: 0,
  totalDistanceM: 0,
  currentStep: 0,
  startedAt: NOW,
  completedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  steps: [E1, E2].map((experienceId, order) => ({
    experienceId,
    order,
    estimatedArrival: order === 0 ? '14:00' : '15:00',
    estimatedDurationMin: 60,
    travelDurationMin: 0,
    travelDistanceM: 0,
    travelMode: 'WALK',
  })),
  ...change,
});

const draft = {
  title: 'Parcours calme',
  context: { mood: 'calm', duration: 'halfDay', budget: 'free' },
  startLocation: {
    kind: 'place',
    label: 'République',
    coordinates: { latitude: 48.8674, longitude: 2.3637 },
  },
  startTime: '14:00',
  experienceIds: [E1, E2],
};

const auth = { authenticate: vi.fn() };
const journeys = {
  findById: vi.fn(),
  findActiveByUserId: vi.fn(),
  listCompletedByUserId: vi.fn(),
  create: vi.fn(),
  replaceSteps: vi.fn(),
  updateProgress: vi.fn(),
  complete: vi.fn(),
};
const catalog = { findManyByIds: vi.fn() };

describe('journey endpoints (repositories mocked)', () => {
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
      .overrideProvider(JourneyRepository)
      .useValue(journeys)
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
      Promise.resolve(ids.map(experience)),
    );
    journeys.findActiveByUserId.mockResolvedValue(null);
    journeys.findById.mockResolvedValue(journey());
  });

  it('every route requires a session → 401', async () => {
    const routes = [
      () => http().get('/api/v1/journeys/active'),
      () => http().get('/api/v1/journeys'),
      () => http().get(`/api/v1/journeys/${J1}`),
      () => http().post('/api/v1/journeys').send(draft),
      () =>
        http()
          .patch(`/api/v1/journeys/${J1}`)
          .send({ experienceIds: [E1] }),
      () => http().post(`/api/v1/journeys/${J1}/progress`).send({ currentStep: 1 }),
      () => http().post(`/api/v1/journeys/${J1}/complete`),
    ];
    for (const route of routes) {
      const response = await route().expect(401);
      expect(errorOf(response.body).code).toBe('AUTH_UNAUTHORIZED');
    }
    expect(journeys.findById).not.toHaveBeenCalled();
  });

  describe('POST /journeys', () => {
    it('201: the mobile Journey shape, steps with their experience, no owner id or internals', async () => {
      journeys.create.mockResolvedValue(journey());

      const response = await http().post('/api/v1/journeys').set(bearer).send(draft).expect(201);

      expect(journeys.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-a',
          mood: 'CALM',
          duration: 'HALF_DAY',
          budget: 'FREE',
          startLocation: {
            kind: 'PLACE',
            label: 'République',
            detail: null,
            latitude: 48.8674,
            longitude: 2.3637,
          },
        }),
      );
      const data = (response.body as { data: Record<string, unknown> }).data;
      expect(data).toMatchObject({
        id: J1,
        status: 'active',
        context: { mood: 'calm', duration: 'halfDay', budget: 'free' },
        startLocation: { kind: 'place', coordinates: { latitude: 48.8674, longitude: 2.3637 } },
        currentStep: 0,
        startedAt: NOW.toISOString(),
        completedAt: null,
        steps: [
          {
            experienceId: E1,
            order: 0,
            travelMode: 'walk',
            experience: { id: E1, coordinates: { latitude: 48.8674 } },
          },
          { experienceId: E2, order: 1 },
        ],
      });
      expect(JSON.stringify(data)).not.toMatch(/userId|user-a|popularity|confidence|updatedAt/);
    });

    it('400: server-controlled fields are refused — userId, status, currentStep, completedAt, startedAt, plan', async () => {
      const response = await http()
        .post('/api/v1/journeys')
        .set(bearer)
        .send({
          ...draft,
          userId: 'user-b',
          status: 'completed',
          currentStep: 5,
          completedAt: NOW.toISOString(),
          startedAt: NOW.toISOString(),
          estimatedBudgetEur: 0,
          steps: [],
        })
        .expect(400);

      expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
      expect(fields(response.body)).toEqual([
        'completedAt',
        'currentStep',
        'estimatedBudgetEur',
        'startedAt',
        'status',
        'steps',
        'userId',
      ]);
      expect(journeys.create).not.toHaveBeenCalled();
    });

    it('400: every field validated, nested ones included', async () => {
      const response = await http()
        .post('/api/v1/journeys')
        .set(bearer)
        .send({
          title: '',
          context: { mood: 'happy', duration: '4h', budget: '€€', extra: 1 },
          startLocation: {
            kind: 'gps',
            label: 'x',
            coordinates: { latitude: 91, longitude: -181 },
          },
          startTime: '24:00',
          experienceIds: ['not-a-uuid'],
        })
        .expect(400);

      expect(fields(response.body)).toEqual([
        'context.budget',
        'context.duration',
        'context.extra',
        'context.mood',
        'experienceIds',
        'startLocation.coordinates.latitude',
        'startLocation.coordinates.longitude',
        'startLocation.kind',
        'startTime',
        'title',
      ]);

      const empty = await http()
        .post('/api/v1/journeys')
        .set(bearer)
        .send({ ...draft, experienceIds: [] })
        .expect(400);
      expect(fields(empty.body)).toEqual(['experienceIds']);
    });

    it('409 JOURNEY_ALREADY_ACTIVE; 422 JOURNEY_EXPERIENCE_UNAVAILABLE with the ids', async () => {
      journeys.findActiveByUserId.mockResolvedValueOnce(journey());
      const conflict = await http().post('/api/v1/journeys').set(bearer).send(draft).expect(409);
      expect(errorOf(conflict.body).code).toBe('JOURNEY_ALREADY_ACTIVE');

      catalog.findManyByIds.mockResolvedValueOnce([experience(E1)]);
      const unavailable = await http().post('/api/v1/journeys').set(bearer).send(draft).expect(422);
      expect(errorOf(unavailable.body)).toMatchObject({
        code: 'JOURNEY_EXPERIENCE_UNAVAILABLE',
        details: [{ experienceId: E2, reason: 'notFound' }],
      });
    });
  });

  describe('reads', () => {
    it('GET /journeys/active: the journey, or { data: null }', async () => {
      journeys.findActiveByUserId.mockResolvedValueOnce(journey());
      const found = await http().get('/api/v1/journeys/active').set(bearer).expect(200);
      expect(found.body).toMatchObject({ data: { id: J1, status: 'active' } });
      expect(journeys.findActiveByUserId).toHaveBeenCalledWith('user-a');

      const none = await http().get('/api/v1/journeys/active').set(bearer).expect(200);
      expect(none.body).toEqual({ data: null });
    });

    it('GET /journeys: the session user’s completed journeys, paginated; query validated (userId refused)', async () => {
      journeys.listCompletedByUserId.mockResolvedValue({
        items: [journey({ status: 'COMPLETED', completedAt: NOW, currentStep: 1 })],
        nextCursor: J1,
      });

      const response = await http()
        .get(`/api/v1/journeys?limit=1&cursor=${J1}`)
        .set(bearer)
        .expect(200);
      expect(journeys.listCompletedByUserId).toHaveBeenCalledWith('user-a', {
        limit: 1,
        cursor: J1,
      });
      expect(response.body).toMatchObject({
        data: {
          items: [{ id: J1, status: 'completed', completedAt: NOW.toISOString() }],
          nextCursor: J1,
        },
      });

      for (const query of [
        'limit=0',
        'limit=101',
        'limit=x',
        'cursor=nope',
        'userId=user-b',
        'status=active',
      ]) {
        const invalid = await http().get(`/api/v1/journeys?${query}`).set(bearer).expect(400);
        expect(errorOf(invalid.body).code).toBe('VALIDATION_ERROR');
      }
    });

    it('GET /journeys/:id: 200 own; 404 another user’s or unknown; 400 not a UUID', async () => {
      await http().get(`/api/v1/journeys/${J1}`).set(bearer).expect(200);

      auth.authenticate.mockResolvedValue({ sessionId: 's2', user: tom });
      const foreign = await http().get(`/api/v1/journeys/${J1}`).set(bearer).expect(404);
      expect(errorOf(foreign.body).code).toBe('NOT_FOUND');
      // A userId in the query is never read: still Tom, still 404.
      await http().get(`/api/v1/journeys/${J1}?userId=user-a`).set(bearer).expect(404);

      journeys.findById.mockResolvedValueOnce(null);
      await http().get(`/api/v1/journeys/${J1}`).set(bearer).expect(404);
      await http().get('/api/v1/journeys/not-a-uuid').set(bearer).expect(400);
    });
  });

  describe('writes on an existing journey', () => {
    it('PATCH: replaces the steps; only experienceIds accepted', async () => {
      journeys.replaceSteps.mockResolvedValue(journey());
      await http()
        .patch(`/api/v1/journeys/${J1}`)
        .set(bearer)
        .send({ experienceIds: [E2, E1] })
        .expect(200);
      expect(journeys.replaceSteps).toHaveBeenCalledWith(
        J1,
        expect.objectContaining({ currentStep: 1 }),
      );

      const spoof = await http()
        .patch(`/api/v1/journeys/${J1}`)
        .set(bearer)
        .send({
          experienceIds: [E1],
          status: 'completed',
          currentStep: 1,
          title: 'x',
          userId: 'user-b',
        })
        .expect(400);
      expect(fields(spoof.body)).toEqual(['currentStep', 'status', 'title', 'userId']);
    });

    it('progress: 200 next step; 409 skipping; 400 invalid body', async () => {
      journeys.updateProgress.mockResolvedValue(journey({ currentStep: 1 }));
      const moved = await http()
        .post(`/api/v1/journeys/${J1}/progress`)
        .set(bearer)
        .send({ currentStep: 1 })
        .expect(200);
      expect(moved.body).toMatchObject({ data: { currentStep: 1 } });

      journeys.findById.mockResolvedValue(
        journey({ currentStep: 0, steps: [...journey().steps, ...journey().steps] }),
      );
      const skip = await http()
        .post(`/api/v1/journeys/${J1}/progress`)
        .set(bearer)
        .send({ currentStep: 3 })
        .expect(409);
      expect(errorOf(skip.body)).toMatchObject({
        code: 'JOURNEY_INVALID_STEP',
        details: { currentStep: 0 },
      });

      for (const body of [
        { currentStep: -1 },
        { currentStep: 1.5 },
        { currentStep: 999 },
        {},
        { currentStep: 1, status: 'completed' },
      ]) {
        await http().post(`/api/v1/journeys/${J1}/progress`).set(bearer).send(body).expect(400);
      }
    });

    it('complete: 200 from the last step (completedAt from the server); 409 before it or when completed', async () => {
      journeys.findById.mockResolvedValueOnce(journey({ currentStep: 1 }));
      journeys.complete.mockResolvedValue(
        journey({ status: 'COMPLETED', currentStep: 1, completedAt: NOW }),
      );
      const done = await http()
        .post(`/api/v1/journeys/${J1}/complete`)
        .set(bearer)
        .send({ completedAt: '2000-01-01T00:00:00.000Z' })
        .expect(200);
      expect(done.body).toMatchObject({
        data: { status: 'completed', completedAt: NOW.toISOString() },
      });

      const early = await http().post(`/api/v1/journeys/${J1}/complete`).set(bearer).expect(409);
      expect(errorOf(early.body).code).toBe('JOURNEY_INVALID_STEP');

      journeys.findById.mockResolvedValueOnce(journey({ status: 'COMPLETED', currentStep: 1 }));
      const again = await http().post(`/api/v1/journeys/${J1}/complete`).set(bearer).expect(409);
      expect(errorOf(again.body).code).toBe('JOURNEY_NOT_ACTIVE');
    });

    it('another user can neither edit, progress nor complete: 404, nothing written', async () => {
      auth.authenticate.mockResolvedValue({ sessionId: 's2', user: tom });
      await http()
        .patch(`/api/v1/journeys/${J1}`)
        .set(bearer)
        .send({ experienceIds: [E1] })
        .expect(404);
      await http()
        .post(`/api/v1/journeys/${J1}/progress`)
        .set(bearer)
        .send({ currentStep: 1 })
        .expect(404);
      await http().post(`/api/v1/journeys/${J1}/complete`).set(bearer).expect(404);
      expect(journeys.replaceSteps).not.toHaveBeenCalled();
      expect(journeys.updateProgress).not.toHaveBeenCalled();
      expect(journeys.complete).not.toHaveBeenCalled();
    });
  });
});
