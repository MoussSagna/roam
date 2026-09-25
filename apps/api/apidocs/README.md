# ROAM API documentation (`apidocs`)

Documentation of the **API / backend**. Start from
[`../../../appdocs/DOCUMENTATION_INDEX.md`](../../../appdocs/DOCUMENTATION_INDEX.md) for the whole map.

## Status

**No backend code exists yet.** `apps/api` contains only these documents: the design of the **Data Foundation** (how
external data — Google Places, Ticketmaster, French open data — becomes ROAM data served by a ROAM API). Nothing here is
implemented; every document is a target design, to be implemented one data sprint at a time
([`DATA_IMPLEMENTATION_PLAN.md`](DATA_IMPLEMENTATION_PLAN.md)).

Planned stack (proposal, [`appdocs/architecture/ARCHITECTURE.md`](../../../appdocs/architecture/ARCHITECTURE.md)): Node.js, TypeScript, REST for the MVP, Prisma,
PostgreSQL. The backend framework is **not decided** (see the restructure report).

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

| Document                                                                               | Content                                                                                                                                   |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`DATA_FOUNDATION.md`](DATA_FOUNDATION.md)                                             | Objective, pipeline (sources → adapters → normalization → enrichment → database/cache → engine → app), initial sources, MVP scope (Paris) |
| [`PROVIDER_ARCHITECTURE.md`](PROVIDER_ARCHITECTURE.md)                                 | Layers from the mobile app to provider adapters, adapter responsibilities, failures, secrets                                              |
| [`NORMALIZATION_AND_ENRICHMENT.md`](NORMALIZATION_AND_ENRICHMENT.md)                   | Pipeline, pricing normalization, enrichment enums, confidence, rule-based first version                                                   |
| [`SYNC_CACHE_AND_COST_CONTROL.md`](SYNC_CACHE_AND_COST_CONTROL.md)                     | Sync flow, cache/TTL, deduplication, rate limiting, cost, observability                                                                   |
| [`DATA_SOURCE_MATRIX.md`](DATA_SOURCE_MATRIX.md)                                       | Which source provides which field; what ROAM owns                                                                                         |
| [`DATA_IMPLEMENTATION_PLAN.md`](DATA_IMPLEMENTATION_PLAN.md)                           | Data sprints DATA-1 → DATA-8                                                                                                              |
| [`prompts/DATA_1_DATA_FOUNDATION_PROMPT.md`](prompts/DATA_1_DATA_FOUNDATION_PROMPT.md) | The agent brief for DATA-1 (a task prompt, kept for traceability)                                                                         |

Related shared documents: [`appdocs/domain/EXPERIENCE.md`](../../../appdocs/domain/EXPERIENCE.md),
[`PLACE.md`](../../../appdocs/domain/PLACE.md), [`EVENT.md`](../../../appdocs/domain/EVENT.md),
[`RECOMMENDATION.md`](../../../appdocs/domain/RECOMMENDATION.md) (with the recommendation data contract),
[`DATA_RULES.md`](../../../appdocs/architecture/DATA_RULES.md).
