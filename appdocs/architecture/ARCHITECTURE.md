# ROAM — Technical Context & Proposed Stack

## Important

This document separates known preferences from proposed architecture.

The user is a frontend developer familiar with:
- React;
- React Native / Expo;
- TypeScript;
- Vite;
- Next.js;
- Tailwind CSS;
- shadcn/ui;
- Node.js / Express;
- MongoDB;
- Prisma;
- React Router.

The following ROAM stack is a recommended starting point and can be adjusted before implementation.

## Recommended application architecture

```text
roam/
├── apps/
│   ├── mobile/       # React Native + Expo
│   ├── web/          # Next.js or React web
│   └── api/          # Node.js API
│
├── packages/
│   ├── ui/           # shared design-system primitives where practical
│   ├── i18n/         # translation resources / helpers
│   ├── theme/        # semantic theme tokens
│   ├── types/        # shared TypeScript types
│   └── config/       # shared lint/ts/build config
│
└── docs/
```

## Frontend

### Mobile
React Native
Expo
TypeScript
NativeWind
Moti

### Web
Preferred option:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui where appropriate

If the project intentionally stays React/Vite-only, preserve the same domain architecture.

## Backend

- Node.js
- TypeScript
- REST API for MVP
- Prisma
- PostgreSQL recommended for structured relational data

MongoDB remains possible, but itinerary relationships, user preferences, feedback and place relations are naturally relational, so PostgreSQL is the preferred starting point.

## Maps / geolocation

Choose one provider before implementation:
- Google Maps Platform; or
- Mapbox.

The provider abstraction should keep the rest of the application independent from the vendor.

## Recommendation engine

Start deterministic.

Conceptually:

```text
User profile
+
Current context
+
Candidate places
        ↓
Constraint filtering
        ↓
Scoring
        ↓
Experience composition
        ↓
Itinerary validation
```

Do not couple the recommendation domain to an AI provider.

## Authentication

Use a standard secure authentication strategy compatible with the chosen web/mobile architecture.
Do not build password cryptography manually.

Status: the mobile screens are built and still simulated ([`DECISIONS.md`](../../apps/mobile/mobiledocs/DECISIONS.md) D-28). The backend
authentication exists since API-05 — email + password (Argon2id), opaque bearer sessions stored hashed in PostgreSQL,
password reset by code — and the mobile app is not wired to it yet ([`apps/api/apidocs/AUTHENTICATION.md`](../../apps/api/apidocs/AUTHENTICATION.md)).

## Data domains

> Since API-03 the stored model is `apps/api/apidocs/DATABASE_SCHEMA.md` (the list below was the initial proposal;
> `Itinerary`/`ItineraryStep` became `Journey`/`JourneyStep`, `FeedbackReason` is deferred).

Likely core entities:

```text
User
UserPreference
Place
Category
Experience
ExperiencePlace
Itinerary
ItineraryStep
Favorite
Feedback
FeedbackReason
```

Exact schema must be finalized before implementation.

## API domain examples

```text
/auth
/users
/preferences
/context
/recommendations
/experiences
/places
/itineraries
/favorites
/feedback
/history
```

## Testing

Recommended:
- Vitest/Jest for unit tests depending on project setup;
- Testing Library for UI;
- API integration tests;
- end-to-end tests for the core loop once the MVP stabilizes.

Prioritize tests for:
- scoring;
- itinerary constraints;
- localization;
- theme;
- critical navigation;
- feedback persistence.

## Implementation status

The **mobile** application is built (`apps/mobile`, see `apps/mobile/mobiledocs/`). `apps/api` is the backend
**foundation** (API-02): a NestJS + Prisma application with configuration, database access layer, validation, errors,
health check and tests, its data model on PostgreSQL (API-03, `apps/api/apidocs/DATABASE_SCHEMA.md`) and its
repositories (API-04, `apps/api/apidocs/REPOSITORY_ARCHITECTURE.md`), authentication (API-05) and the user's profile and
preferences endpoints (API-06, `apps/api/apidocs/USER_PROFILE_AND_PREFERENCES.md`), the experience catalog and a first
recommendation layer (API-07, `apps/api/apidocs/EXPERIENCE_CATALOG_API.md`), the journey endpoints (API-08,
`apps/api/apidocs/JOURNEY_API.md` — `/journeys`, the `/itineraries` example above predates the Journey name) and the
journey feedback (API-09, `apps/api/apidocs/JOURNEY_FEEDBACK_API.md` — under `/journeys/:id/feedback`, not `/feedback`)
and the favorites (API-10, `apps/api/apidocs/FAVORITES_API.md` — `/favorites`)
(`apps/api/apidocs/BACKEND_FOUNDATION.md`).
The mobile app does not call it yet. No web app and no shared `packages/*` yet.

```text
roam/
├── appdocs/             # shared documentation (product, domain, design, architecture)
├── apps/
│   ├── mobile/          # Expo app + mobiledocs/
│   └── api/             # NestJS + Prisma backend (foundation) + apidocs/
├── pnpm-workspace.yaml  # apps/* and packages/*
└── package.json         # root scripts (lint, typecheck, test, format, mobile:start)
```

`apps/web` and `packages/{ui,i18n,theme,types,config}` are **not created yet**. Theme tokens, i18n resources and domain
types currently live in `apps/mobile/src/` and will be extracted into `packages/` when a second application needs them.

### Decided since this proposal

- **Maps (rendering):** `react-native-maps` behind the app's own `RoamMap` — Apple Maps on iOS, Google Maps on Android
  (mobile [`DECISIONS.md`](../../apps/mobile/mobiledocs/DECISIONS.md) D-70). The "provider abstraction" asked above is `RoamMap`, the only component importing the
  vendor library.
- **Place/event data (planned):** Google Places, Ticketmaster Discovery API and French open data, behind backend provider
  adapters ([`apps/api/apidocs/DATA_FOUNDATION.md`](../../apps/api/apidocs/DATA_FOUNDATION.md), [`apps/api/apidocs/PROVIDER_ARCHITECTURE.md`](../../apps/api/apidocs/PROVIDER_ARCHITECTURE.md)). Not implemented.
- **Mobile tests:** Jest (`jest-expo`) + React Native Testing Library (mobile [`DECISIONS.md`](../../apps/mobile/mobiledocs/DECISIONS.md) D-11).
- **Backend:** Node.js + TypeScript + **NestJS** + Prisma + PostgreSQL, REST under `/api/v1` (API-02, 2026-09-25 —
  this settles the framework question left open by
  [`../DOCUMENTATION_RESTRUCTURE_REPORT.md`](../DOCUMENTATION_RESTRUCTURE_REPORT.md)). Details:
  [`apps/api/apidocs/BACKEND_FOUNDATION.md`](../../apps/api/apidocs/BACKEND_FOUNDATION.md).

