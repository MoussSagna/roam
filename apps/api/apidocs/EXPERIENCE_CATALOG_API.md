# ROAM API — Experience catalog and recommendations

The first catalog endpoints of the ROAM backend (task API-07): browse the experiences stored in PostgreSQL, read one,
and get recommendations for the signed-in user's context. **No provider is connected**: the API consumes what the
database holds (seeded later by DATA-1 → DATA-6). The domain model is [`appdocs/domain/EXPERIENCE.md`](../../../appdocs/domain/EXPERIENCE.md),
the recommendation contract [`appdocs/domain/RECOMMENDATION.md`](../../../appdocs/domain/RECOMMENDATION.md), the storage
[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md), the persistence layer [`REPOSITORY_ARCHITECTURE.md`](REPOSITORY_ARCHITECTURE.md).

## Architecture

```text
ExperiencesController     → ExperiencesService      → ExperienceRepository (listActive, findById)
RecommendationsController → RecommendationsService  → ExperienceRepository.findCandidates
                                                     → UsersService.getPreferences (the session user's)

Provider facts (Experience/Place columns) ─┐
ROAM enrichment (RoamEnrichment, read-only)┴→ domain types → response DTOs (facts at the top, ROAM under `roam`)
```

- Modules `experiences` and `recommendations` (HTTP + services) on the existing `catalog` repositories — no new
  repository. `ExperienceRepository` gained plain data filters (`maxPrice`, `text`, `area`) and `findCandidates`; no
  ranking in a repository.
- No Prisma change, no migration.
- **Signed-in only** (global AuthGuard): every catalog screen of the mobile app sits behind the session, and nothing
  asks for anonymous browsing. Opening the catalog to anonymous users later is a `@Public()` on the controller.

## Endpoints

| Method & path                 | Query                                                                                                 | Success                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `GET /api/v1/experiences`     | `category`, `city`, `budget`, `q`, `limit`, `cursor`                                                  | 200 `{ data: { items, nextCursor } }`       |
| `GET /api/v1/experiences/:id` | —                                                                                                     | 200 `{ data: experience + places }`         |
| `GET /api/v1/recommendations` | `latitude`+`longitude`, `maxDistanceKm`, `budget`, `availableMinutes`, `company`, `category`, `limit` | 200 `{ data: { context, items, relaxed } }` |

All require `Authorization: Bearer <token>`. Unknown query parameters are refused (400), including `userId`.

### `GET /experiences`

Active experiences, oldest first (a stable order), **keyset pagination** — the internal contract of
`src/database/pagination.ts` becomes the public one: `limit` (1–100, default 20), `cursor` (the previous page's
`nextCursor`, a UUID) → `{ "data": { "items": […], "nextCursor": "…" | null } }`. `nextCursor: null` is the last page;
an empty catalog is `{ items: [], nextCursor: null }`.

| Filter     | Meaning                                                                                                                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category` | category slug (`culture`)                                                                                                                                                                                            |
| `city`     | exact city (`Paris`)                                                                                                                                                                                                 |
| `budget`   | `free` \| `under10` \| `10to25` \| `25to50` \| `50plus` (MVP brackets): keeps `priceMin ≤` the bracket's ceiling (0, 10, 25, 50 €, none) — **and experiences without a known price** (a missing fact never excludes) |
| `q`        | 2–100 characters, case-insensitive substring of the title or description (PostgreSQL `ILIKE`; accent-sensitive)                                                                                                      |

### `GET /experiences/:id`

The experience with its **ordered places**. An inactive experience is still returned (`isActive: false`): history,
favorites and journeys keep pointing at it. Unknown id → 404 `NOT_FOUND`; not a UUID → 400 `BAD_REQUEST`.

```json
{
  "data": {
    "id": "01a0…0a", "title": "Musée puis café au Marais", "description": "…",
    "categories": ["culture"], "city": "Paris", "address": null,
    "coordinates": { "latitude": 48.8606, "longitude": 2.3376 },
    "coverImage": null, "images": [], "startDate": null, "endDate": null, "openingHours": null,
    "priceLevel": "medium", "priceMin": 12, "priceMax": 25, "currency": "EUR",
    "rating": 4.6, "reviewCount": 230, "placeIds": ["01a0…01"], "isActive": true,
    "roam": {
      "atmosphere": ["cozy"], "energyLevel": "low", "suitableFor": ["couple", "friends"],
      "bestMoments": ["afternoon"], "tags": [], "estimatedDurationMin": 120, "durationIsDerived": true,
      "source": "roamRules"
    },
    "places": [{ "id": "01a0…01", "name": "Musée", "coordinates": { … }, "priceLevel": "medium", "roam": null, "…": "…" }]
  }
}
```

### Provider facts vs. ROAM enrichment

- **Facts** (from providers, normalized) are the top-level fields; **everything ROAM derived is under `roam`**
  (`RoamEnrichment`: atmosphere, energy, audience, moments, tags, duration and whether it was derived, the rule
  source) — a ROAM inference is never presented as a fact (DATA_RULES.md). `roam: null` = not enriched yet: nothing is
  invented.
- Not exposed: provenance (provider ids and URLs: internal until attribution is designed, see "Deferred"), the rule
  `confidence` (internal basis), `popularity` (an internal ranking signal), provider `attributes`, timestamps.
- Enum values are the apps' camelCase (`veryHigh`, `roamRules`, `couple`): mapped in the API layer.
- Events are not exposed: the mobile app has no event screen or type yet.

## Recommendations

`GET /api/v1/recommendations` — read-only, so a GET with the context in the query string. The path and method were not
specified by any document (ARCHITECTURE.md only lists `/recommendations` as an example domain): this is the decision.

### Pipeline

```text
context (query) + saved preferences (session user)
  → candidates   ExperienceRepository.findCandidates: active, category, budget ceiling, box around the user (≤ 200)
  → hard filters exact distance, duration, company — only a known fact that breaks a constraint excludes
  → ranking      deterministic score, stable ties
  → reasons      the constraints each item actually matched
  → no match?    relax one constraint at a time, then all
