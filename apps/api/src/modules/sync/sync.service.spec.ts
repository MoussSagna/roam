import { Logger } from '@nestjs/common';

import {
  DatabaseUnavailableError,
  UniqueConstraintError,
} from '../../database/persistence-errors.js';
import type { CategoryRepository } from '../catalog/category.repository.js';
import {
  type EventIngestionService,
  InvalidProviderRecordError,
} from '../providers/event-ingestion.service.js';
import type { PlaceIngestionService } from '../providers/place-ingestion.service.js';
import {
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderResponseError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../providers/provider.errors.js';
import type { NormalizedPlace } from '../providers/provider.types.js';
import { type ProviderRateLimiter, SyncBudgetExhaustedError } from './provider-rate-limiter.js';
import type { SyncRunRepository } from './sync-run.repository.js';
import { SyncService } from './sync.service.js';
import type { PlaceSyncJob, SyncBatch } from './sync.types.js';

const NOW = new Date('2026-09-27T10:00:00Z');
const PROVIDER = { key: 'datatourisme', name: 'DATAtourisme' };
const place = (id: string) => ({ source: { externalId: id } }) as unknown as NormalizedPlace;

/** A job whose reader returns the given steps in order (a batch, or an error to throw). */
function job(steps: (SyncBatch<NormalizedPlace> | Error)[], opened: unknown[] = []): PlaceSyncJob {
  return {
    key: 'datatourisme:places:test',
    provider: PROVIDER,
    entity: 'PLACE',
    open: (cursor, context) => {
      opened.push(cursor);
      let index = 0;
      return {
        // Like a real reader: paced right before each provider request.
        next: vi.fn(async () => {
          await context.pace();
          const step = steps[index];
          if (step === undefined) return null;
          index += 1;
          if (step instanceof Error) throw step;
          return step;
        }),
        close: vi.fn(() => Promise.resolve()),
      };
    },
  };
}

function setup() {
  const runs = {
    acquire: vi.fn().mockResolvedValue({ id: 'run-1' }),
    progress: vi.fn().mockResolvedValue(undefined),
    finish: vi.fn().mockResolvedValue(undefined),
    lastSuccessAt: vi.fn().mockResolvedValue(null),
    resumeCursor: vi.fn().mockResolvedValue(null),
  };
  const places = {
    upsert: vi.fn(() => Promise.resolve({ place: {}, outcome: 'created' as const })),
  };
  const events = { upsert: vi.fn() };
  const categories = { list: vi.fn().mockResolvedValue([{ slug: 'culture' }]) };
  const limiter = { acquire: vi.fn().mockResolvedValue(undefined) };
  const sleeper = { sleep: vi.fn().mockResolvedValue(undefined) };
  const service = new SyncService(
    runs as unknown as SyncRunRepository,
    places as unknown as PlaceIngestionService,
    events as unknown as EventIngestionService,
    categories as unknown as CategoryRepository,
    limiter as unknown as ProviderRateLimiter,
    sleeper,
    { now: () => NOW },
  );
  return { runs, places, limiter, sleeper, service };
}

const batch = (ids: string[], cursor: unknown = null, skipped: Record<string, number> = {}) =>
  ({ items: ids.map(place), skipped, cursor }) as SyncBatch<NormalizedPlace>;

describe('SyncService (generic orchestrator; repositories and ingestion mocked)', () => {
  let logs: string[];
  beforeEach(() => {
    logs = [];
    for (const level of ['log', 'warn'] as const)
      vi.spyOn(Logger.prototype, level).mockImplementation(
        (message: unknown) => void logs.push(String(message)),
      );
  });
  afterEach(() => vi.restoreAllMocks());

  it('success: every batch paced, ingested, its cursor saved; SUCCEEDED with counters by outcome', async () => {
    const { service, runs, places, limiter } = setup();
    places.upsert
      .mockResolvedValueOnce({ place: {}, outcome: 'created' })
      .mockResolvedValueOnce({ place: {}, outcome: 'matched' } as never)
      .mockResolvedValueOnce({ place: {}, outcome: 'unchanged' } as never);

    const result = await service.run(
      job([batch(['a', 'b'], '/v1/p?page=2', { no_name: 1 }), batch(['c'])]),
    );

    expect(result).toMatchObject({
      status: 'SUCCEEDED',
      provider: 'datatourisme',
      batches: 2,
      fetched: 4,
      normalized: 3,
      created: 1,
      matched: 1,
      unchanged: 1,
      skipped: 1,
      failed: 0,
      errors: { 'skipped:no_name': 1 },
      stoppedBy: null,
      cursor: null,
    });
    expect(limiter.acquire).toHaveBeenCalledTimes(3); // two batches + the final empty read
    expect(runs.progress).toHaveBeenNthCalledWith(
      1,
      'run-1',
      expect.objectContaining({ cursor: '/v1/p?page=2' }),
    );
    expect(runs.finish).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'SUCCEEDED', cursor: null }),
    );
    expect(logs.some((line) => line.includes('SUCCEEDED'))).toBe(true);
  });

  it('partial success: one failing item does not lose the others; invalid records are skipped, not failed', async () => {
    const { service, places } = setup();
    places.upsert
      .mockResolvedValueOnce({ place: {}, outcome: 'created' })
      .mockRejectedValueOnce(new UniqueConstraintError())
      .mockRejectedValueOnce(new InvalidProviderRecordError('end before start'))
      .mockResolvedValueOnce({ place: {}, outcome: 'created' });

    const result = await service.run(job([batch(['a', 'b', 'c', 'd'])]));
    expect(result).toMatchObject({
      status: 'PARTIAL',
      created: 2,
      failed: 1,
      skipped: 1,
      errors: { 'failed:UniqueConstraintError': 1, 'skipped:end before start': 1 },
    });
  });

  it('timeout and 5xx are retried by the orchestrator; the run then goes on', async () => {
    const { service, sleeper } = setup();
    const result = await service.run(
      job([
        new ProviderTimeoutError('datatourisme', 'list', 'no response'),
        new ProviderUnavailableError('datatourisme', 'list', 'HTTP 503', 503),
        batch(['a']),
      ]),
    );
    expect(result).toMatchObject({
      status: 'SUCCEEDED',
      created: 1,
      errors: { 'retried:ProviderTimeoutError': 1, 'retried:ProviderUnavailableError': 1 },
    });
    expect(sleeper.sleep).toHaveBeenCalledTimes(2);
  });

  it('429: no retry; the run stops, keeps its cursor and is PARTIAL after progress', async () => {
    const { service, sleeper, runs } = setup();
    const result = await service.run(
      job([
        batch(['a'], { row: 500 }),
        new ProviderRateLimitError('datatourisme', 'list', 'HTTP 429', 60),
      ]),
    );
    expect(result).toMatchObject({
      status: 'PARTIAL',
      stoppedBy: 'ProviderRateLimitError',
      cursor: { row: 500 },
      errors: { 'stopped:ProviderRateLimitError': 1 },
    });
    expect(sleeper.sleep).not.toHaveBeenCalled();
    expect(runs.finish).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ cursor: { row: 500 } }),
    );
  });

  it('provider error before any batch (bad key, invalid data) → FAILED, nothing retried', async () => {
    const { service, sleeper } = setup();
    for (const error of [
      new ProviderAuthenticationError('datatourisme', 'list', 'HTTP 401'),
      new ProviderResponseError('datatourisme', 'list', 'shape'),
    ]) {
      const result = await service.run(job([error]));
      expect(result).toMatchObject({ status: 'FAILED', stoppedBy: error.name, batches: 0 });
    }
    expect(sleeper.sleep).not.toHaveBeenCalled();
  });

  it('5xx retries exhausted → the run stops (FAILED before any batch)', async () => {
    const { service } = setup();
    const down = new ProviderUnavailableError('datatourisme', 'list', 'HTTP 502', 502);
    const result = await service.run(job([down, down, down]));
    expect(result).toMatchObject({ status: 'FAILED', stoppedBy: 'ProviderUnavailableError' });
  });

  it('an exhausted request budget stops the run (resumable), never waits an hour', async () => {
    const { service, limiter } = setup();
    limiter.acquire
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new SyncBudgetExhaustedError('datatourisme', 'hour', 1000));
    const result = await service.run(job([batch(['a'], 'next'), batch(['b'])]));
    expect(result).toMatchObject({
      status: 'PARTIAL',
      stoppedBy: 'SyncBudgetExhaustedError',
      cursor: 'next',
    });
  });

  it('the database going away stops the run instead of failing every item', async () => {
    const { service, places } = setup();
    places.upsert.mockRejectedValue(new DatabaseUnavailableError());
    const result = await service.run(job([batch(['a', 'b'])]));
    expect(result).toMatchObject({
      status: 'FAILED',
      stoppedBy: 'DatabaseUnavailableError',
      failed: 0,
    });
  });

  it('resume: opens the reader at the last unfinished run cursor; max batches stops a run small and resumable', async () => {
    const { service, runs } = setup();
    runs.resumeCursor.mockResolvedValue({ offset: 300 });
    const opened: unknown[] = [];
    const result = await service.run(job([batch(['a'], { offset: 400 }), batch(['b'])], opened), {
      resume: true,
      maxBatches: 1,
    });
    expect(opened).toEqual([{ offset: 300 }]);
    expect(result).toMatchObject({
      status: 'PARTIAL',
      stoppedBy: 'max_batches',
      cursor: { offset: 400 },
    });
  });

  it('logs counters and reasons only — never a cursor, a URL or a key', async () => {
    const { service } = setup();
    await service.run(job([batch(['a'], '/v1/placeOfInterest?page=2&secret=x')]));
    expect(logs.join('\n')).not.toMatch(/page=2|secret|http/);
  });
});
