# ROAM API — ROAM enrichment & quality (DATA-3)

The layer that turns provider places into ROAM places: deterministic, explainable rules write the ROAM-owned context of
a place, curated data always wins, and a minimal quality check says whether a place is usable by the recommendations.
Backend only and internal to the data pipeline: **no endpoint, nothing runs at startup, the recommendation engine,
API-12 and the mobile app are unchanged**, no AI, no new provider, no Prisma change.

> Numbering: the sprint called DATA-3 here is the plan's "Enrichment" step (listed as DATA-5 in
> [`DATA_IMPLEMENTATION_PLAN.md`](DATA_IMPLEMENTATION_PLAN.md), where DATA-3 is Ticketmaster). Only the enrichment of
> **places** is done.

```text
Google Places / Geoapify (DATA-2, DATA-2.1)
      ↓  adapter → NormalizedPlace                   provider facts only
      ↓  PlaceIngestionService → PlaceRepository     Place + categories + ExternalSource
      ↓  RoamEnrichmentService.enrichPlace(placeId)  enrichment/roam-enrichment.service.ts
      │     ├── deriveRulesEnrichment(categories)    enrichment/roam-enrichment.rules.ts (pure)
      │     ├── RoamEnrichmentRepository             catalog/roam-enrichment.repository.ts (Prisma boundary)
      │     └── assessPlaceQuality(place)            enrichment/place-quality.ts (pure)
PostgreSQL: roam_enrichments (one per place)
```

`EnrichmentModule` (`src/modules/enrichment/`, imported by `AppModule`) exports `RoamEnrichmentService`. It depends on
catalog places only — never on `GooglePlacesAdapter`, `GeoapifyAdapter` or a provider payload — so a place gets the same
enrichment whichever provider it came from.

## Place vs Experience

- A **`Place`** is a physical place: provider facts (`name`, `address`, coordinates, `priceLevel`, `rating`,
  `reviewCount`, `isActive`), its ROAM categories, its provenance (`ExternalSource`, one per provider record).
- An **`Experience`** is the ROAM outing ROAM recommends, made of places (`ExperiencePlace`), with its own facts and its
  own enrichment (EXPERIENCE.md). DATA-3 creates **no experience** and writes **no experience enrichment**: turning
  places into experiences is a later step. The 14 DATA-1 experiences and their curated enrichments are not touched.

## Provider data vs ROAM enrichment

| Owner    | Data                                                                 | Where                        | Written by                          |
| -------- | -------------------------------------------------------------------- | ---------------------------- | ----------------------------------- |
| Provider | name, address, city, coordinates, price level, rating, reviews, open | `Place` columns              | `PlaceIngestionService` (DATA-2)    |
| Provider | provider id, URL, provider classification, fetch time                | `ExternalSource`             | `PlaceIngestionService` (DATA-2)    |
| ROAM     | categories                                                           | `PlaceCategory`              | ingestion (first import only), ROAM |
| ROAM     | atmosphere, energy, audience, best moments, tags, duration           | `RoamEnrichment` (`placeId`) | `RoamEnrichmentService` or curation |

The enrichment service never writes a provider fact; a provider refresh never writes the enrichment (`updateFromSource`,
tested both ways).

## Model (reused, no migration)

`RoamEnrichment` as defined by API-03: `atmosphere String[]` (open list, documented vocabulary), `energyLevel`
(`LOW | MEDIUM | HIGH | UNKNOWN`), `suitableFor Audience[]` (`SOLO | COUPLE | FRIENDS | FAMILY | GROUP | UNKNOWN`),
`bestMoments Moment[]` (`MORNING | AFTERNOON | EVENING | NIGHT | ANYTIME`), `tags`, `estimatedDurationMin` +
`durationIsDerived`, `source`, `confidence Json`. `placeId` is unique (one enrichment per place) and a CHECK constraint
keeps exactly one of `placeId` / `experienceId`.

