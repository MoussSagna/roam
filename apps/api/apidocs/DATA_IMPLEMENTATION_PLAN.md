# ROAM — Real Data MVP Implementation Plan

## DATA-1 — Data foundation — **done** as the initial catalog migration

The canonical models (Experience, Event, Place, location, pricing, atmosphere/enrichment, source metadata) and the
repositories were built by API-03/API-04 ([`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md),
[`REPOSITORY_ARCHITECTURE.md`](REPOSITORY_ARCHITECTURE.md)). DATA-1 migrated the mobile mock data into that canonical
catalog ([`DATA_1_MIGRATION_REPORT.md`](DATA_1_MIGRATION_REPORT.md)): the API now serves it, the mobile app keeps its mocks
until DATA-8. Provider interfaces come with their first adapter (DATA-2). DATA-1 is not provider ingestion.

## DATA-2 — Google Places

Implement backend adapter, place search/details, required fields, validation, normalization and source metadata.

## DATA-3 — Ticketmaster

Implement event search/details where needed, normalization, pricing when available and graceful missing-price handling.

## DATA-4 — Open Data

Select a small number of relevant French datasets. Document publisher, update frequency, schema, license/usage conditions, fields and normalization.

## DATA-5 — Enrichment

Implement deterministic first-pass enrichment:

- atmosphere
- energy
- audience
- duration
- best moments
- ROAM tags

## DATA-6 — Persistence & synchronization

Implement database models, upsert, deduplication, cache, sync, TTL strategy and observability.

## DATA-7 — Recommendations

Implement context filtering, matching, configurable scoring and truthful recommendation explanations.

## DATA-8 — Mobile integration

Mobile calls only ROAM APIs. Existing screens continue using canonical ROAM models.

## Development rule

One data sprint at a time. After each sprint run TypeScript, ESLint, tests and relevant build checks; update docs; commit; stop for validation.
