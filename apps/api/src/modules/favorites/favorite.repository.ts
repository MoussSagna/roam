import { Injectable } from '@nestjs/common';

import { pageArgs, type Page, type PageRequest, toPage } from '../../database/pagination.js';
import { persist, UniqueConstraintError } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Favorite as FavoriteRow } from '../../generated/prisma/client.js';

/** A saved experience (mobile D-57: favorites are experiences). */
export type Favorite = {
  id: string;
  userId: string;
  experienceId: string;
  createdAt: Date;
};

const toFavorite = ({ id, userId, experienceId, createdAt }: FavoriteRow): Favorite => ({
  id,
  userId,
  experienceId,
  createdAt,
});

/**
 * The user's favorites: a set of experiences. `add` and `remove` are idempotent, so a double tap or a retried
 * request never fails and concurrent adds never create a duplicate: the unique `(userId, experienceId)` key does the
 * work. (Prisma runs this upsert as a read then an insert, not as `INSERT … ON CONFLICT`: a concurrent add can lose the
 * insert, and then reads the favorite the other one created — API-10.)
 */
@Injectable()
export class FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Saves the experience (or returns the existing favorite). Unknown user or experience: foreign key error. */
  async add(userId: string, experienceId: string): Promise<Favorite> {
    const where = { userId_experienceId: { userId, experienceId } };
    try {
      return await persist(async () =>
        toFavorite(
          await this.prisma.favorite.upsert({
            where,
            create: { userId, experienceId },
            update: {},
          }),
        ),
      );
    } catch (error) {
      // Saved concurrently between the upsert's read and its insert: the favorite exists — return it.
      if (!(error instanceof UniqueConstraintError)) throw error;
      return persist(async () =>
        toFavorite(await this.prisma.favorite.findUniqueOrThrow({ where })),
      );
    }
  }

  /** `true` when a favorite was removed, `false` when there was none. */
  remove(userId: string, experienceId: string): Promise<boolean> {
    return persist(async () => {
      const { count } = await this.prisma.favorite.deleteMany({ where: { userId, experienceId } });
      return count > 0;
    });
  }

  isFavorite(userId: string, experienceId: string): Promise<boolean> {
    return persist(
      async () => (await this.prisma.favorite.count({ where: { userId, experienceId } })) > 0,
    );
  }

  /** The user's favorites, most recently saved first. */
  listByUserId(userId: string, page?: PageRequest): Promise<Page<Favorite>> {
    return persist(async () => {
      const { limit, args } = pageArgs(page);
      const rows = await this.prisma.favorite.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...args,
      });
      return toPage(rows, limit, toFavorite);
    });
  }
}
