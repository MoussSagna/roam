import { Injectable, Logger } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { DatabaseUnavailableError } from '../../database/persistence-errors.js';
import { CategoryRepository } from '../catalog/category.repository.js';
import {
  EventIngestionService,
  InvalidProviderRecordError,
} from '../providers/event-ingestion.service.js';
import { PlaceIngestionService } from '../providers/place-ingestion.service.js';
import { ProviderRateLimitError } from '../providers/provider.errors.js';
import type { NormalizedEvent, NormalizedPlace } from '../providers/provider.types.js';
import { ProviderRateLimiter } from './provider-rate-limiter.js';
import { withRetry } from './retry.js';
import { Sleeper } from './sleeper.js';
import { SyncRunRepository } from './sync-run.repository.js';
import type { SyncCursor, SyncJob, SyncReader, SyncResult, SyncStatus } from './sync.types.js';

export type SyncOptions = {
  /** Continue from the cursor of the job's last unfinished run (PARTIAL/FAILED). */
  resume?: boolean;
  /** Stop (PARTIAL, resumable) after this many batches — keeps a manual or real-provider run small. */
  maxBatches?: number;
};

/**
 * The synchronization orchestrator (DATA_PERSISTENCE_AND_SYNC.md "Synchronization"), the same for every provider:
 *
 * lease (one run per provider) → for each batch: pace (ProviderRateLimiter) → read with retries (transient errors
 * only) → ingest item by item (each atomic: one bad item never loses the others) → save counters and cursor → close
 * the run with its status, counters and aggregated error reasons.
 *
 * Statuses: SUCCEEDED (read to the end, no failed item), PARTIAL (read to the end with failed items, or stopped after
 * some progress — resumable from the saved cursor), FAILED (stopped before any batch). A provider asking to slow down
 * (429) or a spent budget stops the run; it is never hammered. Logs carry the job, provider, counters and error
 * classes — never a key, a URL, a payload or personal data.
 */
@Injectable()
export class SyncService {
  /** A run not heard from for this long is considered crashed and may be taken over. */
  static readonly LEASE_MS = 10 * 60_000;

  private readonly logger = new Logger('SyncService');

  constructor(
    private readonly runs: SyncRunRepository,
    private readonly places: PlaceIngestionService,
    private readonly events: EventIngestionService,
    private readonly categories: CategoryRepository,
    private readonly limiter: ProviderRateLimiter,
    private readonly sleeper: Sleeper,
    private readonly clock: Clock,
  ) {}

