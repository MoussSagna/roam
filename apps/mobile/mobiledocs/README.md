# ROAM Mobile documentation (`mobiledocs`)

Implementation documentation of the **mobile app** (`apps/mobile`: React Native, Expo, TypeScript). Start from
[`../../../appdocs/DOCUMENTATION_INDEX.md`](../../../appdocs/DOCUMENTATION_INDEX.md) for the whole map of the
documentation.

## What belongs here

How the mobile app is built: Expo configuration and builds, navigation, screens and features, components, hooks, stores,
state, styling (NativeWind), animation (Moti/Reanimated), maps and device permissions, mobile tests, the mobile decision
log.

## What does not

- Product vision, MVP scope, UX intent of a screen, domain concepts and business rules (Experience, Journey,
  Recommendation, Feedback…) → [`appdocs/`](../../../appdocs/README.md). Link to them; do not copy them here.
- Backend, providers, database, API contracts → [`apps/api/apidocs/`](../../api/apidocs/README.md).

## Documents

| Document                                                           | Content                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`DEVELOPMENT.md`](DEVELOPMENT.md)                                 | Requirements, install and run, commands, source structure, troubleshooting                                                                                                                                                                                                                                                           |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                               | Installed stack and versions, data access (`Screen → hook → Repository → mock`), testing                                                                                                                                                                                                                                             |
| [`CONVENTIONS.md`](CONVENTIONS.md)                                 | Routes/screens, styling, horizontal lists and carousels, animation, sticky headers, toasts, icons, assets                                                                                                                                                                                                                            |
| [`NAVIGATION.md`](NAVIGATION.md)                                   | Tabs and tab bar, mocked session and route protection, native back gesture                                                                                                                                                                                                                                                           |
| [`THEME_AND_I18N.md`](THEME_AND_I18N.md)                           | Theme tokens and provider, i18n setup, language screen, adding a language                                                                                                                                                                                                                                                            |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)                             | Fonts, radius, components built, motion, logo, splash — the implementation of the shared design system                                                                                                                                                                                                                               |
| [`SCREEN_INTEGRATION_WORKFLOW.md`](SCREEN_INTEGRATION_WORKFLOW.md) | The step-by-step procedure to integrate one mockup screen                                                                                                                                                                                                                                                                            |
| [`DEPLOYMENT.md`](DEPLOYMENT.md)                                   | EAS builds (preview), Google Maps key, EAS Update, testers, production status                                                                                                                                                                                                                                                        |
| [`DECISIONS.md`](DECISIONS.md)                                     | Decision log D-01 → D-90 (numbers are cited across the code and the docs)                                                                                                                                                                                                                                                            |
| [`features/`](features/)                                           | One document per feature: [`ONBOARDING`](features/ONBOARDING.md), [`AUTH`](features/AUTH.md), [`HOME`](features/HOME.md), [`DISCOVER`](features/DISCOVER.md), [`SEARCH`](features/SEARCH.md), [`MAPS`](features/MAPS.md), [`EXPERIENCE`](features/EXPERIENCE.md), [`PROFILE`](features/PROFILE.md), [`JOURNEY`](features/JOURNEY.md) |

Asset notes stay next to the files they describe: [`assets/images/logo/README.md`](../assets/images/logo/README.md),
[`assets/images/onboarding/README.md`](../assets/images/onboarding/README.md),
[`assets/images/auth/README.md`](../assets/images/auth/README.md).

## Current state (2026-09-25)

Front-end prototype on **mock data**: no backend, no database, no API. Every answer or interaction is local state, mock
repository content (some persisted on the device) or a simulated delay ([`DECISIONS.md`](DECISIONS.md) D-28).

| Area                                       | State                                                                                                                                            | Details                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Splash, Welcome, onboarding                | Built; questions in one fullscreen pager, an answer required to move on; profile creation is a ~10 s simulation; real device position on request | [`features/ONBOARDING.md`](features/ONBOARDING.md)                                     |
| Authentication                             | 7 screens built, simulated (mocked session, `Stack.Protected`)                                                                                   | [`features/AUTH.md`](features/AUTH.md), [`NAVIGATION.md`](NAVIGATION.md)               |
| Main navigation                            | 4 tabs (Home, Discover, Parcours, Profile) behind a floating pill/bubble tab bar                                                                 | [`NAVIGATION.md`](NAVIGATION.md)                                                       |
| Home, Discover                             | Built (discovery page; editorial page)                                                                                                           | [`features/HOME.md`](features/HOME.md), [`features/DISCOVER.md`](features/DISCOVER.md) |
| Search                                     | Built (list + full-screen map, sort, filters); no query engine                                                                                   | [`features/SEARCH.md`](features/SEARCH.md)                                             |
| Experience detail, gallery, experience map | Built                                                                                                                                            | [`features/EXPERIENCE.md`](features/EXPERIENCE.md)                                     |
| Maps                                       | Real `react-native-maps` on every map surface                                                                                                    | [`features/MAPS.md`](features/MAPS.md)                                                 |
| Journey ("parcours")                       | Creation flow, hub, active journey, map, edit, feedback                                                                                          | [`features/JOURNEY.md`](features/JOURNEY.md)                                           |
| Profile, Settings                          | Built; preferences, favorites, history, statistics, language, theme                                                                              | [`features/PROFILE.md`](features/PROFILE.md)                                           |
| Placeholders                               | `/favorites` (out of the tab bar), `/profile/{edit,help,privacy}`, `/collection/[id]`                                                            | —                                                                                      |
| Not built                                  | Recommendations screen, context flow, per-experience feedback, post-auth screens (welcome back, location permission, "Tout est prêt")            | [`../../../appdocs/ROADMAP.md`](../../../appdocs/ROADMAP.md)                           |

## How to use this documentation

1. Read the shared intent first (`appdocs/`: product, UX flow, domain concept).
2. Read the feature document here, then [`CONVENTIONS.md`](CONVENTIONS.md).
3. Follow [`SCREEN_INTEGRATION_WORKFLOW.md`](SCREEN_INTEGRATION_WORKFLOW.md) for a new screen.
4. Record any non-obvious choice as a new [`DECISIONS.md`](DECISIONS.md) entry and update the feature document; update `appdocs/` only
   when a shared concept or rule changes.
