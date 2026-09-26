import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import type { ErrorResponseBody } from '../src/common/errors/api-error.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { UserRepository } from '../src/modules/users/user.repository.js';

/**
 * `/api/v1/users/me*` over HTTP: the real application (guard, validation, service, envelope), with the session
 * check and UserRepository mocked. The same flows on PostgreSQL: test/database/users.db-spec.ts.
 */
const TOKEN = 'c'.repeat(43);
const me = {
  id: 'user-a',
  email: 'lea@example.com',
  displayName: 'Léa',
  avatarUrl: null,
  age: null,
  city: null,
  bio: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const auth = { authenticate: vi.fn() };
const users = {
  updateProfile: vi.fn(),
  findPreference: vi.fn(),
  savePreference: vi.fn(),
};

describe('users/me endpoints (session and repository mocked)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  const signedIn = (req: request.Test) => req.set('Authorization', `Bearer ${TOKEN}`);
  const errorOf = (body: unknown) => (body as ErrorResponseBody).error;
  const fields = (body: unknown) =>
    (errorOf(body).details as { field: string }[]).map((detail) => detail.field).sort();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ onModuleInit: vi.fn(), onModuleDestroy: vi.fn(), isReachable: vi.fn() })
      .overrideProvider(AuthService)
      .useValue(auth)
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
  });

  it('every route requires a session → 401 AUTH_UNAUTHORIZED', async () => {
    for (const [method, path] of [
      ['patch', '/api/v1/users/me'],
      ['get', '/api/v1/users/me/preferences'],
      ['patch', '/api/v1/users/me/preferences'],
    ] as const) {
      const response = await http()[method](path).send({}).expect(401);
      expect(errorOf(response.body).code).toBe('AUTH_UNAUTHORIZED');
    }
    expect(users.updateProfile).not.toHaveBeenCalled();
    expect(users.findPreference).not.toHaveBeenCalled();
  });

  describe('PATCH /users/me', () => {
    it('updates the session user’s profile → 200 public fields only', async () => {
      users.updateProfile.mockResolvedValue({ ...me, city: 'Paris', age: 28 });

      const response = await signedIn(http().patch('/api/v1/users/me'))
        .send({ city: ' Paris ', age: 28, bio: null })
        .expect(200);

      expect(users.updateProfile).toHaveBeenCalledWith('user-a', {
        city: 'Paris',
        age: 28,
        bio: null,
      });
      expect(response.body).toEqual({
        data: {
          id: 'user-a',
          email: 'lea@example.com',
          displayName: 'Léa',
          avatarUrl: null,
          age: 28,
          city: 'Paris',
          bio: null,
        },
      });
      expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|argon|token|createdAt/i);
    });

    it('the email, a user id and unknown fields are refused (400)', async () => {
      const response = await signedIn(http().patch('/api/v1/users/me'))
        .send({ email: 'other@example.com', id: 'user-b', userId: 'user-b', role: 'admin' })
        .expect(400);
      expect(fields(response.body)).toEqual(['email', 'id', 'role', 'userId']);
      expect(users.updateProfile).not.toHaveBeenCalled();
    });

    it('validation: types, lengths, formats, non-nullable display name', async () => {
      const response = await signedIn(http().patch('/api/v1/users/me'))
        .send({
          displayName: null,
          age: 'twenty',
          city: 'x'.repeat(101),
          bio: 'y'.repeat(501),
          avatarUrl: 'http://insecure.example.com/a.jpg',
        })
        .expect(400);
      expect(fields(response.body)).toEqual(['age', 'avatarUrl', 'bio', 'city', 'displayName']);
    });

    it('an empty body changes nothing → 200, no query', async () => {
      await signedIn(http().patch('/api/v1/users/me')).send({}).expect(200);
      expect(users.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('/users/me/preferences', () => {
    it('GET: never saved → 200 with the empty defaults', async () => {
      users.findPreference.mockResolvedValue(null);
      const response = await signedIn(http().get('/api/v1/users/me/preferences')).expect(200);
      expect(response.body).toEqual({
        data: {
          interests: [],
          activities: [],
          usualBudget: null,
          maxDistanceKm: null,
          usualCompany: null,
          updatedAt: null,
        },
      });
      expect(users.findPreference).toHaveBeenCalledWith('user-a');
    });

    it('a userId in the query string is ignored: the session decides', async () => {
      users.findPreference.mockResolvedValue(null);
      await signedIn(http().get('/api/v1/users/me/preferences?userId=user-b')).expect(200);
      expect(users.findPreference).toHaveBeenCalledWith('user-a');
    });

    it('PATCH: mobile values in, database values to the repository, mobile values out', async () => {
      users.savePreference.mockResolvedValue({
        interests: ['culture'],
        activities: [],
        usualBudget: 'UNDER_10',
        maxDistanceKm: 10,
        usualCompany: 'COUPLE',
        updatedAt: new Date('2026-09-26T12:00:00Z'),
      });

      const response = await signedIn(http().patch('/api/v1/users/me/preferences'))
        .send({
          interests: ['culture'],
          usualBudget: 'under10',
          maxDistanceKm: 10,
          usualCompany: 'couple',
        })
        .expect(200);

      expect(users.savePreference).toHaveBeenCalledWith('user-a', {
        interests: ['culture'],
        usualBudget: 'UNDER_10',
        maxDistanceKm: 10,
        usualCompany: 'COUPLE',
      });
      expect(response.body).toEqual({
        data: {
          interests: ['culture'],
          activities: [],
          usualBudget: 'under10',
          maxDistanceKm: 10,
          usualCompany: 'couple',
          updatedAt: '2026-09-26T12:00:00.000Z',
        },
      });
    });

    it('PATCH validation: enums, ranges, arrays, unknown fields', async () => {
      const response = await signedIn(http().patch('/api/v1/users/me/preferences'))
        .send({
          interests: 'culture',
          activities: ['ok', ''],
          usualBudget: 'UNDER_10',
          maxDistanceKm: 0,
          usualCompany: 'colleagues',
          userId: 'user-b',
        })
        .expect(400);
      expect(fields(response.body)).toEqual([
        'activities',
        'interests',
        'maxDistanceKm',
        'userId',
        'usualBudget',
        'usualCompany',
      ]);

      const tooMany = await signedIn(http().patch('/api/v1/users/me/preferences'))
        .send({ interests: Array.from({ length: 21 }, (_, i) => `tag${i}`), maxDistanceKm: 51 })
        .expect(400);
      expect(fields(tooMany.body)).toEqual(['interests', 'maxDistanceKm']);
      expect(users.savePreference).not.toHaveBeenCalled();
    });
  });
});
