# ROAM — Technical decisions

Log of architectural decisions that the product documentation did not settle
(see `00_AGENT_INSTRUCTIONS.md`: "choose the simplest reversible option and document it").
Numbered in the order they were taken. A decision can be revisited: add a new entry that supersedes it.

## Mobile initialisation (2026-09-21)

### D-01 — pnpm monorepo, mobile package named `@roam/mobile`

`04_TECH_STACK.md` proposes `apps/*` + `packages/*`. Only `apps/mobile` exists; `pnpm-workspace.yaml`
already declares `apps/*` and `packages/*` so web/api/shared packages can be added without moving
anything. `pnpm --filter mobile …` works (pnpm matches the scoped name).
**Reversible:** yes.

### D-02 — Expo SDK 57 (latest stable), React Native 0.86, React 19.2

Latest stable Expo SDK at the time. Versions are pinned by `expo install` to what the SDK supports.
Typed routes are enabled (`experiments.typedRoutes`).

### D-03 — NativeWind 4.2.7 + Tailwind CSS 3.4, not NativeWind 5

NativeWind 5 is still a release candidate (`5.0.0-rc.0`, Tailwind 4). The requirement is a stable
release: NativeWind `latest` (4.2.7) with Tailwind 3.4. Migrating to v5 once stable is a dedicated task.
`react-native-css-interop` is a direct dependency because pnpm's strict resolution requires it for
NativeWind's JSX runtime; keep it on the same version as NativeWind.

### D-04 — Semantic tokens as CSS variables, real dark palette

Conflict/gap: `05_THEME_AND_I18N.md` asks for semantic tokens and a genuine dark theme;
`06_DESIGN_SYSTEM.md` lists only the light palette.

- Hex values exist only in `src/theme/palette.ts` and `src/theme/tokens.ts`.
- Tailwind colors are `rgb(var(--color-<token>) / <alpha-value>)`; `ThemeProvider` injects the
  variables (NativeWind `vars()`), so `bg-background` works in both themes and supports `/opacity`.
- Dark palette (near-black green, warm off-white text, lighter forest as primary) is designed, not
  inverted. Tests enforce WCAG AA contrast for text, secondary text, primary and status colors in
  both themes.
- **Stone `#747873` is not used as-is for `textSecondary` in light mode:** it is ~4.0:1 on Cream,
  below AA. A darker `#666A65` is used instead ("accessibility and contrast take priority over exact
  brand colors", `05_THEME_AND_I18N.md`). Stone remains in the palette.
- `overlay` is a base color meant to be used with opacity (`bg-overlay/40`).
- `accent` (Peach) is a background/decoration color: there is no `accentForeground` token, so do not
  put text directly on it in dark mode yet.

### D-05 — Light / Dark / System handled by our own provider

`ThemeProvider` resolves the preference (`system` follows the OS), persists it under `roam.theme`
(AsyncStorage) and calls `Appearance.setColorScheme` so native chrome matches. The persisted value
and the language are loaded **before** the first screen (`useBootstrap`, splash held) to avoid a flash
of the wrong theme/language.

### D-06 — Typography: documented fonts, mobile scale

`06_DESIGN_SYSTEM.md` proposes Plus Jakarta Sans (headings) and Inter (body) and calls them an
"initial proposal". They are used as documented, loaded through `@expo-google-fonts/*` (no font file
is committed), one weight per role: Plus Jakarta Sans 600/700, Inter 400/500/600. Swapping a font
touches only `src/theme/fonts.ts` and `src/theme/typography.ts`. Each weight is imported from its own
entry point — the package root would bundle every weight and italic.

The documented scale is desktop-oriented; mobile uses one step down for large sizes: Display 40/44,
H1 32/38, H2 28/34, H3 24/30, H4 20/26; Body Large 18/28, Body 16/24, Small 14/20, Caption 12/16
keep the documented values.

### D-07 — Moti on Reanimated 4

Moti 0.30 with `react-native-reanimated` 4.5 and `react-native-worklets` 0.10 (versions required by
SDK 57). `FadeInUp` (fade + 12 px translateY, 500 ms) is the only animation for now.
Moti's entry point references React Native's deprecated `SafeAreaView`, which triggers a dev warning
even though it is unused; `src/lib/knownWarnings.ts` hides it in LogBox (and `jest.setup.ts` in tests).
Remove both once Moti drops the reference.

### D-08 — i18n: i18next + react-i18next, resources next to the mobile app

- The provided `fr.json` / `en.json` (at the repository root, referenced as `locales/*.json` in the
  old README) moved to `apps/mobile/src/i18n/locales/`. They become `packages/i18n` when the web app
  needs them.
- Single-brace interpolation (`{count}`) is configured to match the provided files.
- Keys are type-checked against `fr.json`; a test checks FR/EN key parity.
- French is the default; the device language is deliberately **not** auto-detected (the docs say the
  default is French). Adding detection later is a one-line change plus `expo-localization`.
- Keys added during initialisation: `brand.*` and `foundation.*` (temporary, with the foundation screen).

### D-09 — Repository pattern with a mock implementation

`Screen → hook/service → Repository → mock`. Only `CategoryRepository`, `PlaceRepository` and
`ExperienceRepository` exist, with a tiny fixture set, to prove the pattern; each feature adds its own
repository. No data-fetching library (e.g. TanStack Query) yet — decide when the first real async
screen (recommendations) is built.
Entity content (place names, descriptions) is plain strings in the mock; how backend content is
localized is an open question for the API design.

### D-10 — Types are minimal and mirror i18n keys

`Mood`, `BudgetRange`, `DurationOption`, `Company`, `FeedbackRating` and `FeedbackReason` use the same
values as the i18n keys (`context.mood.calm`, `feedback.tooFar`, …). Opening hours, ratings, reviews
and the `ExperiencePlace` join entity from `04_TECH_STACK.md` are intentionally left out until their
features are implemented (`Experience.placeIds` covers the ordering for now).

### D-11 — Tests: Jest (jest-expo) + React Native Testing Library 14

`04_TECH_STACK.md` left "Vitest/Jest" open; `jest-expo` is Expo's supported path. RNTL 14 is
asynchronous (`await render`, `await fireEvent`). Moti/NativeWind/css-interop are added to Jest's
`transformIgnorePatterns` (untranspiled ESM); Reanimated and Worklets use their official mocks.

### D-12 — ESLint 9 (not 10)

`eslint-config-expo` 57 pulls `eslint-plugin-react` and `eslint-plugin-import`, whose peer ranges stop
at ESLint 9. ESLint 9 is used until they support 10.

### D-13 — Mobile only, no web dependencies

`platforms` is `["ios", "android"]`; `react-native-web` / `react-dom` from the Expo template were
removed. `apps/web` will be its own project.

### D-14 — Docs moved under `docs/`

The handoff documents (`00`–`08`, README) moved from the repository root into `docs/`, matching the
target layout in `04_TECH_STACK.md`. `docs/0*.md` are excluded from Prettier so the hand-written
documents are not reformatted.

### D-15 — Logo and icons are placeholders

No official logo asset existed. A neutral ring-and-dot mark was generated for the app icon, splash and
in-app logo (light / dark / icon variants), with fixed file names so the official files can be dropped
in (see `apps/mobile/assets/images/logo/README.md`). Native config (`app.json`) holds the splash and
adaptive-icon colors as hex because it cannot read theme tokens.

### D-16 — Not done on purpose

Environment variables, CI, bundle identifiers (`ios.bundleIdentifier` / `android.package`), EAS
configuration, map provider choice, bottom-tab navigation. They belong to later sprints or need
product decisions.
