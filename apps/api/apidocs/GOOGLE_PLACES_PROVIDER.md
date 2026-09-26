# ROAM API — Google Places provider (DATA-2)

The first external provider: Google Places API (New), backend only, behind a provider contract. DATA-2 builds and
validates the ingestion layer; **it is not connected to anything yet**. No endpoint, no scheduled sync, no change to
`GET /api/v1/recommendations`, the DATA-1 catalog or the mobile app.

```text
Google Places API (New)
      ↓  google-places.client.ts   HTTP: URL, key header, field mask, timeout, status → typed error, validation
      ↓  google-places.dto.ts      Google shapes + runtime validation (Google-only types)
      ↓  google-places.mapper.ts   mapGooglePlaceToRoamPlace(): Google DTO → NormalizedPlace (provider facts only)
      ↓  google-places.adapter.ts  GooglePlacesAdapter implements PlaceProvider (the contract)
      ↓  place-ingestion.service.ts  PlaceIngestionService: upsert by provider identity
      ↓  PlaceRepository / CategoryRepository (the Prisma boundary)
PostgreSQL: places, place_categories, external_sources, providers
```

All in `src/modules/providers/` (`ProvidersModule`, imported by `AppModule`; no controller, nothing calls Google at
startup).

## Provider contract

`provider.types.ts` — what ROAM depends on, with no Google type:

- `PlaceProvider { identity, searchNearby(query), getPlace(externalId) }`;
- `NearbyPlaceQuery { latitude, longitude, radiusMeters, maxResults?, categorySlugs? }` — categories are ROAM slugs,
  each adapter translates them;
- `NormalizedPlace` — provider facts in ROAM vocabulary plus `source { providerKey, externalId, externalUrl,
providerCategories }`.

`provider.errors.ts` — `ProviderError` and its subclasses: `ProviderConfigurationError`, `ProviderTimeoutError`,
`ProviderUnavailableError`, `ProviderAuthenticationError`, `ProviderRateLimitError` (`retryAfterSeconds`),
`ProviderRequestError`, `ProviderNotFoundError`, `ProviderResponseError`. Messages hold the provider key, the operation,
the HTTP status, Google's status and Google's `ErrorInfo.reason` code only — never the key, a header, Google's message or
metadata, or a payload.

Only `google-places/` knows Google. `PlaceIngestionService` takes any `PlaceProvider`: Ticketmaster venues or open data
places plug in the same way.

## Google Places API (New)

| Operation     | Request                                                     | Used for                |
| ------------- | ----------------------------------------------------------- | ----------------------- |
| Nearby Search | `POST https://places.googleapis.com/v1/places:searchNearby` | places around a point   |
| Place Details | `GET https://places.googleapis.com/v1/places/{placeId}`     | refresh one known place |

- Authentication: `X-Goog-Api-Key` header (never a query parameter, never logged).
- `languageCode=fr`, `regionCode=FR` (MVP scope: Paris).
- Nearby Search: `locationRestriction.circle` (radius in (0, 50 000] m), `maxResultCount` 1–20 (default 20),
  `includedTypes` from the ROAM categories (none when no category is asked; a category Google cannot express gives no
  request and no result, rather than an unfiltered search). The adapter refuses out-of-range queries before any request.
