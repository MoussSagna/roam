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
- Keys added: `brand.*` and `splash.*`. (The temporary `foundation.*` keys were removed with the
  foundation screen — see D-18.)

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

### D-15 — Logo and icons (superseded in part by D-17)

No official logo asset existed. A neutral ring-and-dot mark was generated for the app icon, splash and
in-app logo (light / dark / icon variants), with fixed file names so the official files can be dropped
in (see `apps/mobile/assets/images/logo/README.md`). Native config (`app.json`) holds the splash and
adaptive-icon colors as hex because it cannot read theme tokens.

### D-16 — Not done on purpose

Environment variables, CI, bundle identifiers (`ios.bundleIdentifier` / `android.package`), EAS
configuration, map provider choice, bottom-tab navigation. They belong to later sprints or need
product decisions.

## Splash screen (2026-09-21)

### D-17 — Logo assets and native splash

The official logo (`logo-light`, `logo-dark`, `logo-icon`, 1254×1254, real alpha) replaced the
placeholders; the wordmark (`roam-wordmark-light.png`, white on transparency, tinted at runtime) and
`splash-background.png` were added. Roles are listed in `apps/mobile/assets/images/logo/README.md`.

- **Native splash** (`app.json`): `logo-light.png` on Cream / `logo-dark.png` on `#0F1411`, width 200.
  It is deliberately separate from the in-app splash screen: the OS shows it while the JS loads.
- **App icon and Android adaptive icon were NOT migrated.** No provided file has the required format
  (opaque 1024×1024 square; transparent 1024×1024 foreground with a safe zone). The `app-icon-*` and
  `android-*` files of the supplied zip are blurry, geometrically distorted extractions of a mockup
  screenshot, and `splash-logo-*` from the same zip is distorted too — none of them is used.
  The old ring-and-dot `icon.png` / `android-icon-*.png` remain until proper exports exist.
- The old `splash-icon*.png` placeholders were deleted (no longer referenced).

### D-18 — In-app splash screen reproduces the design mockup

`src/features/splash/` (route `/`). Layout numbers were measured on the mockup (941 × 1672) and live in
`splashLayout.ts`; sizes follow the screen width, the two content groups are anchored on the height.
Choices that go beyond the mockup or differ from it:

- **Serif headline:** "Explorer. Ressentir. Sortir." is set in Newsreader 400 (`@expo-google-fonts/newsreader`,
  one weight). It matched the mockup's letter widths best among the serif candidates compared
  (Newsreader, Source Serif 4, Lora, Crimson Pro, Literata, Fraunces, Instrument Serif, DM Serif).
  This third family is an exception to D-06, justified by the mockup.
- **Logo colorway differs from the mockup.** The mockup shows a cream "R"; the only crisp asset that
  reads on the photo is `logo-dark.png` (mint). No cream variant exists yet. The mark's proportions also
  differ slightly (the mockup's R is narrower and taller), so it is scaled to the same area without
  distortion (216 × 238 px vs 199 × 252 px at mockup size).
- **Wordmark** is the supplied raster asset (its "A" has a small crossbar stub the mockup's does not).
- **Photo veil:** flat overlay of the dark theme background at 34 % opacity — the best flat fit (mean
  error ≈ 10/255 against the mockup). The mockup's veil is not uniform (more contrast); reproducing it
  needs a gradient/shader.
- **Small texts have a 10 pt floor.** Scaled proportionally, the tagline and the bottom lines would be
  6–8 pt on a 390 pt phone. No effect at mockup scale. Constant: `MIN_SMALL_TEXT` in `splashLayout.ts`.
- **Text colors are fixed** (Cream / Sage from the palette) because the photo is dark in both themes.
- **Behavior not shown in the mockup:** staggered fade-in with a small translate (Moti, `FadeInUp`,
  ~1.6 s in total), then `router.replace('/welcome')` after 2.6 s (documented flow: unauthenticated →
  Welcome; there is no session yet). The photo fades in over the theme background, so the native →
  in-app transition is continuous in dark mode.
- **The temporary foundation screen was removed** (documented as "replaced by Splash"): `/` is now the
  splash. Theme and language switching are covered by unit tests until the Settings screen exists.
