import { Injectable } from '@nestjs/common';

import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import { toUser, type User } from '../users/user.repository.js';

/** A valid session and its user, as the authentication guard needs them. */
export type AuthenticatedSession = { sessionId: string; user: User };

/**
 * Sessions (AUTHENTICATION.md): one row per signed-in device, found by the SHA-256 hash of its token — the
 * token itself is never stored.
 */
@Injectable()
export class AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(session: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    return persist(async () => {
      await this.prisma.authSession.create({ data: session });
    });
  }

  /** The session and its user in one query; `null` when unknown or expired at `now`. */
  findValid(tokenHash: string, now: Date): Promise<AuthenticatedSession | null> {
    return persist(async () => {
      const row = await this.prisma.authSession.findFirst({
        where: { tokenHash, expiresAt: { gt: now } },
        include: { user: true },
      });
      return row && { sessionId: row.id, user: toUser(row.user) };
    });
  }

  /** Logout: deletes the session if it exists (idempotent). */
  deleteByTokenHash(tokenHash: string): Promise<void> {
    return persist(async () => {
      await this.prisma.authSession.deleteMany({ where: { tokenHash } });
    });
  }
}
