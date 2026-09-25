# ROAM API — Backend foundation

The technical base of the ROAM API (task API-02): bootstrap, configuration, database access, validation, errors,
logging, CORS, health check, routing, OpenAPI and tests. **No domain is implemented yet** (Experiences, Places, Events,
Journeys, Recommendations, Favorites, Feedback, authentication): they are built on top of this foundation by their own
tasks — see [`API_IMPLEMENTATION_ROADMAP.md`](API_IMPLEMENTATION_ROADMAP.md). Domain concepts live in
[`appdocs/domain/`](../../../appdocs/domain/DOMAIN_OVERVIEW.md).

## Stack

| Area             | Choice                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| Runtime          | Node.js ≥ 22.13 (developed with 24), **ESM** (`"type": "module"`, imports end in `.js`) |
| Framework        | NestJS 12 (`@nestjs/core`, `platform-express` on Express 5)                             |
| Language         | TypeScript 6, strict, `module: nodenext`, decorators with metadata                      |
| Database         | PostgreSQL through **Prisma 7** (`prisma-client` generator + `@prisma/adapter-pg`)      |
| Configuration    | `@nestjs/config`, validated with `class-validator`                                      |
| Validation       | `ValidationPipe` + `class-validator` / `class-transformer` DTOs                         |
| Security headers | `helmet`                                                                                |
| OpenAPI          | `@nestjs/swagger`                                                                       |
| Tests            | Vitest 4 + `@nestjs/testing` + `supertest` (the NestJS 12 ESM default)                  |
| Lint             | ESLint 9 + `typescript-eslint` (type-checked), like the rest of the monorepo            |

Package: `@roam/api` (`apps/api`), a pnpm workspace of the monorepo.

## Architecture

```text
src/
├── main.ts                     bootstrap: logger levels, configureApp, listen, startup log / clean exit
├── app.module.ts               root module: config, database, modules + global pipe/filter/interceptor
├── bootstrap/configure-app.ts  HTTP setup shared by main.ts and the tests (helmet, CORS, logging,
│                               /api/v1 routing, Swagger, shutdown hooks)
├── config/                     environment.ts (schema + validation), app-config.service.ts (typed access),
│                               app-config.module.ts, cors.ts
├── common/
│   ├── errors/                 ErrorCode, ErrorResponseBody, ApiException, FieldError
│   ├── filters/                AllExceptionsFilter (the one error handler)
│   ├── interceptors/           ResponseEnvelopeInterceptor ({ data })
│   ├── decorators/             @RawResponse()
│   ├── pipes/                  createValidationPipe()
│   └── logging/                requestLogger middleware
├── database/                   DatabaseModule (global) + PrismaService (the only Prisma client)
├── generated/prisma/           Prisma client, generated — not committed
└── modules/
    └── health/                 GET /health, GET /health/database
prisma/schema.prisma            datasource + generator only (no model yet)
prisma.config.ts                Prisma 7 config: schema, migrations path, DATABASE_URL
test/                           setup-env.ts, app.e2e.spec.ts (unit specs sit next to their code)
```

Layers for the domain modules to come (under `src/modules/<domain>/`):

```text
Controller (HTTP, DTOs) → Service (rules) → Repository (persistence) → PrismaService → PostgreSQL
External provider → Provider adapter → Normalization → ROAM enrichment → Domain model → Repository → Database
```

Controllers never touch Prisma; repositories inject `PrismaService` (never `new PrismaClient()`). Provider adapters
follow [`PROVIDER_ARCHITECTURE.md`](PROVIDER_ARCHITECTURE.md).

## Bootstrap

`main.ts` creates the app with buffered logs, applies the configured log levels and flushes the buffer, runs
`configureApp`, listens on `PORT` and logs what is running: environment, routes, CORS origins, and **whether** each
provider key is set (never its value). Any startup failure (invalid configuration, database unreachable in
production) ends with one error line and exit code 1. Shutdown hooks close the database pool on `SIGTERM`/`SIGINT`.

## Configuration and environment

- **One place reads the environment:** `ConfigModule.forRoot({ validate: validateEnvironment })`. The rest of the code
  injects `AppConfigService` (typed getters `app`, `database`, `cors`, `logging`, `swagger`, `providers`, `auth`) and
  never reads `process.env`. (Exceptions: `app-config.module.ts` decides whether to read `.env` from `NODE_ENV`;
  `prisma.config.ts` is read by the Prisma CLI, outside Nest.)
