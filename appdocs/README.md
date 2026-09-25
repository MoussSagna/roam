# ROAM shared documentation (`appdocs`)

The documentation common to every ROAM application: **product, business rules, domain, design direction and shared
architecture**. Entry point of the whole documentation: [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md).

```text
appdocs                → Product / Business / Domain / Shared architecture   (what ROAM is and must do)
apps/mobile/mobiledocs → Mobile implementation                               (how the mobile app does it)
apps/api/apidocs       → API / Backend implementation                        (how the backend will do it)
```

## What belongs here

- Product: vision, principles, MVP scope, UX flows and the intent of each screen.
- Domain: Experience, Place, Event, Journey, Recommendation, Feedback, User — definitions, states, rules, shared
  vocabularies, target models.
- Design direction: palette, typography, spacing, radius, motion, theme and i18n requirements.
- Shared architecture: planned applications and stack, Mobile ↔ API boundary, data rules, roadmap.
- Instructions for coding agents.

## What does not

- How a screen, a component, a hook or a store is built, Expo configuration, mobile tests →
  [`apps/mobile/mobiledocs/`](../apps/mobile/mobiledocs/README.md).
- Endpoints, DTOs, database, provider adapters, sync, backend tests → [`apps/api/apidocs/`](../apps/api/apidocs/README.md).

A concept is defined **once**, here; an application's documentation links to it and only adds how that application
implements it (for example [`domain/JOURNEY.md`](domain/JOURNEY.md) → mobile
[`features/JOURNEY.md`](../apps/mobile/mobiledocs/features/JOURNEY.md)).

## Documents

| Folder / document | Content |
| --- | --- |
| [`AGENT_INSTRUCTIONS.md`](AGENT_INSTRUCTIONS.md) | Mission, product principles, development rules, definition of done — read first |
| [`product/`](product/) | [`PRODUCT_CONTEXT.md`](product/PRODUCT_CONTEXT.md), [`MVP_SCOPE.md`](product/MVP_SCOPE.md), [`UX_SCREENS_AND_FLOWS.md`](product/UX_SCREENS_AND_FLOWS.md) |
| [`domain/`](domain/) | [`DOMAIN_OVERVIEW.md`](domain/DOMAIN_OVERVIEW.md) (glossary, vocabularies), [`EXPERIENCE.md`](domain/EXPERIENCE.md), [`PLACE.md`](domain/PLACE.md), [`EVENT.md`](domain/EVENT.md), [`JOURNEY.md`](domain/JOURNEY.md), [`RECOMMENDATION.md`](domain/RECOMMENDATION.md), [`FEEDBACK.md`](domain/FEEDBACK.md) |
| [`design/`](design/) | [`DESIGN_SYSTEM.md`](design/DESIGN_SYSTEM.md), [`THEME_AND_I18N.md`](design/THEME_AND_I18N.md) |
| [`architecture/`](architecture/) | [`ARCHITECTURE.md`](architecture/ARCHITECTURE.md) (stack, domains, API examples, implementation status), [`DATA_RULES.md`](architecture/DATA_RULES.md) |
| [`ROADMAP.md`](ROADMAP.md) | Phases A → H with their status |
| [`DOCUMENTATION_RESTRUCTURE_REPORT.md`](DOCUMENTATION_RESTRUCTURE_REPORT.md) | How this documentation was reorganized; open contradictions and decisions |

## How to use it

Read [`AGENT_INSTRUCTIONS.md`](AGENT_INSTRUCTIONS.md), then the product documents, then the domain document of the concept you work on, then
the implementation documentation of your application. When a shared rule changes, change it here and nowhere else.
