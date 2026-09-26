# ROAM API — Repository architecture

The data access layer of the ROAM backend (task API-04): the repositories that sit between the future domain
services and PostgreSQL. It builds on the foundation ([`BACKEND_FOUNDATION.md`](BACKEND_FOUNDATION.md)) and the data
model ([`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)). **No service, no endpoint, no business rule is implemented here**:
the repositories are ready for the domain modules that come next.

## Layers

```text
Controller (HTTP, DTOs)          — later
   ↓
Service (rules, transitions)     — AuthService (API-05), UsersService (API-06), ExperiencesService and RecommendationsService (API-07), JourneysService (API-08), JourneyFeedbackService (API-09)
   ↓
Repository (persistence)         — API-04: src/modules/<domain>/*.repository.ts
   ↓
PrismaService (the only client)  — API-02: src/database/prisma.service.ts
   ↓
PostgreSQL (constraints)         — API-03: schema, CHECKs, partial unique index

External provider → Adapter → Normalization → ROAM enrichment → Repository → PostgreSQL   (DATA-2 → DATA-6)
```

| Layer      | Owns                                                                                            | Never                                                      |
| ---------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Service    | domain rules, transitions, what an error means for the user (`ApiException` with a domain code) | imports Prisma, writes SQL                                 |
| Repository | queries, writes, transactions, Prisma ↔ domain mapping, Prisma error translation                | decides a business rule, scores, ranks, throws HTTP errors |
| PostgreSQL | integrity: keys, unique/partial indexes, CHECKs, delete rules                                   | replaces the service's rules (it only guarantees them)     |

## The Prisma boundary

- Only `src/database/` and the repositories (`*.repository.ts`, with their `*.mappers.ts`) import the Prisma client
  or `@prisma/*`, and only repositories inject `PrismaService` in `src/modules/` (the health controller excepted:
  it only pings). **Enforced by ESLint** (`no-restricted-imports` in `apps/api/eslint.config.js`).
- Repositories take and return **domain types** (`Journey`, `Experience`, `Place`, `User`…), declared next to them
  (`journey.types.ts`, `catalog.types.ts`, or in the repository file for small ones). Services never see a Prisma
  row, a `Prisma.*Input`, a `Decimal` or a `JsonValue` from Prisma.
- The schema's vocabularies (`JourneyStatus`, `PriceLevel`…) are imported from `src/generated/prisma/enums.ts`: plain
  string unions generated from the schema, the single source of these values — not a Prisma runtime dependency.

### Why domain types (and not Prisma's)

Prisma's model types mirror tables; the domain reads differently, and the difference is real, not cosmetic:

| Domain type                   | Prisma row                                       |
| ----------------------------- | ------------------------------------------------ |
| `Journey.startLocation {…}`   | five `start*` columns (JOURNEY.md groups them)   |
| `Journey.steps` without ids   | `JourneyStep` rows with `id`, `journeyId`        |
| `categorySlugs: string[]`     | `PlaceCategory` / `ExperienceCategory` join rows |
| `placeIds` / `places` ordered | `ExperiencePlace` rows with `position`           |
| prices as `number`            | `Prisma.Decimal`                                 |
| `enrichment` nested           | separate `RoamEnrichment` table                  |

Mapping is one function per shape (`toJourney`, `toPlace`, `toExperience`…), no mapper framework, no class hierarchy.
Types are **not** duplicated where nothing differs (`Favorite`, `User`, `JourneyFeedback` are near 1:1 copies, kept
explicit so a column added to the schema is not exposed by accident).

### Why no repository interfaces

Each repository is a concrete `@Injectable()` class used as its own DI token. There is one implementation
(PostgreSQL) and none other is planned; a service test mocks the class
(`Test.createTestingModule(...).overrideProvider(JourneyRepository)`). If a second implementation appears, extract an
abstract class token then — the public methods do not change.

## Repositories

Aggregates, not tables: join tables and child rows go through their owner.

| Module (`src/modules/`) | Repository                  | Aggregate                                                    | Main use (documented)                                                   |
| ----------------------- | --------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `users`                 | `UserRepository`            | `User` + `UserPreference`                                    | profile, preferences (MVP_SCOPE §2), lookup by email for authentication |
| `catalog`               | `ExperienceRepository`      | `Experience` + ordered places, categories, enrichment (read) | home/detail/search (mobile `ExperienceRepository`), journey planning    |
| `catalog`               | `PlaceRepository`           | `Place` + categories, provenance, enrichment (read)          | detail, provider pipeline (dedup by provider id)                        |
| `catalog`               | `EventRepository`           | `Event` + venue, experience, category, provenance            | "what's on", provider pipeline                                          |
| `catalog`               | `CategoryRepository`        | `Category`                                                   | category list (mobile `CategoryRepository`)                             |
| `journeys`              | `JourneyRepository`         | `Journey` + `JourneyStep`                                    | JOURNEY.md: create, current, history, edit, progress, complete          |
| `journeys`              | `JourneyFeedbackRepository` | `JourneyFeedback`                                            | FEEDBACK.md: one feedback per completed journey                         |
| `favorites`             | `FavoriteRepository`        | `Favorite` (user ↔ experience)                               | save / unsave / list (mobile D-57)                                      |

Authentication (API-05, [`AUTHENTICATION.md`](AUTHENTICATION.md)) adds, in `src/modules/auth/`:
`AuthSessionRepository` (`create`, `findValid` — session and user in one query —, `deleteByTokenHash`) and
`PasswordResetRepository` (`save`, `takeAttempt` — atomic attempt count —, `complete` — one transaction: new password
hash, every session revoked, code deleted). The `User` type never carries the password hash.

No repository for: `ExperiencePlace`, `PlaceCategory`, `ExperienceCategory`, `JourneyStep` (children of their
aggregate), `ExternalSource` and `Provider` (written with the record they describe; a provider is registered on first
use by its adapter key), `RoamEnrichment` (read with its place/experience; its writes belong to DATA-5).

The DATA-1 catalog migration (`src/database/catalog-seed/`) is a database-layer tool, like the migrations: it writes
with Prisma directly (inside `src/database/`, where the Prisma boundary allows it), in one transaction, and is run by
`prisma db seed` — not by a service ([`DATA_1_MIGRATION_REPORT.md`](DATA_1_MIGRATION_REPORT.md)).

### Methods

| Repository                  | Methods                                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `UserRepository`            | `findById`, `findByEmail`, `create` (optionally with a password hash), `findCredentialsByEmail` (login only), `updateProfile`, `findPreference`, `savePreference` (upsert)                                                     |
| `ExperienceRepository`      | `findById` (with places), `findManyByIds` (in the given order), `listActive(filter, page)` — filters `city`, `categorySlug`, `maxPrice`, `text`, `area` (API-07) —, `findCandidates(filter, max)` (API-07), `create`, `update` |
| `PlaceRepository`           | `findById`, `findBySource(providerKey, externalId)`, `create` (categories + source), `update`                                                                                                                                  |
| `EventRepository`           | `findById`, `findBySource`, `listUpcoming({ from, to }, page)`, `create`, `update`                                                                                                                                             |
| `CategoryRepository`        | `list`                                                                                                                                                                                                                         |
| `JourneyRepository`         | `findById`, `findActiveByUserId`, `listCompletedByUserId(page)`, `create`, `replaceSteps`, `updateProgress`, `complete` — the last three optionally conditioned on `expectedCurrentStep` (API-08)                              |
| `JourneyFeedbackRepository` | `findByJourneyId`, `create`                                                                                                                                                                                                    |
| `FavoriteRepository`        | `add`, `remove`, `isFavorite`, `listByUserId(page)`                                                                                                                                                                            |

Only what a documented flow needs. Not added on purpose: deletes of catalog records (they are deactivated —
DATABASE_SCHEMA.md), user deletion (no account deletion flow yet), provider upsert/refresh bookkeeping (DATA-6),
enrichment writes (DATA-5), recommendation queries (DATA-7).

**Journey edits.** The mobile store edits a journey in several ways (add, remove, move a step, reorder — then replans
arrivals and totals). Every edit replans the whole list, so the repository offers one write for all of them:
`replaceSteps(id, { steps, currentStep, plan })`. The service computes the new list; the repository stores it
atomically.

**Filters.** `listActive({ city, categorySlug })` and `listUpcoming({ from, to })` are plain data filters. Matching a
context (mood, budget, distance, duration), scoring and ranking belong to the recommendation service (RECOMMENDATION.md)
and are not in any query.

## Business rules vs. persistence

| Rule (JOURNEY.md, FEEDBACK.md)             | Service (later)                                 | Repository / PostgreSQL (now)                                                                                |
| ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| At most one ACTIVE journey per user        | checks `findActiveByUserId` first → clear error | `create` translates the partial unique index violation into `ActiveJourneyExistsError` (the concurrent case) |
| Draft never saved; created ACTIVE          | builds the journey from the draft               | `create` always stores `ACTIVE`                                                                              |
| ACTIVE → COMPLETED once                    | decides when (last step done)                   | `complete` is a conditional update (`WHERE status = 'ACTIVE'`): `null` if already completed                  |
| `currentStep` within the steps, edit rules | computes it                                     | `updateProgress` / `replaceSteps` only write an ACTIVE journey                                               |
| Each experience once per journey           | drops duplicates (`isExperienceInJourney`)      | unique `(journeyId, experienceId)` → `UniqueConstraintError`, whole edit rolled back                         |
| Feedback: completed journey, same user     | checks it                                       | —                                                                                                            |
| Feedback: one per journey, rating 1–5      | validates (DTO, `isValidJourneyRating`)         | `JourneyFeedbackExistsError` (unique), `CheckConstraintError` (CHECK)                                        |
| Favorites are a set                        | —                                               | `add` / `remove` idempotent (`INSERT … ON CONFLICT`, `deleteMany`)                                           |

A conditional update returning `null` is a fact ("not ACTIVE any more"), not a decision: the service turns it into
its answer (404, 409…).

## Transactions and concurrency

- **One Prisma write = one statement or one implicit transaction.** Nested writes (a journey with its steps, a place
  with its categories and source, an experience with its places) are atomic without `$transaction`: a failure leaves
  nothing behind (tested).
- **Explicit transaction, only where several writes must stay together:** `JourneyRepository.replaceSteps`
  (update journey → delete steps → insert steps → read back). Its first statement, a conditional `UPDATE` on the
  journey row, takes the row lock: concurrent edits of one journey run one after the other and never interleave.
- **PostgreSQL arbitrates races, not memory:** two concurrent journey creations (partial unique index), two concurrent
  favorites (unique key + `ON CONFLICT`), two feedbacks (unique `journeyId`), a completion racing an edit (conditional
  updates). Concurrent calls are tested for journey creations and favorites; the completion/edit race relies on the
  row lock and the `WHERE status = 'ACTIVE'` condition (tested sequentially).
- **Not needed yet:** a transaction spanning several repositories (e.g. complete a journey and write its feedback in
  one unit). When a service needs one, add a unit-of-work helper in `src/database/` that passes the transaction client
  to the repositories — not before.
- Default isolation (READ COMMITTED); no retries. A provider sync upserting at high concurrency (DATA-6) may need
  `connectOrCreate` races handled (the provider row): it surfaces today as `UniqueConstraintError`.

## Errors

Repositories never let a Prisma error out. Every public method runs through `persist()`
(`src/database/persistence-errors.ts`), which translates by shape (no dependency on the generated client):

| Prisma / PostgreSQL                                                        | Repository error                                | If no service handles it (global filter) |
| -------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| `P2002` unique (23505)                                                     | `UniqueConstraintError(constraint)`             | 409 `CONFLICT`                           |
| `P2003` foreign key (23503) / restrict (23001)                             | `ForeignKeyConstraintError(reason, constraint)` | 409 `CONFLICT`                           |
| `P2025` record not found (update, delete, nested connect)                  | `RecordNotFoundError(model)`                    | 404 `NOT_FOUND`                          |
| CHECK (23514)                                                              | `CheckConstraintError(constraint)`              | 422 `UNPROCESSABLE_ENTITY`               |
| `P1001` / `P1002` / `P1008` / `P1017`, adapter "not reachable", init error | `DatabaseUnavailableError`                      | 503 `DATABASE_UNAVAILABLE`               |
| invalid page cursor                                                        | `InvalidCursorError`                            | 400 `BAD_REQUEST`                        |
| anything else                                                              | unchanged                                       | 500 `INTERNAL_ERROR`                     |

- Domain translations live in the repository that knows the constraint: `ActiveJourneyExistsError`,
  `JourneyFeedbackExistsError`. Services map errors to `ApiException` with domain codes (e.g. `JOURNEY_ALREADY_ACTIVE`).
- The global filter maps what is left (and raw Prisma errors, as a safety net) to generic messages: no constraint or
  model name, no SQL, no host, no row data. It logs the error class only — a PostgreSQL CHECK violation carries the
  whole failing row (personal data), so the original error is never kept as `cause` nor logged.
- Fixed on the way: with the `pg` adapter an unreachable database raises `P1001` (not
  `PrismaClientInitializationError`), which the filter used to answer with a 500; it is now a 503.
- Reads return `null` for "not found"; only writes throw `RecordNotFoundError`.

## Pagination

No pagination is specified by the documentation yet, so the contract is internal (`src/database/pagination.ts`):
**keyset (cursor)** — `{ limit?, cursor? }` → `{ items, nextCursor }`; default 20, max 100; the cursor is the id of the
last item (UUID v7), validated before it reaches SQL; a stable tie-breaker `id` in every order. Used by the lists that
grow without bound: `listActive`, `listUpcoming`, `listCompletedByUserId`, `listByUserId`. `findManyByIds` and
`CategoryRepository.list` are bounded by their input. The public format (query parameters, response) is decided with
the first list endpoint.

## Logging

Repositories log nothing (no query log, no payloads). Prisma query logging stays off. Persistence errors reaching the
filter are logged as one line: route, status, code, error class.

## Naming conventions

- Files: `src/modules/<domain>/<entity>.repository.ts`, `<domain>.types.ts` (or types in the repository file),
  `<domain>.mappers.ts` when several repositories share mappers, `<domain>.module.ts`.
- Classes: `<Entity>Repository`; modules `<Domain>Module` exporting their repositories.
- Methods: `findX` returns `T | null`; `listX` returns `Page<T>` or a bounded list; `create` / `update` / `add` /
  `remove` / `save` / domain verbs (`complete`, `replaceSteps`) for writes; conditional writes return `T | null`.
- Inputs: `NewX` (create), `XChange` (update: `undefined` = unchanged, `null` = cleared).

## Tests

- **Unit, no database** (`pnpm test`): error translation from the real Prisma 7 error shapes
  (`persistence-errors.spec.ts`), pagination, the filter's persistence mapping, mappers (`catalog.mappers.spec.ts`),
  and repository behavior with Prisma mocked (journey: mapping, ACTIVE on create, active-journey error, conditional
  completion, outage → `DatabaseUnavailableError`; favorites: idempotent add/remove).
- **Integration, PostgreSQL** (`pnpm test:db`, `test/database/repositories.db-spec.ts`, on `roam_test` only — same
  guards as API-03): every repository through the application's own modules (real DI, real `PrismaService`): CRUD,
  relations, ordering, pagination, filters, provenance lookup, JSON and decimals, unique / foreign key / CHECK errors,
  atomic nested writes, `replaceSteps` rollback, concurrent journey creations and favorites, conditional transitions.
