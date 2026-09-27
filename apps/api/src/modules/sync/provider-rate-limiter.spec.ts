import {
  ProviderRateLimiter,
  RATE_POLICIES,
  SyncBudgetExhaustedError,
} from './provider-rate-limiter.js';

function setup() {
  let now = Date.parse('2026-09-27T10:00:00Z');
  const clock = { now: () => new Date(now) };
  const sleeper = {
    sleep: vi.fn((ms: number) => {
      now += ms;
      return Promise.resolve();
    }),
  };
  const limiter = new ProviderRateLimiter(clock, sleeper);
  return { limiter, sleeper, advance: (ms: number) => (now += ms) };
}

describe('provider rate limiter (in process)', () => {
  it('policies stay below each documented quota', () => {
    expect(RATE_POLICIES.datatourisme.perHour).toBeLessThan(1000);
    expect(RATE_POLICIES.datatourisme.minIntervalMs).toBeGreaterThanOrEqual(100); // ≤ 10 req/s
    expect(RATE_POLICIES.ticketmaster.perDay).toBeLessThan(5000);
    expect(RATE_POLICIES.ticketmaster.minIntervalMs).toBeGreaterThanOrEqual(200); // ≤ 5 req/s
    expect(RATE_POLICIES.geoapify.perDay).toBeLessThan(3000);
    expect(RATE_POLICIES.data_es.perDay).toBeLessThan(5000);
  });

  it('spaces two requests of one provider by its minimum interval; providers are independent', async () => {
    const { limiter, sleeper } = setup();
    await limiter.acquire('datatourisme');
    await limiter.acquire('data_es');
    expect(sleeper.sleep).not.toHaveBeenCalled();
    await limiter.acquire('datatourisme');
    expect(sleeper.sleep).toHaveBeenCalledWith(200);
  });

  it('an exhausted budget stops instead of waiting an hour (the run resumes later)', async () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 900; i += 1) {
      await limiter.acquire('datatourisme');
      advance(1000);
    }
    await expect(limiter.acquire('datatourisme')).rejects.toBeInstanceOf(SyncBudgetExhaustedError);
    expect(limiter.usage('datatourisme').lastHour).toBe(900);
    advance(3_600_000);
    await expect(limiter.acquire('datatourisme')).resolves.toBeUndefined();
  });
});
