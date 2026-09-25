# Mobile — Development guide

How to install, run and work on the mobile app (`apps/mobile`), today the only application of the pnpm monorepo.
Feature-by-feature state: `features/`; conventions: [`CONVENTIONS.md`](CONVENTIONS.md).

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
├── mobiledocs/              # this documentation (README, features/, DECISIONS.md…)
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
    ├── hooks/               # Cross-feature hooks (useBootstrap, useReduceMotion, useCtaVisibility, useCurrentLocation)
    ├── i18n/                # i18next setup + locales/fr.json, locales/en.json
    ├── lib/                 # Small framework-agnostic helpers (storage, cx, toast)
    ├── services/            # Data access: repository interfaces + mock implementation
    ├── theme/               # Tokens, palette, typography, ThemeProvider
    ├── types/               # Domain types (User, Place, Experience, Itinerary…)
    ├── constants/
    └── test/                # Test helpers (renderWithProviders)
```

Path alias: `@/` → `src/` (TypeScript, Jest and Metro).

## Troubleshooting

- **Stale styles / config after editing `tailwind.config.ts`, `babel.config.js` or `metro.config.js`:**
  `pnpm --filter mobile start --clear`.
- **`Unable to resolve module react-native-css-interop/jsx-runtime`:** the package must stay a direct
  dependency of `apps/mobile` (pnpm's strict resolution).
- **`ERR_PNPM_IGNORED_BUILDS`:** pnpm ≥ 10 blocks dependency build scripts; decisions are recorded in
  `pnpm-workspace.yaml` (`allowBuilds`).
- **Peer dependency warnings from `pnpm install`:** `react-reconciler` (via the testing library) and
  `@react-native/metro-config` are transitive and pinned by Expo SDK 57; nothing to act on today.
