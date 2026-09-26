import { Injectable } from '@nestjs/common';

import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * The pending password reset of each user (AUTHENTICATION.md → "Password reset"): the code's hash, its expiry
 * and the number of attempts. At most one per user.
 */
@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Stores a new code for the user, replacing any previous one (attempts back to 0). */
  save(reset: { userId: string; codeHash: string; expiresAt: Date }): Promise<void> {
    return persist(async () => {
      const { userId, ...fields } = reset;
      await this.prisma.passwordResetCode.upsert({
        where: { userId },
        create: reset,
        update: { ...fields, attempts: 0, createdAt: new Date() },
      });
    });
  }

  /**
   * Counts one attempt, atomically, and returns the code hash to check — or `null` when there is no pending
   * code, it expired, or its attempts are used up. Counting before checking means concurrent guesses can never
   * exceed `maxAttempts`.
   */
  takeAttempt(userId: string, now: Date, maxAttempts: number): Promise<string | null> {
    return persist(async () => {
      const { count } = await this.prisma.passwordResetCode.updateMany({
        where: { userId, expiresAt: { gt: now }, attempts: { lt: maxAttempts } },
        data: { attempts: { increment: 1 } },
      });
      if (count === 0) return null;
      const row = await this.prisma.passwordResetCode.findUnique({
        where: { userId },
        select: { codeHash: true },
      });
      return row?.codeHash ?? null;
    });
  }

  /**
   * Completes a reset in one transaction: the new password hash, every session of the user revoked (a reset
   * usually means the password may be known to someone else), the code deleted.
   */
  complete(userId: string, passwordHash: string): Promise<void> {
    return persist(async () => {
      await this.prisma.$transaction([
        this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
        this.prisma.authSession.deleteMany({ where: { userId } }),
        this.prisma.passwordResetCode.deleteMany({ where: { userId } }),
      ]);
    });
  }
}
