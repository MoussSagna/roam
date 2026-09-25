# ROAM — Real Data MVP Implementation Plan

## DATA-1 — Data foundation

Build:

- canonical Experience
- Event
- Place
- Location
- Pricing
- Atmosphere
- Source metadata
- provider interfaces
- repository interfaces
- compatible mock adapters

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
