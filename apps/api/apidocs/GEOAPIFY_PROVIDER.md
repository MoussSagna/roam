# ROAM API — Geoapify provider (DATA-2.1)

The second place provider: Geoapify Places, backend only, behind the **DATA-2 provider contract**. Unlike Google Places, it
works on a free plan without billing. Like Google, **it is not connected to anything yet**: no endpoint, no scheduled
sync, no change to `GET /api/v1/recommendations`, the DATA-1 catalog or the mobile app.

```text
Geoapify Places / Place Details API
      ↓  geoapify/geoapify.client.ts   HTTP: URL, key header, timeout, status → typed error, validation
      ↓  geoapify/geoapify.dto.ts      Geoapify GeoJSON shapes + runtime validation (Geoapify-only types)
      ↓  geoapify/geoapify.mapper.ts   mapGeoapifyPlaceToRoamPlace(): Geoapify DTO → NormalizedPlace (provider facts only)
      ↓  geoapify/geoapify.adapter.ts  GeoapifyAdapter implements PlaceProvider
      ↓  place-ingestion.service.ts    PlaceIngestionService (DATA-2, unchanged)
      ↓  PlaceRepository / CategoryRepository (DATA-2, unchanged)
PostgreSQL: places, place_categories, external_sources, providers
```

## Reused from DATA-2 (unchanged)

`PlaceProvider`, `NearbyPlaceQuery`, `NormalizedPlace` (`provider.types.ts`), the `ProviderError` classes
(`provider.errors.ts`), `PlaceIngestionService` (upsert by provider identity, race handling, ROAM data preserved),
`PlaceRepository.findBySource/create/updateFromSource`, `ExternalSource` and `Provider`, the DATA-1 categories, and
`AppConfigService.providers`. Only `geoapify/` knows Geoapify; `ProvidersModule` registers and exports `GeoapifyAdapter`
next to `GooglePlacesAdapter`. The Google files are untouched. No Prisma change, no migration.

```text
PlaceProvider
   ├── GooglePlacesAdapter   (DATA-2)
   └── GeoapifyAdapter       (DATA-2.1)
```

## Geoapify API

| Operation     | Request                                                                               | Used for                |
| ------------- | ------------------------------------------------------------------------------------- | ----------------------- |
| Places        | `GET https://api.geoapify.com/v2/places?categories&filter&limit&lang`                 | places around a point   |
| Place Details | `GET https://api.geoapify.com/v2/place-details?osm_type&osm_id&features=details&lang` | refresh one known place |

Documentation: <https://apidocs.geoapify.com/docs/places/>, <https://apidocs.geoapify.com/docs/place-details/>.

- Authentication: the `X-Api-Key` header (Geoapify also accepts an `apiKey` query parameter; not used, since URLs end up
  in proxy and error logs). Never logged.
- `lang=fr` (MVP scope: Paris).
- Places: `filter=circle:<lon>,<lat>,<radius m>` (longitude first), `limit`, `categories` (**required** by Geoapify: a
  request without categories is a 400). The response is a GeoJSON `FeatureCollection`; each feature's `properties` holds
  the place.
- Place Details: looked up by the OpenStreetMap object (see Identity), `features=details` only (1 credit). An unknown
  object is a 200 with no feature → the adapter returns `null`.

### Limits

| Parameter  | Geoapify                   | ROAM (adapter)                                        |
| ---------- | -------------------------- | ----------------------------------------------------- |
| radius     | no documented maximum      | (0, 50 000] m — the radius already allowed for Google |
| results    | `limit` 1–500 (default 20) | 1–20 (default 20) — one credit per request            |
| categories | 1–100 keys, required       | the mapped keys of the requested ROAM categories      |

Same policy as the Google adapter: an out-of-range query is refused with a `RangeError` **before** any request; nothing
is clamped. The 20-result ceiling is a ROAM choice (Geoapify bills every 20 places, and no DATA-2.1 flow needs more);
pagination (`offset`) is not implemented.

A query **without** categories searches every Geoapify category ROAM maps (Geoapify requires at least one). A query whose
ROAM categories have no Geoapify equivalent (e.g. `experience`) sends no request and returns nothing, rather than an
unrelated wider search — as for Google.

### Timeout, errors, rate limiting

