import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestClient, resetDatabase } from './database.js';

type Signed = { data: { user: { id: string }; session: { token: string } } };

const PASSWORD = 'fictional-Passw0rd';

/**
 * Profile and preferences end to end: the real application over HTTP on PostgreSQL (the test database), two
 * real accounts, and a separate connection to check what was stored.
 */
describe('profile and preferences on PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  const http = () => request(app.getHttpServer());

  async function account(email: string) {
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ displayName: email.split('@')[0], email, password: PASSWORD })
      .expect(201);
    const { user, session } = (response.body as Signed).data;
    return { id: user.id, auth: { Authorization: `Bearer ${session.token}` } };
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
  });

  afterAll(async () => {
    await resetDatabase(db);
    await db.$disconnect();
    await app.close();
  });

  it('profile: partial update, stored, read back through /auth/me; email unchanged', async () => {
    const lea = await account('lea@example.com');

    const updated = await http()
      .patch('/api/v1/users/me')
      .set(lea.auth)
      .send({ displayName: 'Léa M.', city: 'Paris', age: 28 })
      .expect(200);
    expect(updated.body).toEqual({
      data: {
        id: lea.id,
        email: 'lea@example.com',
        displayName: 'Léa M.',
        avatarUrl: null,
        age: 28,
        city: 'Paris',
        bio: null,
      },
    });

    // A second partial update keeps the first one; null clears.
    await http()
      .patch('/api/v1/users/me')
      .set(lea.auth)
      .send({ age: null, bio: 'Hello' })
      .expect(200);
    const me = await http().get('/api/v1/auth/me').set(lea.auth).expect(200);
    expect(me.body).toMatchObject({
      data: { displayName: 'Léa M.', city: 'Paris', age: null, bio: 'Hello' },
    });

    // Stored in PostgreSQL (separate connection).
    const row = await db.user.findUniqueOrThrow({ where: { id: lea.id } });
    expect(row).toMatchObject({ email: 'lea@example.com', city: 'Paris', age: null, bio: 'Hello' });

    // The email is not editable here.
    await http()
      .patch('/api/v1/users/me')
      .set(lea.auth)
      .send({ email: 'x@example.com' })
      .expect(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: lea.id } })).email).toBe(
      'lea@example.com',
    );
  });

  it('preferences: defaults, created on first save, then partially updated; stored as database enums', async () => {
    const lea = await account('lea@example.com');

    const empty = await http().get('/api/v1/users/me/preferences').set(lea.auth).expect(200);
    expect(empty.body).toMatchObject({
      data: { interests: [], usualBudget: null, updatedAt: null },
    });
    expect(await db.userPreference.count()).toBe(0);

    await http()
      .patch('/api/v1/users/me/preferences')
      .set(lea.auth)
      .send({ interests: ['culture', 'food'], usualBudget: '10to25', usualCompany: 'friends' })
      .expect(200);
    const second = await http()
      .patch('/api/v1/users/me/preferences')
      .set(lea.auth)
      .send({ maxDistanceKm: 5, usualCompany: null })
      .expect(200);

    expect(second.body).toMatchObject({
      data: {
        interests: ['culture', 'food'],
        activities: [],
        usualBudget: '10to25',
        maxDistanceKm: 5,
        usualCompany: null,
      },
    });
    const row = await db.userPreference.findUniqueOrThrow({ where: { userId: lea.id } });
    expect(row).toMatchObject({
      interests: ['culture', 'food'],
      usualBudget: 'FROM_10_TO_25',
      maxDistanceKm: 5,
      usualCompany: null,
    });
    expect(await db.userPreference.count()).toBe(1);

    // Read back as a new request.
    const read = await http().get('/api/v1/users/me/preferences').set(lea.auth).expect(200);
    expect(read.body).toEqual(second.body);
  });

  it('isolation: each user reads and changes only their own profile and preferences', async () => {
    const [lea, tom] = [await account('lea@example.com'), await account('tom@example.com')];

    await http().patch('/api/v1/users/me').set(lea.auth).send({ city: 'Paris' }).expect(200);
    await http()
      .patch('/api/v1/users/me/preferences')
      .set(lea.auth)
      .send({ interests: ['culture'] })
      .expect(200);

    // Tom sees his own (empty) data, even when naming Léa's id.
    const tomPrefs = await http()
      .get(`/api/v1/users/me/preferences?userId=${lea.id}`)
      .set(tom.auth)
      .expect(200);
    expect(tomPrefs.body).toMatchObject({ data: { interests: [], updatedAt: null } });
    const tomMe = await http().get('/api/v1/auth/me').set(tom.auth).expect(200);
    expect(tomMe.body).toMatchObject({ data: { id: tom.id, city: null } });

    // Tom cannot target Léa through the body.
    await http()
      .patch('/api/v1/users/me')
      .set(tom.auth)
      .send({ id: lea.id, city: 'Lyon' })
      .expect(400);
    await http()
      .patch('/api/v1/users/me/preferences')
      .set(tom.auth)
      .send({ userId: lea.id, interests: ['sport'] })
      .expect(400);

    // His own changes stay his.
    await http().patch('/api/v1/users/me').set(tom.auth).send({ city: 'Lyon' }).expect(200);
    await http()
      .patch('/api/v1/users/me/preferences')
      .set(tom.auth)
      .send({ interests: ['sport'] })
      .expect(200);

    expect((await db.user.findUniqueOrThrow({ where: { id: lea.id } })).city).toBe('Paris');
    expect(
      (await db.userPreference.findUniqueOrThrow({ where: { userId: lea.id } })).interests,
    ).toEqual(['culture']);
    expect(
      (await db.userPreference.findUniqueOrThrow({ where: { userId: tom.id } })).interests,
    ).toEqual(['sport']);
  });

  it('no secret in any profile or preferences response', async () => {
    const lea = await account('lea@example.com');
    const bodies = [
      (await http().patch('/api/v1/users/me').set(lea.auth).send({ city: 'Paris' })).body,
      (await http().get('/api/v1/users/me/preferences').set(lea.auth)).body,
      (
        await http()
          .patch('/api/v1/users/me/preferences')
          .set(lea.auth)
          .send({ activities: ['walks'] })
      ).body,
    ];
    const text = JSON.stringify(bodies);
    expect(text).not.toMatch(/passwordHash|argon2|token|session|userId/i);
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain(lea.auth.Authorization.slice(7));
  });

  it('a revoked session cannot read or change anything', async () => {
    const lea = await account('lea@example.com');
    await http().post('/api/v1/auth/logout').set(lea.auth).expect(204);

    await http().patch('/api/v1/users/me').set(lea.auth).send({ city: 'Paris' }).expect(401);
    await http().get('/api/v1/users/me/preferences').set(lea.auth).expect(401);
    expect((await db.user.findUniqueOrThrow({ where: { id: lea.id } })).city).toBeNull();
  });

  it('deleting the user deletes its preferences (existing cascade)', async () => {
    const lea = await account('lea@example.com');
    await http()
      .patch('/api/v1/users/me/preferences')
      .set(lea.auth)
      .send({ interests: ['culture'] })
      .expect(200);

    await db.user.delete({ where: { id: lea.id } });
    expect(await db.userPreference.count()).toBe(0);
  });
});
