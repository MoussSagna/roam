import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env by itself. Load apps/api/.env when present (local development);
// in CI/production the variables come from the environment.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the process environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Optional for `prisma generate` / `prisma validate` (no database needed); required by the
  // migration commands, which fail with a clear message when DATABASE_URL is missing.
  datasource: { url: process.env.DATABASE_URL },
});
