import { Injectable } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { UniqueConstraintError } from '../../database/persistence-errors.js';
import { type User, UserRepository } from '../users/user.repository.js';
import { type AuthenticatedSession, AuthSessionRepository } from './auth-session.repository.js';
import { authErrors } from './auth.errors.js';
import { PasswordHasher } from './password-hasher.js';
import { PasswordResetDelivery } from './password-reset-delivery.js';
import { PasswordResetRepository } from './password-reset.repository.js';
import { generateResetCode, generateSessionToken, hashSessionToken } from './session-token.js';

/** A reset code lives 15 minutes and allows 5 attempts (verify and reset both count). */
export const RESET_CODE_TTL_MS = 15 * 60 * 1000;
export const RESET_CODE_MAX_ATTEMPTS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/** What register and login return: the user and a new session. The token is shown once, here. */
export type SignedIn = { user: User; session: { token: string; expiresAt: Date } };

/** Emails are compared normalized: trimmed, lower case (AUTHENTICATION.md → "Email"). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Authentication use cases (AUTHENTICATION.md): register, login, session check, logout, password reset. Talks to
 * repositories only; the controller maps its results to HTTP. Secrets (passwords, tokens, codes) are never
 * logged, returned (except the new session token) or put in an error.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: AuthSessionRepository,
    private readonly resets: PasswordResetRepository,
    private readonly hasher: PasswordHasher,
    private readonly delivery: PasswordResetDelivery,
    private readonly config: AppConfigService,
    private readonly clock: Clock,
  ) {}

  /** Creates the account and signs it in (the mobile Register screen lands on Home). */
  async register(input: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<SignedIn> {
    const passwordHash = await this.hasher.hash(input.password);
    let user: User;
    try {
      user = await this.users.create(
        { displayName: input.displayName.trim(), email: normalizeEmail(input.email) },
        { passwordHash },
      );
    } catch (error) {
      // The unique email index decides, also between two concurrent registrations.
      if (error instanceof UniqueConstraintError) throw authErrors.emailAlreadyExists();
      throw error;
    }
    return this.openSession(user);
  }

  /** One query for the user and its hash, one insert for the session. */
  async login(input: { email: string; password: string }): Promise<SignedIn> {
    const credentials = await this.users.findCredentialsByEmail(normalizeEmail(input.email));
    const valid = credentials?.passwordHash
      ? await this.hasher.verify(credentials.passwordHash, input.password)
      : await this.hasher.verifyNothing(input.password);
    if (!credentials || !valid) throw authErrors.invalidCredentials();
    return this.openSession(credentials.user);
  }

  /** The session behind a bearer token, or `null` (unknown, expired, revoked). */
  authenticate(token: string): Promise<AuthenticatedSession | null> {
    return this.sessions.findValid(hashSessionToken(token), this.clock.now());
  }

  /** Revokes the session of this token. Idempotent: an unknown token is not an error. */
  logout(token: string): Promise<void> {
    return this.sessions.deleteByTokenHash(hashSessionToken(token));
  }

  /**
   * Starts a reset: a new code for the account, sent through the delivery channel. Same outcome and similar
   * work whether the email exists or not (no account enumeration): the code is always generated and hashed.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const code = generateResetCode();
    const codeHash = await this.hasher.hash(code);
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user) return;
    await this.resets.save({
      userId: user.id,
      codeHash,
      expiresAt: new Date(this.clock.now().getTime() + RESET_CODE_TTL_MS),
    });
    await this.delivery.send(user.email, code);
  }

  /** The "Reset code" screen: checks the code without using it up (it still counts as an attempt). */
  async verifyResetCode(email: string, code: string): Promise<void> {
    await this.checkResetCode(email, code);
  }

  /** The "New password" screen: sets the password, revokes every session, deletes the code. */
  async resetPassword(input: { email: string; code: string; newPassword: string }): Promise<void> {
    const user = await this.checkResetCode(input.email, input.code);
    await this.resets.complete(user.id, await this.hasher.hash(input.newPassword));
  }

  private async checkResetCode(email: string, code: string): Promise<User> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    const codeHash = user
      ? await this.resets.takeAttempt(user.id, this.clock.now(), RESET_CODE_MAX_ATTEMPTS)
      : null;
    const valid = codeHash
      ? await this.hasher.verify(codeHash, code)
      : await this.hasher.verifyNothing(code);
    if (!user || !valid) throw authErrors.resetCodeInvalid();
    return user;
  }

  private async openSession(user: User): Promise<SignedIn> {
    const token = generateSessionToken();
    const expiresAt = new Date(
      this.clock.now().getTime() + this.config.auth.sessionTtlDays * DAY_MS,
    );
    await this.sessions.create({ userId: user.id, tokenHash: hashSessionToken(token), expiresAt });
    return { user, session: { token, expiresAt } };
  }
}
