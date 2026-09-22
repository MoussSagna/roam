# ROAM — MVP Scope

## 1. Account

- Sign up
- Sign in
- Sign out
- Password recovery
- User profile

Prototype note: the account screens (login, sign up, password recovery) are built first on the front end
and simulated, with no backend, API, database or real authentication; those come later (`DECISIONS.md` D-28).

## 2. Onboarding

Collect:
- interests;
- preferred activities;
- usual budget;
- maximum distance;
- usual company type.

Company:
- alone;
- couple;
- friends;
- family.

## 3. Current outing context

Collect:
- mood/desire;
- available time;
- budget;
- company;
- location.

### Mood/desire examples

- Calm
- Discover
- Energetic
- Creative
- Food
- Shopping
- Culture

### Available time

- 30 min
- 1 h
- 2 h
- 3 h+
- custom duration later if needed

### Budget

- Free
- < 10 €
- 10–25 €
- 25–50 €
- 50 €+

## 4. Recommendations

Each recommendation should show at least:
- name;
- image;
- category;
- distance;
- estimated duration;
- price;
- opening hours;
- short description;
- why it is recommended.

The MVP can use deterministic scoring.

Suggested scoring dimensions:
- preferences;
- mood;
- budget;
- distance;
- availability;
- duration;
- outing context.

Do not expose a fake precision percentage such as “94% match” unless explicitly introduced later.

## 5. Experience / itinerary

Users can select several proposals and build an outing.

Example:

```text
Café → Bookstore → Park → Pastry shop
```

The itinerary should respect as much as possible:
- available time;
- budget;
- distance;
- opening hours;
- preferences;
- outing context.

## 6. Map

- show places;
- show user position where permission exists;
- show itinerary;
- select a place;
- view place information;
- modify itinerary.

The map is not the home screen.

## 7. Place detail

- photos;
- name;
- category;
- description;
- address;
- distance;
- opening hours;
- price;
- reviews;
- tags;
- practical information.

Actions:
- favorite;
- add to itinerary.

## 8. Favorites

Save:
- places;
- activities;
- experiences;
- itineraries.

## 9. Feedback

Simple feedback:
- Love it;
- Like it;
- Meh;
- Not for me.

Optional reasons:
- too expensive;
- too far;
- too crowded;
- not my style;
- atmosphere;
- activity;
- other.

## 10. History

Show completed experiences.

## 11. Profile

- photo;
- name;
- interests;
- preferences;
- favorites;
- experiences;
- history;
- simple statistics.

Example statistics:
- places discovered;
- neighborhoods explored;
- experiences completed;
- favorite category.

## MVP navigation

### Mobile

```text
Home · Discover · Favorites · Profile
```

The itinerary/map is entered from an experience/itinerary rather than being a permanent bottom-nav tab.

### Web

```text
Home → Context/Search → Recommendations → Experience → Itinerary → Map
```

## V0 prototype

Can use:
- fake recommendations;
- fake map;
- no real backend.

## V1 functional MVP

Adds:
- authentication;
- database;
- real place data;
- geolocation;
- real map;
- calculated recommendations;
- real itinerary generation;
- favorites;
- history;
- feedback;
- backend API.
