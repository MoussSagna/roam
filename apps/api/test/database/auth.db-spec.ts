import { type INestApplication, Injectable, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import type { ErrorResponseBody } from '../../src/common/errors/api-error.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { RESET_CODE_MAX_ATTEMPTS } from '../../src/modules/auth/auth.service.js';
import { PasswordResetDelivery } from '../../src/modules/auth/password-reset-delivery.js';
import { hashSessionToken } from '../../src/modules/auth/session-token.js';
import { createTestClient, resetDatabase } from './database.js';

/** Captures the codes the application would send (no email provider yet). */
@Injectable()
class CapturingDelivery extends PasswordResetDelivery {
  readonly sent: { email: string; code: string }[] = [];
  send(email: string, code: string): Promise<void> {
    this.sent.push({ email, code });
    return Promise.resolve();
  }
}

class RecordingLogger implements LoggerService {
  readonly lines: string[] = [];
  private record = (...parts: unknown[]) => {
    this.lines.push(parts.map((part) => JSON.stringify(part) ?? String(part)).join(' '));
  };
  log = this.record;
  error = this.record;
  warn = this.record;
  debug = this.record;
  verbose = this.record;
  fatal = this.record;
}

type SignedIn = { data: { user: { id: string; email: string }; session: { token: string } } };

const PASSWORD = 'fictional-Passw0rd';
const NEW_PASSWORD = 'another-Passw0rd';

/** Authentication end to end: the real application, over HTTP, on PostgreSQL (the test database). */
describe('authentication on PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: PrismaClient;
  const delivery = new CapturingDelivery();
  const logger = new RecordingLogger();
  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const errorCode = (body: unknown) => (body as ErrorResponseBody).error.code;

  const register = (email = 'lea@example.com') =>
    http().post('/api/v1/auth/register').send({ displayName: 'Léa', email, password: PASSWORD });
  const login = (email: string, password: string) =>
    http().post('/api/v1/auth/login').send({ email, password });

  beforeAll(async () => {
    db = createTestClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasswordResetDelivery)
      .useValue(delivery)
      .compile();
    app = moduleRef.createNestApplication({ logger });
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    await resetDatabase(db);
    delivery.sent.length = 0;
  });

  afterAll(async () => {
    await resetDatabase(db);
    await db.$disconnect();
    await app.close();
    // Nothing secret reached the logs during the whole file.
    const logs = logger.lines.join('\n');
    expect(logs).not.toContain(PASSWORD);
    expect(logs).not.toContain(NEW_PASSWORD);
    expect(logs).not.toMatch(/\$argon2id\$/);
  });

  it('register → session → /me → logout → the token no longer works', async () => {
    const registered = await register('  Lea@Example.com ').expect(201);
    const { user, session } = (registered.body as SignedIn).data;
    expect(user.email).toBe('lea@example.com');

    const me = await http().get('/api/v1/auth/me').set(bearer(session.token)).expect(200);
    expect((me.body as { data: { id: string } }).data.id).toBe(user.id);

    await http().post('/api/v1/auth/logout').set(bearer(session.token)).expect(204);
    const after = await http().get('/api/v1/auth/me').set(bearer(session.token)).expect(401);
    expect(errorCode(after.body)).toBe('AUTH_SESSION_INVALID');
    // Logging out again is not an error.
    await http().post('/api/v1/auth/logout').set(bearer(session.token)).expect(204);
  });

  it('stores an Argon2id hash, never the password; sessions by token hash, never the token', async () => {
    const { session } = ((await register()).body as SignedIn).data;

    const [row] = await db.$queryRaw<{ passwordHash: string }[]>`
      SELECT "passwordHash" FROM users WHERE email = 'lea@example.com'`;
    expect(row.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(row.passwordHash).not.toContain(PASSWORD);

    const sessions = await db.authSession.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokenHash).toBe(hashSessionToken(session.token));
    expect(JSON.stringify(sessions)).not.toContain(session.token);
  });

  it('an email already used (any case) → 409 AUTH_EMAIL_ALREADY_EXISTS; one account', async () => {
    await register().expect(201);
    const duplicate = await register('LEA@example.com').expect(409);
    expect(errorCode(duplicate.body)).toBe('AUTH_EMAIL_ALREADY_EXISTS');
    expect(await db.user.count()).toBe(1);
  });

  it('two registrations at once with one email: exactly one account', async () => {
    const results = await Promise.all([register(), register(), register()]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(await db.user.count()).toBe(1);
  });

  it('login: right password → a new session; wrong password and unknown email → the same 401', async () => {
    await register();

    const ok = await login('LEA@example.com', PASSWORD).expect(200);
    const { session } = (ok.body as SignedIn).data;
    await http().get('/api/v1/auth/me').set(bearer(session.token)).expect(200);
    expect(await db.authSession.count()).toBe(2); // register + login: two devices

    const wrong = await login('lea@example.com', 'wrong-Passw0rd').expect(401);
    const unknown = await login('nobody@example.com', PASSWORD).expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(errorCode(wrong.body)).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('an expired session is refused', async () => {
    const { session } = ((await register()).body as SignedIn).data;
    await db.authSession.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const response = await http().get('/api/v1/auth/me').set(bearer(session.token)).expect(401);
    expect(errorCode(response.body)).toBe('AUTH_SESSION_INVALID');
  });

  it('password reset: code → verify → new password; every session revoked; old password refused', async () => {
    const { session } = ((await register()).body as SignedIn).data;

    await http()
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'Lea@example.com' })
      .expect(202);
    expect(delivery.sent).toHaveLength(1);
    const { code } = delivery.sent[0];
    // Stored hashed, never in clear.
    const stored = await db.passwordResetCode.findFirstOrThrow();
    expect(stored.codeHash).toMatch(/^\$argon2id\$/);
    expect(stored.codeHash).not.toContain(code);

    await http()
      .post('/api/v1/auth/password/verify-code')
      .send({ email: 'lea@example.com', code })
      .expect(204);
    await http()
      .post('/api/v1/auth/password/reset')
      .send({ email: 'lea@example.com', code, newPassword: NEW_PASSWORD })
      .expect(204);

    await http().get('/api/v1/auth/me').set(bearer(session.token)).expect(401);
    expect(await db.passwordResetCode.count()).toBe(0);
    await login('lea@example.com', PASSWORD).expect(401);
    await login('lea@example.com', NEW_PASSWORD).expect(200);

    // The code was used: it cannot be replayed.
    await http()
      .post('/api/v1/auth/password/reset')
      .send({ email: 'lea@example.com', code, newPassword: PASSWORD })
      .expect(400);
  });

  it('forgot password answers the same for an unknown email, and sends nothing', async () => {
    const response = await http()
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'nobody@example.com' })
      .expect(202);
    expect(response.body).toEqual({ data: null });
    expect(delivery.sent).toHaveLength(0);
  });

  it(`a code allows ${RESET_CODE_MAX_ATTEMPTS} attempts, then even the right code is refused`, async () => {
    await register();
    await http()
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'lea@example.com' })
      .expect(202);
    const { code } = delivery.sent[0];
    const wrong = code === '000000' ? '111111' : '000000';

    for (let attempt = 0; attempt < RESET_CODE_MAX_ATTEMPTS; attempt += 1) {
      const response = await http()
        .post('/api/v1/auth/password/verify-code')
        .send({ email: 'lea@example.com', code: wrong })
        .expect(400);
      expect(errorCode(response.body)).toBe('AUTH_RESET_CODE_INVALID');
    }
    await http()
      .post('/api/v1/auth/password/verify-code')
      .send({ email: 'lea@example.com', code })
      .expect(400);
  });

  it('an expired code is refused; a new request replaces it', async () => {
    await register();
    await http()
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'lea@example.com' })
      .expect(202);
    await db.passwordResetCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await http()
      .post('/api/v1/auth/password/verify-code')
      .send({ email: 'lea@example.com', code: delivery.sent[0].code })
      .expect(400);

    await http()
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'lea@example.com' })
      .expect(202);
    await http()
      .post('/api/v1/auth/password/verify-code')
      .send({ email: 'lea@example.com', code: delivery.sent[1].code })
      .expect(204);
    expect(await db.passwordResetCode.count()).toBe(1);
  });

  it('deleting a user deletes its sessions and pending reset', async () => {
    const { user } = ((await register()).body as SignedIn).data;
    await http()
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'lea@example.com' })
      .expect(202);

    await db.user.delete({ where: { id: user.id } });
    expect(await db.authSession.count()).toBe(0);
    expect(await db.passwordResetCode.count()).toBe(0);
  });
});
