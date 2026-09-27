# ROAM — Real Data MVP Implementation Plan

## DATA-1 — Data foundation — **done** as the initial catalog migration

The canonical models (Experience, Event, Place, location, pricing, atmosphere/enrichment, source metadata) and the
repositories were built by API-03/API-04 ([`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md),
[`REPOSITORY_ARCHITECTURE.md`](REPOSITORY_ARCHITECTURE.md)). DATA-1 migrated the mobile mock data into that canonical
catalog ([`DATA_1_MIGRATION_REPORT.md`](DATA_1_MIGRATION_REPORT.md)): the API now serves it, the mobile app reads it in API
mode since DATA-8. Provider interfaces come with their first adapter (DATA-2). DATA-1 is not provider ingestion.

## DATA-2 — Google Places — **done** (provider layer; not connected yet)

Implement backend adapter, place search/details, required fields, validation, normalization and source metadata.
Done: the provider contract, Google Places API (New) Nearby Search and Place Details with an explicit field mask, typed
errors, normalization, idempotent upsert by provider id — [`GOOGLE_PLACES_PROVIDER.md`](GOOGLE_PLACES_PROVIDER.md). Not
connected to an endpoint, a sync or the recommendations. The real Google check is blocked by the key's API restrictions.

## DATA-2.1 — Geoapify — **done** (second place provider; not connected yet)

A `PlaceProvider` on the DATA-2 contract, usable without Google billing (free plan): Places and Place Details,
OpenStreetMap identity, explicit category table, same errors and ingestion — [`GEOAPIFY_PROVIDER.md`](GEOAPIFY_PROVIDER.md).
Real check passed. Not connected to an endpoint, a sync or the recommendations.

## DATA-3 — Ticketmaster — **done** (run as the sprint named "DATA-4 — Ticketmaster"; not connected yet)

Implement event search/details where needed, normalization, pricing when available and graceful missing-price handling.
Done: the event contract, Discovery API v2 Event Search and Event Details, typed errors, normalization (venue as a place,
explicit segment table, absolute instants), idempotent upsert by provider id — [`TICKETMASTER_PROVIDER.md`](TICKETMASTER_PROVIDER.md).
Real check passed. Not connected to an endpoint, a sync or the recommendations.

## DATA-4 — Open Data — **done** (study; no adapter)

Select a small number of relevant French datasets. Document publisher, update frequency, schema, license/usage conditions, fields and normalization.
Done: DATAtourisme (places first, events after a date decision), Basilic (cultural venues, filtered) and Data ES (sports
places, filtered, later) selected and documented — licences and attribution (per-record producer and date for
DATAtourisme, per-image rights), freshness, identity, quality, overlap, mapping to `Place`/`Event`, the contract gaps
and the work left to DATA-6 — [`OPEN_DATA_SOURCES.md`](OPEN_DATA_SOURCES.md). No code, no import, no Prisma change.

## DATA-5 — Enrichment — **places done** (run as the sprint named "DATA-3 — ROAM enrichment")

Implement deterministic first-pass enrichment:

- atmosphere
- energy
- audience
- duration
- best moments
- ROAM tags

Done for places: category rules (definitional atmosphere, derived typical duration; energy, audience, moments and
tags left `UNKNOWN`/empty for lack of evidence), curated data never overwritten, idempotent writes, a computed quality
check — [`ROAM_ENRICHMENT.md`](ROAM_ENRICHMENT.md). Not done: experience enrichment, mood, attribute-based rules. Not
connected to a sync or the recommendations. Ticketmaster (listed as DATA-3 above) was done afterwards.

## DATA-6 — Persistence & synchronization — **done** (not connected to recommendations or endpoints)

Implement database models, upsert, deduplication, cache, sync, TTL strategy and observability.
Done: transactional upserts with advisory locks, cross-provider place deduplication (RNB + name, name + proximity),
ownership rules, per-source attribution and image rights, date-only events, freshness/TTL per provider, a generic sync
orchestrator (lease, pacing, retries, partial failures, resume, run journal), DATAtourisme, Basilic and Data ES
providers, `pnpm sync` — [`DATA_PERSISTENCE_AND_SYNC.md`](DATA_PERSISTENCE_AND_SYNC.md). Real check passed except Google
(key restrictions, DATA-2). Not scheduled, no endpoint; a `sport` category is a product decision (DATA-7).

## DATA-7 — Recommendations

Implement context filtering, matching, configurable scoring and truthful recommendation explanations.

## DATA-8 — Mobile integration — **first step done** (API integration layer)

Mobile calls only ROAM APIs. Existing screens continue using canonical ROAM models, through adapters. Done: one API
client, secure session, typed errors (401, 429), the mock/API switch, authentication, the current user, the experience
catalog and search. Still on the mobile's local data: recommendations, preferences, favorites UI, journeys, feedback —
[`apps/mobile/mobiledocs/MOBILE_API_INTEGRATION.md`](../../mobile/mobiledocs/MOBILE_API_INTEGRATION.md).

## Development rule

One data sprint at a time. After each sprint run TypeScript, ESLint, tests and relevant build checks; update docs; commit; stop for validation.
