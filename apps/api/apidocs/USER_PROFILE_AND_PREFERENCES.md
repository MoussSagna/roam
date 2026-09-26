# ROAM API — User profile and preferences

The signed-in user's own account data (task API-06): reading and editing the profile, reading and saving the lasting
preferences. The first domain endpoints of the API, on top of authentication ([`AUTHENTICATION.md`](AUTHENTICATION.md))
and the repositories ([`REPOSITORY_ARCHITECTURE.md`](REPOSITORY_ARCHITECTURE.md)). The mobile app is not wired to them
yet; this document is the contract that will replace its mocks.

Preferences are **context, not recommendations**: the stable part of what the future recommendation service will read
(`User context → candidates → filtering → scoring → ranking`, RECOMMENDATION.md), next to the per-outing context sent
with each request.

## Architecture

```text
UsersController (users/me)  →  UsersService  →  UserRepository  →  PrismaService  →  users, user_preferences
       ↑ @CurrentUser() — the user loaded by the global AuthGuard from the session
```

- **Identity comes from the session only.** Every route is under `/users/me`; no route takes a user id; the service
  methods take the authenticated `User`. A `userId`/`id` in a body is rejected (unknown field, 400); in a query string
  it is ignored. Tested with two real accounts on PostgreSQL.
- `UsersService` holds the rules (what can change, account deleted meanwhile); the controller validates and maps;
  `UserRepository` (API-04, reused — no new method, no second repository) persists.
- Queries: reading the profile costs none (the guard already loaded the user), a profile update one, reading or saving
  preferences one (`findUnique` / `upsert`). Preferences are loaded only by the preferences routes.

## Endpoints

All require `Authorization: Bearer <token>` (no session → 401 `AUTH_UNAUTHORIZED`; unknown, expired or revoked →
401 `AUTH_SESSION_INVALID`). Success in `{ "data": … }`.

| Method & path                        | Body                            | Success                   |
| ------------------------------------ | ------------------------------- | ------------------------- |
| `GET /api/v1/auth/me`                | —                               | 200 profile (API-05)      |
| `PATCH /api/v1/users/me`             | profile fields, all optional    | 200 the updated profile   |
| `GET /api/v1/users/me/preferences`   | —                               | 200 preferences           |
| `PATCH /api/v1/users/me/preferences` | preference fields, all optional | 200 the saved preferences |

**Reading the profile is `GET /auth/me`.** It already returns exactly the profile (API-05); a `GET /users/me` would be
a second, equivalent route. If the mobile team prefers the resource URL, add it as an alias of the same handler rather
than a different contract.

### Profile

```json
{
  "data": {
    "id": "01a0…",
    "email": "lea@example.com",
    "displayName": "Léa",
    "avatarUrl": null,
    "age": 28,
    "city": "Paris",
    "bio": null
  }
}
```

The public fields of the mobile `User` type — never the password hash, a session, a token or timestamps.

`PATCH /users/me` — partial: only the fields sent change; `null` clears an optional field; `{}` changes nothing (no
query).

| Field         | Rule                                       | Clearable |
| ------------- | ------------------------------------------ | --------- |
| `displayName` | string, trimmed, 1–50 (as at registration) | no        |
| `avatarUrl`   | `https://` URL, ≤ 2048                     | yes       |
| `age`         | integer, 1–120                             | yes       |
| `city`        | string, trimmed, 1–100                     | yes       |
| `bio`         | string, trimmed, ≤ 500                     | yes       |

**The email cannot be changed** (400: unknown field). Changing it safely needs a verification of the new address
(send a code or link to it, confirm, then switch — and handle the uniqueness race); no such mechanism exists. It
comes with email verification, together with the email provider that password reset also waits for.

### Preferences

The lasting preferences of the MVP onboarding (MVP_SCOPE.md §2), stored in `user_preferences` (one row per user,
unchanged since API-03):

```json
{
  "data": {
    "interests": ["culture", "food"],
    "activities": [],
    "usualBudget": "10to25",
    "maxDistanceKm": 5,
    "usualCompany": "friends",
    "updatedAt": "2026-09-26T12:00:00.000Z"
  }
}
```

- **Never saved:** `GET` answers the empty defaults with `updatedAt: null` (200, not 404): a new account simply has no
  preferences yet, and the app shows its defaults.
- `PATCH` — partial; **creates the row on the first save** (`savePreference` upsert), then changes only the fields
  sent; `null` clears a value, `[]` a list.

| Field           | Values                                                            |
| --------------- | ----------------------------------------------------------------- |
| `interests`     | array of strings (trimmed, 1–50 each), at most 20                 |
| `activities`    | same                                                              |
| `usualBudget`   | `free` \| `under10` \| `10to25` \| `25to50` \| `50plus` \| `null` |
| `maxDistanceKm` | integer 1–50 \| `null`                                            |
| `usualCompany`  | `alone` \| `couple` \| `friends` \| `family` \| `null`            |