- Text Search is **not implemented**: no documented ROAM flow needs it yet (DATA_IMPLEMENTATION_PLAN.md says "place
  search/details").

### Field mask

Explicit, never `*` (checked by a test):

```text
id, displayName, formattedAddress, addressComponents, location, types, businessStatus, googleMapsUri,
rating, userRatingCount, priceLevel
```

(prefixed `places.` for Nearby Search). Billing: `rating`, `userRatingCount` and `priceLevel` put both calls in the
**Enterprise** SKU (without them: Pro). They are kept because the `Place` model stores them and PLACE.md / the data source
matrix list them as Google facts. Not requested: `photos`, opening hours, `reviews`, `websiteUri`, phone,
`editorialSummary` and other Atmosphere fields — no ROAM model or feature uses them yet (opening hours wait for the
normalized hours model, photos for the image/attribution decision).

### Timeout, errors, rate limiting

| Situation                                   | Error                                      |
| ------------------------------------------- | ------------------------------------------ |
| key not set                                 | `ProviderConfigurationError` (no request)  |
| no answer in 5 s (`AbortSignal.timeout`)    | `ProviderTimeoutError`                     |
| network failure                             | `ProviderUnavailableError`                 |
| 400                                         | `ProviderRequestError`                     |
| 400 with reason `API_KEY_INVALID`, 401, 403 | `ProviderAuthenticationError`              |
| 404                                         | `ProviderNotFoundError` → adapter `null`   |
| 429                                         | `ProviderRateLimitError` (+ `Retry-After`) |
| 5xx                                         | `ProviderUnavailableError` (status)        |
| body not JSON / not the documented shape    | `ProviderResponseError`                    |

**No retry** — a 429 in particular is reported once; the caller (the future sync, DATA-6) decides when to try again.
API-11 rate limiting protects the ROAM API from its clients and is not involved here. Provider errors are not mapped to
HTTP: no endpoint exposes them; if one leaked to the global filter it would be a generic 500, with no Google detail.

### Logging

One line per call (`GooglePlacesClient`): operation, duration, result count (and invalid places skipped), or the error
class and its message (status/reason codes). `PlaceIngestionService` logs found/created/updated counts. Never the key,
headers, request, payload, place names or ids. Tested.

## Mapping (Google → ROAM)

| `Place` / provenance                | From Google                                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `name`                              | `displayName.text` (trimmed)                                                                                                 |
| `address`                           | `formattedAddress`, else null                                                                                                |
| `city`                              | `addressComponents` of type `locality`, else null                                                                            |
| `latitude`, `longitude`             | `location` (required, range-checked)                                                                                         |
| `priceLevel`                        | `PRICE_LEVEL_FREE/INEXPENSIVE/MODERATE/EXPENSIVE/VERY_EXPENSIVE` → `FREE/LOW/MEDIUM/HIGH/VERY_HIGH`, anything else `UNKNOWN` |
| `rating`, `reviewCount`             | `rating` (0–5), `userRatingCount` (integer ≥ 0), else null — never clamped                                                   |
| `isActive`                          | false only for `businessStatus = CLOSED_PERMANENTLY` (deactivated, never deleted)                                            |
| categories                          | explicit table `GOOGLE_TYPE_TO_CATEGORY` → the DATA-1 slugs (below); only slugs that exist                                   |
| `ExternalSource.externalId`         | `id` (the Google place id)                                                                                                   |
| `ExternalSource.externalUrl`        | `googleMapsUri`                                                                                                              |
| `ExternalSource.providerCategories` | `types`, as received                                                                                                         |
| `ExternalSource.fetchedAt`          | the import time                                                                                                              |

A place without `id`, a non-empty `displayName.text` or valid coordinates is dropped by the validation (Nearby Search:
counted as skipped; Place Details: `ProviderResponseError`). Optional fields of the wrong type are dropped, never guessed.

Category table (conservative; any other type gives no category, its raw value stays in `providerCategories`):
`cafe, coffee_shop, tea_house → cafe` · `restaurant → restaurant` · `bar, pub, wine_bar → bar` · `park → park` ·
`museum, art_gallery, performing_arts_theater → culture` · `national_park, hiking_area, botanical_garden → nature`.

**Not produced here:** description, photos, opening hours, attributes, and every ROAM field — atmosphere, energy,
audience, best moments, duration, tags, score (DATA-5 enrichment, DATA-7 recommendations).

## Identity, idempotence, ownership

- **Identity** = `(Provider.key = "google_places", entityType PLACE, externalId = Google place id)` — the existing
  `ExternalSource` unique key. Never the name or the address. The provider row is registered on first use.
- **Upsert** (`PlaceIngestionService.upsert`): `PlaceRepository.findBySource` → missing: `create` (place + categories +
  provenance, one atomic write); present: `updateFromSource` (provider facts + that source's `fetchedAt`, URL and types,
  one atomic write). Concurrent imports of a new place: the losers hit the unique key and update the winner's row.
  Repeated imports never create a second place (tested, including 3 concurrent imports).
- **Ownership**: a refresh writes only `name, address, city, latitude, longitude, priceLevel, rating, reviewCount,
isActive` and the provenance. It never touches `RoamEnrichment`, categories, `description`, `photos`,
  `openingHours`, `attributes`, other providers' sources, or experiences (tested: a curated enrichment and a ROAM
  description survive a refresh).
