# ROAM API — Journeys

The journey endpoints of the ROAM backend (task API-08): create a journey ("parcours") from the mobile creation flow,
read the active one and the history, edit its steps, move through it and complete it. The backend is the source of
truth for the **owner, the status, the progress and the plan**. The domain is
[`appdocs/domain/JOURNEY.md`](../../../appdocs/domain/JOURNEY.md) (states, rules, planning); the storage is
[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) (`Journey`, `JourneyStep`); the experiences are the canonical catalog
([`EXPERIENCE_CATALOG_API.md`](EXPERIENCE_CATALOG_API.md), seeded by DATA-1).

## Architecture

```text
JourneysController (HTTP, DTOs)
   ↓
JourneysService            owner, transitions, step rules, planning, errors
   ├─ JourneyRepository    (API-04) findById, findActiveByUserId, listCompletedByUserId, create, replaceSteps,
   │                       updateProgress, complete — conditional writes, transactions
   ├─ ExperienceRepository (API-04) findManyByIds — the canonical experiences of the steps
   └─ journey-planning.ts  the mobile planning rules (lib/plan.ts, lib/progress.ts), pure functions
   ↓
PostgreSQL (partial unique index "one ACTIVE journey per user", foreign keys, unique step order/experience)
```

- Existing `journeys` module; no new repository, no new model, **no Prisma change, no migration**.
- `JourneyRepository` gained one optional argument: `expectedCurrentStep` on `replaceSteps`, `updateProgress` and
  `complete` — the conditional update then also requires the journey to still be at that step (see "Concurrency").
- Steps reference the canonical `Experience` (no copy, no snapshot); responses embed it in its API-07 list shape.
- No provider, no geocoding, no Directions API, no recommendation logic (suggestions stay in API-07).

## Lifecycle

```text
draft (in the app only) ──POST /journeys──▶ ACTIVE ──POST /:id/progress (×n)──▶ last step ──POST /:id/complete──▶ COMPLETED
                                            │  ▲                                                                 (read only,
                                            └──┘ PATCH /:id (edit steps)                                           history)
```

- **No draft is stored.** JOURNEY.md: the draft is "built in the creation flow; never saved"; the schema's
  `JourneyStatus` is `ACTIVE | COMPLETED` (API-03). The API-08 brief described a stored `DRAFT` state: it contradicts the
  documented source of truth and the schema, so it is **not** implemented — the draft is the `POST /journeys` body.
