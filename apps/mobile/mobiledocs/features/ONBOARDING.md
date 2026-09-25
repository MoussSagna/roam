# Mobile — Onboarding

Implementation of the onboarding flow in the mobile app. The product intent of each step is in
[`appdocs/product/UX_SCREENS_AND_FLOWS.md`](../../../../appdocs/product/UX_SCREENS_AND_FLOWS.md) (§01–§08b); the decisions behind the build are
[`DECISIONS.md`](../DECISIONS.md) D-19 to D-28 and D-87 to D-89.

## Routes and screens

| Step | Route                                                               | Screen                | Notes                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —    | `/`                                                                 | Splash                | Goes to `/welcome` after 2.6 s (no session yet)                                                                                                                                                          |
| 1    | `/welcome`                                                          | Welcome               | Photo collage; no pagination dots (`PageDots` removed on purpose, do not re-add)                                                                                                                         |
| 2–6  | `/onboarding/mood` (also `time`, `budget`, `location`, `interests`) | Questions (one pager) | Slides of `OnboardingPager` between a fixed "Passer" and a fixed footer (animated bars, "Suivant"), D-87/D-88; an answer is required to move on (button and swipe); answers held by the pager, not saved |
| 7    | `/onboarding/profile-creation`                                      | Profile creation      | **Front-end simulation, about 10 s**, no button, moves on by itself (Moti)                                                                                                                               |
| 8    | `/onboarding/ready`                                                 | "Prêt à explorer ?"   | Reached after the simulation; "Commencer" enters the app                                                                                                                                                 |
| —    | `/home`                                                             | Home                  | End of the journey, now the first tab of the main navigation                                                                                                                                             |

The order and the routes live in `features/onboarding/onboardingFlow.ts`; the questions are one horizontal `FlatList`
(`OnboardingPager`, `PAGER_STEPS`) on `/onboarding/mood`; the other question routes redirect to it. "Passer" jumps to `ready`; "Commencer" and the
profile creation use `router.replace`. Details: [`DECISIONS.md`](../DECISIONS.md) D-19 to D-28, D-87, D-88.

## Question pager (D-87, D-88)

- `OnboardingPager` (`features/onboarding/OnboardingPager.tsx`) is the whole layout of the five questions: a fixed header
  (the only "Passer"), a horizontal paging `FlatList` of the question slides, and a fixed footer (animated `ProgressBars`,
  then "Suivant"). Only the middle zone changes from one slide to the next.
- One `currentIndex` (updated by the swipe through `onViewableItemsChanged`, and by "Suivant") drives the list and the bars.
- The answers are held by the pager (`onboardingAnswers.ts`), in memory only (nothing is saved, D-28). Nothing is
  selected at first; `isStepComplete` is the one rule for moving on: it disables "Suivant", and the list only holds the
  slides up to the first unanswered question, so a swipe cannot go past it (going back stays possible).
- The question routes after `/onboarding/mood` redirect to it; the native swipe-back is off on the pager (D-53, D-87).

## Location step (D-89)

- "Où souhaites-tu sortir ?" offers the journey's choices — "Ma position actuelle" and "Choisir un lieu"
  (`features/journey/data/startSpots.ts`) — over an interactive `RoamMap` that glides to the selected location.
- The device position comes from `hooks/useCurrentLocation.ts` (`expo-location`): the permission is requested **only**
  when "Ma position actuelle" is pressed, never on arrival; refused / blocked / unavailable never block the step — the
  spots stay available and "Ouvrir les réglages" is offered when blocked. See [`MAPS.md`](MAPS.md) and [`DECISIONS.md`](../DECISIONS.md) D-89.
