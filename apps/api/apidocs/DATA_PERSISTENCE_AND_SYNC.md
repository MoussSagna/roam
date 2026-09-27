# ROAM Persistence & Synchronization

DATA-6 of [`DATA_IMPLEMENTATION_PLAN.md`](DATA_IMPLEMENTATION_PLAN.md): the providers of DATA-2 → DATA-4 become a
persisted, synchronizable, controlled and observable data layer. PostgreSQL + NestJS + Prisma only — no Redis, no
queue, no scheduler, no new dependency. Not connected to any endpoint, to the recommendations (DATA-7) or to the mobile
app.

## 1. Objective

```text
Provider → Normalized data → Ingestion → Deduplication → PostgreSQL → Freshness (the DB is the cache)
        → Synchronization → Observability
```

One generic orchestrator runs every provider — Google Places, Geoapify, Ticketmaster, DATAtourisme, Basilic, Data ES —
through the existing contracts (`PlaceProvider`, `EventProvider`, `NormalizedPlace`, `NormalizedEvent`), repositories,
typed errors and ingestion services, extended rather than replaced.

## 2. Architecture

```text
src/modules/providers/                        access to the data (one folder per provider)
  google-places/ geoapify/ ticketmaster/      unchanged adapters (DATA-2, 2.1, 3)
  datatourisme/  client, dto, mapper, adapters (places, events), paged jobs
  basilic/       client (streamed download), csv reader, mapper, batch job
  data-es/       client (data-es only), mapper, adapter, paged job
  place-ingestion.service.ts / event-ingestion.service.ts   → repositories' transactional upserts
  place-matching.ts   deduplication rules (pure)   event-timing.ts   dates/zones (pure)
  image-rights.ts     image licences (pure)         france.ts         zones, communes, plausible coordinates
src/modules/sync/                              synchronization (provider-agnostic)
  sync.service.ts      the orchestrator            jobs.ts          generic jobs (nearby search, stale refresh)
  sync-run.repository.ts  run journal (sync_runs)  provider-rate-limiter.ts, retry.ts, freshness.ts
  sync-jobs.ts         named jobs (Paris scope)    cli.ts           `pnpm --filter @roam/api sync <job>`
src/modules/catalog/                           the Prisma boundary
  place.repository.ts  upsertFromSource (locks, dedup, ownership, obsolescence)
  event.repository.ts  upsertFromSource       external-source.repository.ts  listStale
src/database/  advisory-lock.ts, local-date.ts, provider-rows.ts
```

A provider is responsible for **access** (a `SyncJob` whose reader returns batches of normalized records and a resume
cursor); the orchestrator for **synchronization**. There is no `GoogleSyncService`, `DatatourismeSyncService`… Clients
keep their DATA-2 rules: no persistence, no retry, typed errors, never a key in a log.

## 3. Provider identity

Identity is `(Provider.key, entityType, externalId)` — the existing `ExternalSource` unique key. Never a name, address,
coordinates or title.

| Provider      | key             | Entity       | externalId                                                                                       |
| ------------- | --------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| Google Places | `google_places` | PLACE        | Google place id (DATA-2)                                                                         |
| Geoapify      | `geoapify`      | PLACE        | OpenStreetMap object `node/…`, `way/…`, `relation/…` (DATA-2.1)                                  |
| Ticketmaster  | `ticketmaster`  | EVENT, PLACE | event id; venue id (DATA-3)                                                                      |
| DATAtourisme  | `datatourisme`  | PLACE, EVENT | `uuid` — the API's lookup key (`/v1/catalog/{uuid}`; the uuid inside `uri` is refused, observed) |
| Basilic       | `basilic`       | PLACE        | `Identifiant_deps_a_partir_de_2022` (see "Basilic" below)                                        |
| Data ES       | `data_es`       | PLACE        | `inst_numero` — one place per **installation**, not per equipment (DATA-4)                       |

## 4. ExternalSource

Reused; three nullable columns added (migration `…_data_persistence_sync`, additive):

| Column        | Purpose                                                                        |
| ------------- | ------------------------------------------------------------------------------ |
| `attribution` | who to credit for **this** record (e.g. the DATAtourisme producer) — see §9    |
| `images`      | this record's images with their rights (JSON) — see §10                        |
| `obsoleteAt`  | when the provider **explicitly** declared the record obsolete/closed — see §17 |