```

- **Context:** `latitude`/`longitude` (together), `maxDistanceKm` (1–50, needs a location), `budget` (MVP brackets),
  `availableMinutes` (15–1440), `company` (`alone` \| `couple` \| `friends` \| `family`), `category`, `limit` (1–20,
  default 10). **The saved preferences fill what the query leaves out** (budget, company; max distance when a
  location is given); `context.fromPreferences` lists what came from them. The user is always the session's.
- **Hard filters** (RECOMMENDATION.md → "Candidate filtering"): budget (`priceMin` vs. the bracket ceiling, in the
  query), distance (bounding box in the query, exact haversine distance in the service — DATABASE_SCHEMA.md →
  "Geography"), duration (`roam.estimatedDurationMin` vs. `availableMinutes`), company (`roam.suitableFor`). An unknown
  price, position, duration or audience never excludes.
- **Ranking** = the rule the mobile journey suggestions already implement (`features/journey/lib/suggest.ts`,
  RECOMMENDATION.md → "Current implementation"), **without its mood term**: +2 within 2 km, +1 within 5 km, + rating /
  10; ties by distance then id. Deterministic, no weights to calibrate, no ML, no external call.
- **Reasons:** `nearby` (≤ 2 km), `budget` (known price within the bracket), `duration` (known duration fits),
  `company` (known audience includes it) — the app turns them into sentences ("À proximité", "Dans ton budget"…). No
  score or percentage is exposed (MVP_SCOPE.md §4).
- **No perfect match** (RECOMMENDATION.md): if nothing fits, the constraints are relaxed **one at a time** in the
  documented order — budget, distance, duration, company — then all together; `relaxed` names what was dropped.
  At most 6 queries, only when the first finds nothing.

```json
{
  "data": {
    "context": {
      "location": { "latitude": 48.8566, "longitude": 2.3522 },
      "maxDistanceKm": 5,
      "budget": "free",
      "availableMinutes": null,
      "company": "family",
      "category": null,
      "fromPreferences": ["budget", "maxDistanceKm", "company"]
    },
    "items": [
      {
        "experience": { "id": "01a0…0b", "title": "Marché couvert", "…": "…" },
        "distanceM": 3002,
        "reasons": ["budget", "company"]
      }
    ],
    "relaxed": []
  }
}
```

### What this layer does not do (yet), and why

| Missing                                                             | Why                                                                                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mood** matching (25 % of the conceptual weights)                  | No mood field on experiences and no agreed mapping between the mood vocabularies and `atmosphere`/`energyLevel` (DOMAIN_OVERVIEW.md: open decision) — a product decision |
| "Closed at the relevant time" filter, `openNow` / `when`            | `openingHours` is stored in provider-specific shapes (DATABASE_SCHEMA.md); needs a normalized hours model (DATA-2/3)                                                     |
| Preference matching (`interests`, `activities`)                     | Free strings with no documented link to categories or tags; the preference shape itself is open (USER_PROFILE_AND_PREFERENCES.md)                                        |
| Calibrated weighted score (RECOMMENDATION.md weights)               | "Starting points only, to calibrate with real feedback": no feedback data yet                                                                                            |
| Composed itineraries (experience composition, itinerary validation) | Journey API (not API-07)                                                                                                                                                 |
| Feedback learning                                                   | Nothing stores per-experience feedback yet                                                                                                                               |

## Mobile contract

| Mobile screen / need                           | API-07                                                                    | Gap                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ExperienceRepository.list()` / `getById()`    | `GET /experiences`, `GET /experiences/:id`                                | shape: see below                                                                                               |
| Home "Des idées pour toi", Journey suggestions | `GET /recommendations` (context + reasons + `relaxed`, like `suggest.ts`) | no mood                                                                                                        |
| Discover "À proximité" / "Tendances"           | `/recommendations` with a location (nearest first, then rating)           | no dedicated "trending" signal (`popularity` stays internal until defined)                                     |
| Discover collections                           | —                                                                         | no `Collection` model in the schema                                                                            |
| Search results + filters                       | `GET /experiences?q=&category=&budget=` ; distance via `/recommendations` | no suggestions endpoint; `when` / `openNow` / `walkable` unsupported (no hours model); `q` is accent-sensitive |
| Experience Detail                              | `GET /experiences/:id` with places and `roam`                             | reviews, highlights, transport, similar experiences are mock-only fields                                       |

