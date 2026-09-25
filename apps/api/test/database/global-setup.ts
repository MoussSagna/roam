import { execFileSync } from 'node:child_process';

import { redact, testDatabaseUrl } from './test-database-url.js';

/** Brings the test database to the committed migrations (`prisma migrate deploy`: applies, never resets). */
export default function setup(): void {
  const url = testDatabaseUrl();
  try {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: '1' },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
    });
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    throw new Error(
      `prisma migrate deploy failed on the test database:\n${redact(stdout + stderr)}`,
    );
  }
}