- **No cross-provider deduplication**: a Google place at the same spot as a DATA-1 mock place is a separate place. Matching
  across providers (name + coordinates, EXPERIENCE.md "Deduplication") is DATA-6.

New repository method: `PlaceRepository.updateFromSource(id, change, source)`. No Prisma change, no migration.

## Cache and cost

Every `importNearby` / `importPlace` is one Google request; nothing is cached in DATA-2. The integration point is in
front of `PlaceIngestionService`: the DATA-6 sync decides from `ExternalSource.fetchedAt` (indexed with the provider)
whether a record is fresh enough, and serves the catalog from PostgreSQL. The mobile app never reaches Google: it reads
the ROAM API, which reads the database.

## Configuration and security

- `GOOGLE_PLACES_API_KEY` (existing name, `.env.example`): optional so the API starts without it; validated as a single
  token (letters, digits, `-`, `_`) — the error names the variable, never the value; exposed only as
  `AppConfigService.providers.googlePlacesApiKey`; the startup log says whether it is set, not its value.
- Backend only: not in `apps/mobile`, no `EXPO_PUBLIC_*`, not in Git (`.env` ignored; checked in files and history).
- Restrict the key in Google Cloud to **Places API (New)** (`places.googleapis.com`) and to the server's IPs.
- Tests never hold a real key: `test/setup-env.ts` and `test/database/setup-env.ts` remove provider keys (the database
  test setup loads `apps/api/.env`), suites use a fictional key, and `fetch` is stubbed — no test calls Google.

## Tests

- Unit (`pnpm test`, Google mocked): client (success, request shape, field masks, empty result, invalid places, timeout,
  network, 400/401/403/404/429/500/503, invalid key, reason codes without metadata, no retry on 429, invalid bodies,
  logs without secrets), mapper (every field, optional fields, coordinates, price levels, closed places, types, no raw
  Google field, no ROAM field), adapter (query translation, limits, categories, `null` on 404, errors), ingestion
  (create, update, race, errors, report), configuration (key absent/present/malformed).
- Database (`test/database/google-places.db-spec.ts`): Google-like responses → client → adapter → ingestion →
  PostgreSQL: creation, provenance, categories, update in place, idempotence, concurrent imports, ROAM data preserved,
  deactivation, 404 writes nothing. **Non-destructive**: no reset; it only creates and removes places whose Google id
  starts with `ChIJ-DATA2-TEST-`, and checks the rest of the catalog is unchanged — safe on `roam_test` with the DATA-1
  catalog.

### Real Google check (manual, not in CI)

2026-09-27, the local key, 1 Nearby Search (500 m around 48.8566, 2.3522, 3 results max) into a throwaway database:
**BLOCKED** — Google answered `403 PERMISSION_DENIED (API_KEY_SERVICE_BLOCKED)`: the key's API restrictions do not
include Places API (New). The pipeline reached Google, mapped the answer to `ProviderAuthenticationError`, wrote nothing,
and the key appeared nowhere in the output. To unblock: in Google Cloud, enable Places API (New) and add it to the key's
API restrictions, then rerun the check (a Nearby Search, then a Place Details of the first result, and verify place,
provenance and idempotence).

## Out of scope (later)

Scheduled/on-demand sync, TTLs, cache, deactivation of places no longer found, cross-provider deduplication (DATA-6);
enrichment (DATA-5); recommendations and Home (DATA-7); Text Search; photos and attribution; opening hours; Ticketmaster
(DATA-3); open data (DATA-4); an admin endpoint to trigger an import.
