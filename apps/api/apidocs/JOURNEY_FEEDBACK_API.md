# ROAM API — Journey feedback

The feedback endpoints of the ROAM backend (task API-09): after a journey is completed, its owner gives **1–5 stars and
an optional comment**, once. The domain is [`appdocs/domain/FEEDBACK.md`](../../../appdocs/domain/FEEDBACK.md) →
"Implemented: journey feedback" and mobile [`DECISIONS.md`](../../mobile/mobiledocs/DECISIONS.md) D-83; the journey
lifecycle is [`JOURNEY_API.md`](JOURNEY_API.md); the storage is `JourneyFeedback` ([`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)).

```text
POST /journeys (ACTIVE) → progress… → POST /journeys/:id/complete (COMPLETED) → POST /journeys/:id/feedback → JourneyFeedback
```

## Architecture

```text
JourneyFeedbackController   /api/v1/journeys/:id/feedback
   ↓
JourneyFeedbackService      owner (findOwnedJourney, shared with JourneysService), COMPLETED, one per journey, errors
   ├─ JourneyRepository.findById          (API-04, unchanged)
   └─ JourneyFeedbackRepository            (API-04, unchanged) findByJourneyId, create
   ↓
PostgreSQL: journeyId unique, rating CHECK 1–5, comment varchar(300), foreign keys
```

**Audit — no change needed below the service.** The `JourneyFeedback` model already has everything the contract needs
(`id`, `journeyId` unique, `userId`, `rating` smallint with the CHECK `journey_feedbacks_rating_check`, `comment`
varchar(300) nullable, `createdAt`; cascade with its journey and user). The repository already reads by journey and
creates, translating the unique-index violation into `JourneyFeedbackExistsError`. **No Prisma change, no migration, no
repository change.** The ownership check of API-08 became a shared function (`findOwnedJourney`) instead of being copied.

## Endpoints

Both require `Authorization: Bearer <token>`; the author is always the session user.

| Method & path                        | Body                   | Success                                   |
| ------------------------------------ | ---------------------- | ----------------------------------------- |
| `POST /api/v1/journeys/:id/feedback` | `{ rating, comment? }` | 201 feedback                              |
| `GET /api/v1/journeys/:id/feedback`  | —                      | 200 feedback, or `{ data: null }` if none |

The path nests under the journey (one feedback per journey, like the mobile `getForJourney(journeyId)`); no document
fixed it.

```json
// POST /api/v1/journeys/01a0…f1/feedback
{ "rating": 5, "comment": "Super balade, le rooftop valait le détour." }

// 201
{ "data": { "id": "01a0…fb", "journeyId": "01a0…f1", "rating": 5,
            "comment": "Super balade, le rooftop valait le détour.", "createdAt": "2026-09-26T12:00:00.000Z" } }
```

The response is the mobile `JourneyFeedback` **without `userId`** (always the session user: not needed, not exposed).

- **"Passer"** (skip) sends nothing — D-83: "Nothing is saved either way". No skip endpoint.
- **GET with no feedback** answers `{ data: null }` (the mobile `getForJourney` returns `null`), also for a journey that
  is still active.

## Rules

- **Completed journeys only**: an ACTIVE journey → 409 `JOURNEY_NOT_COMPLETED`; the journey is never changed by its
  feedback (D-83). There is no stored draft (API-08).
- **Owner only**: an unknown journey and another user's journey are both 404 `NOT_FOUND` (API-08 convention) — on GET
  and POST; nothing is read or written.
- **Rating**: an integer 1–5. `0`, `6`, negatives, decimals, strings (`"5"`), `null`, booleans → 400
  `VALIDATION_ERROR` (no implicit conversion). PostgreSQL's CHECK refuses the same range for any other writer.
- **Comment** (D-83, the mobile `submitJourneyFeedback`): optional; trimmed; absent, `null`, `""` or whitespace only →
  stored as `null`; at most **300 characters once trimmed** (the mobile counter "58/300", the column `varchar(300)`) —
  longer → 400 (the server does not cut it); not a string → 400. The text is otherwise kept as written.
- **Unknown fields refused** (400): `userId`, `journeyId`, `id`, `status`, `createdAt`, `updatedAt`…; an empty or `null`
  body → 400.

## One per journey, concurrency

- The unique index on `journeyId` decides: the service does not check-then-insert. A second submission — sequential or
  concurrent — fails the insert, becomes `JourneyFeedbackExistsError`, then **409 `JOURNEY_FEEDBACK_ALREADY_EXISTS` with
  the saved feedback in `error.details.feedback`** (the mobile repository answers a repeated submission with the saved one;
  here the client gets an error _and_ the recap to show). Tested: 5 concurrent submissions → one 201, four 409, one row.
- **Racing the completion**: COMPLETED is final (API-08 has no transition out of it), so a journey the service reads as
  COMPLETED stays COMPLETED; read as ACTIVE, the feedback is refused. A feedback therefore never exists on a journey that
  is not completed. Tested: completion and feedback sent together, 5 rounds — the feedback is either created (journey
  completed) or refused with `JOURNEY_NOT_COMPLETED`, never anything else. No lock is needed.
- **Transactions**: creating a feedback is one `INSERT` — atomic by itself; no transaction is added. A refused insert
  (CHECK, foreign key, unique) leaves no row (tested on PostgreSQL).

## Errors

| Code                                         | Status | When                                                      |
| -------------------------------------------- | ------ | --------------------------------------------------------- |
| `VALIDATION_ERROR`                           | 400    | invalid rating or comment, unknown field, empty body      |
| `BAD_REQUEST`                                | 400    | `:id` not a UUID                                          |
| `AUTH_UNAUTHORIZED` / `AUTH_SESSION_INVALID` | 401    | no or invalid session                                     |
| `NOT_FOUND`                                  | 404    | unknown journey, or another user's                        |
| `JOURNEY_NOT_COMPLETED`                      | 409    | the journey is still active                               |
| `JOURNEY_FEEDBACK_ALREADY_EXISTS`            | 409    | the journey already has its feedback (`details.feedback`) |
| `DATABASE_UNAVAILABLE`                       | 503    | PostgreSQL unreachable                                    |

Two new codes; state conflicts are 409 like API-08's; invalid input is the generic 400 (no rating/comment-specific code).

## Performance

Measured on `roam_test` (SQL statements sent by the `pg` driver for the whole request, session check included —
`test/database/journey-feedback.db-spec.ts`): **POST 5, GET 5**. No N+1 possible (one journey, one feedback).

## Security

- Identity from the session only; no user id accepted anywhere; another user's journey indistinguishable from an unknown
  one; the author id never returned.
- Nothing is sent anywhere (no email, notification, analytics); feedback is not used by the recommendations.
- **Rate limiting is still not implemented**: `POST …/feedback` must be limited before any public deployment.

## Tests

- **Unit** (`journey-feedback.service.spec.ts`, repositories mocked): created with the session user as author; 404
  unknown / other user (nothing written); 409 not completed (journey untouched); 409 already exists with the saved
  feedback; repository errors passed through; GET found / null / 404.
- **HTTP** (`test/journey-feedback.e2e.spec.ts`): 401 on both routes; 201 shape without `userId`; comment
  absent/null/""/whitespace → null; 8 invalid ratings, too long (and exactly 300 once trimmed accepted), wrong type,
  empty and `null` bodies → 400; server-controlled fields refused; 409 codes; GET 200 / null; another user → 404; no
  PATCH/DELETE route.
- **PostgreSQL** (`test/database/journey-feedback.db-spec.ts`, DATA-1 catalog, journeys created and completed through the
  API): full flow with rating 5 + comment and rating 1 without; active journey refused and unchanged; ownership (other
  user refused, then owner succeeds; isolation); duplicate + 5 concurrent submissions; feedback racing the completion;
  the database's own CHECK (0, 6, −3), foreign key and unique, with no row left by a failure; SQL statement counts.

## Decisions

- **No PATCH, no DELETE.** No document plans editing or removing a journey feedback: D-83 builds a single submission,
  the screen shows the recap once given ("feedback already given → its recap, no form"), and the mobile repository
  keeps the first one. Whether a feedback may be edited (or deleted) is a **product decision still to take**.
- A repeated submission is an error (409) that carries the saved feedback, rather than a silent 200.
- `userId` is not in the response.

## Deferred

- Editing / deleting a feedback (decision above); "give feedback later" after skipping (D-83: "skipping is final").
- Per-experience feedback (MVP_SCOPE.md §9: love/like/meh/not for me + reasons) — not built, and whether it coexists with
  journey feedback is an open product decision (FEEDBACK.md).
- Listing a user's feedbacks (no screen needs it); feedback in the journey response (the app asks for it separately).
- Using feedback for recommendations (RECOMMENDATION.md "Feedback learning").
- Rate limiting; the mobile integration.
