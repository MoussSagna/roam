# ROAM — DATA-1 migration report: mobile mock data → canonical catalog

DATA-1 fills the canonical PostgreSQL catalog (API-03 schema) from the only catalog data the repository holds: the mock
data of the mobile app. After DATA-1 the API-07 endpoints (`GET /api/v1/experiences`, `/experiences/:id`,
`/recommendations`) serve real rows from PostgreSQL instead of empty lists.

```text
apps/mobile/src/services/mock/data.ts          (mobile mock data, unchanged)
        ↓  transcribed, checked field by field by a test
src/database/catalog-seed/mobile-mock-catalog.ts   (migration source)
        ↓  catalog-plan.ts   (pure mapping to the canonical model, documented below)
        ↓  catalog-seed.ts   (idempotent upserts, one transaction, ownership by provenance)
PostgreSQL roam / roam_test  →  API-07  →  experiences / recommendations
```

**DATA-1 is the initial migration from the mobile mocks. It is not provider ingestion.** No Google Places, Ticketmaster,
data.gouv.fr or any other external API, no key, no network call, no cron, no sync, no provider adapter, no Prisma change,
no migration, no new dependency. The mobile app is unchanged and still reads its mocks (see "Mobile audit").

Run it: `pnpm --filter @roam/api db:seed` (builds, then `prisma db seed` → `node dist/database/catalog-seed/main.js`) on
the database named by `DATABASE_URL` (`roam` from `apps/api/.env`); `DATABASE_URL="$DATABASE_TEST_URL" pnpm exec prisma db
seed` for `roam_test` (the environment wins over `.env`). Safe to run again.

## 1. Sources identified

| Source                                                                                                                                              | Content                                                                               | Migrated                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `apps/mobile/src/services/mock/data.ts` → `categories`                                                                                              | 7 categories (`{ id, slug }`)                                                         | yes, 7                                                |
| same → `places`                                                                                                                                     | 2 places                                                                              | yes, 2                                                |
| same → `experiences`                                                                                                                                | 14 experiences                                                                        | yes, 14                                               |
| same → `collections`                                                                                                                                | 8 editorial collections                                                               | no — no `Collection` model                            |
| same → review pool (5 `ExperienceReview`)                                                                                                           | review texts shared by the experiences                                                | no — reviews are not modeled                          |
| same → `currentUser`                                                                                                                                | the mock signed-in user                                                               | no — not catalog; accounts come from `/auth/register` |
| `features/home/data/nearbyCategories.ts`, `features/journey/data/startSpots.ts`, `features/search/data/trendingChips.ts`, `features/profile/data/*` | static UI configuration (tiles, start spots, chips, profile options, mock statistics) | no — UI data, not catalog                             |
| `*.test.ts(x)` inline fixtures, `services/mock/search.test.ts`, `services/repositories.test.ts`                                                     | test fixtures                                                                         | no — test data                                        |

`data.ts` is the only runtime source of experiences: every other mention of an experience field in `apps/mobile/src` is a
test fixture or code reading that pool (searched: `mock`, `experiences`, `placeIds`, `estimatedDurationMin`, `exp-` ids,
`.json` files — only the i18n locales).

## 2–8. Counts (verified in PostgreSQL, `roam` and `roam_test`)

| Item                                        | Found in the mocks | Migrated | Ignored |
| ------------------------------------------- | -----------------: | -------: | ------: |
| Experiences                                 |                 14 |       14 |       0 |
| Places                                      |                  2 |        2 |       0 |
| Categories                                  |                  7 |        7 |       0 |
| Events                                      |                  0 |        0 |       0 |
| ExperiencePlace (ordered links)             |                  2 |        2 |       0 |
| ExperienceCategory                          |                 15 |       15 |       0 |
| PlaceCategory                               |                  2 |        2 |       0 |
| RoamEnrichment (14 experiences + 2 places)  |                  — |       16 |       — |
| Provider (internal `mobile_mock_migration`) |                  — |        1 |       — |
| ExternalSource (provenance, 14 + 2)         |                  — |       16 |       — |

