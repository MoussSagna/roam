# ROAM — Development Roadmap

## Phase A — Project foundation

Status for **mobile** (2026-09-22). Web and API foundations are not started.

- [x] Monorepo/app structure (pnpm workspace, `apps/mobile`; `apps/web`, `apps/api`, `packages/*` not created)
- [x] TypeScript configuration (strict)
- [x] Linting/formatting (ESLint + Prettier)
- [ ] Environment variables
- [ ] CI basics
- [x] Theme system (Light / Dark / System, semantic tokens, persisted); `/profile/theme` (sprint 5)
      exposes it, `DECISIONS.md` D-61
- [x] i18n system (FR/EN, persisted, typed keys); `/profile/language` (sprint 5) exposes it with a
      dynamically derived language list, `DECISIONS.md` D-60
- [~] Shared UI primitives (mobile primitives exist in `apps/mobile/src/components/ui`; no shared `packages/ui` yet)
- [x] Mock/repository architecture (interfaces + mock, no API)
- [x] Unit test setup (Jest + RNTL)

## Phase B — Static UX prototype

- [x] Splash (implemented from the mockup; native app icon still to migrate — see `DECISIONS.md` D-18)
- [x] Welcome (first onboarding screen, see `DECISIONS.md` D-19)
- [x] Onboarding (the 7 mockup screens plus the animated profile-creation simulation; the photos of the last screens are temporary — see `DECISIONS.md` D-19 to D-27)
- [x] Home — real discovery screen (hero carousel, mood chips, popular/nearby/for-you sections),
      built on the mock experience pool — `DECISIONS.md` D-45
- [x] Discover — immersive editorial discovery page (Sélection ROAM, suggestions, an immersive
      experience block, nearby/trending experiences, editorial collections), built on the mock
      experience and collection pools — `DECISIONS.md` D-65, D-66
- [x] Main navigation — four tabs (Home, Discover, Favorites, Profile) behind a floating pill/bubble
      tab bar that collapses on scroll and expands on tap; placeholder scrollable content on
      Favorites/Profile — `DECISIONS.md` D-38 to D-43
- [x] Authentication screens — **front-end only, simulated** (Login, Register, Forgot password + their states). All 7 screens done: Entry, Login, Register, Forgot password, Reset code, New password, Reset success — see `DECISIONS.md` D-28, D-29, D-31–D-36 and `docs/SCREEN_INTEGRATION_WORKFLOW.md`. The mockup's post-auth screens (welcome-back, location permission, "Tout est prêt") were never in this sprint's scope and remain undone.
- [ ] Context flow
- [~] Recommendation cards — `ExperienceCard` (reusable, `features/home/components/`) built and used
      on Home; the dedicated Recommendations screen (`03_UX_SCREENS_AND_FLOWS.md` §09) is not built
- [x] Experience detail — real screen (`experience/[id]`) plus a dedicated full-screen gallery
      (`gallery/[id]`) with a hero -> gallery Reanimated transition, sprint 5 — `DECISIONS.md` D-48
- [ ] Itinerary — CTA reached via `itinerary/create`, still a placeholder (`DECISIONS.md` D-48)
- [x] Search — shared `SearchScreen` (`/search`) opened from both Home's and Discover's `SearchBar`;
      recent searches (persisted), trending chips, explore-by-mood, live suggestions, results
      (list/map), a sort sheet (Recommandé/Plus proche/Mieux noté/Prix), and a filters bottom sheet, all over the mock experience pool — no real query
      engine yet, sprint 6 — `DECISIONS.md` D-68
- [~] Map — sprint 7 replaces the illustrated maps with `react-native-maps` (`RoamMap`), one screen at a time
      (`DECISIONS.md` D-70). [x] `/map` (Discover's "Voir la carte"); [x] Search's full-screen map
      (`/search/map`, sprint 8, D-71/D-72 — `ExperienceMapView` deleted); [ ] Experience detail's `MapPreviewRow`;
      [ ] onboarding location preview
- [ ] Feedback

Use mock data. The onboarding is complete on the front end (no backend, nothing saved: D-28).

## Phase C — Backend foundation

- [ ] PostgreSQL
- [ ] Prisma
- [ ] User model
- [ ] Preferences
- [ ] Places
- [ ] Experiences
- [ ] Itineraries
- [ ] Favorites
- [ ] Feedback
- [ ] Auth (real authentication, session/JWT: **after** all the front-end screens; the front-end auth screens are in Phase B)

## Phase D — Recommendation engine

- [ ] Candidate filtering
- [ ] Deterministic scoring
- [ ] Explainable recommendation reasons
- [ ] Experience composition
- [ ] Itinerary validation

## Phase E — Real integrations

- [ ] Place provider
- [ ] Geolocation
- [~] Maps — `react-native-maps` on mock data (sprint 7, D-70); real place/routing data still to do
- [ ] Routing
- [ ] Opening hours where available

## Phase F — User account features

- [~] Favorites — "Mes favoris" (`/profile/favorites`) built (favorited experiences, removal, empty
      state), sprint 5; the separate `/favorites` tab is still sprint-3 placeholder content
- [~] History — "Mon historique" (`/profile/history`) built (completed experiences grouped by date,
      category filter, empty state), sprint 5
- [~] Profile — refactored into identity/activity/taste (header, stats, active journey, likes,
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