**Mood** is not in the model, and its vocabulary is still undecided (DATA-1 report §18, API-07: the mobile moods were not
migrated, `JourneyMood` belongs to journeys). DATA-3 produces no mood and adds no field; this is a decision to take before
the recommendations use one.

## Provenance

The existing `RoamEnrichment.source`:

| `source`        | Meaning                                                     | Rules may rewrite it |
| --------------- | ----------------------------------------------------------- | -------------------- |
| `ROAM_RULES`    | written by the deterministic rules below (provider-derived) | yes                  |
| `CURATED`       | hand-authored ROAM data (DATA-1 values, future editorial)   | **never**            |
| `USER_FEEDBACK` | derived from feedback (future)                              | **never**            |

`confidence` keeps the basis of every rule value (NORMALIZATION_AND_ENRICHMENT.md "Confidence"):

```json
{
  "rulesVersion": 1,
  "categories": ["park"],
  "atmosphere": { "basis": "category", "rule": "category_implies_atmosphere", "confidence": 0.9 },
  "estimatedDurationMin": {
    "basis": "category",
    "rule": "category_typical_duration",
    "confidence": 0.5
  }
}
```

`0.9`: the category implies the value by definition. `0.5`: a typical value, an estimate. The API does not expose
`confidence` (EXPERIENCE_CATALOG_API.md); it exposes `source` and `durationIsDerived`, so a rule value is never presented
as a fact.

## Rules

`deriveRulesEnrichment(categorySlugs)` — pure, deterministic, versioned (`ENRICHMENT_RULES_VERSION`). Input: the place's
**ROAM categories** (the DATA-1 vocabulary), which both providers produce through their explicit tables.

| ROAM category | Atmosphere (by definition) | Typical duration (derived) |
| ------------- | -------------------------- | -------------------------- |
| `cafe`        | —                          | 45 min                     |
| `restaurant`  | —                          | 90 min                     |
| `bar`         | —                          | 90 min                     |
| `park`        | `OUTDOOR`                  | 60 min                     |
| `culture`     | `CULTURAL`                 | 90 min                     |
| `nature`      | `OUTDOOR`                  | 120 min                    |
| `experience`  | no rule                    | no rule                    |

- **Atmosphere** only when the category means it: a park or a nature area is outdoors; a museum, gallery or theatre is
  cultural. Nothing mood-like is inferred from a category: a restaurant is not `ROMANTIC`, a bar is not `FESTIVE` or
  `SOCIAL`, a café is not `COZY` — no data supports it (DATA_RULES.md 1, 6).
- **Duration**: a typical visit length, a ROAM estimate stored with `durationIsDerived = true` and its rule
  (NORMALIZATION_AND_ENRICHMENT.md "Duration"; DATA_RULES.md 5 — no exact duration is claimed).
- **Energy, audience, best moments, tags**: not produced (`UNKNOWN` / empty). A category alone is not evidence; they need
  provider attributes (opening hours, live music…), curated data or feedback. `UNKNOWN` never excludes a place from the
  recommendations (API-07 rule).
- **Several categories**: atmospheres are merged; the duration is kept only when the categories' typical durations
  agree, otherwise it stays `null` (no sufficient evidence). If nothing is left, no enrichment.
- **Unknown or rule-less categories**: ignored. A place with none of the categories above gets no enrichment row
  (`roam: null` keeps meaning "not enriched yet").

Every ROAM category that Google or Geoapify can produce has a rule (tested).

## Curated priority, idempotence, concurrency

`RoamEnrichmentService.enrichPlace(placeId)` → `{ outcome, enrichment, quality }`:

| Situation                                  | Outcome        | Write                                                  |
| ------------------------------------------ | -------------- | ------------------------------------------------------ |
| `CURATED` / `USER_FEEDBACK` enrichment     | `kept_curated` | none                                                   |
| no rule for the categories                 | `no_rule`      | none (an existing rules enrichment is kept)            |
| no enrichment                              | `created`      | insert                                                 |
| rules enrichment equal to the rules output | `unchanged`    | none — same row, same `updatedAt`                      |
| rules enrichment that differs              | `updated`      | `UPDATE … WHERE placeId = ? AND source = 'ROAM_RULES'` |

