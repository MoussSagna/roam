import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../src/generated/prisma/client.js';

/** A Prisma client on the test database (set as DATABASE_URL by setup-env.ts). */
export function createTestClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

/**
 * Empties every table of the test database (the migration history stays). Refuses to run anywhere but in
 * a database whose name ends with `_test` — a second guard after test-database-url.ts.
 */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const [{ name }] = await prisma.$queryRaw<[{ name: string }]>`SELECT current_database() AS name`;
  if (!name.endsWith('_test')) throw new Error(`Refusing to empty "${name}": not a test database`);

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

// ─── Minimal valid records (only the required fields) ─────────────────────────────────────────────

let sequence = 0;
const next = () => ++sequence;

export function createUser(prisma: PrismaClient) {
  const n = next();
  return prisma.user.create({ data: { email: `user${n}@roam.test`, displayName: `User ${n}` } });
}

export function createPlace(prisma: PrismaClient) {
  return prisma.place.create({
    data: { name: `Place ${next()}`, latitude: 48.8566, longitude: 2.3522 },
  });
}

export function createExperience(prisma: PrismaClient) {
  return prisma.experience.create({ data: { title: `Experience ${next()}` } });
}

export function createProvider(prisma: PrismaClient) {
  const n = next();
  return prisma.provider.create({ data: { key: `provider_${n}`, name: `Provider ${n}` } });
}

export function journeyData(userId: string, status: 'ACTIVE' | 'COMPLETED' = 'ACTIVE') {
  return {
    userId,
    status,
    title: 'Balade au Marais',
    mood: 'CALM',
    duration: 'TWO_HOURS',
    budget: 'LOW',
    startKind: 'CURRENT',
    startLabel: 'Ma position',
    startLatitude: 48.8566,
    startLongitude: 2.3522,
    startTime: '14:00',
    endTime: '16:00',
    estimatedDurationMin: 120,
    estimatedBudgetEur: 15,
    totalDistanceM: 1800,
  } as const;
}

export function stepData(experienceId: string, order: number) {
  return {
    experienceId,
    order,
    estimatedArrival: '14:10',
    estimatedDurationMin: 45,
    travelDurationMin: 10,
    travelDistanceM: 700,
    travelMode: 'WALK',
  } as const;
}
