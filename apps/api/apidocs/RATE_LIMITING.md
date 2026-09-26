# ROAM API — Rate limiting

The rate limiting of the ROAM backend (task API-11), required before any public deployment (AUTHENTICATION.md →
"Security", EXPERIENCE_CATALOG_API.md → "Performance"). It is an extra layer: it does not replace authentication,
validation, ownership, database constraints or idempotence.

```text
Request → RateLimitGuard → AuthGuard → ValidationPipe → Controller → Service → Repository → PostgreSQL
```

## Threats covered

- **Brute force** of passwords and reset codes, **account enumeration** by volume (register tells whether an email is
  taken — AUTHENTICATION.md), **reset-code spam** — the `auth` tier.
- **Creation spam** (journeys, feedback, favorites, profile writes) — the `mutation` tier.
- **Abuse or accidents** on every route, including the expensive reads (search, recommendations) — the `client` and
  `ip` tiers.

Not covered: distributed attacks from many IPs (needs an edge service), multi-instance deployments (see "Limits").

## Architecture

| Piece                                        | Role                                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `@nestjs/throttler` 6.7                      | Evaluates named limits per request — the library AUTHENTICATION.md planned; the only new dependency                  |
| `RateLimitModule` (`src/common/rate-limit/`) | Builds the options from the configuration; registers `RateLimitGuard` as a global guard                              |
| `RateLimitGuard`                             | Extends `ThrottlerGuard`: skips `@SkipRateLimit()` routes, answers 429 in the API's format, sets `Retry-After`, logs |
| `rate-limit.options.ts`                      | Tiers, trackers (who is counted), keys, `@AuthRateLimit()` / `@SkipRateLimit()`                                      |
| `InMemoryRateLimitStore`                     | The counters (implements the library's `ThrottlerStorage`), on the injectable `Clock` (API-05)                       |

- **Before authentication.** `RateLimitModule` is imported by `AppModule` before `AuthModule`: global guards run in
  registration order, so the limit is checked before the session lookup — an anonymous or badly authenticated flood is
  refused without touching the database. A test proves the order (with the modules swapped, it fails).
- `@Public()` does not mean "not limited": the public auth routes get the strictest tier.
- No controller, service or repository changed, except the markers: `@AuthRateLimit()` on the five auth routes,
  `@SkipRateLimit()` on the health controller.

## Tiers

Every request goes through `ip` and `client`; `auth` only on the marked routes; `mutation` on the other writes. A
request is refused as soon as one of its tiers is over.

| Tier       | Counted per                           | Routes                                                                                                                                 | Default    |
| ---------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `ip`       | client IP                             | all (except health)                                                                                                                    | 300 / 60 s |
| `client`   | session, or IP without a bearer token | all (except health)                                                                                                                    | 120 / 60 s |
| `auth`     | client IP                             | `POST /auth/login`, `/auth/register`, `/auth/password/forgot`, `/password/verify-code`, `/password/reset` — **one shared budget**      | 10 / 900 s |
| `mutation` | session, or IP                        | POST / PATCH / PUT / DELETE outside the auth routes (favorites, journeys, progress, complete, feedback, users/me, preferences, logout) | 30 / 60 s  |

- One counter per tier and client **across routes** (key `tier:tracker`; the library's default key is per route).
- Over a limit, the key is **blocked for one window** (`blockDuration` = the tier's window); blocked requests are not
  counted further.
- No document fixed numbers: the defaults are generous for one person using the app (a Home screen is a handful of
  requests) and strict where guessing happens (10 auth attempts per 15 minutes per IP ≈ 1 000 guesses a day at most, on
  top of Argon2id's cost and the 5-attempt reset codes). All are configurable.

## Who is counted (keys)

- **IP**: `request.ip` as Express resolves it — the **TCP peer** by default. `X-Forwarded-For` is ignored unless
  `TRUST_PROXY` declares trusted reverse proxies (hop count, Express `trust proxy`): a client cannot pick its IP by
  sending the header. Behind a proxy with `TRUST_PROXY=0`, every client shares the proxy's IP — set it in that
  deployment. IPv6 addresses are grouped by /64 (the library's default: rotating addresses inside one site does not reset
  the count). IPs stay in memory only, are never logged or stored in the database.
- **Session**: when the request carries a bearer token, `session:` + its **SHA-256** (the same hash the session store
  keeps) — never the token or the header. The limit runs before authentication, so a made-up token gets its own small
  bucket and a 401; the `ip` tier caps whoever rotates tokens (tested: 40 random tokens then 429). Two devices of one
  user are two sessions, so two budgets.
- **Auth routes are keyed by IP, never by email**: a lock-out per email would let anyone block a victim's account, and
  the answer must not depend on whether the account exists. The 429 is the same body for every email (tested).

## Algorithm and store

- **Fixed window** per key: the first request opens a window of `ttl`; each request adds a hit; the one over `limit`
  blocks the key for `blockDuration`; when both are over, the next request opens a new window. Chosen for its
  simplicity, O(1) memory per key and exact testability; it maps directly onto an atomic Redis `INCR` + `EXPIRE` later.
  Trade-off: a client can send up to 2 × `limit` around a window boundary — acceptable for these limits.
- **Store** — `InMemoryRateLimitStore`, a `Map` in the API process:
  - **per process**: counters reset on restart and are **not shared between instances**: with N instances behind a load
    balancer the effective limit is up to N × the configured one. Enough for the current single-instance deployment,
    **not enough alone for a multi-instance public deployment**;
  - operations are synchronous (no `await` between read and write): concurrent requests of one process cannot race
    (tested: 20 simultaneous requests, limit 10 → exactly 10 served);
  - O(1) per request (a map lookup and update, a SHA-256 of the token when present); memory ≈ one small entry per active
    key; **expired entries are swept** at most once a minute, on a request (no timer) — tested.
- **Shared store later**: the store implements the library's `ThrottlerStorage` interface; a Redis store (e.g. the
  community `@nest-lab/throttler-storage-redis`) replaces it in `RateLimitModule` without touching the guard or the
  routes. Not in API-11: there is no Redis in the architecture yet.

## Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{ "error": { "code": "TOO_MANY_REQUESTS", "message": "Too many requests: try again later.",
             "details": { "retryAfterSeconds": 60 } } }
```

- `TOO_MANY_REQUESTS` is the code the global error filter already maps to 429 (`ErrorCode.TooManyRequests`, API-02) —
  no new code.
- `Retry-After` (standard, seconds, rounded up) and `details.retryAfterSeconds` give the same delay. No other header:
  the library's `X-RateLimit-*` and `Retry-After-<tier>` headers are turned off (non-standard).
- Nothing else is disclosed (no tier, IP, key or configuration in the body).
- Under the limit, answers are unchanged: a request without a session still gets its usual 401.
- Swagger: every API operation documents the 429 with `Retry-After` (added to the generated document in
  `configure-app.ts`); the health probes do not.

## Exempt

- `GET /health`, `GET /health/database` (`@SkipRateLimit()`): probes must always answer.
- `/docs` (Swagger UI and JSON): served by Swagger's own Express route, outside Nest's guards; enabled outside production
  only (unchanged).

## Configuration

Validated at startup (`environment.ts`), read through `AppConfigService.rateLimit` / `.http`; all optional, documented
in `.env.example` (no secret).

| Variable                                     | Default  | Meaning                                          |
| -------------------------------------------- | -------- | ------------------------------------------------ |
| `RATE_LIMIT_ENABLED`                         | `true`   | master switch (`false` skips every tier)         |
| `RATE_LIMIT_IP_LIMIT` / `_IP_TTL_SECONDS`    | 300 / 60 | per-IP tier                                      |
| `RATE_LIMIT_CLIENT_LIMIT` / `_TTL_SECONDS`   | 120 / 60 | per-session tier                                 |
| `RATE_LIMIT_AUTH_LIMIT` / `_TTL_SECONDS`     | 10 / 900 | auth routes, per IP                              |
| `RATE_LIMIT_MUTATION_LIMIT` / `_TTL_SECONDS` | 30 / 60  | writes, per session                              |
| `TRUST_PROXY`                                | `0`      | trusted reverse proxies (hops) for the client IP |

Limits ≥ 1, windows in seconds ≥ 1, `TRUST_PROXY` 0–10; an invalid value stops the startup with the variable's name.

- **Development**: the defaults.
- **Tests**: rate limiting stays **on**, with limits of 100 000 in `test/setup-env.ts` and `test/database/setup-env.ts`
  (every request of a test file comes from 127.0.0.1, and the suites register and log in many times);
  `test/rate-limit.e2e.spec.ts` sets its own low limits (2 to 40) and moves a fake clock.
- **Production**: the defaults, `TRUST_PROXY` set to the real number of proxies, a single instance until a shared store
  exists.

## Logs

One warning per refused request: `Rate limit exceeded (<tier>): <METHOD> <path>` (context `RateLimit`), plus the usual
request line with status 429. Never the token, the `Authorization` header, the IP, the key, the query string or the body
(tested on a captured log).

## Tests

- **Unit**: `in-memory-rate-limit.store.spec.ts` (first hit, under / over the limit, block and its end, window end, new
  window, independent keys, sweep of expired entries, 20 concurrent increments); `rate-limit.options.spec.ts` (tiers,
  which tier counts which route and method, disabled switch, keys, session hash never the token, IPv6 /64 grouping);
  `environment.spec.ts` (defaults, overrides, invalid values).
- **HTTP** (`test/rate-limit.e2e.spec.ts`, low limits, fake clock): login 2 then 429 with the body, `Retry-After` and the
  same answer for any email; blocked until `Retry-After`, allowed right after; one auth budget shared with register /
  forgot / reset, validation still answering under the limit; health never limited; user A limited, user B not; 401
  under the limit and 429 beyond without a session (order before authentication); rotating tokens capped by the `ip`
  tier; writes budgeted apart from reads; 20 concurrent → 10 served / 10 refused; logs without token, IP or email;
  Swagger 429 documentation.
- **Every existing suite** runs with rate limiting on (273 unit/HTTP tests, 105 PostgreSQL tests, twice): no false 429,
  also over 30 back-to-back full runs.

## Limits and deferred

- Per-process counters (above): a shared store (Redis) before running several instances.
- No per-account throttling of logins (lock-out risk); per-IP only.
- No distinction of failed vs. successful auth attempts: every call to an auth route counts.
- No edge protection (WAF, CDN rate limiting) — outside the application.
- The mobile app does not handle 429 yet (read `Retry-After`, show a message) — with the mobile integration.
