# ROAM — Journey (domain)

A **journey** ("parcours" in the French UI) is an ordered outing made of several experiences, planned from the user's
context and a starting point, then followed step by step. It is the implemented form of what the product documents call
the **itinerary** ([`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md) §5, [`../product/UX_SCREENS_AND_FLOWS.md`](../product/UX_SCREENS_AND_FLOWS.md) §11–§13): same purpose — ordered
steps, travel between them, total duration/budget/distance, edit, start the outing.

Source of truth for the rules below: the mobile types (`apps/mobile/src/types/journey.ts`) and store
(`features/journey/journeyStore.ts`), and mobile [`DECISIONS.md`](../../apps/mobile/mobiledocs/DECISIONS.md) D-80 to D-86. Mobile screens and navigation:
[`apps/mobile/mobiledocs/features/JOURNEY.md`](../../apps/mobile/mobiledocs/features/JOURNEY.md). The backend stores journeys (`Journey`, `JourneyStep`, API-03 — `apps/api/apidocs/DATABASE_SCHEMA.md`); no journey endpoint yet.

## Model

```text
Journey
├── id, title, createdAt
├── status: active | completed          (a draft is never saved)
├── context
│   ├── mood        calm | discover | food | culture | energetic | romantic | festive   (subset of Mood)
│   ├── duration    1h | 2h | 3h | halfDay | day
│   └── budget      free | low | medium | high
├── startLocation   { kind: current | place | address | experience, label, detail?, coordinates }
├── startTime, endTime                   ("HH:MM")
├── estimatedDurationMin, estimatedBudgetEur, totalDistanceM
├── steps[]         { experienceId, order, estimatedArrival, estimatedDurationMin,
│                     travelDurationMin, travelDistanceM, travelMode: walk | metro }
├── currentStep     (0-based)
├── startedAt, completedAt
```

`JourneyDraft` (what creation hands over): `context`, `startLocation`, `startTime`, ordered `experienceIds`.

## States and transitions

```text
draft ──"Créer mon parcours"──▶ active ──last step done──▶ completed
(in memory only)                (at most one)               (kept in history)
```

- **draft** — built in the creation flow; never saved; leaving the flow discards it.
- **active** — created from a draft. **At most one active journey** at a time: creating another is refused
  (`ActiveJourneyExistsError`). A journey starts when it is created (`startedAt` set; step 1 is current).
- **completed** — every step done (`completedAt` set); completed journeys are kept and listed (`listCompleted`).
- Screens read a derived `JourneyState`: `none` | `active` | `completed`.

## Rules

- **Steps are experiences**, each at most once in a journey (`isExperienceInJourney`); adding an experience already in
  the active journey is refused.
- **Progress**: "Continuer mon parcours" completes the current step (`completeCurrentStep`); the last one completes the
  journey and leads to the journey feedback ([`FEEDBACK.md`](FEEDBACK.md)).
- **Editing** (`updateJourneySteps`) keeps the same journey and its status, drops duplicate ids, refuses an empty journey
  or another journey (`JourneyUpdateError`). The current experience stays current wherever it moved; if it was removed,
  as many steps as were done and remain are done and the next one is current (`currentStepAfterEdit`).
- **Planning** (pure functions, `features/journey/lib/plan.ts`): straight-line distances between points, estimated travel
  (walk or metro), arrivals from the start time, totals; the budget is estimated from each experience's budget bracket
  (mock data has no exact prices). No routing/Directions API.
- **Suggestions** for a context: filter then score, with truthful reasons and relaxed alternatives when nothing fits —
  see [`RECOMMENDATION.md`](RECOMMENDATION.md).
- **Starting point**: the device position, a known spot, an address (approximate coordinates for now) or the
  experience the flow was opened from (pre-selected).

## Relation to the planned `Itinerary`

`apps/mobile/src/types/itinerary.ts` still declares the earlier `Itinerary` / `ItineraryStep` shape (place-based steps)
from the initial data domains ([`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) → "Data domains"). No screen uses it; the journey
replaced it in practice. Whether the backend keeps the name `Itinerary` or `Journey` is an open decision — see
[`../DOCUMENTATION_RESTRUCTURE_REPORT.md`](../DOCUMENTATION_RESTRUCTURE_REPORT.md).