- **Created ACTIVE and started**: `startedAt` = creation time, `currentStep` = 0 (JOURNEY.md, mobile D-86: "a journey
  starts when it is created").
- **At most one ACTIVE journey per user**; completing it frees the slot.
- Allowed transitions: create → ACTIVE; ACTIVE → edit / progress; ACTIVE (at its last step) → COMPLETED. Nothing leaves
  COMPLETED; there is no way back to ACTIVE and no DRAFT.

## Endpoints

All require `Authorization: Bearer <token>`; the user is always the session's (`@CurrentUser()`).

| Method & path                        | Body / query                                                      | Success                               |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------- |
| `GET /api/v1/journeys/active`        | —                                                                 | 200 journey, or `{ data: null }`      |
| `GET /api/v1/journeys`               | `limit` (1–100, default 20), `cursor`                             | 200 `{ items, nextCursor }` (history) |
| `GET /api/v1/journeys/:id`           | —                                                                 | 200 journey (active or completed)     |
| `POST /api/v1/journeys`              | `title`, `context`, `startLocation`, `startTime`, `experienceIds` | 201 journey                           |
| `PATCH /api/v1/journeys/:id`         | `experienceIds`                                                   | 200 journey                           |
| `POST /api/v1/journeys/:id/progress` | `currentStep`                                                     | 200 journey                           |
| `POST /api/v1/journeys/:id/complete` | —                                                                 | 200 journey                           |

The paths are an API-08 decision: no document fixed them (ARCHITECTURE.md's "API domain examples" still say
`/itineraries`, from the initial proposal; the backend named the model Journey in API-03 — the naming stays an open
decision of the documentation restructure report).

### Create — `POST /journeys`

The mobile `JourneyDraft` (`apps/mobile/src/types/journey.ts`) plus the title the app displays (the app localizes it:
`journey.defaultTitle`):

```json
{
  "title": "Parcours calme",
  "context": { "mood": "calm", "duration": "halfDay", "budget": "low" },
  "startLocation": {
    "kind": "place",
    "label": "République",
    "detail": null,
    "coordinates": { "latitude": 48.8674, "longitude": 2.3637 }
  },
  "startTime": "14:00",
  "experienceIds": ["…", "…"]
}
```

- `context`: the mobile vocabularies (`mood` ∈ calm, discover, food, culture, energetic, romantic, festive; `duration` ∈
  1h, 2h, 3h, halfDay, day; `budget` ∈ free, low, medium, high) — stored as the journey's context, not used by the
  planning (and not the catalog mood decision).
- `startLocation.kind` ∈ current, place, address, experience (the experience the flow was opened from — creating a
  journey from Experience detail needs no special route); coordinates validated (latitude ±90, longitude ±180); no
  geocoding.
- `startTime`: local `"HH:MM"`, no timezone and no date — the app's own contract; stored as sent.
- `experienceIds`: 1–20 UUIDs, ordered; a repeated id is kept once (JOURNEY.md "each at most once").
- The server computes the plan (below) and sets the owner, `ACTIVE`, `currentStep: 0`, `startedAt`.

### Edit — `PATCH /journeys/:id`

`{ "experienceIds": [...] }` — the edit screen's "Enregistrer" (JOURNEY.md "Editing"). Only the steps are editable (the
documented edit); title, context, start and time are not. The journey keeps its id and status, is replanned from its
own start point and time, duplicates are dropped, an empty list is refused, and **the current experience stays current
wherever it moved**; if it was removed, as many steps as were done and remain are done and the next one is current
(the mobile `currentStepAfterEdit`). Written by `JourneyRepository.replaceSteps` in one transaction.

### Progress — `POST /journeys/:id/progress`

`{ "currentStep": n }` — "Continuer mon parcours" (the current step is done). `n` must be the **next** step
(`current + 1`, within the steps); `n` equal to the current step is a no-op (a retried request answers the journey as
it is). Skipping, going back, a negative or out-of-range index → 409 `JOURNEY_INVALID_STEP` (details: `currentStep`,
`stepCount`) or 400 for a malformed value. The last step is not "progressed": it is finished by `complete`.

### Complete — `POST /journeys/:id/complete`

"Terminer le parcours". Only from the last step (JOURNEY.md: completed = every step done) → `COMPLETED`, `completedAt`
set by the server, `currentStep` kept. A second completion → 409 `JOURNEY_NOT_ACTIVE`. A journey always has at least
one step (create and edit refuse an empty list), so "complete with zero steps" cannot happen.

### Response

The mobile `Journey`, with each step's experience:

```json
{
  "data": {
    "id": "…",
    "status": "active",
    "title": "Parcours calme",
    "createdAt": "2026-09-26T12:00:00.000Z",
    "context": { "mood": "calm", "duration": "halfDay", "budget": "low" },
    "startLocation": {
      "kind": "place",
      "label": "République",
      "detail": null,
      "coordinates": { "latitude": 48.8674, "longitude": 2.3637 }
    },
    "startTime": "14:00",
    "endTime": "18:16",
    "estimatedDurationMin": 256,
    "estimatedBudgetEur": 46,
    "totalDistanceM": 1280,
    "steps": [
      {
        "experienceId": "…",
        "order": 0,
        "estimatedArrival": "14:00",
        "estimatedDurationMin": 120,
        "travelDurationMin": 0,
        "travelDistanceM": 0,
        "travelMode": "walk",
        "experience": {
          "id": "…",
          "title": "Après-midi lente",
          "coordinates": { "…": "…" },
          "roam": { "…": "…" }
        }
      }
    ],
    "currentStep": 0,
    "startedAt": "2026-09-26T12:00:00.000Z",
    "completedAt": null
  }
}
```

