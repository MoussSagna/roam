# Mobile — API integration (DATA-8)

How the mobile app talks to the ROAM API: one HTTP client, a secure session, typed errors, adapters from the API's
canonical model to the app's types, and a single switch between the mock and API repositories. First real flows:
authentication, the current user, the experience catalog and search. Decisions: [`DECISIONS.md`](DECISIONS.md) D-91 →
D-96. API contracts: [`apps/api/apidocs/`](../../api/apidocs/README.md).

```text
Screen → hook / context → Repository (interface, services/repositories/types.ts)
                              ├─ mock  (services/mock/)      EXPO_PUBLIC_DATA_SOURCE=mock  (default)
                              └─ API   (services/api/)       EXPO_PUBLIC_DATA_SOURCE=api
                                   ↓ adapters (DTO → app type)
                                   ↓ ApiClient (the only fetch)  → ROAM API /api/v1 → service → repository → PostgreSQL
```

No screen, hook or context calls `fetch`; only `services/api/apiClient.ts` does.

## Configuration

Two public Expo variables, read once at bundle time (`src/config/dataSource.ts`); template in
[`../.env.example`](../.env.example) (copy to `apps/mobile/.env`, never committed).

| Variable                  | Values                                                      | Default |
| ------------------------- | ----------------------------------------------------------- | ------- |
| `EXPO_PUBLIC_DATA_SOURCE` | `mock` \| `api`                                             | `mock`  |
| `EXPO_PUBLIC_API_URL`     | the API **origin**, without `/api/v1` (added by the client) | —       |

