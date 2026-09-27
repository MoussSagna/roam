import { persist, UniqueConstraintError } from './persistence-errors.js';
import type { PrismaClient } from '../generated/prisma/client.js';

/**
 * The `Provider` row of an adapter (registered on first use), created outside the import transaction: a failed
 * statement would abort that transaction, and two first imports of a new provider may race on its unique key.
 */
export async function ensureProviderId(
  prisma: Pick<PrismaClient, 'provider'>,
  provider: { key: string; name: string },
): Promise<string> {
  return persist(async () => {
    const existing = await prisma.provider.findUnique({
      where: { key: provider.key },
      select: { id: true },
    });
    if (existing) return existing.id;
    try {
      return (await persist(() => prisma.provider.create({ data: provider, select: { id: true } })))
        .id;
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) throw error;
      const raced = await prisma.provider.findUniqueOrThrow({
        where: { key: provider.key },
        select: { id: true },
      });
      return raced.id;
    }
  });
}
