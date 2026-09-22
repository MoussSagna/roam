# ROAM — Development Roadmap

## Phase A — Project foundation

Status for **mobile** (2026-09-22). Web and API foundations are not started.

- [x] Monorepo/app structure (pnpm workspace, `apps/mobile`; `apps/web`, `apps/api`, `packages/*` not created)
- [x] TypeScript configuration (strict)
- [x] Linting/formatting (ESLint + Prettier)
- [ ] Environment variables
- [ ] CI basics
- [x] Theme system (Light / Dark / System, semantic tokens, persisted)
- [x] i18n system (FR/EN, persisted, typed keys)
- [~] Shared UI primitives (mobile primitives exist in `apps/mobile/src/components/ui`; no shared `packages/ui` yet)
- [x] Mock/repository architecture (interfaces + mock, no API)
- [x] Unit test setup (Jest + RNTL)

## Phase B — Static UX prototype

- [x] Splash (implemented from the mockup; native app icon still to migrate — see `DECISIONS.md` D-18)
- [x] Welcome (first onboarding screen, see `DECISIONS.md` D-19)
- [x] Onboarding (the 7 mockup screens plus the animated profile-creation simulation; the photos of the last screens are temporary — see `DECISIONS.md` D-19 to D-27)
- [~] Home (placeholder route `/home`, the end of the onboarding — `DECISIONS.md` D-26)
- [ ] Authentication screens — **front-end only, simulated** (Login, Register, Forgot password + their states). **Next step**, see `DECISIONS.md` D-28
- [ ] Context flow
- [ ] Recommendation cards
- [ ] Experience detail
- [ ] Itinerary
- [ ] Map placeholder
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
- [ ] Maps
- [ ] Routing
- [ ] Opening hours where available

## Phase F — User account features

- [ ] Favorites
- [ ] History
- [ ] Profile
- [ ] Preference editing
- [ ] Statistics

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
