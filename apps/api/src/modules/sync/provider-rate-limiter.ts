import { Injectable } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { Sleeper } from './sleeper.js';

/**
 * Outgoing request pacing per provider (DATA_PERSISTENCE_AND_SYNC.md "Rate limiting"): a minimum interval between two
 * requests (the provider's per-second limit, with margin) and hour/day budgets below its quota. In memory, per process
 * — enough because a provider is synced by one run at a time (`sync_runs` partial unique index). A request that would
 * exceed a budget is not delayed for an hour: `SyncBudgetExhaustedError`, and the run stops and resumes later from its
 * cursor.
 */
export type RatePolicy = { minIntervalMs: number; perHour?: number; perDay?: number };

/** Values and their sources: DATA_PERSISTENCE_AND_SYNC.md "Rate limiting". */
export const RATE_POLICIES: Record<string, RatePolicy> = {
  // Documented: 1 000 req/h, 20–30 concurrent, ~10 req/s sustained.
  datatourisme: { minIntervalMs: 200, perHour: 900 },
  // Documented (TICKETMASTER_PROVIDER.md): 5 000 calls/day, 5 req/s.
  ticketmaster: { minIntervalMs: 250, perDay: 4_500 },
  // Free plan (GEOAPIFY_PROVIDER.md): 3 000 credits/day, 5 req/s.
  geoapify: { minIntervalMs: 250, perDay: 2_500 },
  // Billed per request: a ROAM cost ceiling, not a Google quota.
  google_places: { minIntervalMs: 200, perDay: 500 },
  // Observed x-ratelimit-limit: 5 000/day (anonymous).
  data_es: { minIntervalMs: 200, perDay: 4_500 },
  // One file download per run; nothing to pace beyond that.
  basilic: { minIntervalMs: 1_000, perDay: 24 },
};

const DEFAULT_POLICY: RatePolicy = { minIntervalMs: 1_000, perHour: 100 };
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export class SyncBudgetExhaustedError extends Error {
  constructor(
    readonly provider: string,
    readonly window: 'hour' | 'day',
    readonly retryAfterMs: number,
  ) {
    super(`${provider}: ${window} request budget exhausted`);
    this.name = 'SyncBudgetExhaustedError';
  }
}

@Injectable()
export class ProviderRateLimiter {
  /** Request instants (ms) per provider, last 24 h. */
  private readonly history = new Map<string, number[]>();
  private readonly policies: Record<string, RatePolicy>;

  constructor(
    private readonly clock: Clock,
    private readonly sleeper: Sleeper,
  ) {
    this.policies = RATE_POLICIES;
  }

  policyFor(provider: string): RatePolicy {
    return this.policies[provider] ?? DEFAULT_POLICY;
  }

  /** Waits until a request to `provider` is allowed, then records it. */
  async acquire(provider: string): Promise<void> {
    const policy = this.policyFor(provider);
    let now = this.clock.now().getTime();
    const times = (this.history.get(provider) ?? []).filter((time) => time > now - DAY);

    const check = (window: 'hour' | 'day', span: number, limit: number | undefined) => {
      if (limit === undefined) return;
      const inWindow = times.filter((time) => time > now - span);
      if (inWindow.length >= limit)
        throw new SyncBudgetExhaustedError(provider, window, inWindow[0] + span - now);
    };
    check('hour', HOUR, policy.perHour);
    check('day', DAY, policy.perDay);

    const last = times.at(-1);
    if (last !== undefined && now - last < policy.minIntervalMs) {
      await this.sleeper.sleep(policy.minIntervalMs - (now - last));
      now = Math.max(this.clock.now().getTime(), last + policy.minIntervalMs);
    }
    times.push(now);
    this.history.set(provider, times);
  }

  /** Requests made to `provider` in the last hour and day (observability). */
  usage(provider: string): { lastHour: number; lastDay: number } {
    const now = this.clock.now().getTime();
    const times = this.history.get(provider) ?? [];
    return {
      lastHour: times.filter((time) => time > now - HOUR).length,
      lastDay: times.filter((time) => time > now - DAY).length,
    };
  }
}
