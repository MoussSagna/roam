/**
 * The errors a repository may throw, in place of Prisma's own (apps/api/apidocs/REPOSITORY_ARCHITECTURE.md →
 * "Errors"). Services catch them by class and answer in their domain terms; whatever reaches the global
 * error filter is mapped to a generic HTTP error.
 *
 * Messages are fixed strings: never the SQL, the driver message, the host or the row data (a PostgreSQL
 * CHECK violation carries the whole failing row). The original error is deliberately not kept as `cause`.
 */
export abstract class PersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** An update or delete targeted a record that does not exist (or a nested connect found nothing). */
export class RecordNotFoundError extends PersistenceError {
  constructor(readonly model?: string) {
    super('Record not found');
  }
}

/** A unique constraint or unique index refused the write. */
export class UniqueConstraintError extends PersistenceError {
  constructor(readonly constraint?: string) {
    super('Unique constraint violated');
  }
}

/**
 * A foreign key refused the write: the referenced record does not exist (`missingReference`), or the record
 * is still referenced and its deletion is restricted (`referenced`).
 */
export class ForeignKeyConstraintError extends PersistenceError {
  constructor(
    readonly reason: 'missingReference' | 'referenced',
    readonly constraint?: string,
  ) {
    super('Foreign key constraint violated');
  }
}

/** A CHECK constraint refused the write (data integrity rule of the schema). */
export class CheckConstraintError extends PersistenceError {
  constructor(readonly constraint?: string) {
    super('Check constraint violated');
  }
}

/** PostgreSQL cannot be reached (down, refused, timed out, pool closed). */
export class DatabaseUnavailableError extends PersistenceError {
  constructor() {
    super('Database unavailable');
  }
}

/** A pagination cursor that is not a record id. */
export class InvalidCursorError extends PersistenceError {
  constructor() {
    super('Invalid pagination cursor');
  }
}

type PrismaLikeError = {
  name?: unknown;
  code?: unknown;
  meta?: {
    modelName?: unknown;
    driverAdapterError?: {
      cause?: {
        kind?: unknown;
        originalCode?: unknown;
        originalMessage?: unknown;
        constraint?: { index?: unknown };
      };
    };
  };
};

/** Prisma codes meaning "the database cannot be reached" (P1001–P1002 connect, P1008 timeout, P1017 closed). */
const UNAVAILABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

const text = (value: unknown) => (typeof value === 'string' ? value : undefined);

/**
 * Translates an error thrown by Prisma (recognized by shape: no dependency on the generated client) into a
 * `PersistenceError`. Anything else — a bug, an unexpected database error — is returned unchanged, and ends
 * as a generic 500.
 */
export function toPersistenceError(error: unknown): unknown {
  if (error instanceof PersistenceError || typeof error !== 'object' || error === null)
    return error;
  const { name, code, meta } = error as PrismaLikeError;
  if (typeof name !== 'string' || !name.startsWith('PrismaClient')) return error;

  const cause = meta?.driverAdapterError?.cause;
  const constraint = text(cause?.constraint?.index);

  if (
    name === 'PrismaClientInitializationError' ||
    (typeof code === 'string' && UNAVAILABLE_CODES.has(code)) ||
    cause?.kind === 'DatabaseNotReachable'
  ) {
    return new DatabaseUnavailableError();
  }
  switch (code) {
    case 'P2002':
      return new UniqueConstraintError(constraint);
    case 'P2003':
      return new ForeignKeyConstraintError(
        cause?.kind === 'RestrictViolation' || cause?.originalCode === '23001'
          ? 'referenced'
          : 'missingReference',
        constraint,
      );
    case 'P2025':
      return new RecordNotFoundError(text(meta?.modelName));
  }
  if (cause?.originalCode === '23514') {
    // Only the constraint name is kept from the message, never the failing row.
    const name = /check constraint "([^"]+)"/.exec(text(cause.originalMessage) ?? '')?.[1];
    return new CheckConstraintError(name);
  }
  return error;
}

/**
 * Runs a repository operation and translates its Prisma errors. Every public repository method goes through
 * it, so no Prisma error leaves the repository layer.
 */
export async function persist<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toPersistenceError(error);
  }
}