- **Validated at startup:** an invalid or missing variable stops the app with `Invalid API configuration:` and one line
  per variable and rule. Values are never printed.
- `.env` is read in local development only (ignored when `NODE_ENV=test`); real environments inject variables.
  [`.env.example`](../.env.example) lists them with placeholders — copy it to `.env`, never commit `.env`.

| Variable                | Required | Default                                    | Use                                                            |
| ----------------------- | -------- | ------------------------------------------ | -------------------------------------------------------------- |
| `NODE_ENV`              | no       | `development`                              | `development` \| `test` \| `production`                        |
| `PORT`                  | no       | `3000`                                     | HTTP port                                                      |
| `DATABASE_URL`          | **yes**  | —                                          | `postgresql://…` connection string                             |
| `CORS_ORIGINS`          | no       | none                                       | Comma-separated browser origins                                |
| `LOG_LEVEL`             | no       | `debug` (dev), `warn` (test), `log` (prod) | `error` \| `warn` \| `log` \| `debug` \| `verbose`             |
| `SWAGGER_ENABLED`       | no       | on outside production                      | Swagger UI and document                                        |
| `GOOGLE_PLACES_API_KEY` | no       | —                                          | Future Google Places adapter (not used yet)                    |
| `TICKETMASTER_API_KEY`  | no       | —                                          | Future Ticketmaster adapter (not used yet)                     |
| `AUTH_JWT_SECRET`       | no       | —                                          | Future authentication (not used yet); ≥ 32 characters when set |

Provider keys stay on the server (`appdocs/architecture/DATA_RULES.md`): never in the mobile app, never in Git.

## Database and Prisma

- `prisma/schema.prisma` declares the PostgreSQL datasource and the `prisma-client` generator (ESM, output
  `src/generated/prisma`). **No model**: the ROAM schema is designed with the domain tasks.
- `prisma.config.ts` (Prisma 7) holds the schema path, the migrations folder (`prisma/migrations`) and `DATABASE_URL`
  (loaded from `.env` when present). `prisma generate` and `prisma validate` need no database.
- **`PrismaService`** extends the generated `PrismaClient` with the `pg` driver adapter; `DatabaseModule` is global and
  provides this single instance to every module. Lifecycle:
  - startup: `SELECT 1` with a 3 s timeout. Reachable → "Database connection established". Unreachable → **production**:
    the startup fails (clean error, no driver details); **elsewhere**: a warning, and the API starts without it;
  - `isReachable()` for health checks (never throws);
  - `$disconnect()` on shutdown.
- Scripts: `prisma:generate` (run automatically by `build`, `typecheck`, `test`), `prisma:validate`,
  `prisma:migrate:dev`, `prisma:migrate:deploy` (the last two need a PostgreSQL).

## Routing and versioning

- Domain endpoints: **`/api/v1/...`** — global prefix `api` + URI versioning, default version `1`. A breaking change
  becomes `v2` on the affected controller (`@Controller({ path, version: '2' })`).
- Infrastructure endpoints outside the prefix: **`/health`**, **`/health/database`**, and **`/docs`** (+ `/docs-json`).
- There was no route before API-02, so nothing changed for any client.

## Response convention

- **Success:** `{ "data": … }`, added by `ResponseEnvelopeInterceptor` to whatever a handler returns (`null` when it
  returns nothing). `@RawResponse()` opts out — only for infrastructure endpoints (health).
