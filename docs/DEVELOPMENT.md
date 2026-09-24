# ROAM — Development guide

This guide describes the repository **as it is today**: a pnpm monorepo containing the mobile app
only. `apps/web`, `apps/api` and `packages/*` (see `04_TECH_STACK.md`) do not exist yet.

**Prototype status (2026-09-23):** the mobile **onboarding is implemented on the front end**, from the splash to the app's
main navigation (routes below). **Authentication screens are all implemented**: entry, login, register, and the whole
forgot-password sub-flow (email → reset code → new password → success) — see `docs/SCREEN_INTEGRATION_WORKFLOW.md`. The
mockup's post-authentication screens (a welcome-back moment, location permission, "Tout est prêt") were never part of that
sprint's scope and are still not built (`DECISIONS.md` D-29). **Main navigation** (four tabs behind a floating pill/bubble
tab bar) is built — see `DECISIONS.md` D-38 to D-43. **Home is now the real discovery screen** (hero carousel, mood
chips, popular/nearby/for-you sections, sprint 5, `DECISIONS.md` D-45). **Discover is now a real, immersive editorial
discovery page** (Sélection ROAM, suggestions, an immersive experience block, nearby/trending experiences, editorial
collections — sprint 6, `DECISIONS.md` D-65). **Sprint 11: the "Parcours" tab (`/journey`, the journey hub) replaced
"Favoris" in the tab bar** (D-81); the `/favorites` route (sprint 3 placeholder) still exists, just not in the bar.
**Experience detail and its full-screen gallery are also built** (sprint 5, `DECISIONS.md`
D-48); its CTA now opens the real journey ("parcours") creation flow, sprint 10, D-80. **The Map screen Discover's "Voir la
carte" links to is now a real map** (`react-native-maps`, sprint 7, `DECISIONS.md` D-70); the other illustrated maps are being
replaced one screen at a time. **Profile is now identity/activity/taste
— header, stats, "Ce que j'aime", favorites/history previews and a yearly activity
summary — and configuration moved to a new, real Settings screen** (`/profile/settings`: account, préférences,
langue/thème, aide, confidentialité, déconnexion — all reused routes/rows, sprint 5, `DECISIONS.md` D-63).
"Mes préférences", "Mes favoris", "Mon historique", "Mes statistiques", "Langue" and "Thème" are all real
screens, reached from both Profile and Settings where the brief calls for it — see `DECISIONS.md` D-50, D-51,
D-57, D-58, D-59, D-60, D-61, D-63. The other three screens Settings links to (edit profile, help, privacy) are
still placeholders, built one per session. There is **no backend, no database and no API**: nothing is sent or
stored, and every answer/interaction is local state, mock repository content, or a simulated delay used for the
prototype only (`DECISIONS.md` D-28, D-29, D-31 to D-36, D-45, D-50, D-51, D-57, D-58, D-59, D-60, D-61, D-63, D-65).

## Requirements

- Node.js ≥ 22.13 (developed with 24)
- pnpm ≥ 10 (developed with 12)
- Expo Go on a phone, or an iOS simulator (Xcode) / Android emulator (Android Studio)

## Install and run

```bash
pnpm install                    # from the repository root
pnpm --filter mobile start      # start Expo (also: pnpm mobile:start)
```

In the Expo terminal: `i` opens the iOS simulator, `a` the Android emulator, or scan the QR code
with Expo Go. `pnpm mobile:ios` / `pnpm mobile:android` start Expo and open the platform directly.

> If Expo Go does not support the SDK version or a native module added later, use a development
> build instead (`npx expo run:ios|android`, needs Xcode / Android Studio).

## Commands

Run from the repository root; each one is forwarded to the workspaces that define the script.

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `pnpm mobile:start` | Start the Expo dev server                                      |
| `pnpm lint`         | ESLint (`eslint-config-expo` + Prettier compatibility)         |
| `pnpm typecheck`    | `tsc --noEmit` (strict)                                        |
| `pnpm test`         | Jest (`jest-expo` preset) + React Native Testing Library       |
| `pnpm format`       | Prettier, write                                                |
| `pnpm format:check` | Prettier, check only                                           |
| `pnpm check`        | format:check + typecheck + lint + test (run before committing) |

Mobile-only extras: `pnpm --filter mobile test:watch`, `pnpm --filter mobile doctor` (Expo Doctor,
needs network).

## Mobile structure

```text
apps/mobile/
├── app.json                 # Expo config (name, icons, splash, typed routes)
├── babel.config.js          # babel-preset-expo + NativeWind (jsxImportSource)
├── metro.config.js          # withNativeWind → src/global.css
├── tailwind.config.ts       # NativeWind preset; colors/fonts/radius come from src/theme
├── jest.config.js / jest.setup.ts
├── assets/images/           # splash-background.png, icons, logo/ (roles in logo/README.md), onboarding/
└── src/
    ├── app/                 # Expo Router routes ONLY, kept thin
    │   ├── (tabs)/          # Main navigation group: home, discover, journey (Parcours), profile — plus favorites, kept but out of the bar — + _layout.tsx (no path segment)
    │   └── /, /welcome, /onboarding/*, /auth/*
    ├── components/
    │   ├── ui/              # Text, Button, IconButton, Chip, ConfirmationModal, SearchBar, Slider, StickyActionFooter, StickyRevealHeader, AppToast, Screen, ScrollScreen, PlaceholderCard, FadeInUp, TextField
    │   └── brand/           # Logo (light / dark / icon variants)
    ├── features/            # One folder per feature (empty until its sprint)
    │   ├── splash/          # In-app splash screen (route /) + its measured layout
    │   ├── onboarding/      # Onboarding: the 8 screens, onboardingFlow.ts (routes, order), profileCreation.ts (simulation)
    │   ├── navigation/      # Main navigation: RoamTabBar (floating pill/bubble), TabBarCollapseContext, tabBarConfig
    │   ├── home/            # Home (sprint 5): hero carousel, sections, mock data/lib — see the table below
    │   ├── discover/        # Discover (sprint 6): immersive editorial discovery — see the table below
    │   ├── favorites/       # `/favorites` route: sprint 3 placeholder, no longer in the tab bar since sprint 11 (distinct from `/profile/favorites`)
    │   ├── profile/         # Profile (sprint 5): main screen (identity/activity/taste) + settings + preferences + favorites + history + statistics + language + theme real, other sub-screens still placeholders
    │   ├── experiences/     # Experience detail (route experience/[id]) + gallery/ (route gallery/[id]) — sprint 5
    │   ├── auth/            # Authentication: all 7 screens built (Entry, Login, Register, ForgotPassword, ResetCode, NewPassword, ResetSuccess)
    │   ├── journey/         # Journey ("parcours", sprint 10, D-80): creation flow /journey/create/*, active /journey/[id], journeyStore, lib (plan, suggest)
    │   ├── map/             # RoamMap (react-native-maps) + ExperienceMarker/ExperienceMapCard/markers lib; Map screen (route /map) — sprint 7, D-70; Search's `SearchMapScreen` lives in `features/search/` — sprints 8, D-71/D-72
    │   └── recommendations, outing, feedback
    ├── hooks/               # Cross-feature hooks (useBootstrap, useReduceMotion, useCtaVisibility)
    ├── i18n/                # i18next setup + locales/fr.json, locales/en.json
    ├── lib/                 # Small framework-agnostic helpers (storage, cx, toast)
    ├── services/            # Data access: repository interfaces + mock implementation
    ├── theme/               # Tokens, palette, typography, ThemeProvider
    ├── types/               # Domain types (User, Place, Experience, Itinerary…)
    ├── constants/
    └── test/                # Test helpers (renderWithProviders)
```

Path alias: `@/` → `src/` (TypeScript, Jest and Metro).

