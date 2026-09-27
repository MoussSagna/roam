import type { Prisma } from '../generated/prisma/client.js';

/**
 * Transaction-scoped PostgreSQL advisory locks (DATA-6 concurrency): serialize writers that decide "does this record
 * already exist?" on the same key — the same provider record, the same building, the same place name — so that
 * concurrent imports never both create. Released at commit/rollback. Keys are sorted to take locks in one order
 * (no deadlock between two transactions locking the same keys).
 */
export async function lockKeys(tx: Prisma.TransactionClient, keys: string[]): Promise<void> {
  for (const key of [...new Set(keys)].sort()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
}
