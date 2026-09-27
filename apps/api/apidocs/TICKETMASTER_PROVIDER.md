# ROAM API — Ticketmaster provider (DATA-4)

The first **event** provider: Ticketmaster Discovery API v2, backend only, behind the provider contract of DATA-2. It
is **not connected to anything yet**: no endpoint, no scheduled sync, no change to `GET /api/v1/recommendations`, the
experiences, the DATA-3 enrichment or the mobile app.

> Numbering: this sprint is called DATA-4. In [`DATA_IMPLEMENTATION_PLAN.md`](DATA_IMPLEMENTATION_PLAN.md) Ticketmaster
> is listed as "DATA-3" (and DATA-4 is open data); the plan keeps its numbering and notes the correspondence.

```text
Ticketmaster Discovery API v2
      ↓  ticketmaster/ticketmaster.client.ts   HTTP: URL, apikey, timeout, status → typed error, validation
      ↓  ticketmaster/ticketmaster.dto.ts      Ticketmaster shapes + runtime validation (Ticketmaster-only types)
      ↓  ticketmaster/ticketmaster.mapper.ts   mapTicketmasterEventToRoamEvent(): DTO → NormalizedEvent (facts only)
      ↓  ticketmaster/ticketmaster.adapter.ts  TicketmasterAdapter implements EventProvider
      ↓  event-ingestion.service.ts            EventIngestionService: upsert by provider identity
      │     └── venue → PlaceIngestionService (DATA-2, unchanged): the venue is a place
      ↓  EventRepository / PlaceRepository / CategoryRepository (the Prisma boundary)
PostgreSQL: events, places, external_sources, providers
```

## Contract (added to the existing `provider.types.ts`)

No event contract existed; it was added next to the place contract, on the same pattern, and the existing errors,
provenance and repositories are reused:

- `EventProvider { identity, searchNearby(query), getEvent(externalId) }` — the counterpart of `PlaceProvider`;
- `NearbyEventQuery { latitude, longitude, radiusMeters, from?, to?, maxResults?, categorySlugs? }`;
- `NormalizedEvent` — the `Event` columns in ROAM vocabulary (`title`, `description`, `startDate`, `endDate`,
  `timezone`, `images`, `priceMin`, `priceMax`, `currency`, `priceLevel`, `bookingUrl`, `isActive`, `categorySlug`),
  its provenance `source { providerKey, externalId, externalUrl, providerCategories }`, and its `venue` as a
  `NormalizedPlace` (the place contract, reused).

New: `EventIngestionService` (the counterpart of `PlaceIngestionService`) and `EventRepository.updateFromSource` (the
counterpart of `PlaceRepository.updateFromSource`). No Prisma change: the `Event` model of API-03 already had every field.

## Ticketmaster API

| Operation     | Request                                                          | Used for                |
| ------------- | ---------------------------------------------------------------- | ----------------------- |
| Event Search  | `GET https://app.ticketmaster.com/discovery/v2/events.json`      | events around a point   |
| Event Details | `GET https://app.ticketmaster.com/discovery/v2/events/{id}.json` | refresh one known event |

Documentation: <https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/>.

- **Authentication**: the `apikey` query parameter — the only way Ticketmaster accepts it. The request URL therefore
  holds the key: it is built in one place (`TicketmasterClient.request`), never logged, never put in an error, never
  kept. Network errors are reported without their message (which could hold the URL).
- Event Search: `geoPoint` (geohash of the point, precision 9 — `latlong` is deprecated), `radius` + `unit=km`,
  `startDateTime` (default: now — without it Ticketmaster returns past events), `endDateTime`, `segmentId`, `size`,
  `page=0`, `sort=date,asc`, `locale=*` (Paris events are published in `fr-fr`). Dates are sent as
  `YYYY-MM-DDTHH:mm:ssZ` (UTC).
- One page per call, **no automatic paging**. Text search, attractions, venues search, suggest, checkout, Partner API,
  OAuth are not implemented.

### Limits

| Parameter | Ticketmaster                                | ROAM (adapter)                                                                                                                                                        |
| --------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| radius    | integer only (a decimal radius is a 400)    | (0, 50 000] m; sent as the enclosing whole km, then only events whose returned `distance` is inside the ROAM radius are kept (an event without a distance is dropped) |
| size      | < 200; `size × page` < 1000; 50 recommended | 1–50, default 20                                                                                                                                                      |
| dates     | —                                           | `to` must be after `from`                                                                                                                                             |
| quota     | 5 000 calls/day, 5 requests/s               | one request per adapter call; remaining quota logged                                                                                                                  |

Out-of-range queries are refused with a `RangeError` before any request (same policy as the place adapters). A query
whose ROAM categories Ticketmaster cannot express sends no request and returns nothing.

### Timeout, errors, rate limiting