- The rewrite is conditioned on `source = ROAM_RULES` **in the same statement**: a curation that happens between the read
  and the write is never overwritten (the service then reports `kept_curated`).
- Concurrent first enrichments: the unique `placeId` lets one insert win; the others re-read and report `unchanged`
  (tested with 3 concurrent calls → one row).
- Comparison is structural (jsonb does not keep key order).
- `enrichPlaces(ids)` runs the same for several places and counts outcomes and recommendation-ready places.

Unknown place: `RecordNotFoundError`. Persistence errors pass through (REPOSITORY_ARCHITECTURE.md "Errors").

## Quality

`assessPlaceQuality(place)` — computed, **never stored** (the schema has no quality status and none is added):

- **Blocking issues** → `recommendationReady: false`: `MISSING_NAME`, `INVALID_COORDINATES`, `NO_CATEGORY`, `INACTIVE`.
  Identity and provenance are guaranteed before: adapters drop a record without a stable id, a name or valid coordinates,
  and ingestion always writes the `ExternalSource`.
- **Missing facts** (information only, never filled): `address`, `city`, `priceLevel` (`UNKNOWN`), `rating`,
  `reviewCount`. A Geoapify place typically misses the last three and is still ready.
- `enriched`: whether an enrichment exists. Not blocking — unknown ROAM context never excludes.

A not-ready place is not rejected or deleted: it stays in the catalog as ingested, reported by the enrichment result.

## Deduplication

Provider deduplication is DATA-2's (`ExternalSource` unique `(provider, entityType, externalId)`), unchanged. The same
physical place imported from Google **and** Geoapify is two places, each enriched the same way (tested). EXPERIENCE.md
allows matching on normalized name/address/coordinates after provider ids, but defines no threshold or merge rule, and
SYNC_CACHE_AND_COST_CONTROL.md puts deduplication in DATA-6: no cross-provider merge is done here. Needed later: a
documented matching rule (distance threshold, normalized name), a merge that keeps both `ExternalSource` rows on one
place, and the precedence of facts between providers.

## Recommendation contract

The data matches what `RECOMMENDATION.md` and API-07 read: atmosphere, energy, audience, moments, duration are soft
signals; `UNKNOWN`/empty never exclude; a derived duration is marked derived. The engine is not changed and does not read
place enrichments yet (it ranks experiences); using them — and a mood vocabulary — is the recommendations step.

## Tests

- Unit (`pnpm test`): rules (every category, nothing inferred for energy/audience/moments/tags, no mood-like atmosphere,
  unknown and rule-less categories, several categories, determinism, documented values only, coverage of every
  provider category), quality (Google-like, Geoapify-like, each blocking issue, missing facts, enriched), service with
  mocked repositories (create, unchanged with reordered jsonb, update, curated and feedback kept, curated in between,
  concurrent insert, no rule, no category, unknown place, errors, batch report).
- Database (`test/database/roam-enrichment.db-spec.ts`): NormalizedPlace → ingestion → enrichment → PostgreSQL for a
  Google-like, a Geoapify-like and a DATA-1-like place; two providers for one physical place; idempotence (same row, same
  `updatedAt`); controlled update; provider refresh keeps the enrichment; curated kept against refresh, rules and the
  conditional write; the real DATA-1 places of the database (2 curated places on `roam_test`) kept with no write;
  3 concurrent enrichments → one row; unique constraint; no category → no row. **Non-destructive**: only records whose
  external id contains `DATA3-TEST-`, removed afterwards; the rest of the catalog, its enrichments (ids and
  `updatedAt`) and sources are checked unchanged.

## Out of scope (later)

Experience enrichment and generating experiences from places; mood vocabulary; attribute-based rules (opening hours,
live music…); curation tooling; cross-provider deduplication, sync and TTLs (DATA-6); using place enrichments in the
recommendations (DATA-7); AI-assisted enrichment (DATA_RULES.md "Future AI": would need its own provenance).
