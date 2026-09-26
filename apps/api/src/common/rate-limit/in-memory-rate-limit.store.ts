import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';

import { Clock } from '../clock.js';

type Entry = {
  hits: number;
  /** End of the current window (ms since epoch). */
  windowEndsAt: number;
  /** End of the block after the limit was exceeded (ms since epoch); 0 when not blocked. */
  blockedUntil: number;
};

/** What the throttler expects back from `increment` (the type is not exported by the package's index). */
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

/** How often expired entries are swept (on the next request after this interval). */
export const SWEEP_INTERVAL_MS = 60_000;

/**
 * The rate-limit counters, in the API process's memory (RATE_LIMITING.md → "Store"). **Fixed window** per key: the
 * first request opens a window of `ttl` ms; each request adds a hit; the request that goes over `limit` blocks the key
 * for `blockDuration` ms (blocked requests are refused without counting). When the block and the window are over, the
 * next request opens a new window.
 *
 * Implements `@nestjs/throttler`'s `ThrottlerStorage`, so a shared store (Redis…) can replace it without touching the
 * guard or the routes. Counters are per process: they reset on restart and are not shared between instances. Every
 * operation is synchronous (no await between read and write), so concurrent requests in one process cannot race.
 * Expired entries are swept at most once per `SWEEP_INTERVAL_MS`, on a request — no timer, no unbounded growth.
 */
@Injectable()
export class InMemoryRateLimitStore implements ThrottlerStorage {
  private readonly entries = new Map<string, Entry>();
  private nextSweepAt = 0;

  constructor(private readonly clock: Clock) {}

  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    const now = this.clock.now().getTime();
    this.sweep(now);

    let entry = this.entries.get(key);
    if (entry && entry.blockedUntil > now) {
      return Promise.resolve(record(entry, now, true));
    }
    if (!entry || entry.windowEndsAt <= now || entry.blockedUntil !== 0) {
      entry = { hits: 0, windowEndsAt: now + ttl, blockedUntil: 0 };
      this.entries.set(key, entry);
    }
    entry.hits += 1;
    if (entry.hits > limit) {
      entry.blockedUntil = now + blockDuration;
      return Promise.resolve(record(entry, now, true));
    }
    return Promise.resolve(record(entry, now, false));
  }

  /** Number of keys held (tests, diagnostics). */
  get size(): number {
    return this.entries.size;
  }

  private sweep(now: number): void {
    if (now < this.nextSweepAt) return;
    this.nextSweepAt = now + SWEEP_INTERVAL_MS;
    for (const [key, entry] of this.entries) {
      if (entry.windowEndsAt <= now && entry.blockedUntil <= now) this.entries.delete(key);
    }
  }
}

/** The throttler's record: times in seconds, rounded up (a client waiting that long is sure to be let in). */
function record(entry: Entry, now: number, isBlocked: boolean): ThrottlerStorageRecord {
  const seconds = (ms: number) => Math.max(0, Math.ceil(ms / 1000));
  return {
    totalHits: entry.hits,
    timeToExpire: seconds(entry.windowEndsAt - now),
    isBlocked,
    timeToBlockExpire: isBlocked ? seconds(entry.blockedUntil - now) : 0,
  };
}
