import { type ExecutionContext, SetMetadata } from '@nestjs/common';
import { normalizeIp, type ThrottlerModuleOptions, type ThrottlerStorage } from '@nestjs/throttler';

import type { AppConfigService } from '../../config/app-config.service.js';
import { bearerToken, hashSessionToken } from '../../modules/auth/session-token.js';

/**
 * The rate-limit tiers (RATE_LIMITING.md → "Tiers"). Every request goes through `ip` and `client`; `auth` only on the
 * routes marked `@AuthRateLimit()`; `mutation` on the other writes.
 */
export type RateLimitTier = 'ip' | 'client' | 'auth' | 'mutation';

const AUTH_ROUTE = 'roam:rateLimit:auth';
const SKIP = 'roam:rateLimit:skip';

/** Login, register, password reset: the stricter per-IP `auth` tier (brute force, enumeration). */
export const AuthRateLimit = () => SetMetadata(AUTH_ROUTE, true);

/** No rate limit at all (health probes). */
export const SkipRateLimit = () => SetMetadata(SKIP, true);

const marked = (context: ExecutionContext, key: string) =>
  Reflect.getMetadata(key, context.getHandler()) === true ||
  Reflect.getMetadata(key, context.getClass()) === true;

export const isAuthRoute = (context: ExecutionContext) => marked(context, AUTH_ROUTE);
export const isSkipped = (context: ExecutionContext) => marked(context, SKIP);

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const isRead = (context: ExecutionContext) =>
  READ_METHODS.has(context.switchToHttp().getRequest<{ method: string }>().method);

type TrackedRequest = { ip?: string; headers: Record<string, string | string[] | undefined> };

/**
 * The client's IP as Express resolved it: the TCP peer, unless `TRUST_PROXY` trusts reverse proxies' `X-Forwarded-For`
 * (then Express reads it). IPv6 addresses are grouped by their /64 prefix (the library's default, one site), so rotating addresses inside one allocation
 * does not reset the count. Kept in memory only, never logged.
 */
export const ipTracker = (req: Record<string, unknown>) =>
  `ip:${normalizeIp((req as TrackedRequest).ip ?? 'unknown')}`;

/**
 * The session when the request carries a bearer token — keyed by the token's SHA-256, never the token (the same hash
 * as the session store) — otherwise the IP. Checked before authentication: a made-up token only earns its own small
 * bucket, and the `ip` tier still caps whoever rotates tokens.
 */
export const clientTracker = (req: Record<string, unknown>) => {
  const token = bearerToken((req as TrackedRequest).headers.authorization);
  return token ? `session:${hashSessionToken(token)}` : ipTracker(req);
};

/**
 * The throttler configuration built from `AppConfigService`. Keys are `tier:tracker` — one counter per client and tier
 * across all routes (the library's default key is per route). The library's own `X-RateLimit-*` / `Retry-After-<tier>`
 * headers are off: the guard sends the standard `Retry-After` itself.
 */
export function rateLimitOptions(
  config: AppConfigService,
  storage: ThrottlerStorage,
): ThrottlerModuleOptions {
  const { enabled, ip, client, auth, mutation } = config.rateLimit;
  const tier = (
    name: RateLimitTier,
    settings: { limit: number; ttlMs: number },
    skipIf?: (context: ExecutionContext) => boolean,
  ) => ({
    name,
    limit: settings.limit,
    ttl: settings.ttlMs,
    blockDuration: settings.ttlMs,
    // RATE_LIMIT_ENABLED=false: every tier skipped (a tier's own skipIf replaces the common one in the library).
    skipIf: (context: ExecutionContext) => !enabled || (skipIf?.(context) ?? false),
  });
  return {
    storage,
    setHeaders: false,
    generateKey: (_context, tracker, name) => `${name}:${tracker}`,
    throttlers: [
      { ...tier('ip', ip), getTracker: ipTracker },
      { ...tier('client', client), getTracker: clientTracker },
      { ...tier('auth', auth, (context) => !isAuthRoute(context)), getTracker: ipTracker },
      {
        ...tier('mutation', mutation, (context) => isAuthRoute(context) || isRead(context)),
        getTracker: clientTracker,
      },
    ],
  };
}
