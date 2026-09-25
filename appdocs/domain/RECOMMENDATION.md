# ROAM — Recommendation (domain)

## Goal

Generate relevant outing ideas from:
- user preferences;
- current context;
- real candidate places/activities.

## Candidate filtering

First eliminate impossible candidates:
- closed at relevant time;
- outside distance constraint;
- outside budget constraint;
- incompatible duration;
- incompatible company/context where applicable.

## Scoring

Use an explainable score.

Example conceptual weights:

```text
mood          25
budget        20
distance      20
duration      15
preferences   15
availability   5
```

These weights are starting points only and should be calibrated with real feedback.

## Why recommendation

Do not expose the numeric score.

Generate human-readable reasons such as:

```text
Correspond à ton envie de calme.
Dans ton budget.
À proximité.
Ouvert maintenant.
Correspond à tes centres d'intérêt.
```

The reasons must be based on actual matched constraints.

## Itinerary constraints

Validate:
- total duration <= user available duration where possible;
- total budget <= target budget where possible;
- distances/travel time;
- opening hours;
- compatible categories/preferences.

## No perfect match

Do not simply return an empty list.

Return structured alternatives where possible:
- relax budget;
- relax distance;
- relax time;
- relax preference.

Example UI concept:

```text
No perfect match found.

One experience is almost right:
12 € instead of your 10 € budget.

[ See it anyway ]
```

## Feedback learning

Feedback can update preference signals.

Example:
A positive feedback on a culture/calm/solo experience can increase those preference signals.

Keep this logic transparent and deterministic in the MVP.

## Recommendation data contract

Contract between the user's context and the future recommendation engine (from the Data Foundation, formerly
`apps/api/docs/06_RECOMMENDATION_DATA_CONTRACT`, merged here). The backend implementation plan is
[`apps/api/apidocs/DATA_IMPLEMENTATION_PLAN.md`](../../apps/api/apidocs/DATA_IMPLEMENTATION_PLAN.md) (DATA-7).

### User context

```text
mood
availableDuration
maxBudget
company
location
preferredDistance
preferredCategories
```

### Pipeline

```text
User context
     ↓
Candidate experiences
     ↓
Hard filters
     ├── budget
     ├── distance
     ├── schedule
     └── availability
     ↓
Context matching
     ↓
ROAM scoring
     ↓
Recommendations
```

Hard filters should only exclude experiences for genuine constraints.

Soft matching can consider atmosphere, company, mood, energy, moment and category affinity.

Conceptual scoring:

```text
score =
  contextMatch
  + atmosphereMatch
  + budgetFit
  + distanceFit
  + timeFit
  + preferenceFit
```

Keep the formula configurable.

Recommendations should eventually support truthful user-facing explanations such as:
“Parce que tu cherches quelque chose de calme, à deux, pour environ 2 heures.”

> The conceptual weights of "Scoring" above and the `score = …` formula here describe the same idea at two levels of
> detail (weights per dimension vs. named sub-scores). Neither is implemented; both say the formula must stay
> configurable. Keep them aligned when one is refined.

## Current implementation (mobile, mock data)

No recommendation engine exists yet (no backend). The mobile app applies small deterministic rules to its mock pool,
in line with this document:

- **Home "Des idées pour toi"** — `features/home/lib/pickForYou.ts`: a deterministic 4-rule pick (mobile D-45).
- **Experience detail "Pourquoi ROAM te le recommande"** — `features/experiences/lib/whyRecommended.ts`: reasons derived
  from the experience's own data (mobile D-48).
- **Journey suggestions** — `features/journey/lib/suggest.ts` (`suggestForJourney`): filter by budget, duration and
  distance from the start point, then score; each suggestion carries the actually matched reason (`mood`, `nearby`,
  `budget`); when nothing fits, the closest alternatives are returned with `relaxed: true` ("No perfect match" above).
- **Search "no results"** — relax-distance / clear-filters / trending actions ([`apps/mobile/mobiledocs/features/SEARCH.md`](../../apps/mobile/mobiledocs/features/SEARCH.md)).
