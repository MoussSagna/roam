import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import type { ErrorResponseBody } from '../src/common/errors/api-error.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { JourneyFeedbackRepository } from '../src/modules/journeys/journey-feedback.repository.js';
import { JourneyRepository } from '../src/modules/journeys/journey.repository.js';
import { JourneyFeedbackExistsError } from '../src/modules/journeys/journey.types.js';

/**
 * `/api/v1/journeys/:id/feedback` over HTTP: the real application (guard, validation, service, envelope) with the
 * session and the journey / feedback repositories mocked. On PostgreSQL: test/database/journey-feedback.db-spec.ts.
 */
const TOKEN = 'f'.repeat(43);
const J1 = '01a0db2f-0000-7000-8000-0000000000f1';
const PATH = `/api/v1/journeys/${J1}/feedback`;
const lea = { id: 'user-a', email: 'lea@example.com', displayName: 'Léa' };
const tom = { id: 'user-b', email: 'tom@example.com', displayName: 'Tom' };
const CREATED = new Date('2026-09-26T12:00:00.000Z');
const saved = {
  id: '01a0db2f-0000-7000-8000-0000000000fb',
  journeyId: J1,
  userId: lea.id,
  rating: 5,
  comment: 'Super',
  createdAt: CREATED,
};

const auth = { authenticate: vi.fn() };
const journeys = { findById: vi.fn() };
const feedbacks = { findByJourneyId: vi.fn(), create: vi.fn() };

describe('journey feedback endpoints (repositories mocked)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  const bearer = { Authorization: `Bearer ${TOKEN}` };
  const post = (body: unknown) =>
    http()
      .post(PATH)
      .set(bearer)
      .send(body as object);
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
      .overrideProvider(JourneyFeedbackRepository)
      .useValue(feedbacks)
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
    journeys.findById.mockResolvedValue({ id: J1, userId: lea.id, status: 'COMPLETED' });
    feedbacks.create.mockResolvedValue(saved);
    feedbacks.findByJourneyId.mockResolvedValue(null);
  });

  it('401 without a session, on GET and POST', async () => {
    for (const route of [() => http().get(PATH), () => http().post(PATH).send({ rating: 5 })]) {
      expect(errorOf((await route().expect(401)).body).code).toBe('AUTH_UNAUTHORIZED');
    }
    expect(journeys.findById).not.toHaveBeenCalled();
  });

  it('POST 201: the feedback, author from the session, no author id in the response', async () => {
    const response = await post({ rating: 5, comment: '  Super  ' }).expect(201);

    expect(feedbacks.create).toHaveBeenCalledWith({
      journeyId: J1,
      userId: 'user-a',
      rating: 5,
      comment: 'Super',
    });
    expect(response.body).toEqual({
      data: {
        id: saved.id,
        journeyId: J1,
        rating: 5,
        comment: 'Super',
        createdAt: CREATED.toISOString(),
      },
    });
  });

  it('comment: absent, null, "" and whitespace are all stored as null', async () => {
    for (const body of [
      { rating: 3 },
      { rating: 3, comment: null },
      { rating: 3, comment: '' },
      { rating: 3, comment: ' \n ' },
    ]) {
      await post(body).expect(201);
    }
    expect(
      feedbacks.create.mock.calls.map(([input]) => (input as { comment: unknown }).comment),
    ).toEqual([null, null, null, null]);
  });

  it('400: invalid ratings, comment too long or not a string, empty body', async () => {
    for (const rating of [0, 6, -1, 4.5, '5', null, true, 'five']) {
      const response = await post({ rating }).expect(400);
      expect(fields(response.body)).toEqual(['rating']);
    }
    expect(fields((await post({ rating: 5, comment: 'x'.repeat(301) }).expect(400)).body)).toEqual([
      'comment',
    ]);
    await post({ rating: 5, comment: ` ${'x'.repeat(300)} ` }).expect(201); // 300 once trimmed
    expect(fields((await post({ rating: 5, comment: 42 }).expect(400)).body)).toEqual(['comment']);
    expect(fields((await post({}).expect(400)).body)).toEqual(['rating']);
    await http()
      .post(PATH)
      .set(bearer)
      .set('content-type', 'application/json')
      .send('null')
      .expect(400);
  });

  it('400: server-controlled fields refused — userId, journeyId, id, status, createdAt, updatedAt', async () => {
    const response = await post({
      rating: 5,
      userId: 'user-b',
      journeyId: J1,
      id: saved.id,
      status: 'completed',
      createdAt: CREATED.toISOString(),
      updatedAt: CREATED.toISOString(),
    }).expect(400);
    expect(fields(response.body)).toEqual([
      'createdAt',
      'id',
      'journeyId',
      'status',
      'updatedAt',
      'userId',
    ]);
    expect(feedbacks.create).not.toHaveBeenCalled();
  });

  it('409 JOURNEY_NOT_COMPLETED on an active journey; 409 JOURNEY_FEEDBACK_ALREADY_EXISTS with the saved one', async () => {
    journeys.findById.mockResolvedValueOnce({ id: J1, userId: lea.id, status: 'ACTIVE' });
    expect(errorOf((await post({ rating: 5 }).expect(409)).body).code).toBe(
      'JOURNEY_NOT_COMPLETED',
    );

    feedbacks.create.mockRejectedValueOnce(new JourneyFeedbackExistsError());
    feedbacks.findByJourneyId.mockResolvedValueOnce(saved);
    const again = await post({ rating: 1 }).expect(409);
    expect(errorOf(again.body)).toMatchObject({
      code: 'JOURNEY_FEEDBACK_ALREADY_EXISTS',
      details: { feedback: { id: saved.id, rating: 5 } },
    });
    expect(JSON.stringify(again.body)).not.toContain('user-a');
  });

  it('GET: 200 the feedback, or { data: null }', async () => {
    feedbacks.findByJourneyId.mockResolvedValueOnce(saved);
    expect((await http().get(PATH).set(bearer).expect(200)).body).toMatchObject({
      data: { id: saved.id, rating: 5 },
    });
    expect((await http().get(PATH).set(bearer).expect(200)).body).toEqual({ data: null });
  });

  it('another user: 404 on GET and POST, nothing read or written; a userId in the query never switches identity', async () => {
    auth.authenticate.mockResolvedValue({ sessionId: 's2', user: tom });
    expect(errorOf((await http().get(PATH).set(bearer).expect(404)).body).code).toBe('NOT_FOUND');
    await http().get(`${PATH}?userId=user-a`).set(bearer).expect(404);
    await post({ rating: 5 }).expect(404);
    expect(feedbacks.findByJourneyId).not.toHaveBeenCalled();
    expect(feedbacks.create).not.toHaveBeenCalled();
  });

  it('400 BAD_REQUEST when the journey id is not a UUID; no PATCH or DELETE route', async () => {
    await http().get('/api/v1/journeys/nope/feedback').set(bearer).expect(400);
    await http().patch(PATH).set(bearer).send({ rating: 2 }).expect(404);
    await http().delete(PATH).set(bearer).expect(404);
  });
});