No experience is ignored. **No event**: no mock carries a date, a time or any event information (checked by a test), so
no `Event` row is created.

## 9. Category mapping

The mobile `Category` is already `{ id, slug }` with a stable slug, and the canonical `Category` stores exactly that slug:
the mapping is the identity, written as an explicit table (`CATEGORY_SLUG_MAPPING`) so that a new mobile slug without a
mapping fails the migration instead of creating a category silently. No translation, no merge (the mocks have no
spelling variants).

| Mobile id        | Mobile slug  | Canonical slug | Used by                                                                                      |
| ---------------- | ------------ | -------------- | -------------------------------------------------------------------------------------------- |
| `cat-cafe`       | `cafe`       | `cafe`         | 1 experience, 1 place                                                                        |
| `cat-park`       | `park`       | `park`         | 2 experiences, 1 place                                                                       |
| `cat-restaurant` | `restaurant` | `restaurant`   | 2 experiences                                                                                |
| `cat-bar`        | `bar`        | `bar`          | 4 experiences                                                                                |
| `cat-culture`    | `culture`    | `culture`      | 3 experiences                                                                                |
| `cat-nature`     | `nature`     | `nature`       | 3 experiences                                                                                |
| `cat-experience` | `experience` | `experience`   | none (the Home "Expériences" tile filters on it) — migrated as a category of the mobile list |

Categories are a shared vocabulary: created when missing, reused when the slug already exists (with its own id), never
changed or deleted by the seed.

## 10. Identifiers

- Mobile ids (`exp-jazz-night`, `place-cafe`) are not UUIDs, so they are not reused as primary keys.
- Migrated rows get a **deterministic UUID v5** derived from the kind and the mobile id
  (`catalogId('experience', 'exp-jazz-night')`, fixed namespace in `catalog-id.ts`): the same id on every run, on `roam`
  and `roam_test`, on every machine — useful for the mobile integration and for tests. Implemented with `node:crypto`
  (SHA-1), checked against the RFC 9562 test vector.
- This differs from the schema convention (UUID v7 generated by Prisma), deliberately and only for migrated rows; the
  columns accept any UUID, **no schema change**. Consequence: `GET /experiences` orders by id, so the migrated experiences
  come in id order (stable), not in creation order.
- Provenance rows and enrichments keep generated UUID v7 ids; they are created once and then updated in place.

## 11. Deduplication

- **Places**: key = normalized name (accents removed, lower case, spaces collapsed) + coordinates to 5 decimals — never
  the name alone (EXPERIENCE.md "Deduplication"). Mock places sharing a key become one canonical place; every mobile id
  keeps its own provenance row. The two mock places are distinct (tested, and checked in SQL: 0 duplicates).
- **Experiences** are not merged: each mock experience is its own record (distinct ids, checked).
- **Categories**: unique slug.
- Experiences whose anchor coincides with a place (e.g. "Pique-nique au parc" at the coordinates of "Parc des Buttes")
  are **not** linked to it: the mocks do not link them (`placeIds: []`), and inferring a link would be inventing it.

## 12. Idempotence and ownership

- **Ownership by provenance.** Every migrated place and experience has an `ExternalSource` row of the internal provider
  `mobile_mock_migration` whose `externalId` is the mobile id. That is how the seed finds its own records; rows without it
  are never touched.
- **Upsert.** Missing → created with its deterministic id. Present and identical → nothing written (the second run writes
  nothing: same rows, same timestamps — tested). Present and different → updated (fields, categories, places, enrichment).
- **Manual edits are protected.** The seed stamps the record's `updatedAt` (and its enrichment's) and the provenance
  `fetchedAt` with the same instant. A later `updatedAt` means someone changed the record elsewhere: the seed skips it and
  reports it ("skipped … changed outside the seed"), it never overwrites it. Limits: an edit through raw SQL that does not
  touch `updatedAt`, or a change of only the join rows (categories/places), is not detected.
- **Conflict.** A row with the migration's id but without its provenance stops the run (`SeedConflictError`) — the seed
  never takes over a record it does not own.
- **Nothing is deleted**: no `DELETE`/`TRUNCATE` of the catalog, no deactivation. A mock removed later simply stays in the
  database (deactivation is a decision for later, see "Limits").
