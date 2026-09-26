# ROAM API documentation (`apidocs`)

Documentation of the **API / backend**. Start from
[`../../../appdocs/DOCUMENTATION_INDEX.md`](../../../appdocs/DOCUMENTATION_INDEX.md) for the whole map.

## Status

`apps/api` is a NestJS 12 + Prisma 7 application: technical base (API-02, [`BACKEND_FOUNDATION.md`](BACKEND_FOUNDATION.md)),
database schema (API-03), repositories (API-04), authentication (API-05), profile and preferences (API-06), experience
catalog and recommendations (API-07), a catalog migrated from the mobile mock data (DATA-1), and journeys (API-08) —
[`API_IMPLEMENTATION_ROADMAP.md`](API_IMPLEMENTATION_ROADMAP.md). No provider is connected yet. The schema is migrated on a local PostgreSQL 18.6
(`roam`) and tested on a dedicated test database (`roam_test`, `pnpm test:db`).

The Data Foundation documents below are the target design of the data layer (how external data — Google Places,
Ticketmaster, French open data — becomes ROAM data served by the API), implemented one data sprint at a time
([`DATA_IMPLEMENTATION_PLAN.md`](DATA_IMPLEMENTATION_PLAN.md)).

Stack: Node.js, TypeScript, NestJS, REST (`/api/v1`), Prisma, PostgreSQL
([`appdocs/architecture/ARCHITECTURE.md`](../../../appdocs/architecture/ARCHITECTURE.md)).

## What belongs here

Backend implementation: modules, services, repositories, database and persistence, endpoints and DTOs, provider
adapters, normalization and enrichment, synchronization, cache, rate limiting, security, backend tests, configuration and
deployment.

## What does not

- Domain models and business rules shared with the apps (Experience, Place, Event, Journey, Recommendation, Feedback) →
  [`appdocs/domain/`](../../../appdocs/domain/DOMAIN_OVERVIEW.md). The canonical Experience/Place/Event models of the Data
  Foundation live there, as the single source of truth.
- Cross-application data rules (provenance, no provider JSON or keys in the mobile app) →
  [`appdocs/architecture/DATA_RULES.md`](../../../appdocs/architecture/DATA_RULES.md).
- Mobile implementation → [`apps/mobile/mobiledocs/`](../../mobile/mobiledocs/README.md).

## Documents

| Document                                                                               | Content                                                                                                                                         |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [`BACKEND_FOUNDATION.md`](BACKEND_FOUNDATION.md)                                       | Architecture, bootstrap, configuration and environment, Prisma, validation, errors, logging, CORS, health, routing, OpenAPI, tests, local setup |
| [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)                                             | Prisma data model: models, relations, enums, constraints, indexes, provider data vs. enrichment, deferred items, consistency audit              |
| [`REPOSITORY_ARCHITECTURE.md`](REPOSITORY_ARCHITECTURE.md)                             | Repositories: layers, Prisma boundary, domain types, methods, rules vs. persistence, transactions, errors, pagination, tests                    |
| [`AUTHENTICATION.md`](AUTHENTICATION.md)                                               | Authentication: strategy, endpoints, sessions, password reset, validation, errors, security, mobile contract, deferred                          |
| [`USER_PROFILE_AND_PREFERENCES.md`](USER_PROFILE_AND_PREFERENCES.md)                   | The signed-in user's profile and preferences: endpoints, validation, isolation, mobile contract, open preference decision                       |
| [`EXPERIENCE_CATALOG_API.md`](EXPERIENCE_CATALOG_API.md)                               | Experience catalog and recommendations: endpoints, pagination, filters, facts vs. ROAM context, ranking, relaxation, mobile gaps                |
| [`JOURNEY_API.md`](JOURNEY_API.md)                                                     | Journeys: lifecycle, endpoints, planning, validation, ownership, concurrency, errors, performance                                               |
| [`API_IMPLEMENTATION_ROADMAP.md`](API_IMPLEMENTATION_ROADMAP.md)                       | API steps (API-01 → API-08 and DATA-1 done, next), deferred items, decisions                                                                    |
| [`DATA_1_MIGRATION_REPORT.md`](DATA_1_MIGRATION_REPORT.md)                             | DATA-1: mobile mock data → canonical catalog — sources, mapping, ids, idempotence, provenance, what is not migrated, verifications              |
| [`DATA_FOUNDATION.md`](DATA_FOUNDATION.md)                                             | Objective, pipeline (sources → adapters → normalization → enrichment → database/cache → engine → app), initial sources, MVP scope (Paris)       |
| [`PROVIDER_ARCHITECTURE.md`](PROVIDER_ARCHITECTURE.md)                                 | Layers from the mobile app to provider adapters, adapter responsibilities, failures, secrets                                                    |
| [`NORMALIZATION_AND_ENRICHMENT.md`](NORMALIZATION_AND_ENRICHMENT.md)                   | Pipeline, pricing normalization, enrichment enums, confidence, rule-based first version                                                         |
| [`SYNC_CACHE_AND_COST_CONTROL.md`](SYNC_CACHE_AND_COST_CONTROL.md)                     | Sync flow, cache/TTL, deduplication, rate limiting, cost, observability                                                                         |
| [`DATA_SOURCE_MATRIX.md`](DATA_SOURCE_MATRIX.md)                                       | Which source provides which field; what ROAM owns                                                                                               |
| [`DATA_IMPLEMENTATION_PLAN.md`](DATA_IMPLEMENTATION_PLAN.md)                           | Data sprints DATA-1 → DATA-8                                                                                                                    |
| [`prompts/DATA_1_DATA_FOUNDATION_PROMPT.md`](prompts/DATA_1_DATA_FOUNDATION_PROMPT.md) | The first agent brief for DATA-1 (kept for traceability; DATA-1 was executed as the mock catalog migration)                                     |

Related shared documents: [`appdocs/domain/EXPERIENCE.md`](../../../appdocs/domain/EXPERIENCE.md),
[`PLACE.md`](../../../appdocs/domain/PLACE.md), [`EVENT.md`](../../../appdocs/domain/EVENT.md),
[`RECOMMENDATION.md`](../../../appdocs/domain/RECOMMENDATION.md) (with the recommendation data contract),
[`DATA_RULES.md`](../../../appdocs/architecture/DATA_RULES.md).
