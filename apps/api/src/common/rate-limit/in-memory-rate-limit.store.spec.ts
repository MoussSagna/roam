import { InMemoryRateLimitStore, SWEEP_INTERVAL_MS } from './in-memory-rate-limit.store.js';

/** A clock the test moves by hand. */
function fakeClock(start = Date.UTC(2026, 8, 26, 12)) {
  let now = start;
  return {
    clock: { now: () => new Date(now) },
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const TTL = 60_000;

describe('InMemoryRateLimitStore (fixed window, block after the limit)', () => {
  it('counts hits in the window; the request over the limit is blocked for blockDuration', async () => {
    const { clock } = fakeClock();
    const store = new InMemoryRateLimitStore(clock);

    expect(await store.increment('k', TTL, 2, TTL)).toEqual({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    expect((await store.increment('k', TTL, 2, TTL)).isBlocked).toBe(false);
    expect(await store.increment('k', TTL, 2, TTL)).toMatchObject({
      totalHits: 3,
      isBlocked: true,
      timeToBlockExpire: 60,
    });
  });

  it('a blocked key stays blocked (without counting) until the block ends, then a new window opens', async () => {
    const { clock, advance } = fakeClock();
    const store = new InMemoryRateLimitStore(clock);
    for (let i = 0; i < 3; i += 1) await store.increment('k', TTL, 2, 30_000);

    advance(10_000);
    expect(await store.increment('k', TTL, 2, 30_000)).toMatchObject({
      totalHits: 3,
      isBlocked: true,
      timeToBlockExpire: 20,
    });
    advance(20_000);
    expect(await store.increment('k', TTL, 2, 30_000)).toMatchObject({
      totalHits: 1,
      isBlocked: false,
    });
  });

  it('a window that ends resets the count (no block when under the limit)', async () => {
    const { clock, advance } = fakeClock();
    const store = new InMemoryRateLimitStore(clock);
    await store.increment('k', TTL, 2, TTL);
    await store.increment('k', TTL, 2, TTL);
    advance(TTL - 1);
    expect((await store.increment('k', TTL, 2, TTL)).isBlocked).toBe(true);

    const other = new InMemoryRateLimitStore(clock);
    await other.increment('k', TTL, 2, TTL);
    advance(TTL);
    expect(await other.increment('k', TTL, 2, TTL)).toMatchObject({
      totalHits: 1,
      timeToExpire: 60,
    });
  });

  it('keys are independent (users, IPs, tiers)', async () => {
    const { clock } = fakeClock();
    const store = new InMemoryRateLimitStore(clock);
    await store.increment('client:session:a', TTL, 1, TTL);
    expect((await store.increment('client:session:a', TTL, 1, TTL)).isBlocked).toBe(true);
    expect((await store.increment('client:session:b', TTL, 1, TTL)).isBlocked).toBe(false);
    expect((await store.increment('ip:203.0.113.7', TTL, 1, TTL)).isBlocked).toBe(false);
    expect((await store.increment('auth:ip:203.0.113.7', TTL, 1, TTL)).isBlocked).toBe(false);
  });

  it('sweeps expired entries (at most once per interval, on a request): memory does not grow forever', async () => {
    const { clock, advance } = fakeClock();
    const store = new InMemoryRateLimitStore(clock);
    for (let i = 0; i < 100; i += 1) await store.increment(`ip:${i}`, TTL, 5, TTL);
    for (let i = 0; i < 3; i += 1) await store.increment('blocked', TTL, 1, 10 * TTL);
    expect(store.size).toBe(101);

    advance(SWEEP_INTERVAL_MS + TTL);
    await store.increment('fresh', TTL, 5, TTL);
    // The 100 finished windows are gone; the still-blocked key and the new one remain.
    expect(store.size).toBe(2);
    expect((await store.increment('blocked', TTL, 1, 10 * TTL)).isBlocked).toBe(true);

    advance(10 * TTL);
    await store.increment('fresh', TTL, 5, TTL);
    expect(store.size).toBe(1);
  });

  it('concurrent increments in one process never lose or duplicate a hit', async () => {
    const { clock } = fakeClock();
    const store = new InMemoryRateLimitStore(clock);
    const results = await Promise.all(
      Array.from({ length: 20 }, () => store.increment('k', TTL, 10, TTL)),
    );
    expect(results.filter((result) => !result.isBlocked)).toHaveLength(10);
    expect(results.map((result) => result.totalHits).sort((a, b) => a - b)).toEqual([
      ...Array.from({ length: 11 }, (_, i) => i + 1),
      ...Array<number>(9).fill(11),
    ]);
  });
});