  async run(job: SyncJob, options: SyncOptions = {}): Promise<SyncResult> {
    const provider = job.provider.key;
    const startedAt = this.clock.now();
    const { id: runId } = await this.runs.acquire({
      jobKey: job.key,
      providerKey: provider,
      now: startedAt,
      leaseUntil: this.leaseFrom(startedAt),
    });

    const counters = { fetched: 0, created: 0, updated: 0, unchanged: 0, skipped: 0, failed: 0 };
    let matched = 0;
    let normalized = 0;
    let batches = 0;
    /** Batches whose items were ingested and cursor saved: the progress a stopped run keeps. */
    let committed = 0;
    const errors: Record<string, number> = {};
    const count = (reason: string, by = 1) => (errors[reason] = (errors[reason] ?? 0) + by);
    let cursor: SyncCursor | null = null;
    let completed = false;
    let stoppedBy: string | null = null;
    let reader: SyncReader<NormalizedPlace | NormalizedEvent> | undefined;

    this.logger.log(`sync ${job.key} (${provider}) started${options.resume ? ', resuming' : ''}`);
    try {
      cursor = options.resume ? await this.runs.resumeCursor(job.key) : null;
      const context = {
        lastSuccessAt: await this.runs.lastSuccessAt(job.key),
        now: startedAt,
        // Readers call it right before each real provider request (a streamed file is one request, not one per batch).
        pace: () => this.limiter.acquire(provider),
      };
      reader = job.open(cursor, context);
      const known = new Set((await this.categories.list()).map(({ slug }) => slug));

      for (;;) {
        if (options.maxBatches !== undefined && batches >= options.maxBatches) {
          stoppedBy = 'max_batches';
          break;
        }
        const current = reader;
        const batch = await withRetry(
          () => current.next(),
          (ms) => this.sleeper.sleep(ms),
          (error) => count(`retried:${(error as Error).name}`),
        );
        if (!batch) {
          completed = true;
          break;
        }
        batches += 1;
        const skippedByProvider = Object.values(batch.skipped).reduce((sum, n) => sum + n, 0);
        counters.fetched += batch.items.length + skippedByProvider;
        counters.skipped += skippedByProvider;
        normalized += batch.items.length;
        for (const [reason, n] of Object.entries(batch.skipped)) count(`skipped:${reason}`, n);

        for (const item of batch.items) {
          try {
            const outcome =
              job.entity === 'PLACE'
                ? (await this.places.upsert(job.provider, item as NormalizedPlace, known)).outcome
                : (await this.events.upsert(job.provider, item as NormalizedEvent, known)).outcome;
            if (outcome === 'matched') matched += 1;
            else counters[outcome] += 1;
          } catch (error) {
            // The database itself is gone: every next item would fail too.
            if (error instanceof DatabaseUnavailableError) throw error;
            if (error instanceof InvalidProviderRecordError) {
              counters.skipped += 1;
              count(`skipped:${error.reason}`);
            } else {
              counters.failed += 1;
              count(`failed:${(error as Error).name}`);
            }
          }
        }
        cursor = batch.cursor;
        await this.runs.progress(runId, {
          ...counters,
          created: counters.created + matched,
          cursor,
          leaseUntil: this.leaseFrom(this.clock.now()),
        });
        committed += 1;
      }
    } catch (error) {
      stoppedBy = (error as Error).name;
      count(`stopped:${stoppedBy}`);
      if (error instanceof ProviderRateLimitError && error.retryAfterSeconds !== undefined)
        this.logger.warn(
          `sync ${job.key}: ${provider} asked to retry after ${error.retryAfterSeconds} s`,
        );
    } finally {
      await reader?.close?.().catch(() => undefined);
    }

    const status: SyncStatus =
      completed && counters.failed === 0
        ? 'SUCCEEDED'
        : completed || committed > 0
          ? 'PARTIAL'
          : 'FAILED';
    const finishedAt = this.clock.now();
    const finalCursor = completed ? null : cursor;
    await this.runs.finish(runId, {
      ...counters,
      created: counters.created + matched,
      status,
      finishedAt,
      cursor: finalCursor,
      errors,
    });

    const result: SyncResult = {
      runId,
      jobKey: job.key,
      provider,
      status,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      batches,
      fetched: counters.fetched,
      normalized,
      created: counters.created,
      matched,
      updated: counters.updated,
      unchanged: counters.unchanged,
      skipped: counters.skipped,
      failed: counters.failed,
      errors,
      stoppedBy,
      cursor: finalCursor,
    };
    this.log(result);
    return result;
  }

  private leaseFrom(now: Date): Date {
    return new Date(now.getTime() + SyncService.LEASE_MS);
  }

  private log(result: SyncResult) {
    const reasons = Object.entries(result.errors)
      .map(([reason, n]) => `${reason}=${n}`)
      .join(', ');
    const line =
      `sync ${result.jobKey} (${result.provider}) ${result.status} in ${result.durationMs} ms: ` +
      `${result.batches} batches, ${result.fetched} fetched, ${result.normalized} normalized, ` +
      `${result.created} created, ${result.matched} matched, ${result.updated} updated, ` +
      `${result.unchanged} unchanged, ${result.skipped} skipped, ${result.failed} failed` +
      (result.stoppedBy ? `, stopped by ${result.stoppedBy}` : '') +
      (reasons ? ` [${reasons}]` : '');
    if (result.status === 'SUCCEEDED') this.logger.log(line);
    else this.logger.warn(line);
  }
}
