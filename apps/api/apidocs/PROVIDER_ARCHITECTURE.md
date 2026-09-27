# ROAM — Provider Architecture

## Goal

External APIs must not leak into the mobile application or core domain model.

```text
Mobile
  ↓
ROAM API
  ↓
Application services
  ↓
Repositories
  ↓
Canonical ROAM models
  ↓
Provider adapters
  ├── Google Places
  ├── Geoapify
  ├── Ticketmaster
  └── Open Data
```

## Adapter responsibilities

1. Call the external provider.
2. Validate the response.
3. Map it to an internal provider DTO.
4. Normalize into ROAM models.
5. Record source metadata.
6. Handle provider-specific errors.

Keep provider DTOs separate from domain models.

## Failure handling

Providers can timeout, rate-limit, return partial data or no results. Fail gracefully.

## Current implementation

DATA-2: the contract (`PlaceProvider`, `NormalizedPlace`, typed `ProviderError`s) and the Google Places adapter in
`apps/api/src/modules/providers/`, with `PlaceIngestionService` writing through the catalog repositories —
[`GOOGLE_PLACES_PROVIDER.md`](GOOGLE_PLACES_PROVIDER.md).

DATA-2.1: the Geoapify adapter, a second `PlaceProvider` on the same contract, errors and ingestion (usable on
Geoapify's free plan) — [`GEOAPIFY_PROVIDER.md`](GEOAPIFY_PROVIDER.md).

DATA-4: the event contract (`EventProvider`, `NormalizedEvent`) next to the place one, the Ticketmaster adapter and
`EventIngestionService` (venues go through `PlaceIngestionService`) — [`TICKETMASTER_PROVIDER.md`](TICKETMASTER_PROVIDER.md).

DATA-6: the open data adapters (DATAtourisme places and events, Basilic, Data ES), the transactional upserts with
cross-provider deduplication, and the generic synchronization (`src/modules/sync`) —
[`DATA_PERSISTENCE_AND_SYNC.md`](DATA_PERSISTENCE_AND_SYNC.md).

## Secrets

API keys belong on the backend/server environment. Never put provider keys in React Native source or Git.
