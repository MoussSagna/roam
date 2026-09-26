# ROAM API — Favorites

The favorites endpoints of the ROAM backend (task API-10): the signed-in user saves catalog experiences, lists them and
removes them. Favorites are **experiences** (mobile D-57) — a relation user ↔ canonical experience that changes neither
the experience, nor journeys, nor recommendations. Storage: `Favorite` ([`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md));
experiences: the canonical catalog ([`EXPERIENCE_CATALOG_API.md`](EXPERIENCE_CATALOG_API.md), DATA-1).

## Architecture

```text
FavoritesController   /api/v1/favorites
   ↓
FavoritesService      owner (session), experience checks, mapping, errors
   ├─ FavoriteRepository    (API-04) add (idempotent), remove (idempotent), isFavorite, listByUserId
   └─ ExperienceRepository  (API-04) findManyByIds — the canonical experiences
   ↓
PostgreSQL: unique (userId, experienceId), foreign keys to users and experiences (cascade)
```

**Audit.** The `Favorite` model covers the contract (`id`, `userId`, `experienceId`, `createdAt`; unique
`(userId, experienceId)`; cascade with its user and its experience; index on `experienceId`) — **no Prisma change, no
migration**. The repository had every operation; one fix was needed (see "Concurrency"): its `add` was documented as
idempotent even concurrently, but Prisma runs that upsert as a read then an insert, so a concurrent add could fail on
the unique key. `add` now catches that and returns the favorite the other request created.

## Endpoints

All require `Authorization: Bearer <token>`; the owner is always the session user (no user id in any route, query or
body).

| Method & path                            | Body / query       | Success                     |
| ---------------------------------------- | ------------------ | --------------------------- |
| `GET /api/v1/favorites`                  | `limit`, `cursor`  | 200 `{ items, nextCursor }` |
| `POST /api/v1/favorites`                 | `{ experienceId }` | 201 favorite                |
| `DELETE /api/v1/favorites/:experienceId` | —                  | 204 (no body)               |

```json
// POST /api/v1/favorites  { "experienceId": "01a0…0a" }  → 201
{
  "data": {
    "id": "01a0…c1",
    "experienceId": "01a0…0a",
    "createdAt": "2026-09-26T12:00:00.000Z",
    "experience": {
      "id": "01a0…0a",
      "title": "Rooftop Sunset",
      "isActive": true,
      "roam": { "…": "…" }
    }
  }
}
```

- A favorite = its id, the experience id, when it was saved, and the experience in its API-07 list shape (facts, `roam`,
  `isActive`). Never the owner id.
- **No check endpoint** (`GET /favorites/:experienceId`): the mobile app marks favorites everywhere (Home, Discover,
  Search, Experience detail) from one set of favorite ids, not with a per-experience lookup — `GET /favorites` (up to
  100 per page) gives that set. No document asks for a dedicated check; adding one (or an `isFavorite` on experience
  responses) is left to the mobile integration.
- No `/users/me/favorites`: the Profile's "Mes favoris" uses `GET /favorites`.
- The paths are an API-10 decision (ARCHITECTURE.md lists `/favorites` as a domain example; nothing more).

## Idempotence

- **POST** an experience already saved → **201 with the same favorite** (same id, same `createdAt`), never a duplicate —
  the repository's upsert. (201 every time: the request's outcome — "this experience is a favorite" — is the same.)
- **DELETE** → **204** whether it was a favorite or not; nothing to remove is not an error (the repository's
  `deleteMany`). It only ever targets the session user's favorite: "removing someone else's" removes nothing.

## Experiences

- Unknown experience → **404 `NOT_FOUND`**.
- **Inactive experience** (EXPERIENCE_CATALOG_API.md: `isActive: false` = "no longer offered (kept for history,
  favorites, journeys)"):
  - a favorite saved before the experience was deactivated **stays** and is listed with `isActive: false` — nothing
    deletes favorites (the catalog deactivates, never deletes);
  - it **cannot be newly saved** → 422 `FAVORITE_EXPERIENCE_INACTIVE`;
  - saving again one already saved stays idempotent (201) — the same rule as API-08's journeys.
- The experience is referenced, never copied; favorites are independent from journeys and recommendations.

## Pagination and order

`GET /favorites`: the keyset pagination of API-07 — `{ data: { items, nextCursor } }`, `limit` 1–100 (default 20),
`cursor` = the previous page's `nextCursor` (a favorite id; not a UUID → 400). **Most recently saved first** (the
repository's order, then id). No other sort.

## Concurrency and database guarantees

- 5 simultaneous POSTs for the same user and experience → **5 × 201, the same favorite, one row**; another user saving
  the same experience gets their own row. The unique key `(userId, experienceId)` decides; the service does not
  check-then-insert. Before the repository fix, one of the five answered 409 (no duplicate, but not idempotent).
- Checked directly on PostgreSQL: the unique key (P2002), both foreign keys (P2003), and the cascade (deleting a user
  deletes their favorites; experiences are not deleted).
- Each write is one statement (upsert, delete): atomic; no transaction added.

## Errors

| Code                                         | Status | When                                                                                                                                                    |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`                           | 400    | `experienceId` missing / not a UUID, unknown or server-controlled field (`userId`, `id`, `createdAt`…), invalid `limit`/`cursor`, `userId` in the query |
| `BAD_REQUEST`                                | 400    | `:experienceId` not a UUID                                                                                                                              |
| `AUTH_UNAUTHORIZED` / `AUTH_SESSION_INVALID` | 401    | no or invalid session                                                                                                                                   |
| `NOT_FOUND`                                  | 404    | unknown experience (POST)                                                                                                                               |
| `FAVORITE_EXPERIENCE_INACTIVE`               | 422    | saving an experience no longer offered                                                                                                                  |
| `DATABASE_UNAVAILABLE`                       | 503    | PostgreSQL unreachable                                                                                                                                  |

One new code (422 like API-08's "experience unavailable" rule).

## Performance

Measured on `roam_test` (SQL statements sent by the `pg` driver for the whole request, session check included —
`test/database/favorites.db-spec.ts`): **GET with 1, 10 and 14 favorites: 8** each (the favorites page, then one
`findManyByIds` for all their experiences — no query per favorite); **POST 12** (experience lookup with its relations,
the upsert's read and insert, the response); **DELETE 3**. The catalog holds 14 experiences, so 50 favorites cannot be
created; the count does not depend on the number of favorites.

## Security

- Identity from the session only; another user's favorites are never listed, removed or revealed.
- **Rate limiting is still not implemented**: `POST /favorites` must be limited before any public deployment (the
  authentication already protects every route; global rate limiting stays to do).

## Tests

- **Unit** (`favorites.service.spec.ts`): add (owner, idempotent, 404, inactive 422 vs. already saved, repository
  errors); list (owner, one experience lookup per page, order, empty); remove (idempotent, only the session user's).
- **HTTP** (`test/favorites.e2e.spec.ts`): 401 on the 3 routes; 201 shape without owner id; idempotent POST; validation
  of `experienceId` and refusal of `userId`/`id`/`createdAt`/`updatedAt`/`journeyId`/`status`; 404/422; list, empty,
  query validation; another user's own list; DELETE 204 twice, only the session user's; no check route.
- **PostgreSQL** (`test/database/favorites.db-spec.ts`, DATA-1 catalog, two accounts): add → list → remove,
  idempotence; ownership and isolation; 5 concurrent adds + another user; pagination of 14 favorites to the last page;
  inactive experience kept/refused; unique key, foreign keys, cascade; SQL statement counts. The API-04 repository test
  now races 5 adds instead of 2.

## Deferred

- A per-experience check or `isFavorite` on experience responses (decide with the mobile integration).
- Favorites of places or journeys (the mobile `FavoriteTarget` type; built favorites are experiences only — D-57).
- Using favorites in recommendations.
- Rate limiting; the mobile integration (the app's favorites are local state today).
