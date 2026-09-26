import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * Database integration tests (`pnpm test:db`): a real PostgreSQL, the dedicated database named by
 * DATABASE_TEST_URL (never the development one). Migrations are applied once before the run; the files
 * share that database, so they run one after the other.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/database/**/*.db-spec.ts'],
    globalSetup: ['./test/database/global-setup.ts'],
    setupFiles: ['./test/database/setup-env.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