## Onboarding (current state)

| Step | Route                                                         | Screen              | Notes                                                                            |
| ---- | ------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| —    | `/`                                                           | Splash              | Goes to `/welcome` after 2.6 s (no session yet)                                  |
| 1    | `/welcome`                                                    | Welcome             | Photo collage; no pagination dots (`PageDots` removed on purpose, do not re-add) |
| 2–6  | `/onboarding/mood`, `time`, `budget`, `location`, `interests` | Questions           | "Suivant" / "Passer"; `ProgressBars`; answers are local state, not saved         |
| 7    | `/onboarding/profile-creation`                                | Profile creation    | **Front-end simulation, about 10 s**, no button, moves on by itself (Moti)       |
| 8    | `/onboarding/ready`                                           | "Prêt à explorer ?" | Reached after the simulation; "Commencer" enters the app                         |
| —    | `/home`                                                       | Home                | End of the journey, now the first tab of the main navigation                     |

The order and the routes live in `features/onboarding/onboardingFlow.ts`. "Passer" jumps to `ready`; "Commencer" and the
profile creation use `router.replace`. Details: `DECISIONS.md` D-19 to D-28.

## Main navigation (current state)

Four tabs behind one floating pill/bubble tab bar, sprint 3, with scroll-collapse — `DECISIONS.md` D-38 to D-43.

| Route        | Screen    | Notes                                                  |
| ------------ | --------- | ------------------------------------------------------ |
| `/home`      | Home      | Real discovery screen (sprint 5) — see the table below |
| `/discover`  | Discover  | Placeholder headline + 8 `PlaceholderCard`s            |
| `/journey`   | Parcours  | Journey hub (sprint 11, D-81) — see "Journey" below    |
| `/profile`   | Profile   | Placeholder headline + 8 `PlaceholderCard`s            |

Routes live in `src/app/(tabs)/` (a route _group_: adds no path segment), with `_layout.tsx` rendering
`expo-router`'s `Tabs` (React Navigation bottom tabs) and a fully custom `tabBar`: `RoamTabBar`
(`features/navigation/`). Behavior:

- **Expanded (at rest):** a floating pill, left-anchored above the content, showing all four
  icon+label tabs; the active one has a filled `primary` icon badge.
- **Collapsed (scrolling down):** the pill morphs (animated `width`, not `opacity`) into a small
  circular bubble showing only the active tab's icon. Tapping the bubble re-expands the pill without
  navigating; scrolling up (or being near the top) also re-expands it. Switching tabs while collapsed
  keeps it collapsed and swaps the bubble's icon.
- **State:** `TabBarCollapseContext` (`features/navigation/TabBarCollapseContext.tsx`) holds one shared
  `collapsed` boolean; `useTabBarScrollHandler()` is the `onScroll` handler each tab screen's
  `ScrollView` attaches — a plain JS threshold/direction accumulator (12px sustained movement to flip,
  always expanded within 24px of the top), not a Reanimated worklet (`DECISIONS.md` D-39 explains why).
- **New shared primitives:** `components/ui/ScrollScreen` (scrollable `Screen` sibling) and
  `components/ui/PlaceholderCard`. Every new screen using this pattern reuses both, plus
  `useTabBarScrollHandler()` and `TAB_BAR_CLEARANCE` (`features/navigation/tabBarConfig.ts`) for the
  bottom padding that keeps content clear of the floating bar.

