# ROAM — Documentation index

Entry point of all ROAM documentation. ROAM helps people decide what to do by turning their current context (mood, time,
budget, company, location) into a realistic outing — not just a list of places.

## Architecture of the documentation

```text
roam/
├── README.md                         repository quick start
├── appdocs/                          SHARED — product, domain, design, shared architecture
│   ├── README.md · DOCUMENTATION_INDEX.md · AGENT_INSTRUCTIONS.md · ROADMAP.md
│   ├── product/                      vision, MVP scope, UX screens and flows
│   ├── domain/                       Experience, Place, Event, Journey, Recommendation, Feedback, glossary
│   ├── design/                       design system direction, theme and i18n requirements
│   └── architecture/                 stack and applications, data rules
├── apps/mobile/mobiledocs/           MOBILE — how the Expo app is built
│   └── features/                     one document per feature
└── apps/api/apidocs/                 API — backend foundation (NestJS + Prisma) and Data Foundation design
```

| Folder | Role | README |
| --- | --- | --- |
| `appdocs/` | What ROAM is and must do, for every application | [`README.md`](README.md) |
| `apps/mobile/mobiledocs/` | Mobile implementation (the only application built) | [`README.md`](../apps/mobile/mobiledocs/README.md) |
| `apps/api/apidocs/` | API / backend implementation (foundation only today) | [`README.md`](../apps/api/apidocs/README.md) |

## Current state in one paragraph

The **mobile app** is a front-end prototype on mock data (onboarding, simulated authentication, Home, Discover, Search,
maps, Experience detail, journeys, Profile/Settings). The **API** has its technical foundation (NestJS + Prisma, health
check, no domain endpoint) and no connected database; the mobile app does not call it yet. No web app. Details: [mobile README → Current state](../apps/mobile/mobiledocs/README.md#current-state-2026-09-25),
[`ROADMAP.md`](ROADMAP.md).

## Where to find…

| I need… | Go to |
| --- | --- |
| The rules for working on ROAM (agents and developers) | [`AGENT_INSTRUCTIONS.md`](AGENT_INSTRUCTIONS.md) |
| Product vision, core loop, what is out of the MVP | [`product/PRODUCT_CONTEXT.md`](product/PRODUCT_CONTEXT.md) |
| MVP scope (account, onboarding, context, recommendations, map, favorites, feedback…) | [`product/MVP_SCOPE.md`](product/MVP_SCOPE.md) |
| The intent of a screen, the main flow, important states, UX principles | [`product/UX_SCREENS_AND_FLOWS.md`](product/UX_SCREENS_AND_FLOWS.md) |
| Business concepts, glossary, shared vocabularies | [`domain/DOMAIN_OVERVIEW.md`](domain/DOMAIN_OVERVIEW.md) |
| Domain models: Experience, Place, Event | [`domain/EXPERIENCE.md`](domain/EXPERIENCE.md), [`domain/PLACE.md`](domain/PLACE.md), [`domain/EVENT.md`](domain/EVENT.md) |
| Journey (itinerary): states, transitions, rules | [`domain/JOURNEY.md`](domain/JOURNEY.md) |
| Recommendation rules, scoring, "why", data contract | [`domain/RECOMMENDATION.md`](domain/RECOMMENDATION.md) |
| Feedback models | [`domain/FEEDBACK.md`](domain/FEEDBACK.md) |
| Visual direction, palette, typography, components list | [`design/DESIGN_SYSTEM.md`](design/DESIGN_SYSTEM.md) |
| Theme (light/dark/system) and i18n (FR/EN) requirements | [`design/THEME_AND_I18N.md`](design/THEME_AND_I18N.md) |
| Global architecture, planned stack, domains, API examples | [`architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md) |
| Data rules (provenance, no provider data or keys in the app) | [`architecture/DATA_RULES.md`](architecture/DATA_RULES.md) |
| What is done and what is next | [`ROADMAP.md`](ROADMAP.md) |
| Install, run, commands, source structure (mobile) | [`mobiledocs/DEVELOPMENT.md`](../apps/mobile/mobiledocs/DEVELOPMENT.md) |
| Mobile conventions, navigation, theme/i18n implementation | [`mobiledocs/CONVENTIONS.md`](../apps/mobile/mobiledocs/CONVENTIONS.md), [`NAVIGATION.md`](../apps/mobile/mobiledocs/NAVIGATION.md), [`THEME_AND_I18N.md`](../apps/mobile/mobiledocs/THEME_AND_I18N.md) |
| How a mobile feature is built | [`mobiledocs/features/`](../apps/mobile/mobiledocs/features/) |
| Why something was built that way (mobile) | [`mobiledocs/DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md) (D-01 → D-90) |
| Integrating a new screen | [`mobiledocs/SCREEN_INTEGRATION_WORKFLOW.md`](../apps/mobile/mobiledocs/SCREEN_INTEGRATION_WORKFLOW.md) |
| Builds, EAS Update, testers | [`mobiledocs/DEPLOYMENT.md`](../apps/mobile/mobiledocs/DEPLOYMENT.md) |
| Database schema (Prisma models, constraints, deferred items) | [`apidocs/DATABASE_SCHEMA.md`](../apps/api/apidocs/DATABASE_SCHEMA.md) |
| Backend authentication (register, login, sessions, password reset, mobile contract) | [`apidocs/AUTHENTICATION.md`](../apps/api/apidocs/AUTHENTICATION.md) |
| Backend data access (repositories, Prisma boundary, transactions, errors, pagination) | [`apidocs/REPOSITORY_ARCHITECTURE.md`](../apps/api/apidocs/REPOSITORY_ARCHITECTURE.md) |
| Backend data pipeline, providers, sync, data sprints | [`apidocs/README.md`](../apps/api/apidocs/README.md) |
| How this documentation was reorganized, open questions | [`DOCUMENTATION_RESTRUCTURE_REPORT.md`](DOCUMENTATION_RESTRUCTURE_REPORT.md) |

## Terminology

- **Experience** = a composed outing (not a single place). **Journey** = "parcours" in the UI = the built itinerary.
- Decision numbers `D-xx` refer to the mobile decision log ([`DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md)).
- Product copy is French first; the documentation is in English; code names (files, routes, types) are quoted as in the
  code.