- `experience` is the API-07 `ExperienceResponse` (facts at the top, ROAM context under `roam`; its places as
  `placeIds`) — enough for the hub, the active journey, the detail, the map (coordinates, order) and the edit screen.
- Never returned: the owner id, internal timestamps (`updatedAt`), provenance, confidence, popularity.
- `status` + `completedAt` tell the app that a journey is over; its feedback is `GET /journeys/:id/feedback` (API-09).

## Planning

The rules of the mobile `features/journey/lib/plan.ts`, ported as they are (JOURNEY.md "Planning"; DATABASE_SCHEMA.md:
"planning values are computed by the service … never by the database"):

- legs from the start point, then from step to step: straight-line distance; on foot (80 m/min) up to 1.5 km, else
  métro (400 m/min + 6 min); an experience without coordinates keeps the previous point;
- arrivals from `startTime` ("HH:MM", wraps past midnight), `endTime`, `estimatedDurationMin` = travel + visits,
  `totalDistanceM`;
- a step lasts the experience's `roam.estimatedDurationMin` — an experience without one cannot be planned (422);
- **budget**: the mobile bracket midpoints (`free` 0, `under10` 8, `10to25` 18, `25to50` 38, `50plus` 60 €), the bracket
  of each experience read from its canonical price range (by its lowest price, or its ceiling when only that is known).
  On the DATA-1 catalog — brackets stored as their bounds — this gives back the mobile value exactly; an experience
  without a known price adds nothing (the total is then a lower bound). No price is invented; the bracket ↔ price
  decision of DATA-1 stays open.

## Validation and experiences

- Every body and query is validated (whitelist, unknown fields refused): `userId`, `status`, `currentStep` (outside
  progress), `completedAt`, `startedAt`, plan values, `steps` → **400 `VALIDATION_ERROR`**. Nothing server-controlled can
  be sent.
- Experiences are checked against the catalog (`findManyByIds`, one query): unknown → `notFound`; **inactive and not
  already in the journey** → `inactive` (the catalog documents an inactive experience as "no longer offered", "kept for
  history, favorites, journeys": a journey keeps one it already has, a new step cannot be one); no duration →
  `noDuration`. All problems at once: **422 `JOURNEY_EXPERIENCE_UNAVAILABLE`**, `details: [{ experienceId, reason }]`.
- Order: the list order; positions 0…n-1 are assigned by the server (no gap, no duplicate — unique
  `(journeyId, order)` and `(journeyId, experienceId)` in PostgreSQL).

## Ownership and security

- No route, query or body takes a user id. Another user's journey — read, edit, progress, complete — answers **404
  `NOT_FOUND`**, exactly like an unknown id (its existence is never disclosed); nothing is written. A `userId` in the
  query of the list is refused (400); on routes without a query DTO it is ignored, never read.
- Signed-in only (global AuthGuard). **Rate limiting is still not implemented**: create, edit and progress must be
  limited before any public deployment (as for the auth and recommendation endpoints).

## Pagination

`GET /journeys`: the repositories' keyset pagination, the public format of API-07 — `{ data: { items, nextCursor } }`,
`limit` 1–100 (default 20), `cursor` = the previous page's `nextCursor` (a UUID; otherwise 400). Completed journeys only,
**most recently completed first** (then id), never another user's.

## Concurrency and transactions

- **One active journey**: the service checks first (clear 409); two concurrent creations both pass that check, and the
  partial unique index `journeys_one_active_per_user` refuses the second insert → `ActiveJourneyExistsError` → the same
  409 `JOURNEY_ALREADY_ACTIVE`. Tested with 5 concurrent creations: one 201, four 409, one ACTIVE row.
- **Create** is one nested write (journey + steps): atomic. **Edit** is `replaceSteps`' transaction (the conditional
  update locks the row; any failure rolls back the whole list). **Progress** and **complete** are single conditional
  updates.
