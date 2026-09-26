import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import type { ErrorResponseBody } from '../src/common/errors/api-error.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

/**
 * The auth endpoints over HTTP with AuthService mocked: routing, validation, the guard, response shapes.
 * The real flows on PostgreSQL are in test/database/auth.db-spec.ts.
 */
const PASSWORD = 'fictional-Passw0rd';
const TOKEN = 'b'.repeat(43);
const user = {
  id: 'u1',
  email: 'lea@example.com',
  displayName: 'Léa',
  avatarUrl: null,
  age: null,
  city: null,
  bio: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const signedIn = { user, session: { token: TOKEN, expiresAt: new Date('2026-10-26T12:00:00Z') } };

const authMock = {
  register: vi.fn(() => Promise.resolve(signedIn)),
  login: vi.fn(() => Promise.resolve(signedIn)),
  logout: vi.fn(() => Promise.resolve()),
  authenticate: vi.fn(),
  requestPasswordReset: vi.fn(() => Promise.resolve()),
  verifyResetCode: vi.fn(() => Promise.resolve()),
  resetPassword: vi.fn(() => Promise.resolve()),
};

describe('auth endpoints (AuthService mocked)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ onModuleInit: vi.fn(), onModuleDestroy: vi.fn(), isReachable: vi.fn(() => true) })
      .overrideProvider(AuthService)
      .useValue(authMock)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => vi.clearAllMocks());

  const errorOf = (body: unknown) => (body as ErrorResponseBody).error;
  const fields = (body: unknown) =>
    (errorOf(body).details as { field: string }[]).map((detail) => detail.field).sort();

  it('register → 201 { data: { user, session } }: public fields only', async () => {
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ displayName: 'Léa', email: 'lea@example.com', password: PASSWORD })
      .expect(201);

    expect(response.body).toEqual({
      data: {
        user: {
          id: 'u1',
          email: 'lea@example.com',
          displayName: 'Léa',
          avatarUrl: null,
          age: null,
          city: null,
          bio: null,
        },
        session: { token: TOKEN, expiresAt: '2026-10-26T12:00:00.000Z' },
      },
    });
  });

  it('register validation: invalid email, weak password, missing and unknown fields', async () => {
    const invalid = await http()
      .post('/api/v1/auth/register')
      .send({ displayName: 'Léa', email: 'not-an-email', password: 'short', role: 'admin' })
      .expect(400);
    expect(errorOf(invalid.body).code).toBe('VALIDATION_ERROR');
    expect(fields(invalid.body)).toEqual(['email', 'password', 'role']);

    const noDigit = await http()
      .post('/api/v1/auth/register')
      .send({ displayName: 'Léa', email: 'lea@example.com', password: 'onlyletters' })
      .expect(400);
    expect(fields(noDigit.body)).toEqual(['password']);

    const missing = await http().post('/api/v1/auth/register').send({}).expect(400);
    expect(fields(missing.body)).toEqual(['displayName', 'email', 'password']);

    // A rejected password is never echoed back.
    expect(JSON.stringify([invalid.body, noDigit.body])).not.toMatch(/short|onlyletters/);
    expect(authMock.register).not.toHaveBeenCalled();
  });

  it('login → 200; validation: invalid email, missing password, unknown field', async () => {
    await http()
      .post('/api/v1/auth/login')
      .send({ email: 'lea@example.com', password: PASSWORD })
      .expect(200);

    const response = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'nope', extra: true })
      .expect(400);
    expect(fields(response.body)).toEqual(['email', 'extra', 'password']);
  });

  it('GET /auth/me requires a session: 401 AUTH_UNAUTHORIZED / AUTH_SESSION_INVALID, 200 with one', async () => {
    const none = await http().get('/api/v1/auth/me').expect(401);
    expect(errorOf(none.body).code).toBe('AUTH_UNAUTHORIZED');

    authMock.authenticate.mockResolvedValueOnce(null);
    const invalid = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(401);
    expect(errorOf(invalid.body).code).toBe('AUTH_SESSION_INVALID');

    authMock.authenticate.mockResolvedValueOnce({ sessionId: 's1', user });
    const me = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
    expect(me.body).toEqual({
      data: expect.objectContaining({ id: 'u1', email: 'lea@example.com' }) as unknown,
    });
    expect(me.body).not.toHaveProperty('data.createdAt');
  });

  it('logout → 204 with or without a token (idempotent), revoking the given one', async () => {
    await http().post('/api/v1/auth/logout').set('Authorization', `Bearer ${TOKEN}`).expect(204);
    expect(authMock.logout).toHaveBeenCalledWith(TOKEN);
    await http().post('/api/v1/auth/logout').expect(204);
    expect(authMock.logout).toHaveBeenCalledOnce();
  });

  it('password reset endpoints: public, validated, the code never in a response', async () => {
    const forgot = await http()
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'lea@example.com' })
      .expect(202);
    expect(forgot.body).toEqual({ data: null });

    const badCode = await http()
      .post('/api/v1/auth/password/verify-code')
      .send({ email: 'lea@example.com', code: '12ab' })
      .expect(400);
    expect(fields(badCode.body)).toEqual(['code']);

    await http()
      .post('/api/v1/auth/password/reset')
      .send({ email: 'lea@example.com', code: '123456', newPassword: 'new-Passw0rd' })
      .expect(204);
  });

  it('the health checks and the OpenAPI document stay public', async () => {
    await http().get('/health').expect(200);
    await http().get('/health/database').expect(200);
    const docs = await http().get('/docs-json').expect(200);
    const document = docs.body as { paths: Record<string, unknown>; components: unknown };
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(['/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/me']),
    );
    expect(JSON.stringify(document.components)).toContain('bearer');
  });
});
