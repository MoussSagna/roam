import { ApiException } from '../../common/errors/api-error.js';
import type { AppConfigService } from '../../config/app-config.service.js';
import { UniqueConstraintError } from '../../database/persistence-errors.js';
import type { User, UserRepository } from '../users/user.repository.js';
import type { AuthSessionRepository } from './auth-session.repository.js';
import { AuthService, RESET_CODE_MAX_ATTEMPTS, RESET_CODE_TTL_MS } from './auth.service.js';
import { PasswordHasher } from './password-hasher.js';
import type { PasswordResetRepository } from './password-reset.repository.js';
import { hashSessionToken } from './session-token.js';

const NOW = new Date('2026-09-26T12:00:00.000Z');
const PASSWORD = 'fictional-Passw0rd';

const user: User = {
  id: 'u1',
  email: 'lea@example.com',
  displayName: 'Léa',
  avatarUrl: null,
  age: null,
  city: null,
  bio: null,
  createdAt: NOW,
  updatedAt: NOW,
};

/** Repositories and delivery mocked, the real Argon2id hasher (the property under test). */
function setup() {
  const users = {
    create: vi.fn(),
    findByEmail: vi.fn(),
    findCredentialsByEmail: vi.fn(),
  };
  const sessions = { create: vi.fn(), findValid: vi.fn(), deleteByTokenHash: vi.fn() };
  const resets = { save: vi.fn(), takeAttempt: vi.fn(), complete: vi.fn() };
  const delivery = { send: vi.fn() };
  const hasher = new PasswordHasher();
  const service = new AuthService(
    users as unknown as UserRepository,
    sessions as unknown as AuthSessionRepository,
    resets as unknown as PasswordResetRepository,
    hasher,
    delivery,
    { auth: { sessionTtlDays: 30 } } as AppConfigService,
    { now: () => NOW },
  );
  return { service, users, sessions, resets, delivery, hasher };
}

const code = (error: unknown) => (error instanceof ApiException ? error.code : error);

