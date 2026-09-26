import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerOptions, ThrottlerStorage } from '@nestjs/throttler';

import type { AppConfigService } from '../../config/app-config.service.js';
import {
  AuthRateLimit,
  clientTracker,
  ipTracker,
  rateLimitOptions,
  SkipRateLimit,
  isSkipped,
} from './rate-limit.options.js';

const TOKEN = 'a'.repeat(43);
const config = (enabled = true) =>
  ({
    rateLimit: {
      enabled,
      ip: { limit: 300, ttlMs: 60_000 },
      client: { limit: 120, ttlMs: 60_000 },
      auth: { limit: 10, ttlMs: 900_000 },
      mutation: { limit: 30, ttlMs: 60_000 },
    },
  }) as AppConfigService;

class Routes {
  @AuthRateLimit() login() {}
  list() {}
  @SkipRateLimit() health() {}
}

function context(handler: keyof Routes, method: string): ExecutionContext {
  return {
    getHandler: () => Reflect.get(Routes.prototype, handler),
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => ({ method }) }),
  } as unknown as ExecutionContext;
}

function throttlers(enabled = true) {
  const options = rateLimitOptions(config(enabled), {} as ThrottlerStorage);
  if (Array.isArray(options)) throw new Error('expected the object form');
  const list: ThrottlerOptions[] = options.throttlers;
  const byName: Record<string, ThrottlerOptions> = Object.fromEntries(
    list.map((throttler) => [throttler.name ?? '', throttler]),
  );
  return { options, byName };
}

describe('rate limit options', () => {
  it('four tiers with their limits and windows (ms); blocked for one window once over', () => {
    const { byName } = throttlers();
    expect(Object.keys(byName)).toEqual(['ip', 'client', 'auth', 'mutation']);
    expect(byName.auth).toMatchObject({ limit: 10, ttl: 900_000, blockDuration: 900_000 });
    expect(byName.mutation).toMatchObject({ limit: 30, ttl: 60_000 });
  });

  it('which tiers count a request: auth only on marked routes, mutation on the other writes', () => {
    const { byName } = throttlers();
    const skipped = (name: string, handler: keyof Routes, method: string) =>
      byName[name].skipIf!(context(handler, method));

    expect(skipped('ip', 'list', 'GET')).toBe(false);
    expect(skipped('client', 'login', 'POST')).toBe(false);
    expect(skipped('auth', 'login', 'POST')).toBe(false);
    expect(skipped('auth', 'list', 'POST')).toBe(true);
    expect(skipped('mutation', 'list', 'POST')).toBe(false);
    expect(skipped('mutation', 'list', 'DELETE')).toBe(false);
    expect(skipped('mutation', 'list', 'GET')).toBe(true);
    expect(skipped('mutation', 'login', 'POST')).toBe(true);
    expect(isSkipped(context('health', 'GET'))).toBe(true);
    expect(isSkipped(context('list', 'GET'))).toBe(false);
  });

  it('RATE_LIMIT_ENABLED=false skips every tier', () => {
    const { byName } = throttlers(false);
    for (const name of ['ip', 'client', 'auth', 'mutation']) {
      expect(byName[name].skipIf!(context('login', 'POST'))).toBe(true);
    }
  });

  it('keys: one counter per tier and client across routes; no route in the key', () => {
    const { options } = throttlers();
    expect(options.generateKey!(context('list', 'GET'), 'ip:203.0.113.7', 'client')).toBe(
      'client:ip:203.0.113.7',
    );
    expect(options.setHeaders).toBe(false);
  });

  it('client key: the session’s SHA-256 (never the token), else the IP; the IP key ignores the token', () => {
    const withToken = { ip: '203.0.113.7', headers: { authorization: `Bearer ${TOKEN}` } };
    const anonymous = { ip: '203.0.113.7', headers: {} };

    const key = clientTracker(withToken);
    expect(key).toMatch(/^session:[0-9a-f]{64}$/);
    expect(key).not.toContain(TOKEN);
    expect(clientTracker(anonymous)).toBe('ip:203.0.113.7');
    expect(ipTracker(withToken)).toBe('ip:203.0.113.7');
    expect(clientTracker({ ip: '203.0.113.7', headers: { authorization: 'Basic abc' } })).toBe(
      'ip:203.0.113.7',
    );
  });

  it('IPv6 addresses of one /64 share a key (rotating addresses does not reset the count)', () => {
    const a = ipTracker({ ip: '2001:db8:abcd:1200::1', headers: {} });
    const b = ipTracker({ ip: '2001:db8:abcd:1200:ffff::9', headers: {} });
    const other = ipTracker({ ip: '2001:db8:abcd:1201::1', headers: {} });
    expect(a).toBe(b);
    expect(a).not.toBe(other);
  });
});
