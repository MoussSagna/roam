# ROAM — Development Roadmap

## Phase A — Project foundation

Status for **mobile** (2026-09-22). Web and API foundations are not started.

- [x] Monorepo/app structure (pnpm workspace, `apps/mobile`; `apps/web`, `apps/api`, `packages/*` not created)
- [x] TypeScript configuration (strict)
- [x] Linting/formatting (ESLint + Prettier)
- [ ] Environment variables
- [ ] CI basics
- [x] Theme system (Light / Dark / System, semantic tokens, persisted); `/profile/theme` (sprint 5)
      exposes it, [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-61
- [x] i18n system (FR/EN, persisted, typed keys); `/profile/language` (sprint 5) exposes it with a
      dynamically derived language list, [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-60
- [~] Shared UI primitives (mobile primitives exist in `apps/mobile/src/components/ui`; no shared `packages/ui` yet)
- [x] Mock/repository architecture (interfaces + mock, no API)
- [x] Unit test setup (Jest + RNTL)

## Phase B — Static UX prototype

- [x] Splash (implemented from the mockup; native app icon still to migrate — see [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-18)
- [x] Welcome (first onboarding screen, see [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-19)
- [x] Onboarding (the 7 mockup screens plus the animated profile-creation simulation; the photos of the last screens are temporary — see [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-19 to D-27)
- [x] Home — real discovery screen (hero carousel, mood chips, popular/nearby/for-you sections),
      built on the mock experience pool — [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-45
- [x] Discover — immersive editorial discovery page (Sélection ROAM, suggestions, an immersive
      experience block, nearby/trending experiences, editorial collections), built on the mock
      experience and collection pools — [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-65, D-66
- [x] Main navigation — four tabs behind a floating pill/bubble tab bar that collapses on scroll and expands on
      tap ([`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-38 to D-43): Home, Discover, Parcours (replaced Favorites in sprint 11, D-81), Profile
- [x] Authentication screens — **front-end only, simulated** (Login, Register, Forgot password + their states). All 7 screens done: Entry, Login, Register, Forgot password, Reset code, New password, Reset success — see [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-28, D-29, D-31–D-36 and [`SCREEN_INTEGRATION_WORKFLOW.md`](../apps/mobile/mobiledocs/SCREEN_INTEGRATION_WORKFLOW.md). The mockup's post-auth screens (welcome-back, location permission, "Tout est prêt") were never in this sprint's scope and remain undone.
- [ ] Context flow
- [~] Recommendation cards — `ExperienceCard` (reusable, `features/home/components/`) built and used
      on Home; the dedicated Recommendations screen ([`UX_SCREENS_AND_FLOWS.md`](product/UX_SCREENS_AND_FLOWS.md) §09) is not built
- [x] Experience detail — real screen (`experience/[id]`) plus a dedicated full-screen gallery
      (`gallery/[id]`) with a hero -> gallery Reanimated transition, sprint 5 — [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-48
- [x] Journey ("parcours") — creation flow `/journey/create/*` (intro, context, start, building — sprint 12, D-84 —, suggestions, builder — the last step since D-86) and active journey `/journey/[id]`; add from Experience detail — sprint 10, [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-80
- [x] Parcours tab — journey hub `/journey` (in progress / history / empty), replaces Favoris in the tab bar
      (the `/favorites` route is kept) — sprint 11, [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-81
- [x] Search — shared `SearchScreen` (`/search`) opened from both Home's and Discover's `SearchBar`;
      recent searches (persisted), trending chips, explore-by-mood, live suggestions, results
      (list/map), a sort sheet (Recommandé/Plus proche/Mieux noté/Prix), and a filters bottom sheet, all over the mock experience pool — no real query
      engine yet, sprint 6 — [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-68
- [~] Map — sprint 7 replaces the illustrated maps with `react-native-maps` (`RoamMap`), one screen at a time
      ([`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-70). [x] `/map` (Discover's "Voir la carte"); [x] Search's full-screen map
      (`/search/map`, sprint 8, D-71/D-72 — `ExperienceMapView` deleted); [x] Experience detail's map block + full-screen `/experience-map/[id]` (D-73; round photo markers, selection + camera focus on several experiences, sprint 9, D-75);
      [x] onboarding location (interactive `RoamMap`, real position on request, D-89)
- [~] Feedback — after a completed journey: `/journey/[id]/feedback` (1–5 stars + optional comment, skip,
      one per journey, mock repository) — sprint 12, [`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) D-83; the per-experience feedback of
      [`MVP_SCOPE.md`](product/MVP_SCOPE.md) §9 (love/like/meh/not for me + reasons) is not built

Use mock data. The onboarding is complete on the front end (no backend, nothing saved: D-28).

## Phase C — Backend foundation

- [~] API foundation — NestJS + Prisma app, configuration, validation, errors, health check, tests (API-02,
      `apps/api/apidocs/API_IMPLEMENTATION_ROADMAP.md`)
- [x] PostgreSQL — local PostgreSQL 18.6 (`roam`, `roam_test`), connection checked by `/health/database` (API-03)
- [x] Prisma — `PrismaService`, the data model and its migrations, applied and tested on PostgreSQL (API-03)
- [~] User model, preferences, places, experiences, journeys (itineraries), favorites, feedback — stored in PostgreSQL
      (`apps/api/apidocs/DATABASE_SCHEMA.md`), with their repositories (API-04,
      `apps/api/apidocs/REPOSITORY_ARCHITECTURE.md`); no service, no endpoint yet
- [x] User model — accounts and profile (API-05, API-06: `PATCH /users/me`)
- [~] Preferences — MVP preferences stored and served (API-06: `/users/me/preferences`); which mobile screen writes
      them ("Mes préférences" vs. onboarding) is an open product decision
- [~] Places — stored; the 2 mock places migrated (DATA-1); no endpoint of their own (served inside an experience)
- [~] Experiences — catalog served (API-07: `GET /experiences`, `/experiences/:id`) on the 14 experiences migrated from
      the mobile mock data (DATA-1, `apps/api/apidocs/DATA_1_MIGRATION_REPORT.md`); the mobile app still reads its mocks
- [~] Itineraries — journeys served (API-08: create, active, history, edit, progress, complete —
      `apps/api/apidocs/JOURNEY_API.md`); mobile not wired
- [~] Favorites — served (API-10: list, save, remove, idempotent — `apps/api/apidocs/FAVORITES_API.md`); mobile not
      wired (local state)
- [~] Feedback — journey feedback served (API-09: 1–5 stars + comment, one per completed journey,
      `apps/api/apidocs/JOURNEY_FEEDBACK_API.md`); mobile not wired; per-experience feedback not built
- [~] Auth — backend done (API-05: register, login, sessions, logout, password reset by code;
      `apps/api/apidocs/AUTHENTICATION.md`); mobile not wired yet, no email provider for reset codes, no rate limiting

## Phase D — Recommendation engine

- [~] Candidate filtering — budget, distance, duration, company (API-07, `GET /recommendations`); no mood, no opening hours
- [~] Deterministic scoring — proximity + rating (the mobile suggestion rule without mood); weighted score not calibrated
- [x] Explainable recommendation reasons — reason codes of actually matched constraints, relaxation when nothing fits
- [ ] Experience composition
- [ ] Itinerary validation

## Phase E — Real integrations

- [ ] Place provider
- [~] Geolocation — device position on request in the onboarding location step only (`expo-location`, D-89);
      the journey start point is still approximate
- [~] Maps — `react-native-maps` on mock data (sprint 7, D-70); real place/routing data still to do
- [ ] Routing
- [ ] Opening hours where available

## Phase F — User account features

- [~] Favorites — "Mes favoris" (`/profile/favorites`) built (favorited experiences, removal, empty
      state), sprint 5; the separate `/favorites` tab is still sprint-3 placeholder content
- [~] History — "Mon historique" (`/profile/history`) built (completed experiences grouped by date,
      category filter, empty state), sprint 5
- [~] Profile — refactored into identity/activity/taste (header, stats, likes — the active journey left the Profile in sprint 10, D-80 —
      favorites/history previews, yearly activity) plus a new Settings screen for configuration
      (`/profile/settings`); preferences, favorites, history, statistics, language and theme built,
      other Settings sub-screens still placeholders, sprint 5
- [~] Preference editing — "Mes préférences" built (experience types, ambiance, budget/distance
      sliders), sprint 5
- [~] Statistics — "Mes statistiques" (`/profile/statistics`) built (summary cards, genre/city
      breakdown bars, mood donut chart), sprint 5; all mock numbers, none computed from real data

## Phase G — Quality

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E core flow
- [ ] Accessibility
- [ ] Error states
- [ ] Offline/network edge cases
- [ ] Performance

## Phase H — Beta

- [ ] Analytics
- [ ] User testing
- [ ] Recommendation quality review
- [ ] Feedback analysis
- [ ] Fix UX issues
- [ ] Release preparation
