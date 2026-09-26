import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    // Tests never need PostgreSQL: they set their own environment and mock the database.
    setupFiles: ['./test/setup-env.ts'],
  },
});