**Shape differences** (already documented in EXPERIENCE.md → "Current implementation"): the mobile `Experience` is a
mock shape — `moods`, `estimatedBudget` (a bracket), top-level `estimatedDurationMin`, pre-formatted labels
(`distanceLabel`, `priceLabel`…), `isHero` / `isPopular`, reviews. The API follows the **canonical** model
(price level and amounts, `roam.estimatedDurationMin`, coordinates, raw values the app formats). DATA-1 migrated the mock
data to this model ([`DATA_1_MIGRATION_REPORT.md`](DATA_1_MIGRATION_REPORT.md)): a bracket becomes `priceMin`/`priceMax`,
the duration and tags go under `roam`, moods and display fields are not migrated. The mobile integration needs an API →
mobile `Experience` adapter (none exists yet) and will format labels itself.

## Errors

| Code                                         | Status | When                                                                         |
| -------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `VALIDATION_ERROR`                           | 400    | invalid query (limit, cursor, enums, ranges, coordinates, unknown parameter) |
| `BAD_REQUEST`                                | 400    | `:id` not a UUID                                                             |
| `AUTH_UNAUTHORIZED` / `AUTH_SESSION_INVALID` | 401    | no or invalid session                                                        |
| `NOT_FOUND`                                  | 404    | unknown experience                                                           |
| `DATABASE_UNAVAILABLE`                       | 503    | PostgreSQL unreachable                                                       |

No new error code.

## Performance

- Lists and candidates: one `findMany` with its relations — **5 SQL queries per page whatever the number of items**
  (measured on `roam_test`: 20 items → 5 queries, 30 candidates → 5); the detail is 9 queries (its relations and the
  places'). No N+1.
- Candidates are capped at 200 per query (`CANDIDATE_LIMIT`), in id order, pre-filtered in SQL (category, budget, box).
  With no location and no category on a large catalog, the cap can hide candidates: acceptable for the Paris MVP,
  to revisit with real data (e.g. require a location, or a geographic index).
- **Rate limiting is still not implemented.** Search and recommendations are the most expensive reads of the API
  (up to 6 queries for a recommendation) and the auth endpoints are already flagged (AUTHENTICATION.md → "Security"):
  rate limiting is required before any public deployment; it stays a separate task.

## Tests

- **Unit** (`pnpm test`): `ExperiencesService` (filters and budget ceilings, pagination passthrough, 404, errors);
  the recommendation rules as pure functions (preferences completing the context, each hard filter with known and
  unknown facts, reasons, ranking and stable ties, relaxation attempts) and `RecommendationsService` with repositories
  mocked (query filter, cut to limit, relaxation order, empty catalog, incomplete context, errors); DTO mapping (camelCase
  values, facts vs. `roam`, internals left out); geometry (haversine, bounding box).
- **HTTP** (`test/catalog.e2e.spec.ts`, repositories mocked): 401 everywhere without a session; list shape, filters
  and pagination; validation of every query parameter (including `userId`); detail 200 / 404 / 400; recommendations
  context, reasons and validation (coordinates together, distance needs a location).
- **PostgreSQL** (`test/database/catalog.db-spec.ts`, `roam_test` only): a catalog created by the test (categories,
  places, experiences with and without enrichment, inactive, without coordinates, another city) and two accounts with
  different preferences — active-only list, stable order, pagination to the last page, every filter, detail with
  ordered places and `roam`, inactive and unknown experiences, Léa's preferences applied (and reported) vs. Tom's
  none, ranking, relaxation, no `userId` switch, no internals in responses.

## Deferred

- Mood matching, opening hours (`openNow`, `when`), preference matching — see "What this layer does not do".
- Search suggestions, accent-insensitive search (`unaccent` extension or a normalized column), full-text ranking.
- Collections (no model), events in responses, "trending" as a defined signal.
- Provider attribution and licensing in responses (DATA_RULES.md → "Licensing") before real provider data is served.
- Data: since DATA-1 the development database holds the migrated mobile mock catalog (14 experiences, 2 places —
  `pnpm db:seed`); real data comes with the providers (DATA-2 →). The migrated ids are UUID v5, so the list order (by id)
  is stable but not the creation order. With bracket-derived prices, `budget=10to25` also returns `25to50` experiences
  (shared bound) and `budget=free` the `under10` ones (lowest price unknown) — DATA-1 report → "Budget".
- Rate limiting (see "Performance").
