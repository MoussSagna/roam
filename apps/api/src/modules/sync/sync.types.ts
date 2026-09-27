import type { JsonValue } from '../../database/json.js';
import type {
  NormalizedEvent,
  NormalizedPlace,
  ProviderIdentity,
} from '../providers/provider.types.js';

/**
 * The generic synchronization contract (DATA_PERSISTENCE_AND_SYNC.md "Synchronization"). A provider gives **access**
 * (a `SyncJob` reading batches of normalized records); the `SyncService` gives **synchronization** (lease, rate
 * limiting, retries, ingestion, counters, resume, logs). There is no per-provider sync service.
 */

/** Where a reader resumes: provider-specific, JSON, never a URL holding a secret. */
export type SyncCursor = JsonValue;

/** One batch = one provider request (or one chunk of a streamed file). */
export type SyncBatch<T> = {
  items: T[];
  /** Records the provider returned but normalization rejected, by reason (e.g. "no_coordinates": 3). */
  skipped: Record<string, number>;
  /** Position after this batch; `null` when the source is exhausted. */
  cursor: SyncCursor | null;
};

export type SyncReader<T> = {
  /** The next batch, or `null` when done. A failed call may be retried: the reader must not have advanced. */
  next(): Promise<SyncBatch<T> | null>;
  close?(): Promise<void>;
};

export type SyncContext = {
  /** Start of the last successful run of this job — for incremental sources ("updated since"). */
  lastSuccessAt: Date | null;
  now: Date;
  /**
   * Waits for the provider's rate limit (ProviderRateLimiter). A reader calls it right before **each** provider request
   * — a page, a detail call, a file download — and never for work that sends none (reading the rest of a streamed
   * file). Throws `SyncBudgetExhaustedError` when the budget is spent.
   */
  pace: () => Promise<void>;
};

type JobBase = {
  /** Stable job key, e.g. "datatourisme:places:paris". One RUNNING run per provider at a time. */
  key: string;
  provider: ProviderIdentity;
};

export type PlaceSyncJob = JobBase & {
  entity: 'PLACE';
  open(cursor: SyncCursor | null, context: SyncContext): SyncReader<NormalizedPlace>;
};

export type EventSyncJob = JobBase & {
  entity: 'EVENT';
  open(cursor: SyncCursor | null, context: SyncContext): SyncReader<NormalizedEvent>;
};

export type SyncJob = PlaceSyncJob | EventSyncJob;

export type SyncStatus = 'SUCCEEDED' | 'PARTIAL' | 'FAILED';

export type SyncResult = {
  runId: string;
  jobKey: string;
  provider: string;
  status: SyncStatus;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  /** Provider requests (batches) read. */
  batches: number;
  /** Records returned by the provider (normalized + skipped by normalization). */
  fetched: number;
  normalized: number;
  created: number;
  /** New provider records attached to an existing place of another provider (deduplication). */
  matched: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  /** Aggregated reasons: error classes, skip reasons — never payloads or secrets. */
  errors: Record<string, number>;
  /** Why the run stopped before the end, when it did. */
  stoppedBy: string | null;
  /** Resume point after the last completed batch. */
  cursor: SyncCursor | null;
};