| Where the app runs | `EXPO_PUBLIC_API_URL`                                                                   |
| ------------------ | --------------------------------------------------------------------------------------- |
| iOS simulator      | `http://localhost:3000`                                                                 |
| Android emulator   | `http://10.0.2.2:3000` (the emulator's alias for the host machine)                      |
| Physical device    | `http://<the computer's LAN IP>:3000`, same Wi-Fi — a personal value: keep it in `.env` |
| Deployed API       | its `https://` origin (none exists yet)                                                 |

- **Deterministic.** `api` without a URL, an unknown source, a non-http URL or a URL ending in `/api/v1` throws a
  `ConfigurationError` at startup — the app never quietly picks the other source.
- The values end up in the bundle: never a secret there. Restart `expo start --clear` after a change.
- Plain `http` is for local development only (`localhost` on the iOS simulator, `10.0.2.2` on the Android emulator);
  platform rules on cleartext traffic to a LAN IP from a device were **not verified in DATA-8**. A deployed API must be
  `https`.

## API client (`services/api/apiClient.ts`)

One `createApiClient({ baseUrl, sessionStorage, onUnauthorized, timeoutMs, fetchImpl })` → `get` / `post` / `patch` /
`delete`. It owns:

- the base URL and the **`/api/v1`** prefix (every request), JSON headers and bodies, the query string (empty values left
  out);
- the **bearer token**: read from `SessionStorage`, sent unless `{ authenticated: false }` (login, register);
- a **timeout** (15 s, `AbortController`);
- the envelopes: success → the `data` of `{ "data": … }` (a `null` data stays `null`; 204 and empty bodies → `undefined`);
  failure → an `ApiError` built from `{ "error": { code, message, details } }`.

**No retry of any kind.** Every outcome reaches the caller once.

### Error model (`services/api/apiError.ts`)

`ApiError { status, code, message, details, retryAfterSeconds }` plus `isNetworkError`, `isUnauthorized`,
`isRateLimited`; `isApiError(error)`; `errorMessageKey(error)` → the translation key a screen shows (`errors.network`,
`errors.tooManyRequests`, `errors.sessionExpired`, `errors.generic`).

| Situation                                                               | `status`     | `code`                   |
| ----------------------------------------------------------------------- | ------------ | ------------------------ |
| API error envelope (400, 401, 404, 409, 422, 5xx)                       | its own      | the API's (`NOT_FOUND`…) |
| Offline, DNS, server down                                               | 0            | `NETWORK_ERROR`          |
| No answer within the timeout                                            | 0            | `TIMEOUT`                |
| Malformed JSON, success without `data`, HTML error page, malformed page | the HTTP one | `INVALID_RESPONSE`       |

Errors never contain the URL, a header, the token or a request body.

### 401

A 401 answered to a request **that carried a token** means the server no longer accepts the session (expired,
revoked, logged out elsewhere — `AUTH_SESSION_INVALID`): the client clears the token, then calls `onUnauthorized` once,
then rejects. The next request goes out without a token, so there is nothing to loop on. `createApiRepositories` turns
`onUnauthorized` into `AuthRepository.onSessionExpired`; `AuthProvider` listens: `isLoggedIn` → false,
`router.replace('/auth/login')`, one toast "Ta session a expiré. Reconnecte-toi." — only the first of several parallel
401s acts. `Stack.Protected` drops the authenticated history (D-44), so back cannot return to it.

A 401 **without** a token (wrong password on login: `AUTH_INVALID_CREDENTIALS`) is an ordinary error for the screen.

### 429

API-11 answers `429 TOO_MANY_REQUESTS` with `Retry-After` (seconds; `details.retryAfterSeconds` as a fallback): the
client exposes it as `ApiError.retryAfterSeconds`, `isRateLimited`, and `errorMessageKey` → `errors.tooManyRequests`
("Trop de tentatives. Patiente un peu avant de réessayer."). No automatic retry, no backoff, no global handler: the screen
shows it (Login/Register as a toast, Home/detail in their error state). Checked live: the auth tier's 11th login in 15 min
→ `retryAfterSeconds: 900`.

## Session (`services/api/sessionStorage.ts`)

`SessionStorage { getToken, setToken, clearToken }`, implemented with **`expo-secure-store`** (Keychain / Keystore,
`AFTER_FIRST_UNLOCK`, key `roam.session.token`) with an in-memory copy. Only the API repositories and the client see
it: `AuthProvider`, hooks and screens never touch a token. Never AsyncStorage, never logged, never in an error. The
password is sent once (login/register) and never stored. The `expo-secure-store` config plugin is in `app.json`: a new
native build is needed (Expo Go already includes the module).

## Authentication

`AuthRepository` (D-92) — the same contract in both modes:

| Method                                       | API mode                                                                                                           | Mock mode          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `restoreSession()` (startup)                 | token? → `GET /auth/me`: 200 → signed in; 401 → token cleared, signed out; offline/5xx/429 → token kept, signed in | persisted flag     |
| `login({ email, password })`                 | `POST /auth/login` → token saved                                                                                   | 900 ms, flag saved |
| `register({ displayName, email, password })` | `POST /auth/register` (first name → `displayName`) → token saved                                                   | same as login      |
| `logout()`                                   | `POST /auth/logout` with the token (204 even expired), token cleared **even offline**                              | flag cleared       |
| `onSessionExpired(listener)`                 | fed by the client's 401                                                                                            | never fires        |

- `useBootstrap` calls `restoreSession()` before the first screen (the splash then heads to Home or Welcome).
- `AuthProvider` exposes `login(credentials)`, `register(input)`, `logout()`, `isLoggedIn`.
- **Login**: `AUTH_INVALID_CREDENTIALS` → a field error "Email ou mot de passe incorrect." under the password; anything
  else → a toast from `errorMessageKey`. **Register**: `AUTH_EMAIL_ALREADY_EXISTS` → "Un compte existe déjà avec cet
  email." under the email. Both stay on their screen, button enabled again.
- **Onboarding "Commencer"** now opens Register (pushed) in both modes: a real session needs credentials (D-93).
- **Navigation rules kept**: signed in → Home; signed out → Welcome/Login; logout → Login with no way back; 401 → Login.
- **Not migrated**: forgot password / reset code / new password stay simulated (code `123456`) — the API has no email
  provider to send codes yet (AUTHENTICATION.md); Google/Apple buttons stay visual.

## Repositories and the source switch

`services/index.ts` is the only place that chooses (D-91):

```ts
export const repositories = createRepositories(readDataSourceConfig()); // mock | api
```

`createApiRepositories()` lists each domain explicitly:

| Domain                        | API mode                                               | Why                                                                 |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| `auth`                        | **API** (`/auth/*`)                                    | DATA-8 priority 1                                                   |
| `users`                       | **API** (`GET /auth/me`)                               | the profile read (API-06)                                           |
| `experiences`                 | **API** (`GET /experiences`, `/experiences/:id`)       | DATA-8 priority 2                                                   |
| `search`                      | **API** (`GET /experiences?q=&category=&budget=`)      | must read the same catalog, or a result opens an unknown id         |
| `favorites`                   | **API** (`/favorites`), prepared, not used by a screen | D-95                                                                |
| `recommendations`             | **API** (`GET /recommendations`)                       | Home "Des idées pour toi" (API-12, D-99)                            |
| `categories`                  | local vocabulary                                       | no endpoint; its slugs are the catalog's (DATA-1 identity mapping)  |
| `collections`                 | local (mock editorial content)                         | no `Collection` model in the API                                    |
| `places`                      | local                                                  | no place endpoint; no screen reads it (places come with the detail) |
| `journeys`, `journeyFeedback` | local (AsyncStorage)                                   | not migrated in DATA-8 (API-08/09 ready)                            |

**No silent fallback.** In API mode an API failure is an error — no domain ever answers mock data instead. Mock mode
uses only the mocks. A test checks both (`services/repositories.test.ts`).

### Loading, empty, error

The hooks that could stay in "Chargement…" forever on a failed request now end loading on failure:

| Hook / screen                                                       | On failure                                                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `useHomeExperiences` → Home                                         | error state: the `errorMessageKey` message + "Réessayer" (new, minimal: text + button)         |
| `useExperience` → Experience detail                                 | the existing "not found" layout shows the error message instead of "Cet écran arrive bientôt." |
| `useExperienceDetail` (similar experiences)                         | no suggestions, the experience still shows                                                     |
| `useSearch`                                                         | results end loading, a toast says why (not shown as "no result"); suggestions: none            |
| `useCurrentUser`, `useFavoriteExperiences`, `useHistoryExperiences` | loading ends (empty state)                                                                     |
| `useDiscoverData`, `useJourneyExperiences`                          | unchanged (already had an error state)                                                         |

### Requests

- `ExperienceRepository.list()` follows `nextCursor` with `limit=100` (one request for today's 14 experiences); a
  repeated cursor or a malformed page stops with `INVALID_RESPONSE` instead of looping.
- **Parallel calls share one request**: Home, Discover and the Parcours tab ask for the list when the app opens — one
  `GET /experiences`, each caller gets its own copy. Nothing is cached once resolved (no stale data, no cache
  invalidation to design yet). No React Query (no documented decision for it).
- `getById()`: a non-UUID id (an old mock id kept by a local journey) answers `null` without a request; 404 → `null`.
- Similar experiences: the API serves none, so the detail makes no extra request.

## Adapters (`services/api/adapters/`)

The DTOs (`services/api/dto.ts`) are private to `services/api/`: screens only receive app types.

### Experience (`mapExperienceDto`)

| App field                                                                    | From the API                                                                                                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `title`, `placeIds`, `rating`, `reviewCount`, `address`, `coordinates` | same fields (`null` → absent)                                                                                                          |
| `description`                                                                | `description ?? ''`                                                                                                                    |
| `categoryIds`                                                                | category **slugs** → the app's category id (`culture` → `cat-culture`); unknown slug kept as id                                        |
| `estimatedDurationMin`                                                       | `roam.estimatedDurationMin` (absent when unknown)                                                                                      |
| `estimatedBudget`                                                            | bracket from `priceMax`/`priceMin` (the inverse of DATA-1: `0/0` free, `–/10` under10, `10/25`, `25/50`, `50/–`); absent when no price |
| `coverImage`, `images`                                                       | URLs → `{ uri }`; absent when none                                                                                                     |
| `location`                                                                   | `city`                                                                                                                                 |
| `durationLabel`                                                              | formatted (`formatDuration`: "2 h 30")                                                                                                 |
| `priceLabel`                                                                 | formatted, translated: "Gratuit", "12 €", "10–25 €", "Jusqu'à 10 €", "À partir de 50 €"                                                |
| `tags`                                                                       | `roam.tags`                                                                                                                            |

**Not served — left absent, never invented:** `moods` (`[]`: no mood model — the API does no mood matching and the app
does not pretend otherwise), `distanceLabel` (no user position in a catalog read), `openingHoursLabel` (no normalized
hours), `transport`, `highlights`, `reviews`, `similarExperienceIds`, `isHero`, `isPopular`, `isFavorite`, `visitedAt`,
`historyPeriod`. The labels are formatted when the data arrives, in the language of that moment.

`estimatedDurationMin` and `estimatedBudget` became **optional** on `Experience` (D-94): an unknown value never excludes
(search price sort puts it last, journey suggestions let it through, the journey plan adds nothing for it).

### Consequences on screens (API mode)

| Screen                          | With the API data                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home hero / "Populaires"        | no editorial flag served: the best-rated 5 / the most reviewed (`features/home/lib/pickFeatured.ts`, D-96); mock mode unchanged                    |
| Home "Pour toi"                 | same rules; the mood rule matches nothing (no moods)                                                                                               |
| Discover "Près de toi"          | empty → the section hides (no distance labels)                                                                                                     |
| Discover collections            | still the mock editorial collections; their experience ids are mock ids                                                                            |
| Cards, detail, map markers      | **API experience images are currently absent — the existing no-photo state is used** (no fake URL, no bundled photo presented as the experience's) |
| Detail                          | no opening hours, transport, highlights, reviews, similar experiences; "Pourquoi ROAM" keeps only the reasons the data supports                    |
| Profile                         | real name, email, city, age, bio; stats fall back to the existing defaults (`User.stats` not served)                                               |
| "Mes favoris", "Mon historique" | empty (they read mock flags; favorites/history UI not migrated)                                                                                    |

### User (`mapUserDto`)

Same fields as the app's `User`; `null` → absent; `stats` not served.

## Profile and preferences

- **Migrated**: the profile read (`UserRepository.getCurrentUser()` → `GET /auth/me`).
- **Not migrated**: `PATCH /users/me` (the "Modifier mon profil" screen is a placeholder); `GET`/`PATCH
/users/me/preferences` — the app's "Mes préférences" (`ProfilePreferences`: experience types, ambiance, € budget) does
  not match the stored `UserPreference`, an **open product decision** (USER_PROFILE_AND_PREFERENCES.md): no preference
  repository was added until it is taken.

## Recommendations

**Home "Des idées pour toi" reads `GET /recommendations` (API-12, D-99).** `RecommendationRepository.recommend(context)`
(`services/api/repositories/recommendations.ts`) sends the context in the API vocabulary — budget and company are the
same values, the category id becomes its slug, unknown values are left out — and `mapRecommendationsDto`
(`services/api/adapters/recommendation.ts`) returns `{ items: [{ experience, distanceM?, reasons }], relaxed }`: the
experience through the catalog mapping, nothing ranked again in the app.

- **Context Home really has** (`features/home/useForYouRecommendations.ts`): the position **only if the location
  permission is already granted** (Home never prompts), the selected mood (mock only: the API has no mood model), `limit`
  4 (the section's size). Budget, time and company are not known on Home: nothing is invented, the API takes budget,
  company and distance from the saved preferences.
- **One request per context**: the position is read first, then one request; again only when the mood or the position
  changes, or on "Réessayer". The previous ideas stay shown while a new mood loads. In API mode a mood change still asks
  again although the API ignores the mood (no cache, D-91).
- **States in the section** (the rest of Home stays usable): "Chargement…", the `errorMessageKey` message + "Réessayer",
  or "Pas d'idée pour le moment." when the list is empty. A failure never shows the mock pool.
- **Mock mode**: `createMockRecommendationRepository` is `pickForYou` unchanged — same four ideas, same mood rule.
- **Not migrated**: the journey suggestions (`features/journey/lib/suggest.ts`) and Discover "Près de toi" still rank
  locally; the reasons (`nearby`, `budget`…) are not shown yet — no screen has a place for them.

## Favorites (prepared)

`FavoriteRepository { listExperienceIds, add, remove }` in both modes (API: `GET /favorites` all pages, `POST
/favorites`, `DELETE /favorites/:experienceId`; the list is the source of truth, no check endpoint is called). **No
screen uses it yet**: Home/Discover keep `useFavoriteExperienceIds`, "Mes favoris" keeps `useFavoriteExperiences`.

## Journey and feedback

**Not migrated.** In API mode the journey flow builds from the API catalog (experience ids are catalog UUIDs) and stores
journeys and feedback locally, as before. A journey saved in mock mode keeps mock ids: after switching to API mode its
experiences no longer resolve. API-08 / API-09 are ready for the next step.

## Role of the mocks

`services/mock/` (and `data.ts`) stay: offline development, UI and component tests (the whole existing suite runs in
mock mode), the domains the API does not serve (categories vocabulary, collections), and the explicit `mock` source.
A mock is removed only when its domain is fully migrated and validated.

## Tests

| File                                                                                               | Covers                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/dataSource.test.ts`                                                                        | defaults, api mode, refused configurations                                                                                                                                                                                                    |
| `services/api/apiClient.test.ts`                                                                   | GET/POST/PATCH/DELETE, query, 204, null data, 400/404/409/422/500/503, 401 with/without token (no loop), 429 + Retry-After, malformed JSON, missing envelope, HTML error, offline, timeout, nothing private in errors                         |
| `services/api/adapters/adapters.test.ts`                                                           | experience mapping (every field, nulls, images, unknown slug, nothing invented), budget brackets, price labels FR/EN, user                                                                                                                    |
| `services/api/adapters/catalogFixture.test.ts`                                                     | **real API answers** (captured from the local API on `roam_test`) → app model → the screens' own helpers                                                                                                                                      |
| `services/api/repositories/repositories.test.ts`                                                   | experiences (pages, shared in-flight request, copies, malformed page, repeated cursor, errors, detail, 404, non-UUID, 401), auth (login, 401, 429, register, 409, restore ×4, logout ×3, unsubscribe), user, search, favorites, local domains |
| `services/repositories.test.ts`                                                                    | mock auth (flag only, no password or token stored), mock favorites, the source switch (API errors never become mock data)                                                                                                                     |
| `auth/AuthContext.test.tsx`                                                                        | login/register/logout, failed login, session expiry (once, Login, toast), expiry while signed out                                                                                                                                             |
| `features/auth/authApiErrors.test.tsx`                                                             | Login: credentials sent, invalid credentials, 429, offline; Register: email taken                                                                                                                                                             |
| `features/home/lib/pickFeatured.test.ts`, `HomeScreen.test.tsx`, `ExperienceDetailScreen.test.tsx` | hero/popular without flags; Home error + retry; detail error                                                                                                                                                                                  |
| `services/api/liveApi.integration.test.ts`                                                         | **against a running local API** (skipped without `ROAM_API_URL`): catalog needs a session, register, restore, `/auth/me`, real catalog mapping, detail, 404, search, favorites, revoked session → 401 → expiry, wrong password, login, logout |

## Validation

Run the live suite against an API on **`roam_test`** (it writes accounts and favorites — never `roam`):

```bash
cd apps/api
DATABASE_URL="$DATABASE_TEST_URL" pnpm exec prisma db seed   # the DATA-1 catalog, if roam_test was emptied by pnpm test:db
DATABASE_URL="$DATABASE_TEST_URL" node dist/main.js            # after pnpm build; do not export empty variables (SWAGGER_ENABLED=)
cd ../mobile
ROAM_API_URL=http://localhost:3000 npx jest liveApi
```

Jest runs with Expo's `fetch` polyfill, which does not reach the network: the live suite injects a small `fetch` on
Node's `http` (the app itself uses React Native's).

Then the app: `EXPO_PUBLIC_DATA_SOURCE=api EXPO_PUBLIC_API_URL=… pnpm mobile:start` in a development build (it needs the
`expo-secure-store` native module).

## Limitations

- **Not checked on a simulator or a device** in DATA-8 (no Xcode/Android SDK on the build machine): the iOS and Android
  bundles build in API mode (`expo export`), and the whole API layer ran against the real local API, but the screens
  were not seen with API data. To do before relying on it: Login, Home, Experience, Discover, Profile in API mode.
- Preferences, profile editing, favorites UI, journeys, feedback, password reset: not migrated. Recommendations: Home only
  (API-12); journey suggestions and Discover still local.
- Labels formatted at load time keep the language of that moment until the next load.
- `api` mode with a local journey saved in `mock` mode: its experiences do not resolve.
- Search: accent-sensitive (`q`), no distance filter, API budget semantics (ceiling, unknown price kept).

## Next migrations

1. Validate DATA-8 on a device (API mode).
2. Favorites UI on `FavoriteRepository` (one shared favorite-id set for Home, Discover, Search, detail, "Mes favoris").
3. Journey (API-08) then journey feedback (API-09).
4. Recommendations beyond Home: journey suggestions (their context exists in the creation flow) and Discover "Près de
   toi".
5. Preferences, after the product decision on their shape; profile editing with its screen.