**Sprint 11 (D-81):** "Parcours" (`journey`, Lucide `route` icon) took Favoris' place. `(tabs)/favorites.tsx` is still
declared (after `profile`) and reachable at `/favorites`, but `RoamTabBar` only draws `TAB_NAMES`, which no longer lists it.
While a journey is active, the Parcours icon carries a small `accent` dot (`journeyStore`'s `useJourney()`).

**Conventions for a future screen behind a tab:** add the route file under `src/app/(tabs)/`, add it to
`TAB_NAMES`/`TAB_CONFIG` in `tabBarConfig.ts` (icon + `navigation.*` label key) and to the `<Tabs.Screen>`
list in `(tabs)/_layout.tsx` in the order it should appear; replace the screen's placeholder body, not its
route.

## Home (current state)

Immersive discovery page (sprint 5, `DECISIONS.md` D-45), built on the mock experience pool through the
existing `ExperienceRepository`/`CategoryRepository` (`useHomeExperiences`), not the sprint 3 placeholder.

| Section                             | Component                                                              | Notes                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Hero carousel                       | `features/home/components/HeroCarousel.tsx`                            | Full-bleed, swipeable, paging `ScrollView`; dots (`CarouselDots`) + prev/next; the 5 `isHero` experiences |
| Search bar                          | `components/ui/SearchBar.tsx`                                          | Opens the shared `/search` (`context: 'home'`); sticky — see "Sticky headers" (D-69)/"Search" below       |
| Selon ton humeur                    | `Chip` (icon slot) + `features/home/data/moods.ts`                     | 5 mood chips, single choice, drives "Des idées pour toi"                                                  |
| Les expériences les plus populaires | `features/home/components/ExperienceCard.tsx`                          | The 3 `isPopular` experiences                                                                             |
| Lieux proches de toi                | `features/home/components/NearbyCard.tsx` + `data/nearbyCategories.ts` | 5 static category shortcuts (no geolocation)                                                              |
| Des idées pour toi                  | `ExperienceCard` (reused) + `features/home/lib/pickForYou.ts`          | Deterministic 4-rule pick, unit-tested                                                                    |

`ExperienceCard` is shared by "Les expériences les plus populaires" and "Des idées pour toi" (same card
shape) rather than duplicated per section. Favorites are local state (`useFavoriteExperienceIds`), no
persistence. "Voir l'expérience" pushes to `experience/[id]` (`ExperienceDetailScreen`,
`features/experiences/`, sprint 5). Home reuses `useTabBarScrollHandler()` /
`TabBarCollapseContext` like every other tab screen; `RoamTabBar` itself was not touched this sprint.

**Polish (sprint 4, `DECISIONS.md` D-46):** the Hero's CTA switches to the `primary` `Button` variant
in dark mode (was unreadable white-on-white); pulling down past the top stretches the Hero image via a
`react-native-reanimated` shared value + `useAnimatedStyle` on an `Animated.View` wrapping
`HeroCarousel` (mutated from a plain `onScroll`, not `useAnimatedScrollHandler` — see D-46 for why);
the notification bell moved out of `HeroCarousel` into a new floating `HomeHeader`
(`features/home/components/`) that shows/hides with scroll direction via a new, generic
`useScrollDirection` hook (`src/hooks/`), fully independent of `TabBarCollapseContext`.

## Discover (current state)

Immersive, editorial discovery page (sprint 6, `DECISIONS.md` D-65), replacing the sprint 3 placeholder.
Built on the mock experience pool and a new `Collection` pool (`useDiscoverData`, both through their own
repositories) — not a social feed: no profiles, followers, stories, comments or like counts
(`03_UX_SCREENS_AND_FLOWS.md` sprint 6 brief).

| Section                        | Component                                                                     | Notes                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secondary nav                  | `features/discover/components/DiscoverTabs.tsx`                               | "Pour toi" / "Tendances" / "À proximité" / "Collections", `FlatList horizontal`; narrows which sections show (`DiscoverScreen`'s `TAB_SECTIONS`) |
| Search bar                     | `components/ui/SearchBar.tsx`                                                 | Reused from Home; opens the shared `/search` (`context: 'discover'`); sticky — see "Sticky headers" (D-69)/"Search" below                        |
| Sélection ROAM                 | `RoamSelectionSection.tsx` + `DiscoverCollectionCard` (`variant="hero"`)      | Featured (`Collection.isFeatured`) editorial collections, `FlatList horizontal`                                                                  |
| Suggestions pour toi           | `SuggestionsSection.tsx` + `DiscoverMoodCard.tsx` + `data/suggestionMoods.ts` | Ce soir / Entre amis / En couple / Culture / Nature / Activités — presentational only, `FlatList horizontal`                                     |
| Grande expérience immersive    | `components/ImmersiveExperienceCard.tsx` + `lib/pickImmersiveExperience.ts`   | One fixed card (not a carousel); static editorial copy, links to a picked experience                                                             |
| Près de toi                    | `NearbySection.tsx` + `lib/pickNearby.ts`                                     | Reuses Home's `ExperienceCard`; "Voir la carte" → `/map` (real `RoamMap`, sprint 7), `FlatList horizontal`                                |
| Ce qui fait envie en ce moment | `TrendingSection.tsx` + `lib/pickTrending.ts`                                 | Reuses Home's `ExperienceCard`, highest-rated first, `FlatList horizontal`                                                                       |
| Explorer par envie             | `CollectionsSection.tsx` + `DiscoverCollectionCard` (`variant="compact"`)     | Non-featured collections only (the featured ones already have their own card above), `FlatList horizontal`                                       |

Every carousel on this page (all but the secondary nav) is `components/ui/HorizontalCarousel.tsx`, not a
plain `FlatList` or `ScrollView` — full-bleed past the page's own padding, snaps one card at a time; see
"Horizontal lists / carousels" below. "Voir l'expérience"/a card tap pushes to `experience/[id]`; a collection tap pushes to
`collection/[id]` (`CollectionDetailPlaceholder`, not the real screen yet). Favorites reuse Home's own
`useFavoriteExperienceIds` (in-memory, no persistence). Discover reuses `useTabBarScrollHandler()` like
every other tab screen, but has no floating/`StickyRevealHeader` chrome of its own: unlike Experience
Detail or Profile, it has no full-bleed hero photo at the very top for a header to reveal over.

## Search (current state)

Shared global search (sprint 6, `DECISIONS.md` D-68; flow redesigned in sprint 8, D-71), reached from both Home's and
Discover's `SearchBar` (`router.push({ pathname: '/search', params: { context } })`) — one screen, not two: the
`context` param only changes which existing placeholder copy is shown
(`home.search.placeholder`/`discover.search.placeholder`). Built on a `SearchRepository`
(`services/mock/search.ts`, deterministic text/facet matching, no real query engine) over the existing
mock experience pool. **No backend**: search, filters and sort are all local/mocked.

Two routes over **one shared state** (`SearchSessionProvider`, mounted by the nested layout `app/search/_layout.tsx`):

**`/search` — `SearchScreen` (list)**

```text
back + title
  ↓
SearchInput
  ↓
[ Trier ] [ Filtres ] [ Carte ]     ← SearchActionBar (shared Chip)
  ↓
"N expériences"            <active sort>
  ↓
SearchResultsList → SearchResultCard …
```

**`/search/map` — `SearchMapScreen` (full screen, opened by "Carte")**

```text
RoamMap — absolute fill, edge to edge, no fixed height, no ScrollView      (the surface)
  ▲ overlay (pointerEvents="box-none", under the Safe Area top inset)
  ├─ [‹ back]  SearchInput          ← same field/logic as the list
  ├─ [ Filtres ]                    ← SearchFilterChip → the one SearchFiltersSheet
  └─ ExperienceMapCard (bottom)     ← when a pin is selected → "Voir le lieu" → experience/[id]
```

| State                    | Component(s)                                                                          | Notes                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Initial (no query)        | `RecentSearchList` + `TrendingChips` + `ExploreByMoodSection`                          | Recent searches persisted via `lib/storage.ts` (`useRecentSearches`); trending is a static chip grid; explore-by-mood reuses Discover's `SUGGESTION_MOODS`/`DiscoverMoodCard` |
| Typing                    | `SearchSuggestionsList`                                                                | Debounced `suggest()`; query-text suggestions then up to a few matching experiences                                     |
| Results — list            | `SearchActionBar` + `SearchResultsList` (`FlatList`)                                    | Trier/Filtres/Carte `Chip`s (`selected` = an active sort/filter), result count + active sort label; results are `SearchResultCard`, a full-width sibling of `ExperienceCard` |
| Results — map             | `SearchMapScreen` (`/search/map`): `RoamMap` (`rounded={false}`, absolute fill) + `SearchInput` + `SearchFilterChip` + `ExperienceMapCard` | Markers = `toMapMarkers(sortedResults)`; the map never searches/filters itself; results without `coordinates` stay in the list but get no pin |
| Sort                      | `SearchSortSheet` + `SortOptionRow` + `lib/sortResults.ts`                              | Bottom sheet (same chrome as the filters sheet), picking a row applies + closes; Recommandé / Plus proche / Mieux noté / Prix croissant / Prix décroissant — a pure client-side reorder of the repository's results |
| Filters                   | `SearchFiltersSheet`                                                                    | **One** bottom sheet opened from both `SearchScreen` and `SearchMapScreen`; category (`useCategories`), distance, budget (`context.budget.*`), "Quand ?", options; local draft, live result count |
| Empty                     | `SearchEmptyState`                                                                       | Relax-distance / clear-filters / see-trending actions (`07_DATA_AND_RECOMMENDATION.md`'s "no perfect match" guidance) plus a `pickTrending` fallback carousel |

**Single source of truth.** `SearchSessionProvider` (`features/search/SearchSessionContext.tsx`) wraps `useSearch()` and adds
the sort, the recent searches, the selected map pin and `runSearch`/`applyFilters`; `sortedResults = sortResults(results, sort)`
feeds the list, the count *and* the map markers. Both screens read it through `useSearchSession()`, so "Carte" and back lose
nothing, and the map has no search logic of its own. Leaving `/search` unmounts the provider → the next visit starts fresh.
**Navigation**: "Carte" = `router.push('/search/map')` (fade), the map's ‹ = `router.back()` (`router.replace('/search')` if
there is nothing behind it, e.g. a deep link); native swipe-back stays off (the nested `Stack` repeats `gestureEnabled: false`).
**Tab bar**: `/search` and `/search/map` are inside a root `Stack` screen next to `(tabs)`, so the floating tab bar is never
shown on them — nothing to hide, `RoamTabBar` untouched. **Sticky search**: the list's `SearchInput` sits outside the scrolling
list; the map's floats above the map.

Favorites reuse Home's `useFavoriteExperienceIds`; a result/suggestion/map-pin tap pushes to
`experience/[id]` (`ExperienceDetailScreen`) — no separate detail screen. See D-68 and D-71 for the full
rationale and trade-offs.

## Map (current state)

Real map (sprint 7, `DECISIONS.md` D-70): **`react-native-maps`**, replacing the illustrated maps **one screen at a
time**.

> **Rule:** Les MapPlaceholder sont remplacées progressivement, une screen à la fois. Chaque intégration doit être
> validée avant de passer à la suivante.

| Screen / route                                | Surface                                                              | Status                   |
| --------------------------------------------- | -------------------------------------------------------------------- | ------------------------ |
| Map — `/map` (Discover "Voir la carte")       | `features/map/MapScreen.tsx` → `RoamMap`                             | **Real map (sprint 7)**  |
| Search — "Carte" (`/search/map`)              | `features/search/SearchMapScreen.tsx` → full-screen `RoamMap`         | **Real map (sprint 8)**  |
| Experience detail — map block + `/experience-map/[id]` | `MapPreviewRow` → static `RoamMap`; full screen: `ExperienceMapScreen` | **Real map (sprint 8)**  |
| Onboarding location                           | `MapPreview` (illustrated, decorative)                               | **Next** (may stay static) |
| Journey hub mini-map + `/journey/[id]/map`    | `CurrentJourneyCard` (static `RoamMap`) → `JourneyMapScreen`         | **Real map (sprint 12)** |

```text
Screen → hook / derived results (useNearbyMapExperiences · Search's sortedResults)
       → ExperienceRepository / SearchRepository (mock, Experience.coordinates)
       → toMapMarkers → RoamMap / ExperienceMarker (features/map) → react-native-maps
```

- `RoamMap` is the **only** component (with `ExperienceMarker`) allowed to import `react-native-maps`; screens pass
  `MapMarkerData[]` (`features/map/types/map.types.ts`), a selected id and press callbacks; optionally a `route`
  (ordered points → one `Polyline`, straight segments, sprint 12) and, per marker, a `badge` (a step number) /
  `highlighted` (the current step's badge in `primary`). It frames the markers
  once (`lib/region.ts`), clips to a rounded frame (or edge to edge with `rounded={false}` and `style={StyleSheet.absoluteFill}`, `SearchMapScreen`), and follows the theme through `userInterfaceStyle` (iOS).
- **Markers** (`ExperienceMarker`, sprint 9, D-75): a round photo of the experience (`MapMarkerData.image` =
  its `coverImage`) in a `surface` ring with a shadow; selected = `primary` ring + scale 1.18 (Moti, 200 ms, none
  under reduced motion), drawn on top. Same marker on every `RoamMap` (Map, Search map, detail preview, experience map).
- **Camera focus** is opt-in: `RoamMap focusInsets={{ top, bottom }}` opens on the selected marker and glides to each
  new selection (`animateToRegion`, current zoom kept), centered between those insets (`lib/region.ts`
  `getFocusedRegion`). Without the prop the map never moves by itself. Only `ExperienceMapScreen` uses it.
- **Marker tap ≠ map tap** (D-76): Apple Maps also fires the map's `onPress` ~300 ms after every marker tap. `RoamMap`
  swallows that echo (a map press < 600 ms after a marker press, or flagged `action: 'marker-press'`), so screens'
  `onPressMap` only ever means bare map. Tests: `pressMapEcho` / `pressBareMap` (`src/test/reactNativeMapsMock.tsx`).
- Selection state lives in the screen (hook or screen state), not in the map. The bottom card is `ExperienceMapCard`; "no `coordinates` → no pin, no crash" is defined once in `lib/markers.ts` (`isPinnable`/`toMapMarkers`).
- **Mock data only**: no Google Places / Directions / Geocoding, no network. Coordinates are on the mock
  experiences (`Experience.coordinates`). Real data (place provider, geolocation, routing) is Phase E of
  `08_AGENT_TODO.md`; `Polyline` and user location will be added to `RoamMap` when a screen needs
  them.
- **Dark mode**: iOS (Apple Maps) follows the theme; Android (Google Maps) keeps its light native style for now.
- **Expo Go** works as is, no key in the repo. **Development/production builds** need a Google Maps key for Android
  (`expo.android.config.googleMaps.apiKey`, provided by EAS secrets, never committed) — see D-70.
- **Tests**: `react-native-maps` is mocked globally (`jest.setup.ts`, `src/test/reactNativeMapsMock.tsx`); assert on
  `testID="roam-map"` / `mock-map-view` and on markers by role `button` + title.

## Experience detail & gallery (current state)

Real detail screen and full-screen gallery (sprint 5, `DECISIONS.md` D-48; scroll/header/CTA/carousel
polish D-49), built on `Experience`'s extended fields through the same `ExperienceRepository`
(`useExperienceDetail`/`useExperience`), no second data model.

| Piece                 | Route / component                                                           | Notes                                                                                                             |
| --------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Detail screen         | `experience/[id]` → `features/experiences/ExperienceDetailScreen.tsx`       | Hero, info grid, map preview, why-ROAM, reviews, highlights, similar                                              |
| Hero                  | `features/experiences/components/ExperienceHero.tsx`                        | Paging pager + counter; one `Pressable` per slide (not wrapping the `ScrollView`, D-49); tap opens the gallery Pagination dots (`CarouselDots` reused from Home) bottom-left, same `activeIndex` as the counter, D-73 |
| Sticky header         | `features/experiences/components/ExperienceDetailHeader.tsx`                | Back/share/favorite (moved out of the hero, D-49); title/blur crossfade in past the hero — always visible         |
| Sticky CTA footer     | `components/ui/StickyActionFooter.tsx` (shared, D-52)                       | "Créer mon parcours"; hides on scroll down, returns on scroll end/up (`hooks/useCtaVisibility`, D-49/D-52)        |
| Gallery screen        | `gallery/[id]` → `features/experiences/gallery/ExperienceGalleryScreen.tsx` | Full-screen; a flat route (not nested under `experience/[id]/`), see D-48                                         |
| Gallery sync          | Two `FlatList`s (main pager + thumbnail strip) sharing one `activeIndex`    | `getItemLayout` on both; thumbnail press scrolls the main list, main-list scroll re-centers the thumbnail strip   |
| Hero → gallery motion | `progress` shared value (`useSharedValue`/`withTiming`/`interpolate`)       | Reanimated rect-morph, not a shared-element library (none in the stack) — see D-48 for the full rationale         |
| Why ROAM              | `features/experiences/lib/whyRecommended.ts` (unit-tested)                  | Reasons derived from the experience's own data, not stored per item                                               |
| Map block             | `features/experiences/components/MapPreviewRow.tsx`                         | Two touch targets in one card: the static `RoamMap` (`interactive={false}`, pin + "Voir sur la carte" pill) → `experience-map/[id]`; the address row → `AddressActionsBubble` (D-74). Without `coordinates`: address row only, bubble offers just "Copier l'adresse". The address is no longer in `InfoGrid` |
| Address bubble        | `components/AddressActionsBubble.tsx` + `useAddressActions.ts` + `features/map/lib/externalMaps.ts` | Small centered rounded card over a dimmed backdrop (fade + slight scale, no motion under reduced motion), closed by backdrop / × / Android back. Actions: Copier l'adresse, Copier les coordonnées GPS (`48.8566, 2.3522`) — `expo-clipboard` + `showToast`; Ouvrir dans Plans (iOS only, `https://maps.apple.com/?ll=…`), Ouvrir dans Google Maps (`https://www.google.com/maps/search/?api=1&query=…`) — `Linking.openURL`, plain URLs: no Maps API, no key. Failure → error toast |
| Full-screen map       | `experience-map/[id]` → `features/map/ExperienceMapScreen.tsx`              | `RoamMap` fills the screen; a **transparent** `StickyRevealHeader` (back button only — no title since D-76, no background) floats over it; `ExperienceMapFooter` over the bottom edge. **Tap on bare map → footer slides down** (Moti `translateY`), a small "info" `IconButton` appears bottom-right; **tap it → slides back up**. Pan/zoom untouched. **Sprint 9 (D-75):** every pinnable experience is pinned (round photo markers); one `selectedExperienceId` (the opened one at first) drives the selected marker *and* the footer; a marker tap selects it, re-shows a hidden footer and recenters the camera between header and footer. Footer CTA → back for the opened experience, `experience/[id]` push for another |
| Similar experiences   | `features/experiences/components/SimilarExperiencesSection.tsx`             | Reuses Home's `ExperienceCard`                                                                                    |
| Journey CTA           | sticky footer → `features/journey/hooks/useJourneyCta.tsx`                  | "Créer mon parcours" → `/journey/create?experienceId=…` (no active journey); "Ajouter au parcours" → adds to the active journey, "Ajouté à ton parcours ✓" dialog with "Voir mon parcours" (D-80) |

## Profile (current state)

Built one screen at a time (`docs/SCREEN_INTEGRATION_WORKFLOW.md`), sprint 5. The main screen
(`/profile`) is identity/activity/taste; account and app configuration live in `/profile/settings`
(both new shapes, sprint 5 refactor, `docs/DECISIONS.md` D-63). "Mes préférences"
(`/profile/preferences`), "Mes favoris" (`/profile/favorites`), "Mon historique" (`/profile/history`),
"Mes statistiques" (`/profile/statistics`), "Langue" (`/profile/language`) and "Thème"
(`/profile/theme`) are real, reached from both Profile and Settings where the brief calls for it; every
other row is still a `ProfilePlaceholder` stub (`docs/DECISIONS.md` D-50) until its own session.

| Piece                      | Route / component                                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main screen                | `/profile` (in `(tabs)`) → `features/profile/ProfileScreen.tsx`                          | Header (avatar/name/bio/edit CTA), stats, "Ce que j'aime", favorites/history previews, yearly activity summary — built on `UserRepository` (`useCurrentUser`) plus the hooks below; header is a `StickyRevealHeader` (no `leftSlot`, it's a tab root), settings gear in `rightSlot`, `docs/DECISIONS.md` D-63/D-64                                                      |
| Header/stats               | `features/profile/components/ProfileHeader.tsx`, `ProfileAvatar.tsx`, `ProfileStats.tsx` | Avatar falls back to an initial letter (no photo in the mock content, same precedent as `ReviewCard`)                                                                                                                                                                                                                                                                                        |
| Taste preview              | Inline in `ProfileScreen.tsx` (`Chip` row)                                               | Shows `DEFAULT_EXPERIENCE_TYPES`/`DEFAULT_AMBIANCE` (`data/experienceTypes.ts`/`ambianceOptions.ts`, D-51); "Modifier" pushes `/profile/preferences` — the same route Settings' own "Mes préférences" row uses                                                                                                                                                                               |
| Favorites/history previews | `features/profile/components/ExperiencePreviewCard.tsx`                                  | Compact 3-up cards (not Home's 260px `ExperienceCard`), fed by `useFavoriteExperiences`/`useHistoryExperiences`; each row hides itself when empty — the real empty states live on the full screens                                                                                                                                                                                           |
| Activity summary           | `features/profile/components/ActivitySummaryCard.tsx`                                    | Pressable card, same `UserStats` numbers as `ProfileStats` above, → `/profile/statistics`                                                                                                                                                                                                                                                                                                    |
| Menu row                   | `features/profile/components/ProfileMenuRow.tsx`                                         | Icon + label (+ optional subtitle or right-aligned value) + chevron; reused for every group (now used by Settings, not Profile)                                                                                                                                                                                                                                                              |
| Settings                   | `/profile/settings` → `features/profile/SettingsScreen.tsx`                              | Grouped `ProfileMenuRow`s (Compte/Préférences ROAM/Apparence/Support/Confidentialité & données/Session); owns the logout `ConfirmationModal` (moved from Profile, same flow, D-62); header is a `StickyRevealHeader`; `docs/DECISIONS.md` D-63                                                                                                                                               |
| Preferences                | `/profile/preferences` → `features/profile/PreferencesScreen.tsx`                        | Experience types + ambiance (multi-select tile grids), budget + distance (`Slider`); header is a `StickyRevealHeader`, save CTA is a `StickyActionFooter`, success/error feedback is `showToast` — local state only, `docs/DECISIONS.md` D-51/D-52/D-54/D-56                                                                                                                                 |
| Favorites                  | `/profile/favorites` → `features/profile/FavoritesScreen.tsx`                            | Favorited experiences (`useFavoriteExperiences`, backed by `Experience.isFavorite`), one `FavoriteExperienceRow` per item, heart-tap removal, empty state; header is a `StickyRevealHeader` — local state only, no separate place-favoriting system, `docs/DECISIONS.md` D-57                                                                                                                |
| History                    | `/profile/history` → `features/profile/HistoryScreen.tsx`                                | Completed experiences (`useHistoryExperiences`, backed by `Experience.historyPeriod`), grouped by "Cette semaine/Ce mois-ci/Plus tôt", a dynamic category filter (`Chip` row), one `HistoryEntryRow` per item (read-only, chevron only), empty state; header is a `StickyRevealHeader` — local state only, `docs/DECISIONS.md` D-58                                                          |
| Statistics                 | `/profile/statistics` → `features/profile/StatisticsScreen.tsx`                          | Time-range `Chip`s (local selection only), three `StatCard`s (`UserStats`, same numbers as `ProfileStats`), "Tes genres préférés"/"Villes visitées" (`PercentBarRow`, plain `View` bars), "Ton humeur lors des sorties" (`MoodDonutChart`, `react-native-gifted-charts`' `PieChart`), an insight card; header is a `StickyRevealHeader` — static mock numbers only, `docs/DECISIONS.md` D-59 |
| Language                   | `/profile/language` → `features/profile/LanguageScreen.tsx`                              | `LanguageOptionRow` per language, list from `getAvailableLanguages()` (`src/i18n/index.ts`) — never hardcoded in the screen, see `05_THEME_AND_I18N.md` "Langue screen"; selecting one calls the existing `setLanguage()`; header is a `StickyRevealHeader` — `docs/DECISIONS.md` D-60                                                                                                       |
| Theme                      | `/profile/theme` → `features/profile/ThemeScreen.tsx`                                    | `ThemeOptionRow` per preference, list from the existing `THEME_PREFERENCES` (`theme/tokens.ts`); selecting one calls the existing `useTheme().setPreference`; header is a `StickyRevealHeader` — `docs/DECISIONS.md` D-61                                                                                                                                                                    |
| Not-yet-built rows         | `features/profile/components/ProfilePlaceholder.tsx`                                     | `/profile/{edit,help,privacy}`                                                                                                                                                                                                                                                                                                                                                               |
| Data                       | `UserRepository.getCurrentUser()` (`services/mock/user.ts`)                              | One mocked profile (`services/mock/data.ts` → `currentUser`); `User` gained optional `age/city/bio/stats`                                                                                                                                                                                                                                                                                    |

## Journey (current state, sprint 10, `docs/DECISIONS.md` D-80)

| Step | Route | Screen | Notes |
| ---- | ----- | ------ | ----- |
| Intro | `/journey/create` | `CreateJourneyIntroScreen` | Photo collage from the pool, "Commencer" / "Annuler" |
| Context | `/journey/create/context` | `JourneyContextScreen` | Ambiance → temps → budget, one question at a time (`MoodTile`, `ChoiceRow`, `ProgressBars` from onboarding) |
| Start | `/journey/create/location` | `JourneyLocationScreen` | Ma position (approximate — no geolocation yet) / a spot (`data/startSpots.ts`) / an address; static `RoamMap` |
| Building | `/journey/create/building` | `JourneyBuildingScreen` | Sprint 12, D-84. ~3.6 s front-end simulation, nothing to press: the onboarding's `ProfileOrbit` (faster ring) + `JourneyBuildChecklist` fed by the draft (start, ambiance, time, budget, then "Construction de ton parcours"); then `replace` → suggestions. Reads the draft, never saves |
| Suggestions | `/journey/create/suggestions` | `JourneySuggestionsScreen` | `suggestForJourney` (filter then score, doc 07), pre-selection, add/remove/details, "Explorer d'autres idées" → `/search` |
| Builder | `/journey/create/builder` | `JourneyBuilderScreen` | Timeline (`JourneyStepCard` + `TravelConnector`), move up/down, remove |
| Summary | `/journey/create/summary` | `JourneySummaryScreen` | Totals, map, timeline; "Créer mon parcours" = DRAFT → ACTIVE, then `replace` → `/journey/[id]` |
| Active | `/journey/[id]` | `ActiveJourneyScreen` | Progress, map, timeline (done/current/upcoming), Commencer → Continuer → Terminer; the only place a journey is shown — the current one or a completed one from the history (sprint 11) |
| Feedback | `/journey/[id]/feedback` | `JourneyFeedbackScreen` | Sprint 12, D-83. Opened by "Terminer mon parcours" once the journey is `completed` (never by opening it). Edge-to-edge photo + "Passer", recap, `StarRating` (1–5, required), `FeedbackCommentField` (optional, 300 max), sticky "Envoyer mon avis"; thanks shown in place → "Voir mon parcours" / "Retour à mes parcours"; feedback already given → its recap, no form |
| Journey map | `/journey/[id]/map` | `JourneyMapScreen` | Sprint 12, D-85. From the hub's mini-map. `RoamMap` edge to edge + route line, numbered photo markers (current step highlighted), transparent header with an always-visible "Parcours en cours" pill, `ExperienceMapFooter` (+ step badge) for the one `selectedExperienceId`; bare-map tap hides the footer. Data: `lib/journeyMap.ts`, shared with the mini-map |
| Hub | `/journey` (Parcours tab) | `JourneyHubScreen` | Sprint 11, D-81. Picks one of three states: journey in progress (only `CurrentJourneyCard`: edge-to-edge hero from the top of the screen, content in `px-6` below, no border; "Continuer mon parcours" opens `/journey/[id]`; no history, no create — D-82); none in progress but some completed ("Mes parcours": create, then `JourneyHistoryCard`s); nothing (`JourneyHubEmptyState`, "Créer mon parcours") |

- **Layers:** `Screen → journeyStore (useJourney + operations) → JourneyRepository → mock` (persisted, `roam.journey.current`;
  completed journeys also in `roam.journey.history`, `listCompleted()`, sprint 11). "What's left" (time, distance, steps) is
  `lib/progress.ts`. Feedback: `journeyFeedback.ts` (`submitJourneyFeedback`, `useJourneyFeedback`) →
  `JourneyFeedbackRepository` → mock (`roam.journey.feedback`, one per journey).
  Planning (travel, arrivals, totals) and suggestions are pure functions in `features/journey/lib/`.
- **Draft vs active:** the draft lives in `JourneyDraftProvider`, mounted by `app/journey/create/_layout.tsx`; leaving the
  flow discards it. Nothing is saved before "Créer mon parcours". One active journey at a time (`ActiveJourneyExistsError`).
- **Leaving:** the flow's × (and Intro's "Annuler") leaves at once without input, otherwise "Quitter la création ?".
- **Tests:** `journeyStore.test.ts`, `lib/*.test.ts`, `journeyRoutes.test.tsx` (full flow on the real route tree),
  `journeyHubRoutes.test.tsx` (the hub's three states, sprint 11), `journeyFeedback.test.ts` +
  `journeyFeedbackRoutes.test.tsx` (sprint 12).

## Authentication (current state)

Built one screen per session (`docs/SCREEN_INTEGRATION_WORKFLOW.md`); front-end only, no backend (`DECISIONS.md` D-28, D-29, D-31 to D-36). All 7 screens are done.

| Route                   | Screen          | Notes                                                                                   |
| ----------------------- | --------------- | --------------------------------------------------------------------------------------- |
| `/auth`                 | Entry           | "Se connecter", "Créer un compte", simulated Google/Apple buttons (loading only)        |
| `/auth/login`           | Login           | Email/password form, local validation; any valid input "succeeds" → `/home`             |
| `/auth/register`        | Register        | First name/email/password/confirm + live checklist; same "succeeds" → `/home`           |
| `/auth/forgot-password` | Forgot password | Email step; sends to the reset-code screen (mockup tile 5)                              |
| `/auth/reset-code`      | Reset code      | 6-digit `OtpInput`; only the mock code `123456` "succeeds" → `/auth/new-password`       |
| `/auth/new-password`    | New password    | Password + confirm, same rules/checklist as Register → `/auth/reset-success`            |
| `/auth/reset-success`   | Reset success   | Success badge (`SuccessCheckmark`) + landscape; "Se connecter" replaces → `/auth/login` |

Reached from `WelcomeScreen`'s "Se connecter" link (`t('welcome.signIn')`, `router.push('/auth')`). Shared
pieces in `features/auth/components/`: `AuthTopBar` (back + small wordmark — its back button only renders
when `router.canGoBack()`, sprint 5, `docs/DECISIONS.md` D-62), `OrDivider`, `SocialButtons`,
`AuthFooterLink`, `PasswordRequirements` (Register's live checklist), `OtpInput` (Reset code's 6-digit
entry), `SuccessCheckmark`/`SuccessLandscape` (Reset success's animated badge and illustration). Generic
form field: `components/ui/TextField`.

### Logout (current state, `docs/DECISIONS.md` D-62)

`ProfileScreen`'s "Se déconnecter" row opens a `ConfirmationModal` (`components/ui/`) instead of logging
out directly — "Annuler" closes it with the session untouched, "Se déconnecter" (inside the modal) calls
the existing `useAuth().logout()` then `router.replace('/auth/login')`. `Stack.Protected`'s guard swap
(D-44) removes the whole authenticated group from navigation history the moment `isLoggedIn` flips, so
`/auth/login` ends up with nothing behind it (`router.canGoBack() === false`) — `AuthTopBar` reads exactly
that to decide whether to render its own back button, which is what actually fixes "Login shows a dead
back button after logout" (D-62). `ConfirmationModal` is a generic, reusable primitive (`visible`,
`title`, `description`, `confirmLabel`/`cancelLabel`, `onConfirm`/`onCancel`, `variant: 'default' |
'destructive'`, `loading`, `icon`) — it owns display/animation/interaction only, never logout or any
other domain logic itself.

## Conventions

### Routes and screens

- Files in `src/app/` only declare routes and render a screen from `src/features/<feature>/`.
- Business logic stays out of components; UI never calls `fetch` (see _Data access_).
- Before building a screen: read its section in `03_UX_SCREENS_AND_FLOWS.md`, list its states
  (loading / empty / error / success), its translation keys and the theme tokens it uses.

### Navigation back gesture

- **The native swipe-back/interactive-pop gesture is disabled by default** (`gestureEnabled: false`
  on the root `Stack`'s `screenOptions`, `AppRoutes.tsx`, sprint 5, `docs/DECISIONS.md` D-53). Back
  navigation is button-only: every screen that needs one renders its own back control (a `Pressable`
  - `ChevronLeft` calling `router.back()`, the pattern `AuthTopBar`/`ProfilePlaceholder`/
    `CreateJourneyPlaceholder` already use) — do not rely on the system gesture for a new screen.
- **A rendered back button must only exist when `router.canGoBack()` is actually true** (D-62):
  `AuthTopBar` checks this before rendering its `Pressable` at all (a same-size empty `View` keeps the
  wordmark's position stable either way) rather than rendering a button that calls `router.back()` with
  nowhere to go — the exact bug that showed up on `/auth/login` reached via logout, where
  `Stack.Protected`'s guard swap already leaves nothing behind it. Apply the same check in any new
  shared back-button component; don't reintroduce an always-rendered one.
- **Exception, not a pattern to extend**: a handful of pre-existing screens have no back button at all
  (the mockup doesn't show one) and rely on the gesture — or, on Android, the hardware back button,
  which this setting never affects either way — as their only way back. Each keeps
  `options={{ gestureEnabled: true }}` on its own `Stack.Screen`, listed and reasoned about in
  `AppRoutes.tsx`'s own comments: the onboarding question screens through "ready", and the
  authentication entry screen. Do not add a new screen to that list; give it a back button instead.
- **This only affects the Stack navigator's own edge-swipe gesture** — a completely separate system
  from `ScrollView`/`FlatList` horizontal scrolling, a carousel's paging `ScrollView` (Home's hero,
  the gallery's pager/thumbnail strip), or any `PanResponder`/Reanimated gesture (`Slider`). None of
  those are touched by this setting.
- `gallery/[id]` keeps its own explicit `gestureEnabled: false` (D-48) even though it's now the global
  default too — that one exists so the screen's custom close animation can't be bypassed, which is a
  different reason than "no back button exists", so it's kept explicit rather than folded away.

### Styling (NativeWind 4)

- Style with `className`. Use semantic token classes only: `bg-background`, `bg-surface`,
  `bg-surfaceElevated`, `text-text`, `text-textSecondary`, `border-border`, `bg-primary`,
  `text-primaryForeground`, `bg-accent`, `text-success|warning|error`, `bg-overlay/40`.
- **Never write a hex color** in a component. Raw values live in `src/theme/palette.ts` and
  `src/theme/tokens.ts` only. Need a color that doesn't exist? Add a token (light **and** dark).
- Typography: use `<Text variant="h1|h2|h3|h4|bodyLg|body|small|caption|label|display">`. Do not set
  font families or sizes by hand.
- Radius: `rounded-small|medium|large|card|hero|pill`. Spacing: Tailwind's 4px scale (`p-4` = 16px).
- Build class names from complete strings (`'bg-primary'`), never by concatenating fragments —
  Tailwind only generates classes it can find literally in `src/`.
- NativeWind ignores class order for conflicts: don't try to "override" a class with a later one.
  Use a variant/prop instead.

### Horizontal lists / carousels (sprint 6, `docs/DECISIONS.md` D-66)

**Horizontal lists and carousels of repeating data default to `FlatList horizontal`.** `ScrollView
horizontal` is reserved for a paging pager with its own custom scroll-position tracking (a hero, a
gallery) or other genuinely non-repeating/special-cased content — not for a plain list of cards.

- **Why**: virtualization and better performance on longer lists, one consistent component shape across
  the app, and readiness for real API data — a `FlatList` doesn't change shape once its `data` stops
  being a small fixed mock array.
- **Good practices**: a stable `keyExtractor` (the item's own id, not its index, once one exists);
  `renderItem` stays a plain function unless a card is expensive enough to be worth `React.memo`; don't
  reshape/recreate the `data` array on every render (memoize it if it's derived); consider a loading/empty
  state once a section's data can genuinely be empty (Discover's sections return `null` when their pool
  is empty, rather than rendering an empty `FlatList`). Don't reach for `getItemLayout`, `windowSize` or
  other virtualization tuning prematurely — only when a real performance problem shows up.
- **Not a carousel**: a single, non-repeating block (Discover's `ImmersiveExperienceCard`) or a paging
  pager with its own `ref`/shared-value scroll tracking (Home's `HeroCarousel`, experience detail's
  `ExperienceHero`) stay a plain `View` or `ScrollView` respectively — the rule is about lists of
  repeating items, not every horizontally-laid-out thing.
- **Existing `ScrollView horizontal` carousels were audited, not migrated** (Home's mood/popular/nearby/
  for-you sections, experience detail's "Suggestions similaires", the history screen's category filter):
  each is an already-validated, tested screen, and the sprints that introduced this rule focused on
  putting the strategy in place and applying it to Discover, not retrofitting every existing screen in
  one sweep. Migrate one of them the next time it's touched for an unrelated reason — see
  `docs/DECISIONS.md` D-66.

#### Full-bleed carousels and snapping (`docs/DECISIONS.md` D-67)

A carousel of partial-width "peek" cards sitting inside a page's own horizontal padding (`px-6`) gets
visually boxed in: cards near either edge are clipped by that padding instead of bleeding to the screen's
physical edge, and nothing about `ScrollView`/`FlatList` prevents that on its own. `components/ui/`'s
`HorizontalCarousel` (all of Discover's own carousels use it, `RoamSelectionSection` /
`SuggestionsSection` / `NearbySection` / `TrendingSection` / `CollectionsSection`) is the reusable fix:

- **Full bleed**: `marginHorizontal: -sidePadding` on the `FlatList` itself cancels the parent's padding
  (`sidePadding` defaults to 24, matching `px-6`), while `contentContainerStyle`'s matching
  `paddingHorizontal: sidePadding` keeps the first/last item aligned with the rest of the page's content
  instead of touching the physical screen edge. Reach for this whenever a horizontal carousel sits inside
  a padded page and should visually escape that padding — not just in Discover.
- **Snap**: `snapToInterval={itemWidth + spacing}`, `snapToAlignment="start"`,
  `decelerationRate="fast"`. `itemWidth` must be the exact value the card renders at — a fixed constant
  (`ExperienceCard`'s `CARD_WIDTH`, `DiscoverMoodCard`'s `TILE_SIZE`, `DiscoverCollectionCard`'s
  `COMPACT_WIDTH`) or a value derived from `useWindowDimensions()` the same way the card derives it
  (`DiscoverCollectionCard`'s `getHeroCardWidth`) — **exported by the card itself and imported by the
  section**, not a second hardcoded copy that can silently drift out of sync with what actually renders.
  `pagingEnabled` was considered instead for the hero cards (near-full-width) and rejected: the carousel's
  own frame is full window width once it's full-bleed, but the hero card's width is
  `windowWidth - 2 * sidePadding` — narrower than the frame — so paging (which pages by the scroll view's
  own frame width) would drift out of alignment after a few swipes; `snapToInterval` computed from the
  card's real width doesn't have that problem.
- **Not every horizontal list needs this**: `HorizontalCarousel` takes `snapEnabled` (default `true`) for
  a future non-snapping full-bleed use, and `DiscoverTabs` (the secondary-nav chip row) was deliberately
  left as a plain, padded `FlatList` — it's a navigation control, not a "peek card" carousel, and bleeding
  it to the edges wasn't asked for.

### Theme (Light / Dark / System)

- `ThemeProvider` (mounted in `src/app/_layout.tsx`) resolves the preference, injects the theme as
  CSS variables and syncs native chrome via `Appearance.setColorScheme`.
- `useTheme()` returns `{ preference, scheme, isDark, colors, setPreference }`. Use `colors` only where
  a class is impossible (icons, navigation theme).
- The preference is persisted under `roam.theme` (`light` | `dark` | `system`).

### i18n

- Every visible string comes from `src/i18n/locales/{fr,en}.json`; keys are semantic
  (`recommendations.title`), never screen-coordinate based. French is the default language.
- `const { t } = useTranslation(); t('common.continue')` — keys are type-checked against `fr.json`.
- Interpolation uses **single braces**: `"{count} sélectionnés"` → `t('…', { count: 3 })`.
- Add every key to **both** files; a test fails if they diverge.
- Language is switched with `setLanguage('fr' | 'en')` (updates the UI immediately, persisted under
  `roam.language`).

### Animation (Moti)

Keep motion subtle (fade, small translate, ~1.03 scale on selection). `FadeInUp` is the reference
appearance animation. Moti runs on Reanimated 4 + `react-native-worklets`.

- `MotiView` takes `style`, **not** `className` (NativeWind does not process it): a `className` on it is silently
  ignored (no flex, no background). Use `style` with `useTheme().colors`, or a plain `View` around it.
- Reduced motion: `useReduceMotion()` (`src/hooks/`) follows the OS setting; drop translations, scales, rotations and
  loops when it is true (`ProfileCreationScreen` shows the pattern). Reanimated's own `useReducedMotion` is not in its Jest mock.
- Animating an SVG attribute (the loader ring): `Animated.createAnimatedComponent(Circle)` + `useAnimatedProps`.
- Timed sequences (front-end simulations): a `setTimeout` schedule created in one `useEffect` and cleared in its cleanup
  (see `features/onboarding/profileCreation.ts`), tested with Jest fake timers.

### Sticky headers with a scroll-position reveal

`StickyRevealHeader` (`components/ui/`, sprint 5, `docs/DECISIONS.md` D-55) is a generic sticky header
that starts transparent and crossfades in a background (blur + a `surface`-tinted wash, the same glass
recipe `RoamTabBar` uses) plus an optional title once the screen has scrolled past a given offset —
generalized from experience detail's own header for **future screens with the same shape**.

- **Use it for a new screen** that needs "transparent over a hero, background/title fade in once the
  hero's own title scrolls out of view". Give it `scrollY` (a `SharedValue<number>` you mutate from a
  plain `onScroll`, not `useAnimatedScrollHandler` — same reasoning as `D-39`/`D-46`) and `revealOffset`
  (the scroll position where the reveal should be complete, e.g. from a hero-height helper like
  `getHeroHeight`). `leftSlot`/`rightSlot` are `ReactNode` — the header renders no buttons itself;
  compose whatever the screen needs (an `IconButton`, a `Pressable`, nothing) — same "component owns
  chrome, screen owns content" split as `StickyActionFooter`.
- **Experience detail's own `ExperienceDetailHeader` was intentionally left as-is**, not migrated: it
  hardcodes back/share/favorite (not slot-based), fixed white icons on a permanent dark backdrop (it
  only ever sits over a photo, so no theme-aware icon color is needed), and its own `HEADER_HEIGHT`.
  Migrating it now would touch an already-validated, tested screen for no behavioral gain — **all
  existing headers (`ExperienceDetailHeader`, `HomeHeader`, `AuthTopBar`, …) will be harmonized in a
  dedicated pass at the end of the project**, not screen-by-screen as a side effect of building this
  component.
- Not reduced-motion gated (see the component's own doc comment): the crossfade is a direct function
  of scroll position, not a timed animation, so there's nothing to suppress — same as
  `ExperienceDetailHeader`.

**Sticky search (sprint 6, `docs/DECISIONS.md` D-69):** Home's and Discover's `SearchBar`s are now
reachable while scrolling. The in-flow `SearchBar` on each screen is untouched (same position, same
"at load" behavior); a second, floating instance of the same `SearchBar` fades in once the in-flow one
has scrolled past the sticky zone — the exact reveal-past-`revealOffset` idiom above, just with a
`SearchBar` instead of a title. Two different mechanisms, chosen per screen rather than forced into one:

- **Discover** has no existing sticky header, so it uses `StickyRevealHeader` directly, via its new
  `centerSlot?: ReactNode` prop (additive, `title`-only callers unaffected) — content that must stay
  tappable once revealed, unlike a title (`pointerEvents="box-none"` instead of `"none"`).
- **Home already has one** (`HomeHeader`, the notification bell) with its own tested, direction-based
  hide/show contract (`useScrollDirection` — hides on a sustained scroll down, reveals on any scroll
  up). Changing that contract wasn't asked for, so `HomeHeader` was extended in place instead of
  switched to `StickyRevealHeader`: a new `searchSlot`/`showSearch` prop pair adds a second row that
  rides along with the existing bell row's visibility — one zone, not two overlapping ones. `showSearch`
  is its own signal (scrolled past the Hero, via the new `features/home/lib/heroHeight.ts`, mirroring
  `features/experiences/lib/heroHeight.ts`), independent of the bell's `visible`/`atTop`.
- A momentary overlap between the in-flow and the floating instance during the crossfade is expected
  and harmless (both trigger the identical navigation) — the same characteristic the title-reveal
  pattern above already has, unaddressed, across every `StickyRevealHeader` screen; no extra
  accessibility-hiding was added for search either, to stay consistent rather than introduce a new
  inconsistency.

### Toasts

Global feedback (a save succeeding/failing, and similar one-off confirmations) goes through
`showToast('success' | 'error', { title, message? })` (`src/lib/toast.ts`) — never call
`react-native-toast-message` (`Toast.show`) directly from a screen. This is the only toast/snackbar
mechanism in the app (sprint 5, `docs/DECISIONS.md` D-54).

- **Library**: `react-native-toast-message` (stable, no beta), pure JS, no native linking. `<AppToast />`
  (`components/ui/`) is mounted **once**, at the app root (`app/_layout.tsx`, sibling to `AppRoutes`) —
  a screen never renders its own `<Toast />` or `<AppToast />`.
- **Rendering is ROAM's own**: `AppToast` passes a custom `config` (`success`/`error`) built from
  `Text`/theme tokens/Lucide icons, not the library's default look. Add a new variant by adding a case
  to that `config` and to `ToastVariant` in `toast.ts` — the same "not a full notification system,
  extend when actually needed" scope as this sprint's `success`/`error` pair.
- **Position**: always docks at the top (`position="top"`, offset by `useSafeAreaInsets().top`), so it
  never has to reason about `RoamTabBar` or a screen's `StickyActionFooter` — both are bottom-anchored.
- Respects `useReduceMotion()` (shortens the library's own enter/exit animation duration, the same
  "shorten rather than fully strip" compromise `HomeHeader`/`ExperienceDetailFooter` already use, since
  the library's animation isn't decomposable into "translate vs. opacity" from the outside).

### Data access (mock now, API later)

```text
Screen → hook / service → Repository (interface) → mock implementation  (today)
                                                 → API implementation   (later)
```

- Interfaces: `src/services/repositories/types.ts`. Mock: `src/services/mock/`.
- `src/services/index.ts` exports `repositories`, the single place that picks the implementation.
- Screens and components import `repositories` (through a hook) — never a mock file, never `fetch`.
- Add a repository interface when the feature that needs it is built.

### Testing

- Jest + `@testing-library/react-native` **v14**: `render`, `renderHook`, `fireEvent` and `act` are
  **async** — always `await` them.
- Use `renderWithProviders` (`src/test/`) so components get safe-area, theme and i18n.
- Reanimated / Worklets and AsyncStorage are mocked in `jest.setup.ts`.
- Priorities from `04_TECH_STACK.md`: scoring, itinerary constraints, localization, theme, critical
  navigation, feedback persistence.

### Icons

Use Lucide, **one import per icon** — never the package root:

```ts
import ArrowRight from 'lucide-react-native/icons/arrow-right';
```

The root barrel pulls ~1 600 icons into the bundle (and makes Jest 10× slower). Colors come from
`useTheme().colors` (icons cannot use NativeWind classes).

### Assets

The logo files, the wordmark, the splash photo and the auth entry photo (`assets/images/auth/entry-background.png`)
are official. The app icon and the Android adaptive icon are still placeholders, and so are the onboarding photos in
`assets/images/onboarding/` (the four welcome photos, `ready-background.jpg` and `profile-landscape.jpg`) — **temporary**
crops of the mockups (see the READMEs there). Which file is used for what is documented in
`apps/mobile/assets/images/logo/README.md`. Fonts are loaded from `@expo-google-fonts/*` (Plus Jakarta Sans, Inter, Newsreader, Mrs Saint Delafield); import each
weight from its own entry point (e.g. `@expo-google-fonts/inter/400Regular`) to keep the bundle small.

## Troubleshooting

- **Stale styles / config after editing `tailwind.config.ts`, `babel.config.js` or `metro.config.js`:**
  `pnpm --filter mobile start --clear`.
- **`Unable to resolve module react-native-css-interop/jsx-runtime`:** the package must stay a direct
  dependency of `apps/mobile` (pnpm's strict resolution).
- **`ERR_PNPM_IGNORED_BUILDS`:** pnpm ≥ 10 blocks dependency build scripts; decisions are recorded in
  `pnpm-workspace.yaml` (`allowBuilds`).
- **Peer dependency warnings from `pnpm install`:** `react-reconciler` (via the testing library) and
  `@react-native/metro-config` are transitive and pinned by Expo SDK 57; nothing to act on today.
