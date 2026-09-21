# ROAM — Data & Recommendation Logic

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

## Experiences

An experience is a composition of places/activities.

Example:

```text
Experience
├── Café
├── Bookstore
├── Park
└── Pastry shop
```

Each step should have:
- place/activity;
- estimated duration;
- travel time from previous step;
- estimated cost;
- opening-hours validity.

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