| Situation                                | Error                                      |
| ---------------------------------------- | ------------------------------------------ |
| key not set                              | `ProviderConfigurationError` (no request)  |
| no answer in 5 s (`AbortSignal.timeout`) | `ProviderTimeoutError`                     |
| network failure                          | `ProviderUnavailableError`                 |
| 400 (e.g. `DIS1036` size too large)      | `ProviderRequestError`                     |
| 401 (`oauth.v2.InvalidApiKey`), 403      | `ProviderAuthenticationError`              |
| 404 (`DIS1004`)                          | `ProviderNotFoundError` → adapter `null`   |
| 429 (`policies.ratelimit.*`)             | `ProviderRateLimitError` (+ `Retry-After`) |
| 5xx                                      | `ProviderUnavailableError` (status)        |
| body not JSON / not the documented shape | `ProviderResponseError`                    |

Error bodies are `{ fault: { faultstring, detail: { errorcode } } }` (gateway) or `{ errors: [{ code, detail }] }`
(API), both observed. Messages keep the HTTP status and the code only; `faultstring` and `detail` can echo the request
(ids, parameters) and are never kept. **No retry** (a 429 is reported once). The ROAM API rate limiting (API-11) is not
involved: it protects the API from its clients. Logs: one line per call — operation, duration, result count, skipped
events, remaining daily quota (`Rate-Limit-Available`), or the error class — never the key, the URL, the payload,
titles or ids.

## Mapping (Ticketmaster → ROAM)

| `Event` / provenance                | From Ticketmaster                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                             | `name` (trimmed; required)                                                                                                            |
| `description`                       | `description`, else null (`info` / `pleaseNote` are not a description and are not stored)                                             |
| `startDate`                         | `dates.start.dateTime` — required, an absolute instant                                                                                |
| `endDate`                           | `dates.end.dateTime`, else null; dropped if before the start — never invented                                                         |
| `timezone`                          | `dates.timezone` (IANA, e.g. `Europe/Paris`), else null                                                                               |
| `images`                            | `images[].url`: the event's own pictures first, then the largest, deduplicated, at most 5                                             |
| `priceMin`, `priceMax`, `currency`  | the first coherent `priceRanges` entry (standard first; 3-letter currency; min ≤ max), else null                                      |
| `priceLevel`                        | `UNKNOWN` — no ROAM rule turns amounts into a level yet                                                                               |
| `bookingUrl`                        | `url` (the Ticketmaster page), else null                                                                                              |
| `isActive`                          | false only for `dates.status.code` `cancelled` / `canceled` (deactivated, never deleted); postponed, rescheduled, offsale stay active |
| category                            | explicit table on the primary classification's segment id (below)                                                                     |
| venue (`placeId`)                   | `_embedded.venues[0]` → a place (below), else no link                                                                                 |
| `ExternalSource.externalId`         | `id` (the Ticketmaster event id)                                                                                                      |
| `ExternalSource.externalUrl`        | `url`                                                                                                                                 |
| `ExternalSource.providerCategories` | the classifications as received, level by level: `segment:Arts & Theatre`, `genre:Theatre`, `subGenre:…` (`Undefined` left out)       |

**Venue → place**: `name`, `address` (`address.line1, postalCode city`), `city.name`, `location` (strings → numbers,
range-checked); identity `(ticketmaster, PLACE, venue id)`, URL = the venue page; no category, rating or price. A venue
without a name or valid coordinates gives no place (a place needs both); the event is kept without a venue. Several
events at one venue share one place.

**Dropped events** (counted as skipped, not stored): no `id`, no `name`, `test: true`, and no absolute start instant —
an event whose date or time is to be announced (`dateTBA`, `timeTBA`, `noSpecificTime`: only `localDate`) has no
`dateTime`; giving it an invented time would break DATA_RULES.md, and `startDate` is required.

### Categories

| Ticketmaster segment (id)                     | ROAM      |
| --------------------------------------------- | --------- |
| Arts & Theatre (`KZFzniwnSyZfZ7v7na`)         | `culture` |
| Music, Sports, Film, Miscellaneous, any other | none      |

Mapped by the stable segment id, not the (localizable) name. ROAM has no music, sport or cinema category and none is
created: such events are kept without a category, their classification preserved in `providerCategories`. Unknown
segments are handled the same way.

### Dates and timezones

