import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client.js';
import { buildCatalogPlan } from './catalog-plan.js';
import { seedCatalog } from './catalog-seed.js';
import { MOBILE_MOCK_CATALOG } from './mobile-mock-catalog.js';

/**
 * `pnpm --filter @roam/api db:seed` (runs `prisma db seed`, which runs this file once built): migrates the mobile
 * mock catalog into the database named by DATABASE_URL — `roam` from `apps/api/.env` by default; another database
 * (`roam_test`) by setting DATABASE_URL in the environment, which wins over the file. Safe to run again.
 */
async function main(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the process environment.
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (see apps/api/.env.example).');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const [{ name }] = await prisma.$queryRaw<
      [{ name: string }]
    >`SELECT current_database() AS name`;
    const plan = buildCatalogPlan(MOBILE_MOCK_CATALOG);
    const result = await seedCatalog(prisma, plan);

    const line = (label: string, c: Record<string, number>) =>
      `  ${label.padEnd(12)} ${Object.entries(c)
        .map(([key, value]) => `${key} ${value}`)
        .join(', ')}`;
    console.log(`DATA-1 catalog migration → database "${name}"`);
    console.log(
      `  plan         ${plan.categories.length} categories, ${plan.places.length} places, ` +
        `${plan.experiences.length} experiences, 0 events, ${plan.notMigrated.length} values not migrated`,
    );
    console.log(line('categories', result.categories));
    console.log(line('places', result.places));
    console.log(line('experiences', result.experiences));
    for (const skipped of result.skipped) {
      console.log(`  skipped ${skipped.entity} "${skipped.mockId}": ${skipped.reason}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // The message only: a driver error can carry connection details.
  console.error(
    `DATA-1 catalog migration failed: ${error instanceof Error ? error.message : 'unknown error'}`,
  );
  process.exitCode = 1;
});
