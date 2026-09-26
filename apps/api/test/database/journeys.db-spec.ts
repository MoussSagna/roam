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
import { JourneyRepository } from '../../src/modules/journeys/journey.repository.js';
import { createTestClient, queryCounter, resetDatabase } from './database.js';

type Auth = { Authorization: string };

/** Experiences of the DATA-1 catalog (seeded in the test database), by their mobile id. */
const exp = (mockId: string) => catalogId('experience', mockId);
const SLOW = exp('exp-slow-afternoon');
const ROOFTOP = exp('exp-rooftop-sunset');
const JAZZ = exp('exp-jazz-night');
const MUSEUM = exp('exp-night-museum');
const PICNIC = exp('exp-picnic-park');

type JourneyBody = {
  id: string;
  status: string;
  currentStep: number;
  completedAt: string | null;
  estimatedBudgetEur: number;
  endTime: string;
  steps: {
    experienceId: string;
    order: number;
    estimatedArrival: string;
    travelDistanceM: number;
    experience: { id: string; title: string; coordinates: unknown };
  }[];
};
const dataOf = <T>(body: unknown) => (body as { data: T }).data;
const codeOf = (body: unknown) => (body as { error: { code: string } }).error.code;

/**
 * The journey API end to end on PostgreSQL (the test database only): the real application over HTTP, the DATA-1
 * catalog seeded, two accounts. Lifecycle, planning, ownership, uniqueness under concurrency, history, rollback.
 */