- **Error:** `{ "error": { "code": "…", "message": "…", "details": … } }`, `details` only when useful.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": [
      { "field": "name", "messages": ["name must be longer than or equal to 2 characters"] }
    ]
  }
}
```

## Validation

Global `ValidationPipe` (`createValidationPipe`): `whitelist` + `forbidNonWhitelisted` (an undeclared property is a
400, not silently dropped), `transform` (payloads become DTO instances; no implicit type conversion — use
`ParseIntPipe` or DTO transforms), errors mapped to `VALIDATION_ERROR` with one entry per field (nested fields as
`parent.child`). Rejected values are never echoed back.

## Error handling

One global filter, `AllExceptionsFilter` (registered as `APP_FILTER`):

| Thrown                                          | Status  | `error.code`                                       | Message                                         |
| ----------------------------------------------- | ------- | -------------------------------------------------- | ----------------------------------------------- |
| `ApiException(status, code, message, details?)` | its own | its own                                            | its own                                         |
| Nest `HttpException` (e.g. `NotFoundException`) | its own | derived from the status (`NOT_FOUND`, `CONFLICT`…) | its own (router 404: path without query string) |
| Validation failure                              | 400     | `VALIDATION_ERROR`                                 | "The request is invalid." + `details`           |
| `PrismaClientInitializationError`               | 503     | `DATABASE_UNAVAILABLE`                             | generic                                         |
| Anything else (bugs, other Prisma errors)       | 500     | `INTERNAL_ERROR`                                   | generic                                         |

Stack traces, SQL and driver details are logged server-side and never sent. Domain modules throw `ApiException` with
their own codes (e.g. `JOURNEY_ALREADY_ACTIVE`) or map Prisma's known errors in their repositories.

## Logging

Nest's logger with levels from `LOG_LEVEL`. One line per request (`method path status duration`), path without query
string, health probes at debug level, 4xx as warnings, 5xx as errors; unexpected errors with their stack; database
state at startup; configuration summary at startup. Never logged: request bodies or headers, query strings, passwords,
tokens, API keys, `DATABASE_URL`.

## CORS and security

- CORS is for browsers only (Expo web, the future web app); native mobile calls and server-to-server calls send no
  `Origin` and are unaffected. Only the origins in `CORS_ORIGINS` are allowed; none when empty (production default until
  its domains are known). Never `*`. No credentials (cookies) for now.
- `helmet` security headers; `X-Powered-By` removed. The Content-Security-Policy is disabled while Swagger UI is served
  (it needs inline scripts); the API itself only returns JSON.
- Not in this step, on purpose: authentication and authorization (own task), rate limiting (to add with the first
  public or provider-backed endpoints, `SYNC_CACHE_AND_COST_CONTROL.md`).

## Health check

| Endpoint               | 200                                                                     | Failure                    |
| ---------------------- | ----------------------------------------------------------------------- | -------------------------- |
| `GET /health`          | `{ "status": "ok" }` — the API is up; **never depends on the database** | —                          |
| `GET /health/database` | `{ "status": "ok" }`                                                    | 503 `DATABASE_UNAVAILABLE` |

## OpenAPI

Swagger UI on **`/docs`**, JSON document on **`/docs-json`**, enabled outside production by default
(`SWAGGER_ENABLED`). Only the health endpoints are documented today; each domain module documents its endpoints and
DTOs (`@ApiTags`, `@ApiOperation`, response decorators) when it is built.

## Testing

`pnpm --filter @roam/api test` — Vitest, **no PostgreSQL needed**:

- `test/setup-env.ts` sets a deterministic environment (no `.env`; `DATABASE_URL` points at a closed port, so an
  accidental connection fails fast);
- unit tests next to the code: configuration validation and defaults, CORS, the error filter, the validation pipe,
  `PrismaService` lifecycle (its queries are mocked);
- `test/app.e2e.spec.ts`: the whole `AppModule` with `configureApp`, `PrismaService` replaced by a mock, and a test-only
  module standing in for a future domain module — health, `/api/v1` routing and envelope, validation, errors, security
  headers, CORS, OpenAPI, over HTTP (`supertest`).

Database integration tests (real queries, migrations) come with the first model, once a PostgreSQL is available.

## Local development

**Current local setup (2026-09-25):** Node.js 24 and pnpm 12. **PostgreSQL is not installed. Docker is not installed.**

What works without PostgreSQL: install, `prisma generate`/`validate`, typecheck, lint, all tests, and running the API
(outside production): `/health` answers, `/health/database` reports 503, the startup logs a warning.

```bash
pnpm install                                  # repository root
cp apps/api/.env.example apps/api/.env        # then edit the placeholders
pnpm --filter @roam/api start:dev             # watch mode (nest start --watch)
pnpm --filter @roam/api build && pnpm --filter @roam/api start:prod
pnpm --filter @roam/api test | lint | typecheck
```

## Required later for a complete backend run

- A PostgreSQL database (a version supported by Prisma 7; local install, container or managed instance) and its `DATABASE_URL` in `.env`.
- Then: `pnpm --filter @roam/api prisma:migrate:dev` once models exist, a check that `/health/database` returns 200, and
  the database integration tests.
- In production: `NODE_ENV=production`, `DATABASE_URL`, `CORS_ORIGINS` (the real web origins), and the provider/auth
  secrets from the hosting platform's secret store; `prisma:migrate:deploy` before starting.
