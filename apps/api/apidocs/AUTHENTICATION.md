# ROAM API — Authentication

Accounts and sessions of the ROAM backend (task API-05): register, login, authenticated requests, logout, password
reset. Built on the foundation ([`BACKEND_FOUNDATION.md`](BACKEND_FOUNDATION.md)), the data model
([`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)) and the repositories ([`REPOSITORY_ARCHITECTURE.md`](REPOSITORY_ARCHITECTURE.md)).
The mobile app still runs on its mocked session; this document is the contract that will replace it.

## Starting point (audit)

- **API:** no authentication at all — no library, guard, session or credential column. Only an unused, optional
  `AUTH_JWT_SECRET` variable prepared by API-02 ("future authentication"); it is **removed** (see "Strategy").
- **Mobile** (`apps/mobile/mobiledocs/features/AUTH.md`, `NAVIGATION.md`, D-28 → D-36, D-44, D-62): 7 screens, all
  simulated — Login (email, password), Register (first name, email, password ≥ 8 with a letter and a digit, confirm)
  that **lands signed in on Home**, Forgot password (email) → Reset code (6 digits) → New password → Reset success →
  Login; Logout from Settings. The session is a persisted boolean `isLoggedIn`. Google/Apple buttons are visual only.
- **Documentation:** "use a standard secure strategy, do not build password cryptography manually"
  (`appdocs/architecture/ARCHITECTURE.md` → "Authentication"); nothing more specific.

No second system was created: this is the first and only authentication of the API.

## Strategy

| Concern         | Choice                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Credential      | Email + password                                                                                                  |
| Password hash   | **Argon2id** (`@node-rs/argon2`), OWASP baseline: `m=19456` KiB, `t=2`, `p=1`; PHC string in `users.passwordHash` |
| Session         | **Opaque server-side session**: a random 256-bit token (`node:crypto`), sent as `Authorization: Bearer <token>`   |
| Session storage | `auth_sessions`: SHA-256 of the token (never the token), user, expiry. One row per signed-in device               |
| Lifetime        | `AUTH_SESSION_TTL_DAYS` (default 30, 1–365), fixed from sign-in (no sliding renewal yet)                          |
| Revocation      | Logout deletes the row; a password reset deletes every session of the user — effective immediately                |
| Protection      | Global `AuthGuard`: **every route requires a session unless marked `@Public()`**                                  |

**Why opaque sessions, not JWT.** The mobile app only needs a bearer token it keeps in secure storage. A JWT cannot be
revoked before it expires without a server-side list — a real logout would need refresh tokens stored and rotated in
the database anyway, i.e. two mechanisms. An opaque token checked against PostgreSQL is one mechanism: logout and
"sign out everywhere" are immediate, nothing sensitive travels in the token, there is no signing secret to manage (so
`AUTH_JWT_SECRET` is gone). Cost: one indexed query per authenticated request, which also loads the user the handler
needs.

**Why not an auth framework.** Better Auth / Passport were not installed and would bring what ROAM does not need yet:
Better Auth owns its tables (`user`, `session`, `account`, `verification`, with its own id and field conventions that
clash with `users`), its routes (outside `/api/v1`) and its error format (not `{ error: { code, message } }`); Passport
would only wrap a 20-line bearer check. The cryptographic parts come from standard libraries: Argon2id from
`@node-rs/argon2`, randomness and SHA-256 from `node:crypto`. Nothing cryptographic is implemented here.

**Why SHA-256 for tokens but Argon2id for passwords and codes.** A 256-bit random token cannot be guessed, so a fast
hash is enough to make a stolen `auth_sessions` table useless. Passwords and 6-digit codes have little entropy: they
need a slow, salted hash.

## Endpoints

All under `/api/v1/auth`, JSON, success in `{ "data": … }`, errors in `{ "error": { code, message, details? } }`.

| Method & path                     | Auth             | Body                               | Success                           |
| --------------------------------- | ---------------- | ---------------------------------- | --------------------------------- |
| `POST /auth/register`             | public           | `displayName`, `email`, `password` | 201 `{ data: { user, session } }` |
| `POST /auth/login`                | public           | `email`, `password`                | 200 `{ data: { user, session } }` |
| `GET /auth/me`                    | session          | —                                  | 200 `{ data: user }`              |
| `POST /auth/logout`               | bearer, optional | —                                  | 204 (idempotent)                  |
| `POST /auth/password/forgot`      | public           | `email`                            | 202 `{ data: null }` (always)     |
| `POST /auth/password/verify-code` | public           | `email`, `code`                    | 204                               |
| `POST /auth/password/reset`       | public           | `email`, `code`, `newPassword`     | 204                               |

```json
{
  "data": {
    "user": {
      "id": "01a0…",
      "email": "lea@example.com",
      "displayName": "Léa",
      "avatarUrl": null,
      "age": null,
      "city": null,
      "bio": null
    },
    "session": { "token": "q8Jx0K3v…", "expiresAt": "2026-10-26T12:00:00.000Z" }
  }
}
```

`user` is the public view (the mobile `User` fields): never the password hash, a token, or internal timestamps. The
token appears once, in the register/login response.

### Register

Validates (below), normalizes the email, hashes the password, creates the user — the **unique email index decides**,
also between two concurrent registrations (tested) — then opens a session: the mobile Register screen lands signed in.
An email already used → 409 `AUTH_EMAIL_ALREADY_EXISTS`. (Register necessarily tells whether an email has an account;
see "Security".)

### Login

One query (user + hash by normalized email), one Argon2id verification, one insert (session). Wrong password, unknown
email, account without password: **the same** 401 `AUTH_INVALID_CREDENTIALS`, and the same work — an unknown email
still runs a verification against a dummy hash, so timing does not reveal accounts.

### Authenticated requests

`Authorization: Bearer <token>`. The guard hashes the token and loads the session **with its user in one query**
(`expiresAt > now`), then exposes the user: `@CurrentUser() user: User` in a handler. No or malformed header → 401
`AUTH_UNAUTHORIZED`; unknown, expired or revoked session → 401 `AUTH_SESSION_INVALID` (the app signs in again). The guard
holds no business rule.

Public routes: `/health`, `/health/database` (controller marked `@Public()`), `/docs` (not a controller), register,
login, logout, password reset. Everything else — `/auth/me` and every future module — is protected by default.

### Logout

Deletes the session of the given token. Public and idempotent on purpose: an expired or unknown token, or none, still
answers 204 — the app then forgets its token and shows Login (mobile D-62). Other devices stay signed in.

### Current user

`GET /auth/me` returns the user loaded by the guard (no extra query). It is also the profile read of API-06; profile
edits and preferences are `/users/me` ([`USER_PROFILE_AND_PREFERENCES.md`](USER_PROFILE_AND_PREFERENCES.md)).

### Password reset

The mobile flow, backed by the API:

```text
Forgot password ──POST /password/forgot──▶ code sent (15 min, 5 attempts)
Reset code      ──POST /password/verify-code──▶ 204 or 400        (counts as an attempt)
New password    ──POST /password/reset──▶ password changed, every session revoked, code deleted
Reset success   ──▶ Login
```

- One pending code per user (`password_reset_codes`), a new request replaces it. Stored as an Argon2id hash.
- Attempts are counted **atomically before** checking (`UPDATE … WHERE attempts < 5`), so parallel guesses cannot
  exceed the limit; after 5, even the right code is refused. 6 digits × 5 attempts = a 1-in-200 000 chance per code.
- `forgot` answers 202 whether the email exists or not, and does the same work (a code is generated and hashed either
  way). Any failure (wrong, expired, used up, unknown email) is the same 400 `AUTH_RESET_CODE_INVALID`.
- The reset is one transaction: new hash + delete all sessions + delete the code.
- **Delivery is not wired yet** (no email provider is chosen): `PasswordResetDelivery` is an abstract class, and the
  application registers `UnconfiguredPasswordResetDelivery`, which sends nothing and logs one warning — **without the
  email or the code**. The code is never returned by the API nor logged, in any environment. Until an email provider is
  added (a new `PasswordResetDelivery` class, nothing else changes), the reset cannot be completed by a real user; it is
  fully tested with a capturing delivery.

## Validation

Global `ValidationPipe` (API-02): unknown fields → 400, rejected values never echoed back.

| Field                      | Rule                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `displayName`              | string, trimmed, 1–50                                                                      |
| `email`                    | trimmed, valid email, ≤ 254; stored and compared **trimmed + lower case**                  |
| `password` / `newPassword` | 8–128 characters, at least a letter and a digit (the mobile Register rules); never trimmed |
| login `password`           | non-empty, ≤ 128 (no strength rule: an old password must still log in)                     |
| `code`                     | exactly 6 digits                                                                           |

The 128-character cap bounds the hashing work a request can cause.

## Errors

| Code                        | Status | When                                                 |
| --------------------------- | ------ | ---------------------------------------------------- |
| `VALIDATION_ERROR`          | 400    | invalid body (with `details` per field)              |
| `AUTH_EMAIL_ALREADY_EXISTS` | 409    | register with a used email                           |
| `AUTH_INVALID_CREDENTIALS`  | 401    | login failed (any reason)                            |
| `AUTH_UNAUTHORIZED`         | 401    | protected route without a bearer token               |
| `AUTH_SESSION_INVALID`      | 401    | unknown, expired or revoked session                  |
| `AUTH_RESET_CODE_INVALID`   | 400    | reset code wrong, expired, used up, or unknown email |
| `DATABASE_UNAVAILABLE`      | 503    | PostgreSQL unreachable (API-04 persistence errors)   |

No expiry-specific code (`AUTH_TOKEN_EXPIRED`): the client does the same thing — sign in again — and one code reveals
less.

## Security

- **Stored secrets:** password and reset code as Argon2id hashes, session token as SHA-256; nothing reversible.
  `User` (the repositories' type) has no `passwordHash`; only `UserRepository.findCredentialsByEmail` returns it, for
  login.
- **Never logged or returned:** passwords, tokens (except the new one, once, to its owner), codes, hashes. The request
  log has no bodies or headers; validation errors never echo values. Checked in tests (logs of a full run, responses).
- **Enumeration:** login and reset give the same answer and similar timing for unknown accounts; register must say an
  email is taken (usual trade-off; mitigated by rate limiting later).
- **Brute force — not rate-limited yet.** Argon2id makes each guess cost ~20 ms of CPU, reset codes are capped at 5
  attempts, but nothing limits login attempts per account or per IP. Planned: `@nestjs/throttler` on
  `/auth/login`, `/auth/register`, `/auth/password/*` (the API-02 rate-limiting point), before any public deployment.
- **Transport:** HTTPS is required in production (bearer tokens); CORS unchanged (no cookies, so no CSRF surface);
  helmet headers unchanged.
- **Token handling on the device:** store it in `expo-secure-store`, never in AsyncStorage; drop it on 401 and on logout.

## Mobile contract

What replaces the mocks (`apps/mobile/src/services/mock/auth.ts`, `user.ts`, `auth/session.ts`), for the mobile task
that wires the API (not part of API-05 — no mobile change was made):

| Mobile today                               | With the API                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `AuthRepository.login()` (always succeeds) | `POST /auth/login` → store `session.token`; 401 `AUTH_INVALID_CREDENTIALS` → form error                      |
| Register → `login()`                       | `POST /auth/register` (`displayName` = first name) → store the token; 409 → "email used"                     |
| `isLoggedIn` persisted boolean             | "a token is stored"; on start, `GET /auth/me` → 200 signed in, 401 → Login                                   |
| `UserRepository.getCurrentUser()`          | `GET /auth/me` (`id`, `email`, `displayName`, `avatarUrl`, `age`, `city`, `bio`; `stats` not served)         |
| Logout (Settings)                          | `POST /auth/logout` with the token, then forget it (204 even if already expired)                             |
| Forgot → code `123456` → new password      | `/password/forgot` → `/password/verify-code` → `/password/reset` (needs the email kept across the 3 screens) |
| Google / Apple buttons                     | not supported yet                                                                                            |

## Environment

| Variable                | Default | Use                          |
| ----------------------- | ------- | ---------------------------- |
| `AUTH_SESSION_TTL_DAYS` | `30`    | session lifetime, 1–365 days |

No secret is needed by this design. Reset code lifetime (15 min) and attempts (5) are constants in `auth.service.ts`.

## Code

`src/modules/auth/`: `auth.controller.ts` (HTTP), `auth.service.ts` (use cases), `auth.guard.ts` (`AuthGuard`,
`@Public()`, `@CurrentUser()`), `auth-session.repository.ts`, `password-reset.repository.ts`, `password-hasher.ts`,
`session-token.ts`, `password-reset-delivery.ts`, `auth.errors.ts`, `dto/`. Accounts go through `UserRepository`
(`create` with a password hash, `findByEmail`, `findCredentialsByEmail`). `src/common/clock.ts`: injectable time.

Database (migration `20260926011137_authentication`, additive): `users.passwordHash` (nullable — accounts without a
password for a future social sign-in), `auth_sessions`, `password_reset_codes`; both cascade with the user.

## Tests

- **Unit** (`pnpm test`): token/code generation and hashing, bearer parsing; Argon2id format, parameters, salt,
  verification; `AuthService` with repositories mocked (register hash + normalization, duplicate email, login
  success/wrong password/unknown email/no password with the same error and a dummy verification, token lookups by
  hash, reset request/verify/complete); `AuthGuard` (public, missing token, invalid session, valid); the endpoints over
  HTTP (`test/auth.e2e.spec.ts`: responses, validation of every body, protected `/me`, idempotent logout, public health
  and docs, OpenAPI).
- **PostgreSQL** (`pnpm test:db`, `test/database/auth.db-spec.ts`, on `roam_test` only): the whole flow over HTTP
  (register → me → logout → token refused; login; expired session), hashes actually stored, duplicate emails in any
  case and **concurrent registrations**, identical login failures, reset (code hashed, verify, reset, sessions revoked,
  old password refused, no replay), attempt limit, expired and replaced codes, cascades — and no password or hash in
  the logs of the run.

## Deferred

- Rate limiting of the auth endpoints (see "Security").
- An email provider for reset codes (and email verification at sign-up, not specified).
- Google / Apple sign-in (the mobile buttons are visual only; `passwordHash` is nullable for it).
- Sliding session renewal, "sign out everywhere" endpoint, listing devices; periodic cleanup of expired
  `auth_sessions` rows (they are ignored, not deleted, until then).
- Account deactivation or deletion (not documented), password change while signed in. (Profile and preferences endpoints: done in API-06.)
- Authorization beyond "signed in" (roles): not needed by any documented feature.
