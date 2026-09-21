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

## Data domains

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

---

## Implementation status (updated 2026-09-21)

Only the **mobile foundation** exists. Nothing below the "Frontend → Mobile" level of this document
is implemented: no web app, no API, no database, no shared `packages/*`, no map provider chosen.
Rationale for every choice: `DECISIONS.md`. Commands and conventions: `DEVELOPMENT.md`.

### Repository

```text
roam/
├── apps/
│   └── mobile/          # exists — Expo app
├── docs/                # exists — this documentation
├── pnpm-workspace.yaml  # apps/* and packages/*
└── package.json         # root scripts (lint, typecheck, test, format, mobile:start)
```

`apps/web`, `apps/api` and `packages/{ui,i18n,theme,types,config}` are **not created yet**. Theme
tokens, i18n resources and domain types currently live in `apps/mobile/src/` and will be extracted
into `packages/` when the web app needs them.

### Mobile stack (installed)

| Area               | Choice                                                     | Version                 |
| ------------------ | ---------------------------------------------------------- | ----------------------- |
| Runtime            | Expo SDK / React Native / React                            | 57.0 / 0.86.3 / 19.2.3  |
| Language           | TypeScript (strict)                                        | 6.0                     |
| Navigation         | Expo Router (file-based, typed routes)                     | 57.0                    |
| Styling            | NativeWind (stable) + Tailwind CSS                         | 4.2.7 + 3.4.19          |
| Animation          | Moti on Reanimated + Worklets                              | 0.30 on 4.5.1 / 0.10.1  |
| i18n               | i18next + react-i18next                                    | 26.4 / 17.0             |
| Persistence        | `@react-native-async-storage/async-storage` (theme, language) | 2.2.0                |
| Fonts              | Plus Jakarta Sans + Inter (+ Newsreader for the splash) via `@expo-google-fonts/*` | 0.4.x |
| Images             | `expo-image`                                               | 57.0                    |
| Tests              | Jest 29 (`jest-expo`) + React Native Testing Library       | 57.0 / 14.0             |
| Lint / format      | ESLint 9 (`eslint-config-expo`) + Prettier                 | 9.39 / 3.9              |
| Package manager    | pnpm workspaces                                            | 12 (≥ 10 supported)     |

### Testing

Jest was chosen over Vitest (the document left it open). The foundation tests cover theme tokens and
contrast, theme provider (light/dark/system, persistence), i18n (FR/EN parity, switching), the mock
repositories, NativeWind UI components, the splash layout and screen, and the Welcome placeholder.

### Data access

The mobile app already follows `Screen → hook/service → Repository → mock`; see `DEVELOPMENT.md`.
The API implementation of the repositories comes with the backend (Phase C).