describe('journey API on PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  let lea: Auth;
  let tom: Auth;
  const http = () => request(app.getHttpServer());

  const draft = (experienceIds: string[], change: Record<string, unknown> = {}) => ({
    title: 'Parcours calme',
    context: { mood: 'calm', duration: 'halfDay', budget: 'low' },
    startLocation: {
      kind: 'place',
      label: 'République',
      coordinates: { latitude: 48.8674, longitude: 2.3637 },
    },
    startTime: '14:00',
    experienceIds,
    ...change,
  });
  const create = (auth: Auth, experienceIds: string[]) =>
    http().post('/api/v1/journeys').set(auth).send(draft(experienceIds));
  const progress = (auth: Auth, id: string, currentStep: number) =>
    http().post(`/api/v1/journeys/${id}/progress`).set(auth).send({ currentStep });
  const complete = (auth: Auth, id: string) =>
    http().post(`/api/v1/journeys/${id}/complete`).set(auth);

  async function account(email: string) {
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ displayName: 'Test', email, password: 'fictional-Passw0rd' })
      .expect(201);
    const { token } = dataOf<{ session: { token: string } }>(response.body).session;
    return { Authorization: `Bearer ${token}` };
  }

  /** Creates, walks through and completes a journey. */
  async function completedJourney(auth: Auth, experienceIds: string[]) {
    const { id } = dataOf<JourneyBody>((await create(auth, experienceIds).expect(201)).body);
    for (let step = 1; step < experienceIds.length; step += 1) {
      await progress(auth, id, step).expect(200);
    }
    await complete(auth, id).expect(200);
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

  it('create → active → edit → progress → complete → history, planned by the server', async () => {
    // Create: ACTIVE, started, step 0, planned from République at 14:00.
    const created = dataOf<JourneyBody>((await create(lea, [SLOW, ROOFTOP]).expect(201)).body);
    expect(created).toMatchObject({
      status: 'active',
      currentStep: 0,
      completedAt: null,
      endTime: '18:16',
    });
    expect(created.estimatedBudgetEur).toBe(46);
    expect(
      created.steps.map((step) => [step.order, step.estimatedArrival, step.travelDistanceM]),
    ).toEqual([
      [0, '14:00', 0],
      [1, '16:16', 1280],
    ]);
    expect(created.steps[1].experience).toMatchObject({ id: ROOFTOP, title: 'Rooftop Sunset' });
    const row = await db.journey.findUniqueOrThrow({ where: { id: created.id } });
    expect(row).toMatchObject({ status: 'ACTIVE', currentStep: 0, completedAt: null });
    expect(row.startedAt).toBeInstanceOf(Date);

    // Active: Léa's; Tom has none.
    expect(
      dataOf<JourneyBody>((await http().get('/api/v1/journeys/active').set(lea)).body).id,
    ).toBe(created.id);
    expect((await http().get('/api/v1/journeys/active').set(tom).expect(200)).body).toEqual({
      data: null,
    });

    // Progress one step, then edit: add two, reorder — the current experience (the rooftop) stays current.
    await progress(lea, created.id, 1).expect(200);
    const edited = dataOf<JourneyBody>(
      (
        await http()
          .patch(`/api/v1/journeys/${created.id}`)
          .set(lea)
          .send({ experienceIds: [SLOW, JAZZ, ROOFTOP, MUSEUM] })
          .expect(200)
      ).body,
    );
    expect(edited.steps.map((step) => step.experienceId)).toEqual([SLOW, JAZZ, ROOFTOP, MUSEUM]);
    expect(edited.currentStep).toBe(2);
    expect(await db.journeyStep.count({ where: { journeyId: created.id } })).toBe(4);

    // Progress rules: no skip, no going back past the done steps, the last one is `complete`.
    expect(codeOf((await progress(lea, created.id, 0).expect(409)).body)).toBe(
      'JOURNEY_INVALID_STEP',
    );
    await progress(lea, created.id, 3).expect(200);
    expect(codeOf((await progress(lea, created.id, 4).expect(409)).body)).toBe(
      'JOURNEY_INVALID_STEP',
    );

    // Complete: COMPLETED, completedAt set, then read-only.
    const done = dataOf<JourneyBody>((await complete(lea, created.id).expect(200)).body);
    expect(done).toMatchObject({ status: 'completed', currentStep: 3 });
    expect(done.completedAt).not.toBeNull();
    expect(codeOf((await complete(lea, created.id).expect(409)).body)).toBe('JOURNEY_NOT_ACTIVE');
    expect(codeOf((await progress(lea, created.id, 3).expect(409)).body)).toBe(
      'JOURNEY_NOT_ACTIVE',
    );
    await http()
      .patch(`/api/v1/journeys/${created.id}`)
      .set(lea)
      .send({ experienceIds: [SLOW] })
      .expect(409);

    // No active journey any more; in the history; still readable.
    expect((await http().get('/api/v1/journeys/active').set(lea)).body).toEqual({ data: null });
    const history = dataOf<{ items: JourneyBody[] }>(
      (await http().get('/api/v1/journeys').set(lea)).body,
    );
    expect(history.items.map((item) => item.id)).toEqual([created.id]);
    await http().get(`/api/v1/journeys/${created.id}`).set(lea).expect(200);
  });

  it('one active journey per user: refused after, and under concurrency (the index decides)', async () => {
    await create(lea, [SLOW]).expect(201);
    expect(codeOf((await create(lea, [ROOFTOP]).expect(409)).body)).toBe('JOURNEY_ALREADY_ACTIVE');

    const responses = await Promise.all(Array.from({ length: 5 }, () => create(tom, [JAZZ])));
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409, 409, 409]);
    for (const response of responses.filter((item) => item.status === 409)) {
      expect(codeOf(response.body)).toBe('JOURNEY_ALREADY_ACTIVE');
    }
    expect(await db.journey.count({ where: { status: 'ACTIVE' } })).toBe(2);

    // Completing it frees the slot: a new active journey can be created.
    const { id } = dataOf<JourneyBody>((await http().get('/api/v1/journeys/active').set(lea)).body);
    await complete(lea, id).expect(200);
    await create(lea, [ROOFTOP]).expect(201);
  });

  it('ownership: another user can neither read, edit, progress nor complete; no identity switch', async () => {
    const { id } = dataOf<JourneyBody>((await create(lea, [SLOW, ROOFTOP]).expect(201)).body);
    const before = await db.journey.findUniqueOrThrow({ where: { id }, include: { steps: true } });

    await http().get(`/api/v1/journeys/${id}`).set(tom).expect(404);
    await http()
      .patch(`/api/v1/journeys/${id}`)
      .set(tom)
      .send({ experienceIds: [JAZZ] })
      .expect(404);
    await progress(tom, id, 1).expect(404);
    await complete(tom, id).expect(404);
    await http().get(`/api/v1/journeys/${id}?userId=${before.userId}`).set(tom).expect(404);
    await http().get(`/api/v1/journeys?userId=${before.userId}`).set(tom).expect(400);
    await http()
      .post('/api/v1/journeys')
      .set(tom)
      .send({ ...draft([JAZZ]), userId: before.userId })
      .expect(400);

    expect(
      dataOf<{ items: unknown[] }>((await http().get('/api/v1/journeys').set(tom)).body).items,
    ).toEqual([]);
    expect(await db.journey.findUniqueOrThrow({ where: { id }, include: { steps: true } })).toEqual(
      before,
    );
  });

  it('history: completed only, most recent first, paginated to the last page; never another user’s', async () => {
    const first = await completedJourney(lea, [SLOW]);
    const second = await completedJourney(lea, [ROOFTOP, JAZZ]);
    const third = await completedJourney(lea, [MUSEUM, PICNIC, SLOW]);
    await create(lea, [JAZZ]).expect(201); // active: not history
    await completedJourney(tom, [SLOW]);

    const page1 = dataOf<{ items: JourneyBody[]; nextCursor: string | null }>(
      (await http().get('/api/v1/journeys?limit=2').set(lea).expect(200)).body,
    );
    expect(page1.items.map((item) => item.id)).toEqual([third, second]);
    expect(page1.nextCursor).toBe(second);
    const page2 = dataOf<{ items: JourneyBody[]; nextCursor: string | null }>(
      (await http().get(`/api/v1/journeys?limit=2&cursor=${page1.nextCursor}`).set(lea)).body,
    );
    expect(page2).toMatchObject({ items: [{ id: first }], nextCursor: null });
    expect(page2.items[0].steps[0].experience.id).toBe(SLOW);

    await http().get('/api/v1/journeys?limit=101').set(lea).expect(400);
    await http().get('/api/v1/journeys?cursor=nope').set(lea).expect(400);
  });

  it('experiences: unknown or inactive refused (422); one already in the journey may stay once deactivated', async () => {
    const unknown = '01a0db2f-0000-7000-8000-000000000000';
    const refused = await create(lea, [SLOW, unknown]).expect(422);
    expect(refused.body).toMatchObject({
      error: {
        code: 'JOURNEY_EXPERIENCE_UNAVAILABLE',
        details: [{ experienceId: unknown, reason: 'notFound' }],
      },
    });
    expect(await db.journey.count()).toBe(0);

    const { id } = dataOf<JourneyBody>((await create(lea, [SLOW, ROOFTOP]).expect(201)).body);
    await db.experience.update({ where: { id: ROOFTOP }, data: { isActive: false } });
    await http()
      .patch(`/api/v1/journeys/${id}`)
      .set(lea)
      .send({ experienceIds: [ROOFTOP, SLOW] })
      .expect(200);
    await http()
      .patch(`/api/v1/journeys/${id}`)
      .set(lea)
      .send({ experienceIds: [SLOW, ROOFTOP] })
      .expect(200);
    const detail = dataOf<JourneyBody>((await http().get(`/api/v1/journeys/${id}`).set(lea)).body);
    expect(detail.steps[1].experience).toMatchObject({ id: ROOFTOP, isActive: false });
    expect(codeOf((await create(tom, [ROOFTOP]).expect(422)).body)).toBe(
      'JOURNEY_EXPERIENCE_UNAVAILABLE',
    );
  });

  it('rollback: a failing write leaves no journey, no step, no half-replaced list', async () => {
    const repository = app.get(JourneyRepository);
    const user = await db.user.findUniqueOrThrow({ where: { email: 'lea@example.com' } });
    const step = (experienceId: string) => ({
      experienceId,
      estimatedArrival: '14:00',
      estimatedDurationMin: 60,
      travelDurationMin: 0,
      travelDistanceM: 0,
      travelMode: 'WALK' as const,
    });
    const plan = {
      endTime: '16:00',
      estimatedDurationMin: 120,
      estimatedBudgetEur: 0,
      totalDistanceM: 0,
    };

    // Creation with an unknown experience in its second step: nothing at all.
    await expect(
      repository.create({
        userId: user.id,
        title: 'x',
        mood: 'CALM',
        duration: 'ONE_HOUR',
        budget: 'FREE',
        startLocation: { kind: 'CURRENT', label: 'Ma position', latitude: 48.86, longitude: 2.35 },
        startTime: '14:00',
        startedAt: new Date(),
        steps: [step(SLOW), step('01a0db2f-0000-7000-8000-000000000000')],
        ...plan,
      }),
    ).rejects.toThrow();
    expect(await db.journey.count()).toBe(0);
    expect(await db.journeyStep.count()).toBe(0);

    // Replacement failing on its last step (the same experience twice: unique per journey): the old list stays.
    const { id } = dataOf<JourneyBody>((await create(lea, [SLOW, ROOFTOP]).expect(201)).body);
    const before = await db.journey.findUniqueOrThrow({ where: { id }, include: { steps: true } });
    await expect(
      repository.replaceSteps(id, {
        steps: [step(JAZZ), step(MUSEUM), step(JAZZ)],
        currentStep: 0,
        plan,
      }),
    ).rejects.toThrow();
    expect(await db.journey.findUniqueOrThrow({ where: { id }, include: { steps: true } })).toEqual(
      before,
    );
  });

  it('performance: a stable number of SQL statements whatever the number of steps (no query per step)', async () => {
    const counter = queryCounter();
    const small = dataOf<JourneyBody>((await create(lea, [SLOW]).expect(201)).body);
    const big = dataOf<JourneyBody>(
      (
        await create(tom, [SLOW, ROOFTOP, JAZZ, MUSEUM, PICNIC, exp('exp-bellevilloise')]).expect(
          201,
        )
      ).body,
    );

    const detailSmall = await counter.measure(() =>
      http().get(`/api/v1/journeys/${small.id}`).set(lea).expect(200),
    );
    const detailBig = await counter.measure(() =>
      http().get(`/api/v1/journeys/${big.id}`).set(tom).expect(200),
    );
    const active = await counter.measure(() =>
      http().get('/api/v1/journeys/active').set(tom).expect(200),
    );
    await complete(lea, small.id).expect(200);
    await completedJourney(lea, [ROOFTOP, JAZZ, MUSEUM]);
    const list = await counter.measure(() => http().get('/api/v1/journeys').set(lea).expect(200));

    // Recorded in JOURNEY_API.md → "Performance".
    console.log(
      `SQL statements — detail (1 step): ${detailSmall}, detail (6 steps): ${detailBig}, active: ${active}, history (2 journeys): ${list}`,
    );
    expect(detailBig).toBe(detailSmall);
    expect(detailBig).toBeLessThanOrEqual(12);
    expect(list).toBeLessThanOrEqual(12);
  });
});
