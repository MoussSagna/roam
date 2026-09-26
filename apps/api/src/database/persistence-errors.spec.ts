import {
  CheckConstraintError,
  DatabaseUnavailableError,
  ForeignKeyConstraintError,
  persist,
  RecordNotFoundError,
  toPersistenceError,
  UniqueConstraintError,
} from './persistence-errors.js';

/** Shapes of the errors Prisma 7 + @prisma/adapter-pg raise on PostgreSQL 18 (observed on roam_test). */
function prismaError(code: string, cause?: object, modelName?: string) {
  return Object.assign(new Error(`Prisma error ${code} (host db.internal, row lea@roam.test)`), {
    name: 'PrismaClientKnownRequestError',
    code,
    meta: { modelName, ...(cause ? { driverAdapterError: { cause } } : {}) },
  });
}

describe('toPersistenceError', () => {
  it('unique violation (P2002) → UniqueConstraintError with the constraint name', () => {
    const error = toPersistenceError(
      prismaError('P2002', {
        kind: 'UniqueConstraintViolation',
        originalCode: '23505',
        constraint: { index: 'journeys_one_active_per_user' },
      }),
    );
    expect(error).toBeInstanceOf(UniqueConstraintError);
    expect(error).toMatchObject({ constraint: 'journeys_one_active_per_user' });
  });

  it('foreign key (P2003): missing reference vs. restricted delete', () => {
    expect(
      toPersistenceError(
        prismaError('P2003', {
          kind: 'ForeignKeyConstraintViolation',
          originalCode: '23503',
          constraint: { index: 'favorites_experienceId_fkey' },
        }),
      ),
    ).toMatchObject({ reason: 'missingReference', constraint: 'favorites_experienceId_fkey' });

    const restricted = toPersistenceError(
      prismaError('P2003', {
        kind: 'RestrictViolation',
        originalCode: '23001',
        constraint: { index: 'experience_places_placeId_fkey' },
      }),
    );
    expect(restricted).toBeInstanceOf(ForeignKeyConstraintError);
    expect(restricted).toMatchObject({ reason: 'referenced' });
  });

  it('record not found (P2025) → RecordNotFoundError with the model', () => {
    const error = toPersistenceError(prismaError('P2025', undefined, 'User'));
    expect(error).toBeInstanceOf(RecordNotFoundError);
    expect(error).toMatchObject({ model: 'User' });
  });

  it('CHECK violation (23514) → CheckConstraintError, keeping only the constraint name', () => {
    const error = toPersistenceError(
      prismaError('P2039', {
        kind: 'postgres',
        originalCode: '23514',
        originalMessage:
          'new row for relation "journey_feedbacks" violates check constraint "journey_feedbacks_rating_check"',
        detail: 'Failing row contains (lea@roam.test, 9).',
      }),
    );
    expect(error).toBeInstanceOf(CheckConstraintError);
    expect(error).toMatchObject({ constraint: 'journey_feedbacks_rating_check' });
    expect(JSON.stringify(error) + String(error)).not.toContain('lea@roam.test');
  });

  it('unreachable database (P1001, driver kind, initialization error) → DatabaseUnavailableError', () => {
    expect(toPersistenceError(prismaError('P1001'))).toBeInstanceOf(DatabaseUnavailableError);
    expect(
      toPersistenceError(prismaError('P2010', { kind: 'DatabaseNotReachable', host: 'db' })),
    ).toBeInstanceOf(DatabaseUnavailableError);
    expect(
      toPersistenceError(
        Object.assign(new Error('init'), { name: 'PrismaClientInitializationError' }),
      ),
    ).toBeInstanceOf(DatabaseUnavailableError);
  });

  it('never carries the driver message (host, row data)', () => {
    for (const code of ['P1001', 'P2002', 'P2003', 'P2025']) {
      const error = toPersistenceError(prismaError(code)) as Error;
      expect(error.message).not.toMatch(/db\.internal|lea@roam\.test/);
      expect(error.cause).toBeUndefined();
    }
  });

  it('leaves anything else unchanged (bugs, other Prisma errors)', () => {
    const bug = new TypeError('x is undefined');
    const other = prismaError('P2023');
    expect(toPersistenceError(bug)).toBe(bug);
    expect(toPersistenceError(other)).toBe(other);
    expect(toPersistenceError('text')).toBe('text');
  });

  it('persist() rethrows translated errors and passes results through', async () => {
    await expect(persist(() => Promise.resolve(42))).resolves.toBe(42);
    await expect(persist(() => Promise.reject(prismaError('P2025')))).rejects.toBeInstanceOf(
      RecordNotFoundError,
    );
  });
});
