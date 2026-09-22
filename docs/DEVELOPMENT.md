# ROAM — Development guide

This guide describes the repository **as it is today**: a pnpm monorepo containing the mobile app
only. `apps/web`, `apps/api` and `packages/*` (see `04_TECH_STACK.md`) do not exist yet.

**Prototype status (2026-09-22):** the mobile **onboarding is implemented on the front end**, from the splash to the app's
main navigation (routes below). **Authentication screens are all implemented**: entry, login, register, and the whole
forgot-password sub-flow (email → reset code → new password → success) — see `docs/SCREEN_INTEGRATION_WORKFLOW.md`. The
mockup's post-authentication screens (a welcome-back moment, location permission, "Tout est prêt") were never part of that
sprint's scope and are still not built (`DECISIONS.md` D-29). **Main navigation** (four tabs behind a floating pill/bubble
tab bar) is built — see `DECISIONS.md` D-38 to D-43. **Home is now the real discovery screen** (hero carousel, mood
chips, popular/nearby/for-you sections, sprint 5, `DECISIONS.md` D-45); Discover/Favorites are still the sprint 3
placeholder content. **Experience detail and its full-screen gallery are also built** (sprint 5, `DECISIONS.md` D-48);
the itinerary/journey screen it leads to is still a placeholder. **Profile's main screen and "Mes préférences" are now
real** (header, stats, grouped menu; experience types/ambiance/budget/distance; sprint 5, one screen at a time,
`DECISIONS.md` D-50, D-51); the other nine screens it links to (edit profile, favorites, history, statistics, language,
theme, help, privacy, settings) are still placeholders, built one per session. There is **no backend, no database and no
API**: nothing is sent or stored, and every answer/interaction is local state, mock repository content, or a simulated
delay used for the prototype only (`DECISIONS.md` D-28, D-29, D-31 to D-36, D-45, D-50, D-51).

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
    │   ├── (tabs)/          # Main navigation group: home, discover, favorites, profile + _layout.tsx (no path segment)
    │   └── /, /welcome, /onboarding/*, /auth/*
    ├── components/
    │   ├── ui/              # Text, Button, IconButton, Chip, SearchBar, Slider, StickyActionFooter, StickyRevealHeader, AppToast, Screen, ScrollScreen, PlaceholderCard, FadeInUp, TextField
    │   └── brand/           # Logo (light / dark / icon variants)
    ├── features/            # One folder per feature (empty until its sprint)
    │   ├── splash/          # In-app splash screen (route /) + its measured layout
    │   ├── onboarding/      # Onboarding: the 8 screens, onboardingFlow.ts (routes, order), profileCreation.ts (simulation)
    │   ├── navigation/      # Main navigation: RoamTabBar (floating pill/bubble), TabBarCollapseContext, tabBarConfig
    │   ├── home/            # Home (sprint 5): hero carousel, sections, mock data/lib — see the table below
    │   ├── discover/, favorites/  # Still sprint 3 placeholder content
    │   ├── profile/          # Profile (sprint 5): main screen + preferences real, other sub-screens still placeholders
    │   ├── experiences/     # Experience detail (route experience/[id]) + gallery/ (route gallery/[id]) — sprint 5
    │   ├── auth/            # Authentication: all 7 screens built (Entry, Login, Register, ForgotPassword, ResetCode, NewPassword, ResetSuccess)
    │   ├── itinerary/       # CreateJourneyPlaceholder (route itinerary/create) — not the real screen yet
    │   └── recommendations, map, outing, feedback
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
| `/favorites` | Favorites | Placeholder headline + 8 `PlaceholderCard`s            |
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
| Search bar (mocked)                 | `components/ui/SearchBar.tsx`                                          | Reusable primitive; no real query engine yet                                                              |
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

## Experience detail & gallery (current state)

Real detail screen and full-screen gallery (sprint 5, `DECISIONS.md` D-48; scroll/header/CTA/carousel
polish D-49), built on `Experience`'s extended fields through the same `ExperienceRepository`
(`useExperienceDetail`/`useExperience`), no second data model.

| Piece                 | Route / component                                                           | Notes                                                                                                             |
| --------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Detail screen         | `experience/[id]` → `features/experiences/ExperienceDetailScreen.tsx`       | Hero, info grid, map preview, why-ROAM, reviews, highlights, similar                                              |
| Hero                  | `features/experiences/components/ExperienceHero.tsx`                        | Paging pager + counter; one `Pressable` per slide (not wrapping the `ScrollView`, D-49); tap opens the gallery    |
| Sticky header         | `features/experiences/components/ExperienceDetailHeader.tsx`                | Back/share/favorite (moved out of the hero, D-49); title/blur crossfade in past the hero — always visible         |
| Sticky CTA footer     | `components/ui/StickyActionFooter.tsx` (shared, D-52)                       | "Créer mon parcours"; hides on scroll down, returns on scroll end/up (`hooks/useCtaVisibility`, D-49/D-52)        |
| Gallery screen        | `gallery/[id]` → `features/experiences/gallery/ExperienceGalleryScreen.tsx` | Full-screen; a flat route (not nested under `experience/[id]/`), see D-48                                         |
| Gallery sync          | Two `FlatList`s (main pager + thumbnail strip) sharing one `activeIndex`    | `getItemLayout` on both; thumbnail press scrolls the main list, main-list scroll re-centers the thumbnail strip   |
| Hero → gallery motion | `progress` shared value (`useSharedValue`/`withTiming`/`interpolate`)       | Reanimated rect-morph, not a shared-element library (none in the stack) — see D-48 for the full rationale         |
| Why ROAM              | `features/experiences/lib/whyRecommended.ts` (unit-tested)                  | Reasons derived from the experience's own data, not stored per item                                               |
| Map preview           | `features/experiences/components/MapPreviewRow.tsx`                         | Reuses onboarding's `MapPreview` illustration; not yet navigable (no map screen)                                  |
| Similar experiences   | `features/experiences/components/SimilarExperiencesSection.tsx`             | Reuses Home's `ExperienceCard`                                                                                    |
| Create-journey CTA    | `itinerary/create` → `features/itinerary/CreateJourneyPlaceholder.tsx`      | Reached only from the sticky footer CTA now — the old inline button and "Envie d'en faire plus ?" are gone (D-49) |

## Profile (current state)

Built one screen at a time (`docs/SCREEN_INTEGRATION_WORKFLOW.md`), sprint 5. The main screen
(`/profile`) and "Mes préférences" (`/profile/preferences`) are real; every other row is still a
`ProfilePlaceholder` stub (`docs/DECISIONS.md` D-50) until its own session.

| Piece              | Route / component                                                                        | Notes                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main screen        | `/profile` (in `(tabs)`) → `features/profile/ProfileScreen.tsx`                          | Header (avatar/name/bio/edit CTA), stats, grouped menu, logout — built on `UserRepository` (`useCurrentUser`)                                                                                                         |
| Header/stats       | `features/profile/components/ProfileHeader.tsx`, `ProfileAvatar.tsx`, `ProfileStats.tsx` | Avatar falls back to an initial letter (no photo in the mock content, same precedent as `ReviewCard`)                                                                                                                 |
| Menu row           | `features/profile/components/ProfileMenuRow.tsx`                                         | Icon + label (+ optional subtitle or right-aligned value) + chevron; reused for every group                                                                                                                           |
| Preferences        | `/profile/preferences` → `features/profile/PreferencesScreen.tsx`                        | Experience types + ambiance (multi-select tile grids), budget + distance (`Slider`); save CTA is a `StickyActionFooter`, success/error feedback is `showToast` — local state only, `docs/DECISIONS.md` D-51/D-52/D-54 |
| Not-yet-built rows | `features/profile/components/ProfilePlaceholder.tsx`                                     | `/profile/{edit,favorites,history,statistics,language,theme,help,privacy,settings}`                                                                                                                                   |
| Data               | `UserRepository.getCurrentUser()` (`services/mock/user.ts`)                              | One mocked profile (`services/mock/data.ts` → `currentUser`); `User` gained optional `age/city/bio/stats`                                                                                                             |

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
pieces in `features/auth/components/`: `AuthTopBar` (back + small wordmark), `OrDivider`, `SocialButtons`,
`AuthFooterLink`, `PasswordRequirements` (Register's live checklist), `OtpInput` (Reset code's 6-digit
entry), `SuccessCheckmark`/`SuccessLandscape` (Reset success's animated badge and illustration). Generic
form field: `components/ui/TextField`.

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