| Situation                                 | Error                                      |
| ----------------------------------------- | ------------------------------------------ |
| key not set                               | `ProviderConfigurationError` (no request)  |
| no answer in 5 s (`AbortSignal.timeout`)  | `ProviderTimeoutError`                     |
| network failure                           | `ProviderUnavailableError`                 |
| 400 (e.g. invalid category, invalid id)   | `ProviderRequestError`                     |
| 401 (`Invalid apiKey`), 403               | `ProviderAuthenticationError`              |
| 404                                       | `ProviderNotFoundError`                    |
| 429                                       | `ProviderRateLimitError` (+ `Retry-After`) |
| 5xx                                       | `ProviderUnavailableError` (status)        |
| body not JSON / not a `FeatureCollection` | `ProviderResponseError`                    |

Geoapify's error body is `{ statusCode, error, message }` (observed: `401 {"error":"Unauthorized","message":"Invalid
apiKey"}`). Error messages keep the HTTP status and the short `error` name only; `message` can echo the request and is
never kept. **No retry** (a 429 is reported once; the future sync decides when to try again). The timeout is the
Geoapify client's own constant (`GeoapifyClient.TIMEOUT_MS`, 5 s): no shared timeout setting exists, and a small POI
search answers in well under a second.

Logging: one line per call (operation, duration, result count and invalid features skipped, or the error class and its
status). Never the key, headers, URL, payload, place names or ids. Tested.

## Identity

`ExternalSource`: `Provider.key = "geoapify"` (name `Geoapify`), `entityType PLACE`, **`externalId` = the OpenStreetMap
object**, `node/<id>`, `way/<id>` or `relation/<id>`, from `datasource.raw.osm_type` (`n`/`w`/`r`) and
`datasource.raw.osm_id`.

Not Geoapify's `place_id`: it encodes coordinates, and was observed to differ between Places and Place Details for the
same object (and an altered `place_id` resolved to the same place) — it is a lookup token, not a stable identity. The
OpenStreetMap object is what Geoapify returns the data of, is the same in both endpoints, and Place Details accepts it
directly (`osm_type` + `osm_id`). A feature without an OpenStreetMap identity (another data source) is dropped by the
validation. Never the name, the address or the coordinates.

## Mapping (Geoapify → ROAM)

| `Place` / provenance                | From Geoapify (`properties`)                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `name`                              | `name` (trimmed; required — unnamed features are dropped)                                                     |
| `address`                           | `address_line2` when `address_line1` is the name (the usual case), else `formatted`; else null                |
| `city`                              | `city`, else null                                                                                             |
| `latitude`, `longitude`             | `lat`, `lon` (required, range-checked)                                                                        |
| `priceLevel`                        | `UNKNOWN` — Geoapify (OpenStreetMap data) has no price level                                                  |
| `rating`, `reviewCount`             | null — Geoapify has no ratings or reviews                                                                     |
| `isActive`                          | true — Geoapify returns existing places only and reports no closure status                                    |
| categories                          | explicit table `GEOAPIFY_CATEGORY_TO_CATEGORY` → the DATA-1 slugs (below); only slugs that exist              |
| `ExternalSource.externalId`         | the OpenStreetMap object (above)                                                                              |
| `ExternalSource.externalUrl`        | null — Geoapify gives no page for a place (`datasource.url` is the OpenStreetMap licence page); none is built |
| `ExternalSource.providerCategories` | `categories`, as received (including conditions such as `wheelchair.yes`)                                     |
| `ExternalSource.fetchedAt`          | the import time                                                                                               |

Category table (conservative; a key covers its sub-categories, e.g. `catering.cafe.coffee`; any other category gives no
ROAM category and stays in `providerCategories` only; no new ROAM category):

| Geoapify                                        | ROAM         |
| ----------------------------------------------- | ------------ |
| `catering.cafe`                                 | `cafe`       |
| `catering.restaurant`                           | `restaurant` |
| `catering.bar`, `catering.pub`                  | `bar`        |
| `leisure.park`                                  | `park`       |
| `entertainment.museum`, `entertainment.culture` | `culture`    |
| `national_park`, `natural`                      | `nature`     |

`experience` has no Geoapify equivalent. Every key was checked against the real API (a search on all of them is
accepted).

**Not produced here:** description, photos, opening hours, website, contact, facilities, and every ROAM field —
atmosphere, energy, audience, best moments, duration, tags, score (DATA-5 enrichment, DATA-7 recommendations).

