# ROAM — UX Screens & Flows

## Main flow

```text
Splash
 ↓
Welcome
 ↓
Onboarding
 ↓
Home / Current context
 ↓
Recommendations
 ↓
Experience detail
 ↓
Itinerary
 ↓
Map
 ↓
Outing in progress
 ↓
Feedback
 ↓
History
```

## Main screens

### 01 Splash
Purpose: brand impression and session check.
Transitions:
- unauthenticated → Welcome/onboarding;
- authenticated → Home.

### 02 Welcome
Purpose: communicate the value proposition.
Primary CTA: Start.
Secondary CTA: Sign in.
Prototype: the built welcome screen has a single "Suivant" button and no pagination dots. Sign in / sign up
screens are the next front-end step, simulated (no backend) — see `DECISIONS.md` D-28.

### 03 Home
Purpose: start a new outing.
The home screen should focus on the user's context and current intent, not on a map.
It may include a carousel of current/trending outings as inspiration.

### 04 Mood
Purpose: choose current mood/desire.
Examples: Calm, Discover, Energetic, Creative, Food, Shopping, Culture.

### 05 Time
Purpose: choose available duration.
Examples: 30 min, 1 h, 2 h, 3 h+.

### 06 Budget
Purpose: choose outing budget.
Examples: Free, <10 €, 10–25 €, 25–50 €, 50 €+.

### 07 Location
Purpose: use current position or search a location/area.
Location permission denial must not block the user; allow manual area selection.

### 08 Preferences
Purpose: collect interests for personalization.
Multiple selection, minimum 3 recommended in the onboarding UX concept.
All visible copy localized.

### 08b Profile creation (prototype simulation)
Purpose: after the preferences, show ROAM "building" the user's profile before the final onboarding screen.
Front-end simulation only (about 10 s, no backend, nothing stored); nothing to press, it moves on to
"Prêt à explorer ?" by itself. See `DECISIONS.md` D-27.

### 09 Recommendations
Purpose: show a limited number of relevant outings.
Use immersive image-based cards.
Show:
- title;
- category;
- price;
- distance;
- duration;
- why this recommendation.

Do not overload the user with a huge list.

### 10 Experience detail
Purpose: help the user decide.
Show:
- immersive hero image;
- title;
- category;
- rating;
- distance;
- description;
- practical information;
- why ROAM recommends it;
- photos/reviews where available;
- similar suggestions;
- primary CTA: Create my itinerary.

Important distinction:
An experience is a composed outing, not just a single place.

### 11 Itinerary
Purpose: transform an experience into a concrete outing.
Show:
- ordered steps;
- travel time between steps;
- total duration;
- total estimated budget;
- total distance;
- edit;
- add/replace/remove;
- start outing.

### 12 Map
Purpose: visualize the itinerary geographically.
Map is secondary to the itinerary.

### 13 Outing in progress
Purpose: guide the user through the current step.
Keep UI focused:
- current step;
- next step;
- travel/navigation action.

### 14 Feedback
Purpose: close the product loop.
Four primary options:
- Love it;
- Like it;
- Meh;
- Not for me.
Optional reason selection.

## Secondary screens

15. Place detail
16. Edit itinerary
17. Favorites
18. History
19. Profile
20. User preferences
21. Statistics
22. Sign in
23. Sign up
24. Password recovery

## Important states

- recommendation loading;
- no recommendations;
- partial match;
- network error;
- location permission denied;
- itinerary generation;
- itinerary impossible;
- empty favorites;
- empty history;
- feedback sending/success/error.

## UX principles

- one important decision at a time during onboarding;
- minimal header where possible;
- immersive imagery;
- clear primary CTA;
- explain recommendations in human language;
- preserve user control;
- never make the map the starting point.