describe('AuthService', () => {
  describe('register', () => {
    it('stores an Argon2id hash (never the password), a normalized email, and opens a session', async () => {
      const { service, users, sessions, hasher } = setup();
      users.create.mockResolvedValue(user);

      const result = await service.register({
        displayName: '  Léa ',
        email: '  Lea@Example.COM ',
        password: PASSWORD,
      });

      const [profile, credentials] = users.create.mock.calls[0] as [
        { email: string; displayName: string },
        { passwordHash: string },
      ];
      expect(profile).toEqual({ displayName: 'Léa', email: 'lea@example.com' });
      expect(credentials.passwordHash).toMatch(/^\$argon2id\$/);
      expect(JSON.stringify(users.create.mock.calls)).not.toContain(PASSWORD);
      expect(await hasher.verify(credentials.passwordHash, PASSWORD)).toBe(true);

      // The session row holds the token's hash; the token itself is only in the result.
      const [session] = sessions.create.mock.calls[0] as [{ tokenHash: string; expiresAt: Date }];
      expect(session.tokenHash).toBe(hashSessionToken(result.session.token));
      expect(session.expiresAt).toEqual(new Date('2026-10-26T12:00:00.000Z'));
      expect(result.user).toBe(user);
      expect(JSON.stringify(result)).not.toMatch(/argon2|passwordHash/);
    });

    it('an email already used → AUTH_EMAIL_ALREADY_EXISTS, no session', async () => {
      const { service, users, sessions } = setup();
      users.create.mockRejectedValue(new UniqueConstraintError('users_email_key'));

      const error: unknown = await service
        .register({ displayName: 'Léa', email: 'lea@example.com', password: PASSWORD })
        .catch((e: unknown) => e);
      expect(code(error)).toBe('AUTH_EMAIL_ALREADY_EXISTS');
      expect(sessions.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('right password → a session; the email is normalized before the lookup', async () => {
      const { service, users, sessions, hasher } = setup();
      users.findCredentialsByEmail.mockResolvedValue({
        user,
        passwordHash: await hasher.hash(PASSWORD),
      });

      const result = await service.login({ email: ' LEA@example.com', password: PASSWORD });

      expect(users.findCredentialsByEmail).toHaveBeenCalledWith('lea@example.com');
      expect(result.user).toBe(user);
      expect(sessions.create).toHaveBeenCalledOnce();
    });

    it('wrong password, unknown email, account without password → the same AUTH_INVALID_CREDENTIALS', async () => {
      const { service, users, sessions, hasher } = setup();
      const verifyNothing = vi.spyOn(hasher, 'verifyNothing');
      const stored = await hasher.hash(PASSWORD);

      users.findCredentialsByEmail
        .mockResolvedValueOnce({ user, passwordHash: stored })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ user, passwordHash: null });

      const errors = [
        await service.login({ email: user.email, password: 'wrong-Passw0rd' }).catch(code),
        await service.login({ email: 'nobody@example.com', password: PASSWORD }).catch(code),
        await service.login({ email: user.email, password: PASSWORD }).catch(code),
      ];

      expect(errors).toEqual(Array(3).fill('AUTH_INVALID_CREDENTIALS'));
      // No shortcut for a missing account: a verification is spent anyway (timing).
      expect(verifyNothing).toHaveBeenCalledTimes(2);
      expect(sessions.create).not.toHaveBeenCalled();
    });
  });

  it('authenticate and logout look the session up by the token hash, never by the token', async () => {
    const { service, sessions } = setup();
    sessions.findValid.mockResolvedValue(null);

    expect(await service.authenticate('some-token-value-123')).toBeNull();
    await service.logout('some-token-value-123');

    const hash = hashSessionToken('some-token-value-123');
    expect(sessions.findValid).toHaveBeenCalledWith(hash, NOW);
    expect(sessions.deleteByTokenHash).toHaveBeenCalledWith(hash);
  });

  describe('password reset', () => {
    it('unknown email: nothing stored, nothing sent, no error', async () => {
      const { service, users, resets, delivery } = setup();
      users.findByEmail.mockResolvedValue(null);

      await expect(service.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
      expect(resets.save).not.toHaveBeenCalled();
      expect(delivery.send).not.toHaveBeenCalled();
    });

    it('known email: a 6-digit code sent, only its hash stored, valid 15 minutes', async () => {
      const { service, users, resets, delivery, hasher } = setup();
      users.findByEmail.mockResolvedValue(user);

      await service.requestPasswordReset(' Lea@example.com');

      const [email, sent] = delivery.send.mock.calls[0] as [string, string];
      const [saved] = resets.save.mock.calls[0] as [
        { userId: string; codeHash: string; expiresAt: Date },
      ];
      expect(email).toBe(user.email);
      expect(sent).toMatch(/^\d{6}$/);
      expect(saved.codeHash).not.toContain(sent);
      expect(await hasher.verify(saved.codeHash, sent)).toBe(true);
      expect(saved.expiresAt.getTime() - NOW.getTime()).toBe(RESET_CODE_TTL_MS);
    });

    it('verify: a wrong code, no pending code, an unknown email → AUTH_RESET_CODE_INVALID', async () => {
      const { service, users, resets, hasher } = setup();
      users.findByEmail
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null);
      resets.takeAttempt
        .mockResolvedValueOnce(await hasher.hash('123456'))
        .mockResolvedValueOnce(null);

      expect(await service.verifyResetCode(user.email, '654321').catch(code)).toBe(
        'AUTH_RESET_CODE_INVALID',
      );
      expect(await service.verifyResetCode(user.email, '123456').catch(code)).toBe(
        'AUTH_RESET_CODE_INVALID',
      );
      expect(await service.verifyResetCode('x@example.com', '123456').catch(code)).toBe(
        'AUTH_RESET_CODE_INVALID',
      );
      expect(resets.takeAttempt).toHaveBeenCalledWith(user.id, NOW, RESET_CODE_MAX_ATTEMPTS);
    });

    it('reset: the right code → the new password hashed, sessions revoked in the same step', async () => {
      const { service, users, resets, hasher } = setup();
      users.findByEmail.mockResolvedValue(user);
      resets.takeAttempt.mockResolvedValue(await hasher.hash('123456'));

      await service.resetPassword({
        email: user.email,
        code: '123456',
        newPassword: 'new-Passw0rd',
      });

      const [userId, newHash] = resets.complete.mock.calls[0] as [string, string];
      expect(userId).toBe(user.id);
      expect(await hasher.verify(newHash, 'new-Passw0rd')).toBe(true);
    });
  });
});
