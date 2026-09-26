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
import {
  CheckConstraintError,
  ForeignKeyConstraintError,
} from '../../src/database/persistence-errors.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { JourneyFeedbackRepository } from '../../src/modules/journeys/journey-feedback.repository.js';
import { JourneyFeedbackExistsError } from '../../src/modules/journeys/journey.types.js';
import { createTestClient, queryCounter, resetDatabase } from './database.js';

type Auth = { Authorization: string };
const SLOW = catalogId('experience', 'exp-slow-afternoon');
const ROOFTOP = catalogId('experience', 'exp-rooftop-sunset');
const codeOf = (body: unknown) => (body as { error: { code: string } }).error.code;
const idOf = (body: unknown) => (body as { data: { id: string } }).data.id;

/**
 * Journey feedback end to end on PostgreSQL (the test database only): the real application over HTTP, the DATA-1
 * catalog, two accounts, journeys created and completed through the journey API. Plus the database's own guarantees
 * (CHECK, foreign key, unique), checked directly.
 */
describe('journey feedback API on PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  let lea: Auth;
  let tom: Auth;
  const http = () => request(app.getHttpServer());
  const feedbackOf = (id: string) => `/api/v1/journeys/${id}/feedback`;
  const give = (auth: Auth, id: string, body: object) =>
    http().post(feedbackOf(id)).set(auth).send(body);

  async function account(email: string): Promise<Auth> {
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ displayName: 'Test', email, password: 'fictional-Passw0rd' })
      .expect(201);
    const { token } = (response.body as { data: { session: { token: string } } }).data.session;
    return { Authorization: `Bearer ${token}` };
  }

  /** An ACTIVE journey of two steps, at its last step when `atLastStep`. */
  async function activeJourney(auth: Auth, atLastStep = false) {
    const response = await http()
      .post('/api/v1/journeys')
      .set(auth)
      .send({
        title: 'Parcours calme',
        context: { mood: 'calm', duration: 'halfDay', budget: 'low' },
        startLocation: {
          kind: 'current',
          label: 'Ma position',
          coordinates: { latitude: 48.8674, longitude: 2.3637 },
        },
        startTime: '14:00',
        experienceIds: [SLOW, ROOFTOP],
      })
      .expect(201);
    const id = idOf(response.body);
    if (atLastStep) {
      await http()
        .post(`/api/v1/journeys/${id}/progress`)
        .set(auth)
        .send({ currentStep: 1 })
        .expect(200);
    }
    return id;
  }

  async function completedJourney(auth: Auth) {
    const id = await activeJourney(auth, true);
    await http().post(`/api/v1/journeys/${id}/complete`).set(auth).expect(200);
    return id;
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
    await seedCatalog(db, buildCatalogPlan(MOBILE_MOCK_CATALOG));
    lea = await account('lea@example.com');
    tom = await account('tom@example.com');
  });

  afterAll(async () => {
    await resetDatabase(db);
    await db.$disconnect();
    await app.close();
  });

  it('complete → feedback → read: rating 5 with a comment, rating 1 without', async () => {
    const first = await completedJourney(lea);
    expect((await http().get(feedbackOf(first)).set(lea).expect(200)).body).toEqual({ data: null });

    const created = await give(lea, first, { rating: 5, comment: '  Super balade  ' }).expect(201);
    expect(created.body).toMatchObject({
      data: { journeyId: first, rating: 5, comment: 'Super balade' },
    });
    expect((await http().get(feedbackOf(first)).set(lea).expect(200)).body).toEqual(created.body);

    const row = await db.journeyFeedback.findUniqueOrThrow({ where: { journeyId: first } });
    const leaUser = await db.user.findUniqueOrThrow({ where: { email: 'lea@example.com' } });
    expect(row).toMatchObject({ userId: leaUser.id, rating: 5, comment: 'Super balade' });

    const second = await completedJourney(lea);
    await give(lea, second, { rating: 1 }).expect(201);
    expect(
      await db.journeyFeedback.findUniqueOrThrow({ where: { journeyId: second } }),
    ).toMatchObject({
      rating: 1,
      comment: null,
    });
    // The journey itself is untouched by its feedback.
    expect(await db.journey.findUniqueOrThrow({ where: { id: first } })).toMatchObject({
      status: 'COMPLETED',
    });
  });

  it('an active journey takes no feedback (409), and stays active; its feedback reads null', async () => {
    const id = await activeJourney(lea);
    expect(codeOf((await give(lea, id, { rating: 4 }).expect(409)).body)).toBe(
      'JOURNEY_NOT_COMPLETED',
    );
    expect((await http().get(feedbackOf(id)).set(lea).expect(200)).body).toEqual({ data: null });
    expect(await db.journeyFeedback.count()).toBe(0);
    expect(await db.journey.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'ACTIVE',
    });
  });

  it('ownership: another user can neither give nor read it (404, nothing written); the owner then can', async () => {
    const id = await completedJourney(lea);

    await give(tom, id, { rating: 1, comment: 'Pas moi' }).expect(404);
    await http().get(feedbackOf(id)).set(tom).expect(404);
    expect(await db.journeyFeedback.count()).toBe(0);
    await give(tom, id, { rating: 1, userId: 'x' }).expect(400);

    await give(lea, id, { rating: 4 }).expect(201);
    await http().get(feedbackOf(id)).set(tom).expect(404);
    const tomsJourney = await completedJourney(tom);
    expect((await http().get(feedbackOf(tomsJourney)).set(tom).expect(200)).body).toEqual({
      data: null,
    });
  });

  it('one per journey: a second one is refused with the saved one; 5 concurrent submissions → 1 row', async () => {
    const id = await completedJourney(lea);
    await give(lea, id, { rating: 4, comment: 'Bien' }).expect(201);
    const again = await give(lea, id, { rating: 1 }).expect(409);
    expect((again.body as { error: unknown }).error).toMatchObject({
      code: 'JOURNEY_FEEDBACK_ALREADY_EXISTS',
      details: { feedback: { rating: 4, comment: 'Bien' } },
    });

    const other = await completedJourney(lea);
    const responses = await Promise.all(
      [1, 2, 3, 4, 5].map((rating) => give(lea, other, { rating })),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409, 409, 409]);
    expect(await db.journeyFeedback.count({ where: { journeyId: other } })).toBe(1);
  });

  it('feedback racing the completion never lands on a journey that is not completed', async () => {
    for (let round = 0; round < 5; round += 1) {
      await resetDatabase(db);
      await seedCatalog(db, buildCatalogPlan(MOBILE_MOCK_CATALOG));
      const auth = await account(`race${round}@example.com`);
      const id = await activeJourney(auth, true);

      const [completion, feedback] = await Promise.all([
        http().post(`/api/v1/journeys/${id}/complete`).set(auth),
        give(auth, id, { rating: 5 }),
      ]);

      expect(completion.status).toBe(200);
      expect([201, 409]).toContain(feedback.status);
      if (feedback.status === 409) expect(codeOf(feedback.body)).toBe('JOURNEY_NOT_COMPLETED');
      const row = await db.journeyFeedback.findUnique({ where: { journeyId: id } });
      const journey = await db.journey.findUniqueOrThrow({ where: { id } });
      expect(journey.status).toBe('COMPLETED');
      expect(row !== null).toBe(feedback.status === 201);
    }
  });

  it('the database itself guarantees the rating range, the journey link and uniqueness; failures leave nothing', async () => {
    const id = await completedJourney(lea);
    const user = await db.user.findUniqueOrThrow({ where: { email: 'lea@example.com' } });
    const repository = app.get(JourneyFeedbackRepository);

    for (const rating of [0, 6, -3]) {
      await expect(
        repository.create({ journeyId: id, userId: user.id, rating }),
      ).rejects.toBeInstanceOf(CheckConstraintError);
    }
    await expect(
      repository.create({
        journeyId: '01a0db2f-0000-7000-8000-000000000000',
        userId: user.id,
        rating: 3,
      }),
    ).rejects.toBeInstanceOf(ForeignKeyConstraintError);
    expect(await db.journeyFeedback.count()).toBe(0);

    await repository.create({ journeyId: id, userId: user.id, rating: 3 });
    await expect(
      repository.create({ journeyId: id, userId: user.id, rating: 5 }),
    ).rejects.toBeInstanceOf(JourneyFeedbackExistsError);
    expect(await db.journeyFeedback.findMany({ select: { rating: true } })).toEqual([
      { rating: 3 },
    ]);
  });

  it('performance: SQL statements for GET and POST (session check included)', async () => {
    const id = await completedJourney(lea);
    const counter = queryCounter();

    const post = await counter.measure(() => give(lea, id, { rating: 5 }).expect(201));
    const get = await counter.measure(() => http().get(feedbackOf(id)).set(lea).expect(200));
    // Recorded in JOURNEY_FEEDBACK_API.md → "Performance".
    console.log(`SQL statements — POST feedback: ${post}, GET feedback: ${get}`);
    expect(post).toBeLessThanOrEqual(8);
    expect(get).toBeLessThanOrEqual(8);
  });
});