- **One transaction** for the whole run: any failure rolls everything back (tested with a failure on the 6th experience:
  0 rows left, providers and categories included).

## 13. Fields not representable (not migrated)

| Mobile field                                 | Why                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `moods` (all 14 experiences)                 | no mood field; no agreed mood ↔ atmosphere/energy mapping — product decision (see "Mood")                  |
| `coverImage`, `images`                       | React Native `require()` assets, not URLs (see "Images")                                                   |
| `openingHoursLabel`                          | display strings; no normalized hours model (see "Opening hours")                                           |
| `priceLabel`                                 | display string, not a price (see "Budget")                                                                 |
| `location`, `distanceLabel`, `durationLabel` | display strings (the app formats them from coordinates, distance, duration)                                |
| `rating`, `reviewCount`                      | **migrated** (Experience columns) — listed here because the review texts are not                           |
| `reviews` (pool of 5 texts)                  | reviews are not modeled (DATABASE_SCHEMA.md "Deferred"); no parallel review system created                 |
| `highlights`, `transport`                    | no field in the canonical model                                                                            |
| `similarExperienceIds`                       | no relation for it                                                                                         |
| `isHero` (5), `isPopular` (3)                | editorial/UI flags; `popularity` stays unused (API-07 keeps it internal, no artificial popularity created) |
| `isFavorite` (5)                             | user data (`Favorite` needs a real user; the mock user is not an account)                                  |
| `visitedAt`, `historyPeriod`                 | user history, not catalog                                                                                  |
| place `price: 'under10'` (Café de la Place)  | `Place` has a price level only; no documented bracket → level mapping (`priceLevel` stays `UNKNOWN`)       |
| place `imageUrl`                             | absent from both mock places                                                                               |

The plan reports the moods and the place price in `notMigrated` (15 values: 14 mood lists + 1 place price), printed by the
seed and checked by the tests.

## 14. Images