- The vocabularies are **the mobile ones** (`BudgetRange`, `Company` in `apps/mobile/src/types/common.ts`); the API
  maps them to the database enums (`UNDER_10`, `FRIENDS`…) in its DTOs — the convention DATABASE_SCHEMA.md set for
  enums. Database values are refused on input.
- `interests` / `activities` have no documented vocabulary: free strings, bounded. The bounds (20 items, 50
  characters, 1–50 km — the range of the mobile distance slider) are technical limits, not product rules.

## Errors

| Code                   | Status | When                                                                                 |
| ---------------------- | ------ | ------------------------------------------------------------------------------------ |
| `VALIDATION_ERROR`     | 400    | invalid body, unknown field (incl. `email`, `id`, `userId`), with `details`          |
| `AUTH_UNAUTHORIZED`    | 401    | no bearer token                                                                      |
| `AUTH_SESSION_INVALID` | 401    | invalid session — or the account was deleted between the session check and the write |
| `DATABASE_UNAVAILABLE` | 503    | PostgreSQL unreachable                                                               |

No new error code. "Preferences not found" is not an error (defaults); "user not found" cannot happen for a valid
session except in the deletion race above, answered like any request after the deletion.

## Mobile contract

What the API can replace, and what it cannot yet (no mobile change in API-06):

| Mobile today                                                                                            | API                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UserRepository.getCurrentUser()` (mocked `currentUser`)                                                | `GET /auth/me` — `id`, `email`, `displayName`, `avatarUrl`, `age`, `city`, `bio`                                                                  |
| `User.stats` (outings, places discovered, favorites)                                                    | **not served**: computed from journeys/favorites once those APIs exist                                                                            |
| "Modifier mon profil" (`/profile/edit`, a placeholder screen)                                           | `PATCH /users/me` — ready for when the screen is built                                                                                            |
| `UserPreference` (MVP onboarding type)                                                                  | `GET` / `PATCH /users/me/preferences` — same fields and values                                                                                    |
| Built onboarding answers (mood, time, budget, location, interests — in memory, D-28)                    | only `interests` has a home; mood/time/location are **per-outing context**, not lasting preferences; the onboarding "budget" is the outing budget |
| "Mes préférences" (`ProfilePreferences`: experience types, ambiance, budget per person €, max distance) | only `maxDistanceKm` matches; experience types, ambiance and a € budget are **not stored**                                                        |
| Language, theme                                                                                         | device settings, kept on the device (no backend need documented)                                                                                  |

### Open product decision (not decided here)

Three preference shapes coexist (DATABASE_SCHEMA.md → "Consistency audit" #4, DOCUMENTATION_RESTRUCTURE_REPORT.md):
the MVP `UserPreference` (stored), the built onboarding answers, and "Mes préférences". API-06 exposes the stored one
and adds **no column**. Before the mobile saves preferences, decide which screen writes what — e.g. map "Mes
préférences" types/ambiance to `interests`, or add `experienceTypes` / `ambiance` / `budgetPerPersonEur` to the model
(a small additive migration) — and whether onboarding answers are saved as preferences.

## Security

- Global `AuthGuard` (protected by default), identity from the session only, user isolation tested with two accounts.
- Responses built from explicit DTOs (`UserResponse`, `PreferencesResponse`): no Prisma row, hash, session, token,
  internal id or timestamp other than `updatedAt`. Checked in tests.
- Validation: whitelist + forbid unknown fields (API-02), values never echoed back.
- Not changed: CORS, headers, logs (no bodies logged). **Rate limiting is still not implemented** (see
  AUTHENTICATION.md → "Security"): required before any public deployment.

## Tests

- **Unit** (`pnpm test`): `UsersService` with `UserRepository` mocked (updates and reads for the session user only,
  empty change without query, deleted account → `AUTH_SESSION_INVALID`, outage passes through); DTOs (only the sent
  fields, mobile ↔ database values both ways, defaults, public user fields).
- **HTTP** (`test/users.e2e.spec.ts`, session and repository mocked): 401 on every route without a session; profile
  update and response shape; email / id / userId / unknown fields refused; type, length, format and nullability
  errors; defaults; mobile ↔ database values; a `userId` query parameter ignored; enum, range and array errors.
- **PostgreSQL** (`test/database/users.db-spec.ts`, `roam_test` only): two real accounts over HTTP — partial profile
  updates stored and read back, email unchanged, preferences created then partially updated and stored as database
  enums, isolation in both directions (query and body attempts included), no secret in responses, a revoked session
  refused, cascade on user deletion.

## Deferred

- Email change (with address verification); avatar upload (only a URL for now).
- The preference shape decision above; persisting onboarding answers.
- `User.stats` (needs journeys and favorites APIs).
- Account deletion, password change while signed in.
- Rate limiting (auth endpoints first).
