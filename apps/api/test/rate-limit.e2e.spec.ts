import { randomBytes } from 'node:crypto';

import type { INestApplication, LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { Clock } from '../src/common/clock.js';
import type { ErrorResponseBody } from '../src/common/errors/api-error.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { authErrors } from '../src/modules/auth/auth.errors.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

// Low limits for this file only (read by the configuration when AppModule loads): windows of 60 s.
vi.hoisted(() => {
  Object.assign(process.env, {
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_IP_LIMIT: '40',
    RATE_LIMIT_IP_TTL_SECONDS: '60',
    RATE_LIMIT_CLIENT_LIMIT: '10',
    RATE_LIMIT_CLIENT_TTL_SECONDS: '60',
    RATE_LIMIT_AUTH_LIMIT: '2',
    RATE_LIMIT_AUTH_TTL_SECONDS: '60',
    RATE_LIMIT_MUTATION_LIMIT: '3',
    RATE_LIMIT_MUTATION_TTL_SECONDS: '60',
  });
});

/**
 * Rate limiting over HTTP (RATE_LIMITING.md): the real application with low limits and a clock the test moves; the
 * session service mocked (two known tokens). Every request comes from 127.0.0.1.
 */
const TOKEN_A = 'a'.repeat(43);
const TOKEN_B = 'b'.repeat(43);
const users: Record<string, { id: string; email: string; displayName: string }> = {
  [TOKEN_A]: { id: 'user-a', email: 'lea@example.com', displayName: 'Léa' },
  [TOKEN_B]: { id: 'user-b', email: 'tom@example.com', displayName: 'Tom' },
};

let now = Date.UTC(2026, 8, 26, 12);
const clock = { now: () => new Date(now) };
const advance = (seconds: number) => {
  now += seconds * 1000;
};

const auth = {
  authenticate: vi.fn((token: string) =>
    Promise.resolve(users[token] ? { sessionId: `s-${token[0]}`, user: users[token] } : null),
  ),
  login: vi.fn(() => Promise.reject(authErrors.invalidCredentials())),
  requestPasswordReset: vi.fn(() => Promise.resolve()),
};

const logs: string[] = [];
const captureLogger: LoggerService = {
  log: (message: unknown) => void logs.push(String(message)),
  warn: (message: unknown) => void logs.push(String(message)),
  error: (message: unknown) => void logs.push(String(message)),
  debug: (message: unknown) => void logs.push(String(message)),
  verbose: (message: unknown) => void logs.push(String(message)),
};

describe('rate limiting over HTTP (low limits, controlled clock)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const errorOf = (body: unknown) => (body as ErrorResponseBody).error;
  const login = (email: string) =>
    http().post('/api/v1/auth/login').send({ email, password: 'fictional-Passw0rd' });
  const me = (token?: string) => {
    const call = http().get('/api/v1/auth/me');
    return token ? call.set(bearer(token)) : call;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: vi.fn(),
        onModuleDestroy: vi.fn(),
        isReachable: vi.fn(() => Promise.resolve(true)),
      })
      .overrideProvider(AuthService)
      .useValue(auth)
      .overrideProvider(Clock)
      .useValue(clock)
      .compile();
    app = moduleRef.createNestApplication({ logger: captureLogger });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Every window and block of the previous test is over.
    advance(600);
    logs.length = 0;
  });

  it('login: 2 attempts, then 429 TOO_MANY_REQUESTS with Retry-After — the same answer whatever the email', async () => {
    expect(errorOf((await login('known@example.com').expect(401)).body).code).toBe(
      'AUTH_INVALID_CREDENTIALS',
    );
    await login('unknown@example.com').expect(401);

    const limited = await login('known@example.com').expect(429);
    const other = await login('someone-else@example.com').expect(429);

    expect(limited.headers['retry-after']).toBe('60');
    expect(limited.body).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests: try again later.',
        details: { retryAfterSeconds: 60 },
      },
    });
    // Keyed by IP, not by email: nothing tells whether an account exists.
    expect(other.body).toEqual(limited.body);
    expect(auth.login).toHaveBeenCalledTimes(2);
  });

  it('a new window after Retry-After: blocked until then, allowed again right after', async () => {
    await login('a@example.com').expect(401);
    await login('a@example.com').expect(401);
    await login('a@example.com').expect(429);

    advance(59);
    const stillBlocked = await login('a@example.com').expect(429);
    expect(stillBlocked.headers['retry-after']).toBe('1');
    advance(1);
    await login('a@example.com').expect(401);
  });

  it('one auth budget for login, register and password reset; validation still answers under the limit', async () => {
    const invalidRegister = await http()
      .post('/api/v1/auth/register')
      .send({ email: 'nope' })
      .expect(400);
    expect(errorOf(invalidRegister.body).code).toBe('VALIDATION_ERROR');
    await http().post('/api/v1/auth/password/forgot').send({ email: 'x@example.com' }).expect(202);

    await http()
      .post('/api/v1/auth/password/reset')
      .send({ email: 'x@example.com', code: '123456', password: 'fictional-Passw0rd' })
      .expect(429);
    await http().post('/api/v1/auth/password/forgot').send({ email: 'x@example.com' }).expect(429);
    await login('x@example.com').expect(429);
    expect(auth.requestPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('health probes are never limited', async () => {
    for (let i = 0; i < 30; i += 1) await http().get('/health').expect(200);
  });

  it('per session: user A is limited, user B is not', async () => {
    for (let i = 0; i < 10; i += 1) await me(TOKEN_A).expect(200);
    await me(TOKEN_A).expect(429);
    await me(TOKEN_B).expect(200);
  });

  it('without a session: 401 as usual under the limit, 429 beyond — the limit runs before authentication', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect(errorOf((await me().expect(401)).body).code).toBe('AUTH_UNAUTHORIZED');
    }
    await me().expect(429);
  });

  // 45 sequential requests: given more than the default 5 s, which a loaded machine can exceed.
  it('rotating made-up tokens does not escape: the per-IP tier caps them', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 45; i += 1) {
      statuses.push((await me(randomBytes(32).toString('base64url'))).status);
    }
    expect(statuses.slice(0, 40).every((status) => status === 401)).toBe(true);
    expect(statuses.slice(40)).toEqual([429, 429, 429, 429, 429]);
  }, 20_000);

  it('writes have their own budget (before validation); reads are not counted in it', async () => {
    for (let i = 0; i < 3; i += 1) {
      await http().post('/api/v1/favorites').set(bearer(TOKEN_A)).send({}).expect(400);
    }
    await http().post('/api/v1/favorites').set(bearer(TOKEN_A)).send({}).expect(429);
    await me(TOKEN_A).expect(200);
    // Another user's writes are counted apart.
    await http().post('/api/v1/favorites').set(bearer(TOKEN_B)).send({}).expect(400);
  });

  it('concurrency: 20 simultaneous requests with a limit of 10 → exactly 10 served, 10 refused', async () => {
    const responses = await Promise.all(Array.from({ length: 20 }, () => me(TOKEN_A)));
    const statuses = responses.map((response) => response.status);
    expect(statuses.filter((status) => status === 200)).toHaveLength(10);
    expect(statuses.filter((status) => status === 429)).toHaveLength(10);
  });

  it('logs: the tier and the route of a refused request — never the token, the IP or the body', async () => {
    for (let i = 0; i < 11; i += 1) await me(TOKEN_A);
    await login('secret-email@example.com');
    await login('secret-email@example.com');
    await login('secret-email@example.com');

    const text = logs.join('\n');
    expect(text).toContain('Rate limit exceeded (client): GET /api/v1/auth/me');
    expect(text).toContain('Rate limit exceeded (auth): POST /api/v1/auth/login');
    expect(text).not.toContain(TOKEN_A);
    expect(text).not.toMatch(/127\.0\.0\.1|::1|secret-email|fictional-Passw0rd|Bearer/);
  });

  it('Swagger documents 429 with Retry-After on the API routes, not on the health probes', async () => {
    const document = (await http().get('/docs-json').expect(200)).body as {
      paths: Record<string, Record<string, { responses: Record<string, { headers?: object }> }>>;
    };
    expect(document.paths['/api/v1/auth/login'].post.responses['429'].headers).toHaveProperty(
      'Retry-After',
    );
    expect(document.paths['/api/v1/favorites'].get.responses['429']).toBeDefined();
    expect(document.paths['/health'].get.responses['429']).toBeUndefined();
  });
});
