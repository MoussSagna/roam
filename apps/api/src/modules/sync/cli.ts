import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module.js';
import { SyncJobs } from './sync-jobs.js';
import { SyncService } from './sync.service.js';

/**
 * `pnpm --filter @roam/api sync <job> [--resume] [--max-batches N]` — runs one named sync job against the database of
 * DATABASE_URL (apps/api/.env by default) and prints its result. `pnpm … sync --list` lists the jobs. Nothing is
 * scheduled: DATA-6 provides the runs, their scheduling is an operations decision (DATA_PERSISTENCE_AND_SYNC.md).
 */
async function main(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the process environment.
  }
  const args = process.argv.slice(2);
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const jobs = app.get(SyncJobs);
    const name = args.find((arg) => !arg.startsWith('--'));
    if (!name || args.includes('--list')) {
      console.log(jobs.names().join('\n'));
      return;
    }
    const maxIndex = args.indexOf('--max-batches');
    const maxBatches = maxIndex >= 0 ? Number(args[maxIndex + 1]) : undefined;
    if (maxBatches !== undefined && !(Number.isInteger(maxBatches) && maxBatches > 0))
      throw new RangeError('--max-batches must be a positive integer');
    const result = await app.get(SyncService).run(jobs.get(name), {
      resume: args.includes('--resume'),
      maxBatches,
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'FAILED') process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  // The message only: errors here are typed provider/persistence errors, never carrying secrets.
  new Logger('sync').error(error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
