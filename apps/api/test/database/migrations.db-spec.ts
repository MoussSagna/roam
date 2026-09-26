import { execFileSync } from 'node:child_process';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createTestClient } from './database.js';

/** The database produced by the committed migrations is the schema, with its extra SQL. */
describe('migrations on PostgreSQL', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('are all applied', async () => {
    const rows = await prisma.$queryRaw<{ migration_name: string; finished: boolean }[]>`
      SELECT migration_name, finished_at IS NOT NULL AS finished
      FROM _prisma_migrations WHERE rolled_back_at IS NULL ORDER BY migration_name`;
    expect(rows).toEqual([
      { migration_name: '20260926000000_init', finished: true },
      { migration_name: '20260926002147_check_constraints', finished: true },
      { migration_name: '20260926011137_authentication', finished: true },
    ]);
  });

  it('leave no difference between the database and the Prisma schema', () => {
    // Exit code 2 when there is a difference: Prisma would then want a new migration (or drop our SQL).
    const diff = execFileSync(
      'pnpm',
      [
        'exec',
        'prisma',
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--exit-code',
      ],
      {
        // CHECKPOINT_DISABLE: no network update check from the Prisma CLI (keeps the test offline and fast).
        env: { ...process.env, CHECKPOINT_DISABLE: '1' },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 20_000,
      },
    );
    expect(diff).toMatch(/No difference detected|empty migration/i);
  });

  it('create the documented tables', async () => {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename`;
    expect(tables.map((row) => row.tablename)).toEqual([
      'auth_sessions',
      'categories',
      'events',
      'experience_categories',
      'experience_places',
      'experiences',
      'external_sources',
      'favorites',
      'journey_feedbacks',
      'journey_steps',
      'journeys',
      'password_reset_codes',
      'place_categories',
      'places',
      'providers',
      'roam_enrichments',
      'user_preferences',
      'users',
    ]);
  });

  it('create the enums with their documented values', async () => {
    const enums = await prisma.$queryRaw<{ name: string; labels: string[] }[]>`
      SELECT t.typname::text AS name, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
      FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typnamespace = 'public'::regnamespace GROUP BY t.typname`;
    const byName = Object.fromEntries(enums.map(({ name, labels }) => [name, labels]));

    expect(Object.keys(byName)).toHaveLength(14);
    expect(byName.JourneyStatus).toEqual(['ACTIVE', 'COMPLETED']);
    expect(byName.PriceLevel).toEqual(['FREE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'UNKNOWN']);
    expect(byName.SourceEntityType).toEqual(['PLACE', 'EVENT', 'EXPERIENCE']);
  });

  it('create the CHECK constraints and the partial unique index', async () => {
    const checks = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
      WHERE contype = 'c' AND connamespace = 'public'::regnamespace ORDER BY conname`;
    expect(checks.map((row) => row.conname)).toEqual([
      'external_sources_single_target_check',
      'journey_feedbacks_rating_check',
      'roam_enrichments_single_target_check',
    ]);

    const [index] = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'journeys_one_active_per_user'`;
    expect(index.indexdef).toMatch(/CREATE UNIQUE INDEX .* \("userId"\) WHERE \(status = 'ACTIVE'/);
  });

  it('use the documented delete rules for the main relations', async () => {
    const rules = await prisma.$queryRaw<{ fk: string; rule: string }[]>`
      SELECT conname AS fk, confdeltype::text AS rule FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace`;
    const rule = Object.fromEntries(rules.map(({ fk, rule }) => [fk, rule]));

    // c = CASCADE, r = RESTRICT, n = SET NULL
    expect(rule.journeys_userId_fkey).toBe('c');
    expect(rule.journey_steps_journeyId_fkey).toBe('c');
    expect(rule.journey_steps_experienceId_fkey).toBe('r');
    expect(rule.experience_places_placeId_fkey).toBe('r');
    expect(rule.external_sources_providerId_fkey).toBe('r');
    expect(rule.events_placeId_fkey).toBe('n');
    expect(rule.auth_sessions_userId_fkey).toBe('c');
    expect(rule.password_reset_codes_userId_fkey).toBe('c');
    expect(rules).toHaveLength(25);
  });
});
