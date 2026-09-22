# ROAM — Development guide

This guide describes the repository **as it is today**: a pnpm monorepo containing the mobile app
only. `apps/web`, `apps/api` and `packages/*` (see `04_TECH_STACK.md`) do not exist yet.

**Prototype status (2026-09-22):** the mobile **onboarding is implemented on the front end**, from the splash to a placeholder
home (routes below). **Authentication** entry (`/auth`), login, register, forgot password and its reset-code step are
implemented; the sub-flow continues with a new-password screen, still a placeholder, built one screen per session
(`docs/SCREEN_INTEGRATION_WORKFLOW.md`). There is **no backend, no database and no API**: nothing is sent or stored, and
every answer/interaction is local state or a simulated delay used for the prototype only (`DECISIONS.md` D-28, D-29, D-31
to D-34).

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
    ├── app/                 # Expo Router routes ONLY, kept thin (/, /welcome, /onboarding/*, /home, /auth/*)
    ├── components/
    │   ├── ui/              # Text, Button, Chip, Screen, FadeInUp, TextField (design-system primitives)
    │   └── brand/           # Logo (light / dark / icon variants)
    ├── features/            # One folder per feature (empty until its sprint)
    │   ├── splash/          # In-app splash screen (route /) + its measured layout
    │   ├── onboarding/      # Onboarding: the 8 screens, onboardingFlow.ts (routes, order), profileCreation.ts (simulation)
    │   ├── home/            # Placeholder of the home screen (end of the onboarding)
    │   ├── auth/            # Authentication: AuthEntryScreen, Login/Register/ForgotPassword/ResetCodeScreen (built); AuthPlaceholder stands in for the rest
    │   └── recommendations, experiences, itinerary, map,
    │       outing, feedback, profile, favorites
    ├── hooks/               # Cross-feature hooks (useBootstrap, useReduceMotion)
    ├── i18n/                # i18next setup + locales/fr.json, locales/en.json
    ├── lib/                 # Small framework-agnostic helpers (storage, cx)
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
| —    | `/home`                                                       | Home (placeholder)  | End of the journey                                                               |

The order and the routes live in `features/onboarding/onboardingFlow.ts`. "Passer" jumps to `ready`; "Commencer" and the
profile creation use `router.replace`. Details: `DECISIONS.md` D-19 to D-28.

## Authentication (current state)

Built one screen per session (`docs/SCREEN_INTEGRATION_WORKFLOW.md`); front-end only, no backend (`DECISIONS.md` D-28, D-29, D-31 to D-34).

| Route                   | Screen          | Notes                                                                            |
| ----------------------- | --------------- | -------------------------------------------------------------------------------- |
| `/auth`                 | Entry           | "Se connecter", "Créer un compte", simulated Google/Apple buttons (loading only) |
| `/auth/login`           | Login           | Email/password form, local validation; any valid input "succeeds" → `/home`      |
| `/auth/register`        | Register        | First name/email/password/confirm + live checklist; same "succeeds" → `/home`    |
| `/auth/forgot-password` | Forgot password | Email step; sends to the reset-code screen (mockup tile 5)                       |
| `/auth/reset-code`      | Reset code      | 6-digit `OtpInput`; any complete code "succeeds" → `/auth/new-password`          |
| `/auth/new-password`    | New password    | **Placeholder** (`AuthPlaceholder`) — not built yet                              |

Reached from `WelcomeScreen`'s "Se connecter" link (`t('welcome.signIn')`, `router.push('/auth')`). Shared
pieces in `features/auth/components/`: `AuthTopBar` (back + small wordmark), `OrDivider`, `SocialButtons`,
`AuthFooterLink`, `PasswordRequirements` (Register's live checklist), `OtpInput` (Reset code's 6-digit
entry). Generic form field: `components/ui/TextField`.

## Conventions

### Routes and screens

- Files in `src/app/` only declare routes and render a screen from `src/features/<feature>/`.
- Business logic stays out of components; UI never calls `fetch` (see _Data access_).
- Before building a screen: read its section in `03_UX_SCREENS_AND_FLOWS.md`, list its states
  (loading / empty / error / success), its translation keys and the theme tokens it uses.

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