### Geoapify data vs ROAM data

Geoapify gives facts from OpenStreetMap: name, address, coordinates, classification. It gives **no** rating, reviews or
price, fewer than Google: those stay `null`/`UNKNOWN`, never filled with a default. ROAM owns the enrichment and the
editorial data (DATA_SOURCE_MATRIX.md); a Geoapify refresh never writes them.

## Persistence, idempotence, ownership

Entirely DATA-2's `PlaceIngestionService` ([`GOOGLE_PLACES_PROVIDER.md`](GOOGLE_PLACES_PROVIDER.md) "Identity, idempotence,
ownership"): first import creates the place, its categories and provenance; later imports update the same place
(`updateFromSource`: provider facts + provenance only); concurrent imports create one place. A refresh never touches
`RoamEnrichment`, categories, `description` or other providers' sources. No cross-provider deduplication: a Geoapify
place and a Google or DATA-1 place at the same spot are separate places until DATA-6.

## Free plan and cost

Free plan (2026-09): 3 000 credits/day, up to 5 requests/s, no card; commercial use allowed with attribution ("Powered by
Geoapify" and the OpenStreetMap data attribution) where the data is shown — to handle when a screen displays Geoapify
data (DATA-7/DATA-8). Cost: Places = 1 credit per 20 places returned; Place Details (`details`) = 1 credit. With the
20-result ceiling, every adapter call is 1 credit. Geoapify's limits are soft (no throttling announced), so request
control is ROAM's job: no cron, no queue, no bulk import in DATA-2.1; the cache/TTL decision belongs in front of
`PlaceIngestionService` (DATA-6).

## Configuration and security

- `GEOAPIFY_API_KEY` (`.env.example`, empty placeholder): optional, the API starts without it; validated as a single
  token — the error names the variable, never the value; exposed only as `AppConfigService.providers.geoapifyApiKey`; the
  startup log says whether it is set, not its value.
- Backend only: not in `apps/mobile`, no `EXPO_PUBLIC_*`, not in Git (`.env` ignored).
- Tests never hold a real key: both test setup files remove `GEOAPIFY_API_KEY`; suites use a fictional key and stub
  `fetch` — no automated test calls Geoapify.

## Tests

- Unit (`pnpm test`, Geoapify mocked): client (request shape, key in the header and never in the URL, empty and multiple
  results, invalid features, optional fields, details by OpenStreetMap object, unknown place, missing key, timeout,
  network, 400/401/403/404/429/500/503, no retry, `message` never kept, invalid bodies, logs without secrets), mapper
  (every field, address choice, absent facts null, category table and sub-categories, only DATA-1 slugs, no ROAM field,
  external id round trip), adapter (query translation, categories, default scope, limits, `null`, errors pass through),
  configuration (key absent/present/malformed, never printed).
- Database (`test/database/geoapify.db-spec.ts`): Geoapify-like responses → client → adapter → ingestion → PostgreSQL:
  creation, provenance, absent facts null, update in place with a different `place_id`, idempotence, concurrent imports,
  ROAM data preserved, unknown place writes nothing. **Non-destructive**: it only creates and removes places whose
  external id starts with `node/99000000000` — safe on `roam_test` with the DATA-1 catalog.

### Real Geoapify check (manual, not in CI)

2026-09-27, the local key, into a throwaway database (`*_tmp_test`, dropped afterwards), about 10 credits in total:
Places around 48.8566, 2.3522, 500 m, 3 results, category `cafe` → 3 real cafés normalized (e.g. `node/2152981900`
Café Beaubourg, `43 Rue Saint-Merri, 75004 Paris, France`, Paris, `cafe`, rating/price null/UNKNOWN, no URL); a search
on every mapped category accepted by Geoapify; import 1 → 3 created, import 2 → 0 created / 3 updated, Place Details of
the first → `updated`, same place; 3 places and 3 sources in the database. The key appeared in no log or output.
**PASS.**

## Out of scope (later)

Sync, TTLs, cache, deactivation of places no longer found, cross-provider deduplication (DATA-6); enrichment (DATA-5);
recommendations and Home (DATA-7); attribution display; pagination; opening hours, website, contact, facilities; an
admin endpoint to trigger an import.