- **Stale writes**: edit, progress and complete are conditioned on the journey being ACTIVE **and still at the step the
  service read** (`expectedCurrentStep`). A progress racing an edit, or two completions, cannot write an inconsistent
  step: the loser gets 409 `JOURNEY_INVALID_STEP` ("changed meanwhile: reload") or `JOURNEY_NOT_ACTIVE`.

## Errors

| Code                                         | Status | When                                                                       |
| -------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `VALIDATION_ERROR`                           | 400    | invalid or unknown body/query field (incl. `userId`, `status`…)            |
| `BAD_REQUEST`                                | 400    | `:id` not a UUID                                                           |
| `AUTH_UNAUTHORIZED` / `AUTH_SESSION_INVALID` | 401    | no or invalid session                                                      |
| `NOT_FOUND`                                  | 404    | unknown journey, or another user's                                         |
| `JOURNEY_ALREADY_ACTIVE`                     | 409    | create while an active journey exists (also when created concurrently)     |
| `JOURNEY_NOT_ACTIVE`                         | 409    | edit, progress or complete a completed journey                             |
| `JOURNEY_INVALID_STEP`                       | 409    | progress not to the next step; complete before the last; changed meanwhile |
| `JOURNEY_EXPERIENCE_UNAVAILABLE`             | 422    | an experience unknown, inactive (new step) or without duration             |
| `DATABASE_UNAVAILABLE`                       | 503    | PostgreSQL unreachable                                                     |

Four new codes (the existing `NOT_FOUND` serves for journeys too).

## Performance

Measured on `roam_test` by counting the SQL statements the `pg` driver sends for a whole request, session check
included (`test/database/journeys.db-spec.ts`): **9 statements** for a detail with 1 step, a detail with 6 steps, the
active journey, and a history page of 2 journeys. The journeys and their steps are one `findMany`/`findUnique` with
steps; the experiences of all steps are one `findManyByIds` — no query per step or per journey.

## Tests

- **Unit** (`pnpm test`): `journey-planning.spec.ts` (legs, arrivals, métro, midnight, missing coordinates/price, budget
  brackets on the DATA-1 bounds, current step after an edit); `journeys.service.spec.ts` with the repositories mocked
  (create: plan, owner, duplicates, 409 before and under concurrency, 422 per reason, repository errors; reads; edit:
  replan, current step, guard, inactive kept vs. new, completed, changed meanwhile; progress: next, no-op, skip/back/past
  end, completed; complete: last step, early, twice, concurrent).
- **HTTP** (`test/journeys.e2e.spec.ts`, repositories mocked): 401 on the 7 routes; response shape without internals;
  spoofing refused (`userId`, `status`, `currentStep`, `completedAt`, `startedAt`, plan, `steps`); nested validation;
  409/422; active null; history pagination and query validation; 404 for another user on every route, nothing written.
- **PostgreSQL** (`test/database/journeys.db-spec.ts`, `roam_test`, DATA-1 catalog seeded, two accounts): the full
  lifecycle with real planning values; uniqueness under concurrency; ownership (read/edit/progress/complete, `userId`
  spoofing, rows unchanged); history (3 completed + 1 active + another user's, 2 pages); unknown/inactive experiences;
  rollback of a failing creation and of a failing step replacement; SQL statement counts.

## Deferred

- ~~Journey feedback endpoints~~ — done in API-09: [`JOURNEY_FEEDBACK_API.md`](JOURNEY_FEEDBACK_API.md).
- Editing title, context, start point or time (no documented edit for them); abandoning/deleting a journey (no
  documented action); a "restart" of a completed journey (not a documented transition).
- Server-side suggestions for the builder (the app uses its own rules; API-07 `/recommendations` exists).
- Opening-hours validity of a plan, real routing — need an hours model and a routing provider.
- Rate limiting (required before any public deployment).
- The mobile integration (an API repository and the API → mobile adapter).
