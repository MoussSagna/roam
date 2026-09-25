# ROAM — Domain overview

Shared vocabulary of ROAM, for every application. Each concept below has one source of truth; implementation details live
in `apps/mobile/mobiledocs/` and (later) `apps/api/apidocs/`.

## Core loop

```text
Context → Recommendation → Experience → Journey (itinerary) → Real-world outing → Feedback
```

([`../product/PRODUCT_CONTEXT.md`](../product/PRODUCT_CONTEXT.md), [`../AGENT_INSTRUCTIONS.md`](../AGENT_INSTRUCTIONS.md).)

## Concepts

| Concept | Definition | Source of truth |
| --- | --- | --- |
| **Context** | What the user wants now: mood/desire, available time, budget, company, location | [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md) §3, [`RECOMMENDATION.md`](RECOMMENDATION.md) → "User context" |
| **Experience** | A composed outing (several places/activities), the object ROAM recommends | [`EXPERIENCE.md`](EXPERIENCE.md) |
| **Place** | A persistent physical place (café, museum, park…) | [`PLACE.md`](PLACE.md) |
| **Event** | A time-bound experience (concert, exhibition…) | [`EVENT.md`](EVENT.md) |
| **Recommendation** | Filtering + explainable scoring of candidates for a context | [`RECOMMENDATION.md`](RECOMMENDATION.md) |
| **Journey** ("parcours") | An ordered outing of experiences, followed step by step — the built form of the "itinerary" | [`JOURNEY.md`](JOURNEY.md) |
| **Feedback** | The user's verdict after an outing | [`FEEDBACK.md`](FEEDBACK.md) |
| **User / preferences** | Profile, interests and usual constraints | below |
| **Favorite** | A saved place, experience or itinerary (`targetType`) | below |

## Shared vocabularies (as implemented)

String unions in `apps/mobile/src/types/common.ts`, mirrored by i18n keys:

- `Mood`: `calm | discover | energetic | creative | food | shopping | culture | festive | romantic`
- `Company`: `alone | couple | friends | family`
- `BudgetRange`: `free | under10 | 10to25 | 25to50 | 50plus`
- `DurationOption`: `30min | 1h | 2h | 3hPlus`
- `Coordinates`: `{ latitude, longitude }`

Other vocabularies exist and are **not** aligned with these: the onboarding mood tiles (`curious`, `relaxed`, `festive`,
`cultural`, `sporty`, `romantic`, `solo`, `friends`, `family` — mood and company mixed, from the mockup), the journey
context (`JourneyMood` ⊂ `Mood`, its own durations and budgets, [`JOURNEY.md`](JOURNEY.md)), the Data Foundation enrichment enums
([`EXPERIENCE.md`](EXPERIENCE.md): atmosphere, energy, audience, moments, price level). Unifying them is an open decision
([`../DOCUMENTATION_RESTRUCTURE_REPORT.md`](../DOCUMENTATION_RESTRUCTURE_REPORT.md)).

## User and preferences

- `User` (`types/user.ts`): `id`, `displayName`, `email`, optional avatar, age, city, bio, stats (mock profile).
- `UserPreference`: the onboarding answers as the MVP scope defines them (interests, activities, usual budget, max
  distance, usual company). **Not used**: the built onboarding asks mood, time, budget, location and interests instead,
  held in memory only ([`apps/mobile/mobiledocs/features/ONBOARDING.md`](../../apps/mobile/mobiledocs/features/ONBOARDING.md)).
- `ProfilePreferences`: "Mes préférences" (experience types, ambiance, budget per person, max distance), local state.
- `Favorite` (`types/favorite.ts`): `targetType: place | experience | itinerary`, `targetId`. The built favorites are
  experiences only (`Experience.isFavorite`, mobile D-57).

## Data ownership

External facts (from providers) and ROAM inferences must stay distinguishable; missing facts stay `null`/`UNKNOWN`.
Rules: [`../architecture/DATA_RULES.md`](../architecture/DATA_RULES.md).
