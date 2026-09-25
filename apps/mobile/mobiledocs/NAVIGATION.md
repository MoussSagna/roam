# Mobile — Navigation

Expo Router (file-based, typed routes). Route files in `src/app/` only declare routes and render a screen from
`src/features/<feature>/`. The whole route table lives in `features/navigation/AppRoutes.tsx`.

## Main navigation (tabs)

Four tabs behind one floating pill/bubble tab bar, sprint 3, with scroll-collapse — [`DECISIONS.md`](DECISIONS.md) D-38 to D-43.

| Route       | Screen   | Notes                                                                                     |
| ----------- | -------- | ----------------------------------------------------------------------------------------- |
| `/home`     | Home     | Real discovery screen (sprint 5) — [`features/HOME.md`](features/HOME.md)                 |
| `/discover` | Discover | Real editorial discovery page (sprint 6) — [`features/DISCOVER.md`](features/DISCOVER.md) |
| `/journey`  | Parcours | Journey hub (sprint 11, D-81) — [`features/JOURNEY.md`](features/JOURNEY.md)              |
| `/profile`  | Profile  | Identity/activity/taste (sprint 5) — [`features/PROFILE.md`](features/PROFILE.md)         |

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
  always expanded within 24px of the top), not a Reanimated worklet ([`DECISIONS.md`](DECISIONS.md) D-39 explains why).
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

## Mocked session and route protection

No backend yet, so "being signed in" is simulated end to end — see [`DECISIONS.md`](DECISIONS.md) for the
full rationale. Summary:

- **`isLoggedIn`** (`apps/mobile/src/auth/AuthContext.tsx`, `AuthProvider`/`useAuth`) is the single
  source of truth. `login()`/`logout()` simulate a request (`repositories.auth`, ~900 ms delay) then
  flip it; it is persisted (`apps/mobile/src/auth/session.ts`, reusing the theme/language storage
  abstraction) so a restart returns to the same session.
- **Public flow** (`isLoggedIn === false`): Welcome, the whole onboarding journey (mood → … → ready),
  and the whole `/auth/*` sub-flow (entry, login, register, forgot password, reset code, new
  password, reset success).
- **Authenticated flow** (`isLoggedIn === true`): the tabs ((tabs)/home, discover, journey, profile — plus
  `favorites`, still declared but out of the tab bar since D-81) and every screen pushed from them.
- Both flows are declared once in `apps/mobile/src/features/navigation/AppRoutes.tsx`, gated with
  `Stack.Protected`, and reused by the app and its route tests alike.
- **Becoming "signed in"**: Login, Register, and finishing onboarding ("Commencer") all call the
  same `login()` — the brief behind this treats them as equally valid ways to enter the app for the
  first time, matching what each already did (land on Home) before route protection existed.
- **Logout**: `SettingsScreen`'s "Se déconnecter" (after a `ConfirmationModal`, D-62/D-63) calls `logout()`, then
  navigates to `/auth/login`.
- **No way back once switched**: `Stack.Protected` removes the other flow's screens from history the
  moment `isLoggedIn` flips (Login/Register/finish-onboarding → Home, or logout → Login) — the back
  button/gesture cannot reach them. Welcome specifically also can't be reached from the auth flow
  it leads into, even though both stay on the _public_ side of that guard (unaffected by
  `Stack.Protected`): choosing "Se connecter" from Welcome `replace`s it instead of pushing.

## Native back gesture

- **The native swipe-back/interactive-pop gesture is disabled by default** (`gestureEnabled: false`
  on the root `Stack`'s `screenOptions`, `AppRoutes.tsx`, sprint 5, [`DECISIONS.md`](DECISIONS.md) D-53). Back
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
  `AppRoutes.tsx`'s own comments: the onboarding profile creation and "ready", and the
  authentication entry screen. (The onboarding questions left that list with D-87: they are one
  pager, whose own swipe goes back a question.) Do not add a new screen to that list; give it a back button instead.
- **This only affects the Stack navigator's own edge-swipe gesture** — a completely separate system
  from `ScrollView`/`FlatList` horizontal scrolling, a carousel's paging `ScrollView` (Home's hero,
  the gallery's pager/thumbnail strip), or any `PanResponder`/Reanimated gesture (`Slider`). None of
  those are touched by this setting.
- `gallery/[id]` keeps its own explicit `gestureEnabled: false` (D-48) even though it's now the global
  default too — that one exists so the screen's custom close animation can't be bypassed, which is a
  different reason than "no back button exists", so it's kept explicit rather than folded away.