Instants only: `dates.start.dateTime` / `dates.end.dateTime` are ISO 8601 with `Z`. The DTO accepts an instant **only
with its zone** (`Z` or `±hh:mm`); a zone-less string is refused rather than parsed in the server's local time (the class
of bug once met with session expiries). Stored as `timestamptz`; `localDate` / `localTime` are not used (they are the
same instant in the venue's zone). Tested: a 22:30 Paris show is `20:30Z` in summer and `21:30Z` in winter, and
PostgreSQL reads it back as 22:30 `AT TIME ZONE 'Europe/Paris'`.

### Not stored (outside the current `Event` model or not needed for the MVP)

`info`, `pleaseNote`, `localDate`/`localTime`, `dateTBA`/`timeTBA` flags, `spanMultipleDays`, `sales` (on-sale dates),
`seatmap`, `ticketLimit`, `accessibility`, `ageRestrictions`, `promoter(s)`, `products`, `outlets`, attractions
(artists), `distance`, `locale`, image ratios/sizes, venue `additionalInfo`, `boxOfficeInfo`, `parkingDetail`,
`accessibleSeatingDetail`, `generalInfo`, `markets`, `dmas`, venue timezone, state and country (the venue place keeps
city and address). Raw payloads are never stored.

## Identity, idempotence, ownership

- **Identity** = `(Provider.key = "ticketmaster", entityType EVENT, externalId = Ticketmaster event id)` — the existing
  `ExternalSource` unique key; the venue is `(ticketmaster, PLACE, venue id)`. Never the title, the date or coordinates.
- **Upsert** (`EventIngestionService.upsert`): venue first (through `PlaceIngestionService`), then
  `EventRepository.findBySource` → missing: `create` (event + category + venue link + provenance, one atomic write);
  present: `updateFromSource` (facts + venue link + that source's provenance, one atomic write). Concurrent imports of a
  new event: the losers hit the unique key and update the winner's row (tested: 3 concurrent imports → 1 event,
  1 source, 1 venue). The venue and the event are two writes: a failure between them leaves a venue place, which the
  next import reuses.
- **Ownership**: a refresh writes the provider facts (title, description, dates, timezone, images, prices, booking URL,
  active flag) and the venue link (kept when the venue is not locatable this time). It never touches the ROAM category
  (set at creation, then ROAM's), the experience link, other providers' sources, or the venue place's ROAM data
  (categories, `RoamEnrichment`, description — `PlaceIngestionService` rules). Tested.
- **No cross-provider deduplication**: no rule is documented for events (EXPERIENCE.md mentions date/time for events,
  without a rule); DATA-6.

## Configuration and security

- `TICKETMASTER_API_KEY` (existing name, `.env.example`): optional, the API starts without it; validated as a single
  token — the error names the variable, never the value; exposed only as `AppConfigService.providers.ticketmasterApiKey`;
  the startup log says whether it is set, not its value.
- Backend only: not in `apps/mobile`, no `EXPO_PUBLIC_*`, not in Git.
- Tests never hold a real key: the test setup files remove it; suites use a fictional key and stub `fetch` — no
  automated test calls Ticketmaster.

## Tests

- Unit (`pnpm test`, Ticketmaster mocked): client (request shape, whole-km radius, UTC dates, one page, key only in the
  query, empty result, invalid/test/TBA/zone-less events, details, missing key, timeout, network error without URL,
  400/401/403/404/429/500/503, codes kept and `detail`/`faultstring` never kept, no retry, invalid bodies, logs without
  key, URL or payload), mapper (complete and minimal events, summer/winter Paris times, offsets, end before start,
  zone-less instants, categories known/unknown, cancelled/postponed, venue with/without coordinates or name, prices,
  images, no ROAM field), geohash, adapter (translation, defaults, radius filter, categories, limits, `null`, errors),
  ingestion (venue through `PlaceIngestionService`, create, update without category/experience, venue link kept, race,
  errors, report), configuration.
- Database (`test/database/ticketmaster.db-spec.ts`): create with provenance, category and shared venue; dates read back
  by PostgreSQL in Paris time; second import (same event, no duplicate); update (same id); ROAM data kept (experience
  link, ROAM category, curated venue enrichment); 3 concurrent imports; unmapped segment; minimal event; cancelled event
  deactivated; 404 writes nothing. **Non-destructive**: only records whose Ticketmaster id contains `DATA4-TEST-` (plus a
  test experience), removed afterwards; the rest of the catalog, experiences and enrichments checked unchanged.

### Real Ticketmaster check (manual, not in CI)

2026-09-27, the local key, into a throwaway database (`*_tmp_test`, dropped afterwards), 3 calls: Event Search around
48.8566, 2.3522, 2 km, 5 results → 5 events created (Arts & Theatre → `culture`; e.g. `ZkyMmBwZ1A7uwrb` "ANDY WARHOL -
ENTRÉE SIMPLE" at Musée du Luxembourg, 48.849008, 2.334282), 4 venue places (two events at the same venue), Europe/Paris
timezone, starts read back by PostgreSQL in Paris time without shift (`08:00Z` → 10:00), no price given by Ticketmaster
(left null), 5 images and a booking URL each; second search → 0 created / 5 updated; Event Details of the first → same
event, `updated`. The key appeared in no log or output. **PASS.**

## Out of scope (later)

Sync, TTLs, cache, deactivation of events no longer found, cross-provider deduplication (DATA-6); price levels from
amounts; linking events to experiences; events in the recommendations or Home (DATA-7); attractions (artists); paging
beyond one page; an endpoint to trigger an import.