The 14 covers and galleries are 8 photos bundled in the app (`assets/images/onboarding/welcome-*.png`,
`ready-background.jpg`, `profile-landscape.jpg`, `auth/entry-background.png`, `splash-background.png`) loaded with
`require()` — bundler module ids, not URLs; the galleries are a rotating slice of that pool (mobile D-45/D-48, "temporary
placeholders"). They are **not migrated**: `coverImage` null and `images` empty on all 14 experiences, no place photo. No URL
was fabricated and no hosting was created. Serving images needs real photos (provider photos under their terms, or ROAM
assets on a storage) — a later step.

## 15. Budget

The mobile experience has a budget **bracket** (`estimatedBudget`) and a display label (`priceLabel`); the mobile code
itself says the label is not a price (`features/journey/lib/plan.ts`). The bracket (MVP_SCOPE.md §3) is a range, stored as
the range's own bounds — never a single made-up price:

| Bracket   | Experiences | `priceLevel` | `priceMin` | `priceMax` | `currency` |
| --------- | ----------: | ------------ | ---------: | ---------: | ---------- |
| `free`    |           4 | `FREE`       |          0 |          0 | `EUR`      |
| `under10` |           3 | `UNKNOWN`    |       null |         10 | `EUR`      |
| `10to25`  |           4 | `UNKNOWN`    |         10 |         25 | `EUR`      |
| `25to50`  |           3 | `UNKNOWN`    |         25 |         50 | `EUR`      |
| `50plus`  |           0 | `UNKNOWN`    |         50 |       null | `EUR`      |

- `free` is the only bracket that is also a price level. The other levels stay `UNKNOWN`: no document maps a bracket to
  `LOW`/`MEDIUM`/`HIGH`, and choosing one would be a hidden decision.
- The labels are ignored; two contradict their bracket: "Musée d’Art Moderne" `12 €` vs `under10`, "Mama Shelter" `22 €`
  vs `25to50`.
- Effect on API-07's budget filter (lowest price ≤ bracket ceiling, unknown price kept): `budget=10to25` also returns the
  `25to50` experiences (lowest price 25 ≤ 25), and `budget=free` also returns the `under10` ones (lowest price unknown).
  Both follow from the brackets sharing their bounds and from API-07's documented rules; the recommendation reason
  `budget` is only given for a known lowest price. See "Decisions needed".

## 16. Duration

All 14 mocks give a number of minutes (`estimatedDurationMin`: 90, 120, 150 or 240). Stored as
`RoamEnrichment.estimatedDurationMin` (the canonical place of the duration, served as `roam.estimatedDurationMin`) with
`durationIsDerived: true` — it is an estimate authored with the mock, not a provider fact (EXPERIENCE.md "Duration"). No
text duration had to be interpreted; `durationLabel` is redundant display text.

## 17. Provenance

- One internal provider row: `key = mobile_mock_migration`, name "ROAM mobile mock data (DATA-1 migration, internal)".
- One `ExternalSource` per migrated place/experience: `externalId` = the mobile id, `externalUrl` null, `fetchedAt` = the
  run that wrote it. No Google Places, Ticketmaster or data.gouv.fr provider, id or URL exists in the database (checked).
- Enrichments: `source = CURATED` (hand-authored values, not rule output), `confidence` records the basis per field:
  `{ "tags": { "basis": "mobile_mock_migration", "note": "hand-authored mobile mock value" }, "estimatedDurationMin": … }`.
- None of this is exposed by the API (provenance and confidence are internal — EXPERIENCE_CATALOG_API.md).

## 18. Mood

| Exists in the mocks                                                                                                                      | Migrated                                | Why                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `moods` on 14/14 experiences — 26 values: `calm` ×5, `discover` ×5, `festive` ×5, `food` ×4, `culture` ×4, `romantic` ×2, `energetic` ×1 | **no**                                  | no mood column; mapping moods to `atmosphere`/`energyLevel` is undecided (DOMAIN_OVERVIEW.md, API-07)                                           |
| `tags` on 13/14 experiences, 2/2 places                                                                                                  | yes, as `RoamEnrichment.tags`, verbatim | the same concept ("tags"); their words overlap the mood vocabulary, but they are **not** interpreted as moods and API-07 does not match on them |

No mood was converted (`happy → energetic`-style mappings are not made); `atmosphere`, `energyLevel` and `suitableFor`
stay empty/`UNKNOWN` on every enrichment. The mood values remain in the migration source for when the decision is taken.

## 19. Opening hours

The mocks have `openingHoursLabel` display strings only ("18:00 – 02:00", "08:00 – 19:00", "Accès libre"…) on the 14
experiences, none on the places. Not migrated: `openingHours` stays null. The column accepts JSON, but storing labels would
fix a shape before the normalized hours model is designed (needed by `openNow`, `when` and the "closed at the relevant
time" filter — API-07 decision needed #2).

## 20. Preferences matching

No documented link between `UserPreference.interests`/`activities` and categories or tags: none created. Categories and
tags are migrated as they are; the matching stays deferred (API-07 decision needed #3).

## 21. Decisions still needed (product)

1. **Mood ↔ experience** (unchanged from API-07): vocabulary and mapping; the mood values are kept in the migration source.
2. **Budget brackets ↔ price level and bounds**: map brackets to `priceLevel`? Should adjacent brackets not overlap at their
   shared bound (`10to25` vs `25to50`), and should `under10` exclude the `free` filter? Changing it is a mapping change
   plus a re-run.
3. **Opening hours model** (unchanged).
4. **Preferences ↔ catalog** (unchanged).
5. **Images**: which photos the catalog serves (provider photos and their terms, or ROAM-hosted assets).
6. **Collections, reviews, highlights, transport, similar experiences**: model them or keep them app-side.
7. **Retired mocks**: when a mock disappears from the source, deactivate its record or keep it.

## 22. Limits

- The catalog is **mock content**: 14 hand-written experiences, 2 places, placeholder ratings — enough to develop and test
  the API on real rows, not a real catalog (real data comes from DATA-2 → DATA-6).
- 13 of 14 experiences have no place (the mocks give them none): their detail shows `places: []`.
- Every experience has coordinates: no "without coordinates" case exists in the migrated data (the API still supports it).
- Manual-edit detection relies on `updatedAt` (see §12).
- The migration source is a transcription: `mobile-mock-catalog.spec.ts` fails if the mobile file changes, until the
  source is updated.
- `pnpm db:seed` builds the API first (the seed is compiled with it: the generated Prisma client needs the build).

## Mobile audit

| Class | Data                                                                                                                                                                                         | Status                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A     | `experiences`, `places`, `categories` (`services/mock/data.ts`) — read by Home, Discover, Search, Experience detail, Map, Journey, Favorites, History, `useCategories`                       | **migrated**; still the mobile runtime source until the mobile integration (DATA-8) |
| B     | inline fixtures of the `*.test.ts(x)` files, `services/mock/search.test.ts`, `services/repositories.test.ts`, `test/reactNativeMapsMock.tsx`                                                 | keep — tests                                                                        |
| C     | `NEARBY_CATEGORIES`, `START_SPOTS`, trending chips, profile options and mock statistics                                                                                                      | keep — UI configuration                                                             |
| D     | —                                                                                                                                                                                            | nothing obsolete yet: the mocks stay until the app reads the API                    |
| E     | `collections`, the review pool, display labels, highlights, transport, similar ids, hero/popular/favorite flags, history fields, images, `currentUser`, the mock journey and feedback stores | not migratable today (no model, user data, or local assets)                         |

**No mobile file was changed.** The DATA-1 brief makes the mobile switch optional and the data plan puts it in DATA-8. The
switch needs an API repository (`createApiRepositories()`, the single line in `services/index.ts`) **and an adapter from the
API DTO to the mobile `Experience` shape** — none exists yet. The backend does not copy the mock shape: canonical model →
API DTO → mobile adapter.

## 23–24. Verification (commands actually run, 2026-09-26)

| Command                                                                                 | Result                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @roam/api db:seed` (on `roam`), then `prisma db seed` again              | 1st: created 7 categories, 2 places, 14 experiences · 2nd: unchanged 7 / 2 / 14, nothing written                                                                                                                                                           |
| `DATABASE_URL="$DATABASE_TEST_URL" pnpm exec prisma db seed` ×2                         | same on `roam_test`                                                                                                                                                                                                                                        |
| `psql` counts (both databases)                                                          | 14 experiences, 2 places, 7 categories, 2 experience places, 15 experience categories, 2 place categories, 0 events, 16 enrichments, 1 provider, 16 sources                                                                                                |
| `psql` integrity checks                                                                 | 0 active experience without title/coordinates/category/enrichment, 0 broken link, 0 duplicate place, 0 duplicate slug, 0 non-migration source, 0 experience without provenance, 0 image/hours/date/popularity                                              |
| `pnpm test` (unit + HTTP, no database)                                                  | 180 passed (+20: migration source ↔ mobile file, mapping, ids)                                                                                                                                                                                             |
| `pnpm test:db` (PostgreSQL, `roam_test`), twice                                         | 84 passed (+12: first run, second run no-op, ids, update, ownership, conflict, rollback, API-07 on the catalog)                                                                                                                                            |
| `pnpm typecheck`, `pnpm lint`, `pnpm build`, `prisma validate`, `prisma migrate status` | clean; schema unchanged, 3 migrations, up to date                                                                                                                                                                                                          |
| Built API on `roam`                                                                     | `/health` 200, `/health/database` 200, Swagger `/docs` 200, `/experiences` without a session 401                                                                                                                                                           |
| Built API on `roam_test` (test account)                                                 | list 5 + cursor → 3 pages, 14 items; `category=bar` 4; detail with 2 ordered places and `roam` (duration 120, tags); recommendations near République (2 km): 4 items, `nearby`; `availableMinutes=60` → `relaxed: ["duration"]`; no internals in responses |

Seen along the way, not changed (outside DATA-1): `pg` prints a deprecation warning ("client.query() when the client is
already executing a query") from inside Prisma 7's `pg` adapter during transactions — already present in the existing
database tests; and an **exported empty** `SWAGGER_ENABLED=` turns Swagger off (the documented `.env` startup keeps it on).
