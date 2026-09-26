import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Test } from '@nestjs/testing';

import { AppModule } from '../app.module.js';
import * as Enums from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { HealthController } from '../modules/health/health.controller.js';
import { PrismaService } from './prisma.service.js';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * What can be checked about the data model without PostgreSQL: the generated client (models, enums,
 * constraints through its types) and the committed migrations. Their behavior on a real database is
 * tested by `pnpm test:db` (test/database/, apps/api/apidocs/DATABASE_SCHEMA.md → "Tests").
 */
describe('ROAM data model (API-03)', () => {
  it('defines exactly the documented models', () => {
    expect(Object.keys(Prisma.ModelName).sort()).toEqual(
      [
        'AuthSession',
        'Category',
        'Event',
        'Experience',
        'ExperienceCategory',
        'ExperiencePlace',
        'ExternalSource',
        'Favorite',
        'Journey',
        'JourneyFeedback',
        'JourneyStep',
        'Place',
        'PasswordResetCode',
        'PlaceCategory',
        'Provider',
        'RoamEnrichment',
        'User',
        'UserPreference',
      ].sort(),
    );
  });

  it('leaves out what is deferred (not specified enough, or superseded)', () => {
    for (const deferred of [
      'Itinerary',
      'ItineraryStep',
      'Recommendation',
      'Feedback',
      'FeedbackReason',
    ]) {
      expect(Prisma.ModelName).not.toHaveProperty(deferred);
    }
  });

  it('uses the documented vocabularies', () => {
    // EXPERIENCE.md "Suggested enums", NORMALIZATION_AND_ENRICHMENT.md
    expect(Object.values(Enums.PriceLevel)).toEqual([
      'FREE',
      'LOW',
      'MEDIUM',
      'HIGH',
      'VERY_HIGH',
      'UNKNOWN',
    ]);
    expect(Object.values(Enums.EnergyLevel)).toEqual(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN']);
    expect(Object.values(Enums.Audience)).toEqual([
      'SOLO',
      'COUPLE',
      'FRIENDS',
      'FAMILY',
      'GROUP',
      'UNKNOWN',
    ]);
    expect(Object.values(Enums.Moment)).toEqual([
      'MORNING',
      'AFTERNOON',
      'EVENING',
      'NIGHT',
      'ANYTIME',
    ]);
    // MVP_SCOPE.md §2–3 (mobile BudgetRange, Company)
    expect(Object.values(Enums.BudgetRange)).toEqual([
      'FREE',
      'UNDER_10',
      'FROM_10_TO_25',
      'FROM_25_TO_50',
      'OVER_50',
    ]);
    expect(Object.values(Enums.Company)).toEqual(['ALONE', 'COUPLE', 'FRIENDS', 'FAMILY']);
    // JOURNEY.md (mobile journey types)
    expect(Object.values(Enums.JourneyStatus)).toEqual(['ACTIVE', 'COMPLETED']);
    expect(Object.values(Enums.JourneyMood)).toEqual([
      'CALM',
      'DISCOVER',
      'FOOD',
      'CULTURE',
      'ENERGETIC',
      'ROMANTIC',
      'FESTIVE',
    ]);
    expect(Object.values(Enums.JourneyDuration)).toEqual([
      'ONE_HOUR',
      'TWO_HOURS',
      'THREE_HOURS',
      'HALF_DAY',
      'DAY',
    ]);
    expect(Object.values(Enums.JourneyBudget)).toEqual(['FREE', 'LOW', 'MEDIUM', 'HIGH']);
    expect(Object.values(Enums.JourneyStartKind)).toEqual([
      'CURRENT',
      'PLACE',
      'ADDRESS',
      'EXPERIENCE',
    ]);
    expect(Object.values(Enums.TravelMode)).toEqual(['WALK', 'METRO']);
  });

  it('a draft journey is never saved: no DRAFT status in the database', () => {
    expect(Object.values(Enums.JourneyStatus)).not.toContain('DRAFT');
  });

  it('declares the uniqueness rules (checked by the TypeScript compiler through the client types)', () => {
    expectTypeOf<Prisma.FavoriteWhereUniqueInput>().toHaveProperty('userId_experienceId');
    expectTypeOf<Prisma.JourneyStepWhereUniqueInput>().toHaveProperty('journeyId_order');
    expectTypeOf<Prisma.JourneyStepWhereUniqueInput>().toHaveProperty('journeyId_experienceId');
    expectTypeOf<Prisma.JourneyFeedbackWhereUniqueInput>().toHaveProperty('journeyId');
    expectTypeOf<Prisma.ExternalSourceWhereUniqueInput>().toHaveProperty(
      'providerId_entityType_externalId',
    );
    expectTypeOf<Prisma.ExperiencePlaceWhereUniqueInput>().toHaveProperty('experienceId_position');
    expectTypeOf<Prisma.RoamEnrichmentWhereUniqueInput>().toHaveProperty('experienceId');
    expectTypeOf<Prisma.RoamEnrichmentWhereUniqueInput>().toHaveProperty('placeId');
    expectTypeOf<Prisma.UserWhereUniqueInput>().toHaveProperty('email');
    expectTypeOf<Prisma.ProviderWhereUniqueInput>().toHaveProperty('key');
    // Partial unique index "one ACTIVE journey per user": looked up with its status.
    expectTypeOf<Prisma.JourneyWhereUniqueInput>().toHaveProperty('userId');
  });

  const migrationsDir = join(apiRoot, 'prisma', 'migrations');
  const migrations = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  it('commits the migrations in order: init, CHECK constraints, authentication', () => {
    expect(migrations).toEqual([
      '20260926000000_init',
      '20260926002147_check_constraints',
      '20260926011137_authentication',
    ]);

    const checks = readFileSync(join(migrationsDir, migrations[1], 'migration.sql'), 'utf8');
    for (const name of [
      'journey_feedbacks_rating_check',
      'external_sources_single_target_check',
      'roam_enrichments_single_target_check',
    ]) {
      expect(checks).toContain(`ADD CONSTRAINT "${name}" CHECK`);
    }
  });

  it('every table of the schema is created by a committed migration', () => {
    // Exact equality (no drift) needs a database: test/database/migrations.db-spec.ts runs
    // `prisma migrate diff --from-config-datasource --to-schema --exit-code` after `migrate deploy`.
    const schema = readFileSync(join(apiRoot, 'prisma', 'schema.prisma'), 'utf8');
    const tables = [...schema.matchAll(/@@map\("([a-z_]+)"\)/g)].map((match) => match[1]).sort();
    const created = migrations
      .flatMap((name) => [
        ...readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf8').matchAll(
          /CREATE TABLE "([a-z_]+)"/g,
        ),
      ])
      .map((match) => match[1])
      .sort();

    expect(tables).toHaveLength(18);
    expect(created).toEqual(tables);
  });

  it('keeps a single PrismaService shared by every module', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    const fromRoot = moduleRef.get(PrismaService);
    const fromHealth = moduleRef.get(HealthController)['prisma'];
    expect(fromHealth).toBe(fromRoot);

    await moduleRef.close();
  });
});