Already there and now always written: `fetchedAt` (freshness), `providerUpdatedAt` (the provider's own update date),
`externalUrl`, `providerCategories`. One row per provider record: a place seen by four providers has four rows, each
with its own attribution, date, images and obsolescence.

## 5. Deduplication

For a provider record **new to ROAM** (its identity is not yet in `ExternalSource`), `place-matching.ts` decides whether
it is a place another provider already brought:

1. exact provider identity → refresh (unique key, never a merge question);
2. **RNB**: same RNB building id **and** compatible names (≥ half of the shorter name's words) **and** ≤ 150 m;
3. **proximity**: same normalized name (case, accents, punctuation, stop words removed) **and** ≤ 30 m **and** not two
   different RNB ids;
4. otherwise — or when several candidates qualify (`ambiguous`) — a new place.

Never eligible: a place that already has a record of the **same** provider (the provider says they differ), and the
curated DATA-1 catalog (`mobile_mock_migration`: its facts are ROAM's). A wrong merge is worse than a duplicate: two
independent signals are required, never proximity alone. A match attaches the new `ExternalSource` to the place
(outcome `matched`) and only fills the facts it lacks (§7). **Events are not merged across providers**: only title, date
and place are comparable, and DATAtourisme dates are local and often timeless (OPEN_DATA_SOURCES.md §7).

Concurrency: the whole decision runs in one transaction holding PostgreSQL advisory locks on the provider record, the
RNB id and the normalized name (`advisory-lock.ts`), so two imports of the same place — same provider or not — are
serialized and never both create (tested: 5 concurrent imports → 1 place, 1 source; Google + Geoapify at once → 1 place,
2 sources). The `ExternalSource` unique key remains the final guarantee.

Real check (2026-09-27, Paris): 15 cross-provider merges, all verified correct by hand (e.g. "Maison de Victor Hugo"
DATAtourisme + Basilic, "Point Virgule" Basilic + Ticketmaster venue, "Le Calbar" DATAtourisme + Geoapify).

## 6. RNB

The Référentiel National des Bâtiments id is stored on `Place.rnbId` (indexed, not unique): DATAtourisme gives it in
`hasExternalReference`, Data ES in `equip_rnb`. It identifies a **building**, not a place — a museum and its café share
one — so it is a matching **signal** confirmed by the name (rule 2), never an identity and never required. It is filled
when the place has none and never overwritten. No separate RNB table. In the real Paris samples no DATAtourisme and
Data ES record shared an RNB id; the rule is covered by the database tests (§ tests).

## 7. NormalizedPlace

Extended with **optional**, provider-neutral fields (Google, Geoapify and Ticketmaster mappers unchanged):
`description`, `website`, `openingHours` (neutral shape: `{ periods: [{ days, opens, closes, validFrom, validThrough }],
note }`), `attributes`, `rnbId`, `images` (with rights), `attribution`, `providerUpdatedAt`. `Place` gains `website` and
`rnbId`.

**Ownership** (a refresh never makes a blind update of the row):

| Data                                                                     | Written by                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| name, address, city, coordinates, price level, rating, review count      | the place's **primary** source (the one that created it), on each refresh                      |
| description, website, opening hours, attributes, RNB id                  | any source, **only where the place has none** (never over curated or another provider's value) |
| categories                                                               | at creation only, then ROAM's                                                                  |
| `RoamEnrichment` (atmosphere, energy, audience, moments, tags, duration) | never by a provider (DATA-5)                                                                   |
| `isActive`                                                               | derived: active while one of its sources is not obsolete (§17)                                 |
| user data (favorites, journeys, feedback)                                | never touched by the data layer                                                                |

Trade-off: "fill only where empty" means a provider's later change of hours or description is not propagated over an
existing value — the safe side for curated data; editorial refresh is a DATA-7/product decision.

## 8. NormalizedEvent

`Event.startDate` was a required instant; ~57 % of DATAtourisme's Paris events have no time (DATA-4). The model now
represents every case without inventing a time:

| Case                                          | Stored                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| precise instant (Ticketmaster)                | `startDate` (timestamptz, UTC) + `timezone`; `localStartDate/Time` derived in that zone |
| local date + time + known zone                | `localStartDate`, `localStartTime`, `timezone`, and the derived instant `startDate`     |
| local date + time, unknown zone               | `localStartDate`, `localStartTime`; `startDate` **null**                                |
| date only                                     | `localStartDate` (PostgreSQL `date`); `startDate` and `localStartTime` **null**         |
| wall-clock time that does not exist (DST gap) | kept local, no instant                                                                  |

`events_start_known_check`: an instant or a local date is required; `events_local_times_check`: "HH:MM". Calendar dates
cross the driver as strings through UTC only (`local-date.ts`), so the process time zone never shifts a day; instants
keep the UTC session fix of `prisma-adapter.ts`. Tested: Paris summer (22:30 → 20:30Z), winter (22:30 → 21:30Z), date
only, local time without zone, UTC instant, provider → normalized → PostgreSQL (`::text`, `AT TIME ZONE`) → Prisma.

`Event` also gains its own `address`, `city`, `latitude`, `longitude` (DATAtourisme events have an inline location and
no venue record — no invented venue place). Events ending before they start (18 of 42 real Paris DATAtourisme events)
are skipped, never "fixed"; for a multi-day period the first start and last end are stored (recurrences are not expanded).

## 9. Attribution

Per source, in `ExternalSource.attribution` + `providerUpdatedAt` — never a global `sourceText`: a place can carry
Google + Geoapify + DATAtourisme + Basilic, each creditable separately ("Source : Paris je t'aime - Office de Tourisme
via DATAtourisme, mis à jour le 01/09/2026"). DATAtourisme: `hasBeenCreatedBy.legalName` and `lastUpdate` (a calendar
day, stored as that day 00:00 UTC — read its UTC date); Basilic: "Ministère de la Culture (DEPS) — base Basilic" and the
file date (HTTP `Last-Modified`); Data ES: "Ministère chargé des Sports — Data ES" and the latest meaningful
`equip_maj_date`. Display is DATA-7/DATA-8's (`PlaceRepository.sourcesOf` returns them).

## 10. Images and licensing

Images from licensed sources are kept **with their rights** on their `ExternalSource.images`:
`{ url, license, credit, rightsStartDate, rightsEndDate }` (provider and external id: those of the source) — never as
bare URLs in `Place.photos`. `image-rights.ts`:

- the provider drops images whose licence forbids ROAM's use (non-commercial or no-derivatives, e.g. the "By-NC-ND 4.0"
  observed on DATAtourisme);
- `imageUsage(image, day)` → `ALLOWED` (Licence Ouverte/Etalab, CC0, CC BY, CC BY-SA, public domain, within its rights
  period), `FORBIDDEN` (NC/ND, outside its period), `UNKNOWN` (no or unrecognized licence) — **an image without a licence
  is not usable commercially by default**; the credit must be shown next to an allowed image.

Existing `Place.photos` (Google) and `Event.images` (Ticketmaster) are unchanged: their terms are the providers' API
terms (DATA-2, DATA-3). Real check: no DATAtourisme image around Paris (as in DATA-4).

## 11. Freshness

For every provider record: `fetchedAt` (last successful fetch), `providerUpdatedAt`, `obsoleteAt`; for every job:
`sync_runs` (last successful run). No `staleAt` column: it is `fetchedAt + TTL(provider, entity)`, computed.

- **FRESH**: now < fetchedAt + TTL;
- **STALE**: past it — refreshed by the `…:refresh-stale` jobs, oldest first (index `(providerId, fetchedAt)`);
- **OBSOLETE**: the provider declared it (`obsoleteAt`) — never refreshed back to life by a TTL.

An `unchanged` refresh still moves `fetchedAt` (the record is fresh again), nothing else.

## 12. TTL

| Provider / entity   | TTL     | Why                                                                                                         |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| Google Places place | 30 days | Google Maps Platform terms: place content other than the id cached ≤ 30 days                                |
| Geoapify place      | 30 days | OpenStreetMap data changes slowly; each refresh costs free-plan credits                                     |
| Ticketmaster event  | 1 day   | status, cancellation and prices move                                                                        |
| Ticketmaster venue  | 7 days  | venues rarely change                                                                                        |
| DATAtourisme place  | 7 days  | flows daily, places updated by producers "au moins une fois par an"; weekly incremental is cheap (`update`) |
| DATAtourisme event  | 1 day   | "EVENEMENTS ajoutés ou modifiés quotidiennement" (FAQ)                                                      |
| Basilic place       | 30 days | published punctually (last file 2026-02-18); a monthly check suffices                                       |
| Data ES place       | 1 day   | updated daily (portal metadata, observed)                                                                   |

No TTL = no refresh (`ttlFor` throws): the internal DATA-1 catalog is never refreshed.

## 13. Synchronization

`SyncService.run(job, { resume?, maxBatches? })`:

1. **lease**: a `sync_runs` row RUNNING; the partial unique index `sync_runs_one_running_per_provider` forbids two
   runs of one provider at once, across processes (`SyncAlreadyRunningError`); a run whose `leaseUntil` (10 min,
   renewed per batch) expired is closed FAILED (`lease_expired`) and taken over;
2. **open** the job's reader at the resume cursor (optional) with the context: last successful run (incremental
   sources), now, and `pace()` (rate limiting, called by the reader before each real provider request);
3. per batch: read (retries §15) → ingest item by item → save counters, cursor and lease;
4. **close** the run: status, counters, aggregated reasons, cursor.

Jobs: generic (`nearbyPlacesJob`, `nearbyEventsJob`, `stalePlacesJob`, `staleEventsJob`) and paged/streamed ones in the
provider folders (`datatourismePlacesJob`, `datatourismeEventsJob`, `basilicPlacesJob`, `dataEsPlacesJob`). Named jobs
(Paris / petite couronne scope, DATA_FOUNDATION.md): `pnpm --filter @roam/api sync --list`. **Incremental**: DATAtourisme
asks for records updated since the day before the last successful run (`update=`; real check: second events run read 1
record instead of 42). **Scheduling** is not in DATA-6 (no cron): runs are started explicitly; an operations decision.

## 14. Pagination

| Provider         | Rule                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATAtourisme     | pages of 100 following `meta.next` (the only way past 10 000; the real API paginates with a `crs` token). A link is followed only on `api.datatourisme.fr` and the same endpoint; key-like parameters (`api_key`…) are removed; the cursor stored is that relative path — never logged, never shown outside the backend. A foreign link stops the run (`ProviderResponseError`). |
| Ticketmaster     | one page (DATA-3 adapter, unchanged)                                                                                                                                                                                                                                                                                                                                             |
| Data ES          | Opendatasoft `limit` 100 / `offset`, ordered by `inst_numero, equip_numero`; an installation cut by a page is read again from its first equipment (cursor = offset). `offset + limit` ≤ 10 000: a larger scope must be split (by département).                                                                                                                                   |
| Basilic          | one streamed download (49 MB, never in memory: 33 MB heap for 86 366 rows), batches of 500 rows, cursor = rows consumed                                                                                                                                                                                                                                                          |
| Google, Geoapify | one page (adapters unchanged)                                                                                                                                                                                                                                                                                                                                                    |

## 15. Retry

Clients never retry (DATA-2 rule kept). The orchestrator retries a **batch read** after `ProviderTimeoutError` or
`ProviderUnavailableError` (network, 5xx): 2 retries, 1 s then 5 s. Never after 400, 401/403, 404, invalid response,
missing key, or 429. A Basilic stream broken mid-way is downloaded again and skips the rows already consumed.

## 16. Partial failures

Each item is its own transaction: one failing item (`failed`, reason `failed:<ErrorClass>`) never loses the others; a
record that cannot be stored without inventing (no start, end before start) is `skipped` with its reason. A run stopped
by a provider (429, budget, auth…) or `maxBatches` keeps its cursor; `run(job, { resume: true })` continues from it.
Statuses: `SUCCEEDED` (read to the end, no failed item), `PARTIAL` (failed items, or stopped after at least one saved
batch — resumable), `FAILED` (stopped before any saved batch). The database going away stops the run. Counters:
`fetched`, `normalized`, `created`, `matched`, `updated`, `unchanged`, `skipped`, `failed`, `durationMs`, `startedAt`,
`finishedAt` (`SyncResult`; `sync_runs` stores `created` including matches).

## 17. Obsolete data

Only an explicit provider signal makes a record obsolete: DATAtourisme `isObsolete`, Google permanently closed (DATA-2),
Ticketmaster cancelled (DATA-3), Basilic exit notes ("sorti de la base", "désactivé"…), Data ES "installation
hors-service". It sets that source's `obsoleteAt` (first date kept); the place is deactivated (`isActive = false`, never
deleted) only when **all** its sources are obsolete — a place another provider still lists stays active (tested). An
absence from a page, a search or a file is never a deletion; a stale refresh whose record is no longer found is counted
`not_found` and left as is.

## 18. Rate limiting

`ProviderRateLimiter` (in process — one run per provider at a time makes it sufficient): a minimum interval per provider
and hour/day budgets below each quota. A spent budget stops the run (`SyncBudgetExhaustedError`, resumable) instead of
sleeping for an hour. Paced per **real request** (a Basilic download, not each batch of its rows — found by the real
check).

| Provider      | Policy                    | Source                                     |
| ------------- | ------------------------- | ------------------------------------------ |
| DATAtourisme  | ≥ 200 ms, ≤ 900/hour      | documented 1 000 req/h, ~10 req/s          |
| Ticketmaster  | ≥ 250 ms, ≤ 4 500/day     | documented 5 000/day, 5 req/s              |
| Geoapify      | ≥ 250 ms, ≤ 2 500/day     | free plan 3 000 credits/day, 5 req/s       |
| Google Places | ≥ 200 ms, ≤ 500/day       | billed per request: a ROAM cost ceiling    |
| Data ES       | ≥ 200 ms, ≤ 4 500/day     | observed `x-ratelimit-limit: 5000` per day |
| Basilic       | ≥ 1 s, ≤ 24 downloads/day | a static file                              |

The API's own rate limiting (API-11) is unrelated: it protects the API from its clients.

## 19. Cache

PostgreSQL **is** the cache: data is served from the database; freshness (§11) decides what to fetch again. No Redis
(no documented need: one API process, low volume, no shared hot key), no in-memory data cache, no user data cached.

## 20. Observability

- `sync_runs`: job, provider, status, start/end, counters, aggregated reasons, cursor — queryable history
  (`lastSuccessAt`, resume).
- Logs: one line at start and one at the end — `sync <job> (<provider>) <STATUS> in <ms>: <batches> batches, <fetched>
fetched, <normalized> normalized, <created> created, <matched> matched, <updated> updated, <unchanged> unchanged,
<skipped> skipped, <failed> failed [reason=count…]`; clients log per request (duration, counts, remaining quota).
- Never logged: API keys, headers, URLs holding a key (DATAtourisme `next` links), cursors, payloads, names, personal
  data (tested: no key in any log or real-run output).

## 21. Privacy

Data ES: only the `data-es` dataset, never `data-es-equipement` (declarants' names, emails, phones); an explicit field
list (`DATA_ES_FIELDS`) without any personal field; the mapper keeps no unknown field. Tested: a response carrying
declarant fields → none of their values in the place, the source or any column; no `declarant` column exists. Keys:
backend only (`DATATOURISME_API_KEY` like the others, validated, exposed through `AppConfigService.providers`, removed
from the test environment; never in `apps/mobile`, never `EXPO_PUBLIC_*`).

## 22. Provider-specific strategy

### Google

Unchanged adapter; `nearbyPlacesJob` + `google_places:places:refresh-stale`. Real check: the local key is refused by
Google (401/403, API restrictions — the DATA-2 known issue): the run is FAILED cleanly, no retry.

### Geoapify

Unchanged adapter; nearby job + stale refresh. Real check: 20 places, 1 matched to a DATAtourisme place ("Le Calbar");
second run unchanged.

### Ticketmaster

Unchanged adapter and mapper; events now also carry their local date and time (derived in their zone). Real check: 50
events created, second run 50 unchanged; venues merged into Basilic theatres (e.g. "Comédie Bastille").

### DATAtourisme

`DatatourismeClient` (key in `X-API-Key` only, `redirect: 'error'`, 10 s timeout, typed errors including 429 with its
reset), explicit `fields`, `sort=uuid` (accepted by the real API), place and event adapters, paged incremental jobs.
Places: description, website, hours, RNB, rights-checked images, attribution. Events: local dates, own location.
Real check: 500 places over 5 pages (resume through the sanitized `crs` cursor); on the first 200: attribution and
update date 200/200, descriptions 191, websites 184, hours 115, RNB ids 24; 42 events → 24 stored (16 date-only), 18 skipped `end_before_start`.

### Basilic

`BasilicClient`: the data.gouv.fr stable link, https + data.gouv.fr hosts only, 200 MB guard, header validation,
streamed `;` CSV (`csv.ts`, RFC 4180 + lenient on the file's malformed quotes). Kept types: Musée, Théâtre, Scène,
Opéra, Cinéma, Centre d'art, Centre culturel, Lieu de mémoire (`culture`), Parc et jardin (`park`). Implausible
coordinates refused (the swapped Saint-Pierre-et-Miquelon rows). **Identity**: `Identifiant_deps_a_partir_de_2022`, the
publisher's documented id. It embeds the label code and can change with a relabel (DATA-4); `Rang` looks stable (unique,
the id's suffix) but is **not documented** as an identifier. The least dangerous choice is the documented id: a relabel
yields a duplicate place (the old record then goes stale, never obsolete by absence), never a wrong merge; the name +
proximity rule may even re-attach it. A future correction can re-key `ExternalSource.externalId` from the file without
touching places. Real check: one download, 86 366 rows, 613 places (petite couronne), 7 matched to DATAtourisme places;
second run 613 unchanged.

### Data ES

`DataEsClient` on `data-es` with `DATA_ES_FIELDS`; installations as places (first located equipment's coordinates, no
averaging), website normalized, RNB, `attributes { equipmentCount, freeAccess }`, out-of-service → obsolete. **No ROAM
category**: none exists for sport and none is created — a product decision for DATA-5/DATA-7 (the sync imports the
places without a category; the named Paris job keeps free-access installations only). Real check: 233 free-access
equipments in Paris → 160 installations; second run 160 unchanged. The real `data-es` exposes `equip_acc_libre`,
`equip_x`, `equip_y` as **text** (filter `= "true"`, coordinates read from the typed `equip_coordonnees` geo point).

## 23. DATA-7 implications

Left to DATA-7 on purpose: using open-data places and events in recommendations; a `sport` category (product); showing
attribution and credits (`sourcesOf`, `imageUsage`); choosing among several sources' descriptions or hours; editorial
refresh of fill-only fields; linking events to experiences; recurring-event occurrences; scheduling the jobs; any
endpoint to trigger or observe syncs.

## Conflicts found (documentation vs. code / real sources)

- OPEN_DATA_SOURCES.md §2.1: `page_size > 100` → 400 per the changelog, but observed clamped to 100 — ROAM sends ≤ 100.
- OPEN_DATA_SOURCES.md §2.3 listed `equip_x`/`equip_y` among Data ES fields without type; in `data-es` they are text
  (and `equip_acc_libre` too) — handled here, documented above.
- The DATA-3 test "several providers: the same physical place stays two places (no cross-provider merge)" encoded the
  pre-DATA-6 rule ("until DATA-6"); it now asserts the DATA-6 merge.
- The DATA-6 brief mentions `BETTER_AUTH_SECRET`: no such variable exists (authentication uses opaque sessions,
  AUTHENTICATION.md); none added.

## Tests

- Unit (`pnpm test`): matching rules, event timing (summer/winter/date-only/DST/zones), image rights, freshness and
  every TTL, retry policy, rate limiter, orchestrator (success, partial, timeout/5xx retries, 429, invalid data, budget,
  database down, resume, logs without secrets), ingestion services, DATAtourisme (header key, next-link sanitization,
  > 10 000 through `next`, errors, mapping, events), Basilic (CSV edge cases, mapping, pacing per download, reopen after a
  > broken stream), Data ES (privacy, grouping across pages, text coordinates, window), configuration.
- Database (`pnpm test:db`, `test/database/persistence-sync.db-spec.ts`): the six providers through the generic sync,
  RNB merge (two providers, one place, two sources, no duplicate), multiple sources, enrichment and curated data kept,
  image metadata, attribution, freshness and stale refresh, obsolescence (single and multi-source), date-only events and
  Paris instants, concurrency (same record ×5, same place from two providers, run lease and takeover), no Data ES personal
  data, partial failure + resume, DATA-1 untouched. **Non-destructive** (marked ids only). Migrations: the new table,
  CHECKs and partial index. Existing suites updated for `unchanged` and the DATA-6 merge.
- Real providers (manual, 2026-09-27, throwaway database `roam_data6_tmp_test` dropped afterwards, DATA-1 seeded): see
  §22; merges reviewed by hand; DATA-1 still 14 experiences / 2 places / 16 enrichments / 16 internal sources, none
  merged; no key in any output; no personal data stored.
