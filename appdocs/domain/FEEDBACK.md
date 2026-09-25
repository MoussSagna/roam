# ROAM — Feedback (domain)

Feedback closes the product loop (context → recommendation → outing → **feedback** → better recommendations).

## Planned: per-experience feedback (MVP scope)

From [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md) §9 and [`../product/UX_SCREENS_AND_FLOWS.md`](../product/UX_SCREENS_AND_FLOWS.md) §14:

- rating: **Love it / Like it / Meh / Not for me** (`FeedbackRating`: `love | like | meh | notForMe`);
- optional reasons: too expensive, too far, too crowded, not my style, atmosphere, activity, other (`FeedbackReason`);
- one `Feedback` = `userId`, `experienceId`, `rating`, `reasons[]`, `createdAt` (`apps/mobile/src/types/feedback.ts`).

**Not built**: the types exist, no screen or repository uses them.

## Implemented: journey feedback (mobile, sprint 12, mobile D-83)

- Given after a **completed journey**, at most **one per journey**: a **1–5 star** rating (required) and an optional
  comment (300 characters max). `JourneyFeedback` = `journeyId`, `userId`, `rating`, `comment | null`, `createdAt`.
- Front end only: `JourneyFeedbackRepository` → mock (persisted on the device). Screen:
  [`apps/mobile/mobiledocs/features/JOURNEY.md`](../../apps/mobile/mobiledocs/features/JOURNEY.md) (`/journey/[id]/feedback`).

## Learning from feedback

Feedback can update preference signals, transparently and deterministically in the MVP ([`RECOMMENDATION.md`](RECOMMENDATION.md) →
"Feedback learning"). Nothing uses feedback yet (no backend, no engine).

> Two feedback models coexist (per-experience ratings planned, per-journey stars built). Whether both are kept is an
> open product decision — see [`../DOCUMENTATION_RESTRUCTURE_REPORT.md`](../DOCUMENTATION_RESTRUCTURE_REPORT.md).
