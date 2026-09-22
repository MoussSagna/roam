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
  below AA ("accessibility and contrast take priority over exact brand colors",
  `05_THEME_AND_I18N.md`). Stone remains in the palette. The light `textSecondary` is now the slate
  measured on the onboarding mockups — see D-19.
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

## Onboarding (2026-09-21)

### D-19 — Onboarding 1 "Bienvenue sur ROAM" (design mockup "Home Onboarding")

The mockup board has 8 tiles: splash (unchanged), then **7 screens to build**: Bienvenue, Humeur,
Temps, Budget, Localisation, Centres d'intérêt and the final "Prêt à explorer ?". The brief's list
counted the welcome tile twice; the journey is `welcome → mood → time → budget → location → interests
→ ready` (`features/onboarding/onboardingFlow.ts`). (Written when only the welcome screen existed: all of
them are built now, plus the profile-creation simulation of D-27 — see D-28 for the current state.)

**Design tokens changed to match the mockup** (light theme only; the dark theme is untouched):

| Token / value   | Before           | Now                            | Why                                   |
| --------------- | ---------------- | ------------------------------ | ------------------------------------- |
| `primary`       | Forest `#3F624E` | `derived.forestDeep` `#1A3E30` | Buttons/selected states in the mockup |
| `text`          | Ink `#171B18`    | `derived.inkDeep` `#060A0E`    | Headings are near-black in the mockup |
| `textSecondary` | `#666A65`        | `derived.slate` `#454F5B`      | Subtitles are slate; contrast > 8:1   |

Forest and Ink stay in the palette (the splash uses them directly). Contrast tests still enforce AA.

**Other choices:**

- **Type.** Titles use Newsreader **SemiBold** (same family as the splash headline; it was the closest of
  14 serif candidates compared with the mockup). The handwritten line uses **Mrs Saint Delafield**
  (`@expo-google-fonts/mrs-saint-delafield`), chosen among 14 script candidates. New text variant `cta`
  (Inter Regular 19/26) for the button label. Two more font families, both required by the mockup.
- **Icons: `lucide-react-native` + `react-native-svg`.** The mockup uses thin outline icons and the 7 screens
  need ~20 of them (binoculars, landmark, clock, gift, euro, martini…); Lucide has them all. **Import one
  icon per file** (`lucide-react-native/icons/arrow-right`): the package root would bundle ~1 600 icons
  (bundle +0.2 MB with per-icon imports). Jest needs `lucide-react-native` in its ESM list and a `.mjs`
  transform (see `jest.config.js`).
- **`Button` follows the mockup:** 64 pt high, 20 px radius (not a pill), Inter Regular label, optional
  `trailingIcon`. It was only used by the previous placeholder screen and tests.
- **Photo collage is built from cards, not one image.** Four cards (street at sunset, café terrace, lake,
  and a sliver cut by the left edge) with white frame, rotation and shadow. Sizes follow a `scale` that
  shrinks on short screens (down to 0.6 at 375 × 667); the two outer cards stay glued to their screen edge
  and the two central cards to the screen center, so the overlap is identical on every width.
- **The four photos are TEMPORARY, low-resolution crops taken from the mockup** (un-rotated, frame removed,
  one corner reconstructed). The original photos were not available. Replace
  `assets/images/onboarding/welcome-*.png` keeping the names (see the README in that folder).
- **Pagination.** The welcome tile showed 4 round dots; the other tiles show segmented bars with an
  inconsistent count (the mockup is not consistent). The round dots (`PageDots`) were **removed from the
  welcome screen on purpose** and the component deleted (D-28); the welcome screen has no pagination.
  The question screens use `ProgressBars`.
- **Navigation.** "Suivant" pushes the next step and "Passer" replaces the route with the final `ready`
  screen (the mockup does not show it). The `/onboarding/*` routes were missing at first, so both buttons
  landed on "Unmatched Route"; fixed in D-20.
- **Status bar and home indicator** are drawn by the OS, not by the app. Content is offset by the safe-area
  insets; the mockup's 47 pt top / 34 pt bottom insets were emulated when comparing.
- The welcome copy lives in `onboarding.welcome.*` (and `common.next`). The older `welcome.*` keys from the
  original documentation files are no longer used by any screen.

### D-20 — Onboarding routes exist as placeholders (fix "Unmatched Route")

**Cause.** `onboardingFlow.ts` pushes `/onboarding/mood` ("Suivant") and replaces with `/onboarding/ready`
("Passer"), but `src/app/` only had `index.tsx` and `welcome.tsx`: no file matched those paths. The
`as Href` cast hid it from the typed routes, and the component tests mock `useRouter`, so nothing checked
that a route file existed.

**Fix.** `src/app/onboarding/{mood,time,budget,location,interests,ready}.tsx` exist and render
`OnboardingPlaceholder` ("Écran à venir", step N of 7, Next, Back). They are stand-ins, not designs:
replace the body of each route file with the real screen when it is built (the route path does not change).
`onboardingRoutes.test.tsx` mounts the real `src/app` tree with `expo-router/testing-library` (only the root
layout is swapped for one without font loading) and checks splash → welcome → "Suivant" / "Passer", the
back button, the whole journey and that every entry of `ROUTES` resolves. Add a route file whenever a step
is added to `ONBOARDING_STEPS`, or that test fails.
**Reversible:** yes.

### D-21 — Onboarding 2 "Quelle est ton humeur aujourd'hui ?" (route `/onboarding/mood`)

`MoodScreen` replaces the placeholder of `app/onboarding/mood.tsx`. Measured on the mockup (third tile), checked
by side-by-side and blended captures at 390 × 844 and re-checked at 375 × 667, 375 × 812 and 430 × 932.

- **Single choice, "Curieux" selected by default** (the mockup shows it selected with an enabled "Suivant"). Tiles are
  `radio`s in a `radiogroup`. The choice is local state for now: nothing stores it yet (a shared onboarding store is
  needed when the recommendations use it). Selection scales the tile by 1.03, the documented selection motion.
- **Grid 3 × 3**, tiles about 112 × 119 pt, radius 20. Unselected tiles are `text` at 5 % opacity; Festif and Romantique
  are `accent` (peach) at 28 %; the selected one is `primary`. No new color token: only three decorative icon colors
  were added (`moodAccents` in `theme/tokens.ts`, light and dark) for Détendu, Festif and Romantique.
- **Fitting.** Tiles keep the mockup ratio and shrink down to 80 pt on short screens (the grid sits between the header and
  the footer, free space split 1:2 above/below like the mockup). The title font follows the screen width (28 pt max, 26 pt
  at 375) so that "ton humeur aujourd'hui ?" never wraps onto a third line.
- **Type.** Title Newsreader SemiBold 28/35 (same family as the welcome), subtitle Inter 15/24 capped at 325 pt so it breaks
  after "correspondent", tile label Inter 14.5.
- **Icons (Lucide)**: binoculars, leaf, sparkles, landmark, heart, user, users, users-round. Two compromises: Lucide has no
  running figure (`person-standing` stands still), so `RunnerIcon` draws one with `react-native-svg` (path of Tabler's
  MIT "run" icon); and no Lucide glyph shows an adult with a child, so "En famille" uses `users-round`.
- **Progress.** `ProgressBars` (segmented, 5 bars, current one longer): mood, time, budget, location, interests. The mockup's
  bar counts are inconsistent from tile to tile (see D-19), so the position follows the journey.
- **No visible "Retour"** — the mockup has none; going back is the native gesture / hardware button of the stack.
- **Navigation** unchanged: "Suivant" → `/onboarding/time` (placeholder), "Passer" → `/onboarding/ready`.

### D-22 — Onboarding 3 "Combien de temps as-tu ?" (route `/onboarding/time`)

`TimeScreen` replaces the placeholder of `app/onboarding/time.tsx`; measured on the fourth mockup tile and checked by
side-by-side and blended captures (390 × 851, the tile's own ratio), then re-checked at 375 × 667, 390 × 844 and 430 × 932.

- **Single choice, "1 à 2 h" selected by default** (as on the mockup). Four rows (Moins d'1 h, 1 à 2 h, 2 à 4 h, Plus de 4 h)
  exposed as `radio`s. Local state only, like D-21. The mockup's clock glyph is drawn by Lucide `clock`.
- **`ChoiceRow`** (icon + label, full width, 76 pt, radius 16, 1 px `border`, no fill; selected = `primary`) is the row the budget
  screen will reuse. Selection scales it by 1.02 (1.03 would push a full-width row too far).
- **Fitting.** Rows shrink down to 58 pt (icon with them) on short screens; the subtitle font follows the width (17 pt max, 16 pt at 375) because its longer line is 312 pt wide.
- **Type.** Title Newsreader SemiBold 33/40 (bigger than the mood title, as on the mockup), subtitle Inter 17/26 with an
  explicit line break after "suggestions", labels Inter 17.5.
- **Progress:** second of five bars. Navigation unchanged: "Suivant" → `/onboarding/budget` (placeholder), "Passer" → `ready`.

### D-23 — Onboarding 4 "Quel est ton budget ?" (route `/onboarding/budget`)

`BudgetScreen` replaces the placeholder of `app/onboarding/budget.tsx`; measured on the fifth mockup tile, compared side by side and
blended at 390 × 842, then re-checked at 375 × 667, 390 × 844 and 430 × 932.

- **Five rows** (Gratuit, Moins de 10, 10 – 30, 30 – 50, Plus de 50), single choice, "Moins de 10" selected by default as on the
  mockup. Local state only (see D-21). **One "€" per priced row**, in the leading slot under the gift of "Gratuit": the mockup's
  "€ … €€€€" scale and the "€" in the labels were dropped so the unit is never shown twice on a line. The spoken name of a row
  still adds the unit ("10 – 30 €"). These ranges belong to the onboarding; the home context flow keeps its own `context.budget.*` keys.
- **`ChoiceRow` extended** (used by D-22): `labelSize` and `accessibilityLabel`. The gift is a Lucide icon, the "€" is `EuroGlyph`
  (Inter SemiBold, shaped like an icon so it centers under the gift).
- **Progress:** third of five bars. The mockup draws four here (see D-19); the journey has five questions, so five are kept.
- Replaced the unused original `onboarding.budget.*` keys ("budget habituel"). Navigation unchanged: "Suivant" →
  `/onboarding/location` (placeholder), "Passer" → `ready`.

### D-24 — Onboarding 5 "Où souhaites-tu sortir ?" (route `/onboarding/location`)

`LocationScreen` replaces the placeholder of `app/onboarding/location.tsx`; measured on the sixth mockup tile, compared side by side and
blended at 390 × 839, then re-checked at 375 × 667, 375 × 812, 390 × 844 and 430 × 932.

- **Three choices** (Ma position actuelle, Choisir une ville, Autour de moi), single choice, "Ma position actuelle" selected by default as
  on the mockup. **Nothing asks for the position or opens a city search yet**: the choice is local state (see D-21). When it does, a denied
  permission must not block the user (`03_UX_SCREENS_AND_FLOWS.md`: manual area selection). Lucide icons: navigation, search, locate-fixed
  (closest to the mockup's dial).
- **`ChoiceRow` extended** (used by D-22, D-23): `slotWidth` and `paddingLeft` align the label of smaller icons (38 pt icon in a 50 pt slot).
- **The map is an illustration** (`MapPreview`, `react-native-svg`, 345 × 256 design grid): streets, parks, a "you are here" marker with halos
  and a card with the city. No map asset was provided and no map library is installed (D-13: nothing added). "Paris / France" is **sample
  content** (`onboarding.location.previewCity/previewCountry`), and the whole preview is hidden from assistive technologies. A real map
  (and the real city) replaces it once positioning exists. Colors are `mapColors` in `theme/tokens.ts` (light and dark).
- **Fitting.** The map gives way first (down to 110 pt), then the rows (72 → 56 pt). Below a map height of 170 pt the city card is left out
  because it would cover the marker (375 × 667). The title (29 pt max, 27 pt at 375) follows the width so it stays on one line.
- **Progress:** fourth of five bars (the mockup draws four with the second lit, see D-19). Navigation unchanged: "Suivant" →
  `/onboarding/interests` (placeholder), "Passer" → `ready`.

### D-25 — Onboarding 6 "Qu'est-ce qui t'intéresse ?" (route `/onboarding/interests`)

`InterestsScreen` replaces the placeholder of `app/onboarding/interests.tsx`; measured on the seventh mockup tile, compared side by side
and blended at 390 × 835, then re-checked at 375 × 667, 390 × 844 and 430 × 932.

- **Multiple choice** (the subtitle says "Sélectionne tes centres d'intérêt"): tiles are `checkbox`es, several can be selected or
  unselected, "Culture" is selected by default as on the mockup. `03_UX_SCREENS_AND_FLOWS.md` recommends at least 3, so the original
  "at least 3" copy was replaced by the mockup's, and **"Suivant" is never blocked** (a recommendation is not a rule). Local state only
  (see D-21). The unused original keys `eyebrow`, `selected`, `addInterest…` were left in place.
- **Grid 2 × 4**, tiles about 166 × 100 pt, radius 16, 1 px `border`, no fill; selected = `primary`, scaled by 1.03.
- **`InterestTile`** keeps an icon box of fixed size and lets `iconScale` draw a glyph larger inside it, so labels stay aligned. Lucide icons:
  landmark, utensils, martini, tree-deciduous, shopping-bag, calendar-days. `RunnerIcon` (D-21) is reused for Activités and a new
  `LotusIcon` (drawn on Lucide's grid, no Lucide equivalent) is used for Bien-être. The mockup's tree and calendar are only approximated.
- **Fitting.** Tiles shrink from ~100 pt down to 64 pt (icons with them); the title (29 pt max, 27 pt at 375) follows the width so it stays on
  one line. Subtitle Inter 18.5 with an explicit break after "intérêt".
- **Progress:** fifth (last) of five bars. Navigation unchanged: "Suivant" → `/onboarding/ready` (placeholder, the last screen to build),
  "Passer" → `ready`.

### D-26 — Onboarding 7 "Prêt à explorer ?" (route `/onboarding/ready`) and the end of the journey

`ReadyScreen` replaces the last placeholder of `app/onboarding/ready.tsx`; measured on the eighth mockup tile, compared side by side and
blended at 390 × 843, then re-checked at 375 × 667, 390 × 844 and 430 × 932. `OnboardingPlaceholder` and its `onboarding.placeholder.*`
keys were removed (nothing uses them any more, see D-20).

- **Full-bleed photo, colors independent of the theme.** The text sits on the sky, so the title and subtitle use Ink directly (like the
  splash uses palette colors) and the status bar is forced light. The photo is **TEMPORARY**: the original was not available, so
  `assets/images/onboarding/ready-background.jpg` is a crop of the mockup from which the title, subtitle, handwritten line, button and
  status bar were erased by interpolation (see the README of that folder). It is low resolution (about 0.7 px per pt of the mockup
  upscaled): replace it with the original, keeping the name. Displayed with `cover`, centered.
- **Type.** Title Newsreader SemiBold 44/56 on two lines, subtitle Inter 18/26 on three lines (explicit breaks), handwritten line Mrs Saint
  Delafield 27, rotated -9° above the button (same script as the welcome, D-19).
- **Button.** "Commencer" is 83 pt high (as measured; the other buttons are 64) with a 1.5 pt white outline on `forestDeep`, and
  sits 9 pt above the usual footer position. There is no "Passer" and no progress indicator on this screen, as on the mockup.
- **End of the journey:** "Commencer" **replaces** the route with `/home` (`HOME_ROUTE` in `onboardingFlow.ts`), so back does not return
  to the onboarding. `/home` is a **placeholder** (`features/home/HomeScreen`: the home headline and "Cet écran arrive bientôt.");
  replace its body with the real screen. **Nothing remembers that the onboarding was completed** — the splash still always goes to the
  welcome (no session or storage yet, D-18): a "seen onboarding" flag belongs with the authentication work.
- **Not covered by the mockup and not done here:** saving the answers of the questions (mood, time, budget, location, interests), which are
  local state on each screen (D-21 to D-25).

### D-27 — Onboarding "Profile creation": animated simulation between the interests and "Prêt à explorer ?"

New step `profile`, route **`/onboarding/profile-creation`**. The journey is now
`welcome → mood → time → budget → location → interests → profile → ready → app`; "Suivant" on the interests screen goes to
`profile`, and "Passer" still jumps to `ready` (there is nothing to build when the questions are skipped). Screen
`ProfileCreationScreen`, mockup provided as an image (not part of the original 8 tiles).

- **It is a simulation, not a profile.** No backend, no request, no storage, no repository: `features/onboarding/profileCreation.ts`
  is a front-end timeline (`useProfileCreation`) that only drives animations and then calls the navigation. The answers of the
  previous screens are local state (D-21 to D-25) and are **not** read: nothing is saved. The real profile belongs with the backend work.
- **Timeline (ms):** 0 intro (logo fades in, scale 0.85 → 1, rise 12 → 0; six chips appear staggered) · 2000 the loader ring starts (0 → 22 %) and
  the chips drift · 4000 "Analyse de tes réponses" · 6000 "Sélection de recommandations" · 8000 "Préparation de ton expérience" (ring 97 %) ·
  9500 "Ton profil est prêt", ring 100 %, logo scale 1 → 1.03 → 1 · 10000 fade out (opacity → 0, rise -10) · **10300 `router.replace` to `ready`**
  (the whole sequence is a little over 10 s: 500 ms of rest, then 300 ms of fade). The script line "De belles découvertes t'attendent…" appears at 8000.
- **Navigation.** `replace`, so the loader is not in the history: back from `ready` goes to the interests. Both this route and `ready`
  set `animation: 'fade'` in their `Stack.Screen` options (native transition, no new library); `ready` keeps its own entry animation and its design.
  The screen has no button; the back gesture stays enabled, and leaving clears every timer, so coming back restarts a fresh sequence.
  A guard prevents a second navigation.
- **Animation.** Moti for opacity / scale / translate / rotate (chips: staggered entry, slow 24° drift with counter-rotation so the icons stay upright,
  a soft 1.07 pulse); the ring and its head dot use Reanimated (`useAnimatedProps` on `react-native-svg` circles), the layer Moti is built on. No new animation
  library, no animation on the large illustration. **Reduced motion** (`useReduceMotion`, OS setting): no rise, scale, rotation or loop; fades and the ring remain.
- **Reused:** `Logo`, `Text`, theme tokens and `moodAccents`, `RunnerIcon`, `useOnboardingNavigation`. **New:** `ProfileOrbit`, `ProfileChecklist`,
  `ProfileScene`, `useReduceMotion`. Chips: pin (place), heart (mood), clock (time), euro (budget), sparkles (interests), runner (activity).
- **The landscape is TEMPORARY** (`assets/images/onboarding/profile-landscape.jpg`, a 2× crop of the mockup with the handwritten line and bar erased;
  README in that folder) and does not follow the dark theme (it is dimmed). Copy is in `onboarding.profile.*` (FR and EN).
- **Tests:** timeline (stages, single `onFinish`, timers cleared, no double start, restart), screen (no button, one navigation, early exit), and the real route
  tree (interests → profile → ready by itself, back to the interests).

### D-28 — Mobile onboarding is complete (front-end); next step: authentication, front-end only

**State at the end of the onboarding sprint (2026-09-22).** The onboarding runs end to end in the mobile app:

`/` (splash) → `/welcome` → `/onboarding/mood` → `/time` → `/budget` → `/location` → `/interests` → **`/onboarding/profile-creation`**
(animated simulation of about 10 s, moves on by itself) → `/onboarding/ready` ("Prêt à explorer ?") → `/home` (placeholder).

- **Buttons and navigation work to the end of the journey:** "Suivant" on each question, "Passer" (jumps to `ready`), the profile creation moving on
  by itself, "Commencer" entering the app (`replace`, so back does not return to the onboarding). Every route has a screen and a test
  walks the real route tree (`onboardingRoutes.test.tsx`).
- **No backend, no database, no API.** Nothing is sent or stored. The answers (mood, time, budget, location, interests) are **local state of each
  screen, used for the prototype only**; the profile creation is a front-end simulation (D-27) and does not read them. The splash still always
  goes to the welcome (there is no session, nothing remembers that the onboarding was seen).
- **Animations use Moti** (on Reanimated 4); only the loader ring of the profile creation uses Reanimated directly. Reduced motion is honored by the profile creation.
- **`PageDots` was removed from `WelcomeScreen` on purpose** by the product owner. Do not put it back; the component file was deleted (no other screen used it).
- **Temporary assets:** the welcome photos, `ready-background.jpg` and `profile-landscape.jpg` are crops of the mockups (README in `assets/images/onboarding/`).
- `/home` is a placeholder (`features/home/HomeScreen`).

**Next step: AUTHENTICATION — FRONT-END ONLY.** Screens to build: **Login**, **Register (sign up)**, **Forgot password**, and the states they need
(validation errors, loading, success, "email sent"…). The forms and interactions are **simulated on the front end**, as for the prototype. Still **no**
backend, API, database, Prisma, real authentication, JWT or session: they come **later**, once all the front-end screens are done (`08_AGENT_TODO.md`
Phase C). Do not add any of them while building these screens, and keep form logic behind a small interface so a real implementation can replace the
simulation (see _Data access_ in `DEVELOPMENT.md`). The auth screens go in `src/features/auth/` (empty folder today).

## Authentication (2026-09-22)

### D-29 — Authentication 1 "Écran d'entrée" (route `/auth`) and the screen-by-screen workflow

`AuthEntryScreen` (`src/features/auth/`), route `/auth`. Sprint 2 works one authentication screen at a time,
each one stopping for human validation before the next; the procedure is now written down in
`docs/SCREEN_INTEGRATION_WORKFLOW.md` so it doesn't have to be re-derived every session. Measured on tile 1
of the design mockup board ("Authentification").

- **No clean photo asset existed at first.** Only a flattened mockup board (all 10 tiles in one image) was
  provided, with "ROAM" and the tagline baked into the Eiffel Tower photo, and no inpainting tool was
  available in this environment to erase them (unlike `ready-background.jpg` / `profile-landscape.jpg`,
  D-26/D-27). The screen was built to draw its **own** "ROAM" + tagline on top in code (Newsreader SemiBold
  42 px, cream; `t('auth.entry.tagline')`) rather than baking French/English text into an image
  (`00_AGENT_INSTRUCTIONS.md` rule 9), over a temporary cropped/upscaled placeholder photo. **Superseded the
  same day:** a clean official photo (Paris from Montmartre, no baked text) replaced the placeholder — see
  D-30.
- **Layout is two flex children, not absolute positioning.** A photo section (`flex: 1`, takes whatever
  space is left) above a card section (`bg-surface`, intrinsic height, `rounded-t-hero`), matching the
  mockup's proportions (photo ≈ 48% of the screen at the reference size) without hard-coding either height;
  on a short screen the photo simply gives way first, the same pattern as the onboarding's `MapPreview`
  (D-24).
- **Google / Apple have no Lucide glyph** (brand logos aren't part of an outline icon set). `GoogleIcon`
  (official 4-color "G", fixed colors) and `AppleIcon` (single path, follows `colors.text`) are drawn with
  `react-native-svg` in `src/features/auth/components/`, the same pattern as `RunnerIcon`/`LotusIcon`
  (D-21/D-25).
- **`Button` gained `leadingIcon` (`ReactNode`) and `loading` (spinner, disables press).** Both are optional
  and additive — every existing call site is unchanged. `loading` is the generic implementation of "buttons
  can simulate a request" (`08_AGENT_TODO.md`/the sprint brief): Google/Apple set it for ~900 ms on press,
  then reset. There is nothing to navigate to afterwards yet (no backend, and the mockup's post-auth screens
  — "Bienvenue sur ROAM", location permission, "Tout est prêt" — are not built), so the button just returns
  to normal; wiring a destination is for when those screens exist.
- **"Se connecter" / "Créer un compte" needed somewhere to land.** `src/app/auth/login.tsx` and
  `register.tsx` are placeholder routes rendering a small new `AuthPlaceholder` (title + back button),
  exactly the role `OnboardingPlaceholder` played before the onboarding screens existed (D-20) — not a
  preview of the Login/Register screens, just infrastructure so navigation doesn't hit "Unmatched Route".
  Replace their body, not their route, when Login/Register are actually built (next sessions).
- **The entry screen needed to be reachable from the running app.** `03_UX_SCREENS_AND_FLOWS.md` already
  documents a "Sign in" secondary CTA on the Welcome screen that the prototype note said was "the next
  front-end step" — now that it exists, `WelcomeScreen` gained that one `Pressable` (`t('welcome.signIn')`,
  an unused key already sitting in both locale files since D-19, `router.push('/auth')`). This is the only
  change to an already-validated screen in this session; no visual/design work on Welcome itself.
- **i18n.** New `auth.entry.*` (tagline, `or`, `continueWithGoogle`, `continueWithApple`, legal text split
  into 4 keys so "Conditions d'utilisation" / "Politique de confidentialité" can be styled inline) and
  `auth.placeholder.comingSoon`. Reused as-is (no new key): `auth.signIn` / `auth.signUp` (button labels)
  and `welcome.signIn` (the Welcome link). The legal text is styled (primary color, underline) but **not**
  tappable — Terms/Privacy pages don't exist and aren't in the MVP scope.
- **Animation.** `FadeInUp` on the photo's text (delay 150 ms) and on the card (delay 300 ms), consistent
  with the rest of the app; no new animation primitive needed.
- **Not done on purpose:** Login, Register, Forgot password screens (next sessions, one at a time); wiring
  Google/Apple to an actual destination; the post-auth screens from the mockup (welcome-back, location
  permission, "Tout est prêt").

### D-30 — Entry screen background replaced; Welcome's "Se connecter" link made visible

Same-day follow-up after reviewing D-29 on device.

- **Official photo.** `assets/images/auth/entry-background.png` (Paris from Montmartre, no baked text)
  replaced the temporary mockup crop. Its sky is pale, so the flat scrim over it (same recipe as the splash
  screen, D-18) went from 22% to **42%** opacity (`derived.night`) to keep the cream "ROAM" + tagline
  readable — the splash photo is already dark enough at 34%, this one needed more.
- **`WelcomeScreen`'s "Se connecter" link was too easy to miss** (secondary-tone, unstyled text, no
  context) — flagged on device. Changed to a small composed line, `t('welcome.alreadyHaveAccount')`
  ("Déjà un compte ?", new key, secondary tone) followed by `t('welcome.signIn')` in `label` variant
  (semibold) and `primary` tone, mirroring how the Login/Register mockup tiles style their own
  cross-links. Same pattern to reuse if Login/Register need an equivalent footer link later.

## Authentication, continued

### D-31 — Authentication 2 "Connexion" (route `/auth/login`)

`LoginScreen` (`src/features/auth/`) replaces the `AuthPlaceholder` that `/auth/login` rendered since D-29.
Measured on tile 2 of the design mockup board.

- **Deep navy heading, light theme only.** "Bon retour !" and (tile 3) "Créer un compte" are a
  consistent, saturated navy (`rgb(0,0,~85)` sampled on both tiles independently) — clearly a deliberate
  choice, not a near-black `text` rendering artifact (`inkDeep` is `#060A0E`, nowhere near it). Added as
  `derived.authHeading` (`#000050`) in `palette.ts`, used directly via `style`, **not** as a 14th semantic
  token: it is a narrow, one-off accent for these two headings, not a general-purpose color. No dark-theme
  equivalent exists in the mockup and navy-on-near-black would be unreadable, so the screen falls back to
  the normal `colors.text` token when `scheme === 'dark'`.
- **New `TextField` primitive** (`src/components/ui/`): labeled input, leading icon, inline error, and a
  `secureTextEntry` show/hide toggle (Lucide `eye`/`eye-off`). Generic and reusable — Register needs the
  same Email/Password fields. `Text` gained an `error` tone (`text-error`) for the inline message.
- **Four new shared auth components** (`src/features/auth/components/`), extracted instead of duplicated
  because Register will need them too: `AuthTopBar` (back chevron + small "ROAM" wordmark — new pattern,
  the mockup's Login/Register/Forgot-password tiles all have it, Entry doesn't), `OrDivider` and
  `SocialButtons` (pulled out of `AuthEntryScreen`, which now composes them instead of owning the
  Google/Apple loading state itself — same behavior, no test changes needed), and `AuthFooterLink`
  ("Pas encore de compte ? **Créer un compte**" — the same composed-link pattern as `WelcomeScreen`'s
  `alreadyHaveAccount` link, D-30, but this one is reusable since Register needs its mirror image).
- **Validation is local and minimal.** Required fields + a basic email-format regex, on submit; an error
  clears as soon as that field is edited again. `03_UX_SCREENS_AND_FLOWS.md` calls for validation/error
  states without specifying rules, and there's no backend to enforce anything stronger.
- **"Any well-formed input succeeds."** There's nothing to check credentials against (no backend, D-28), so
  `handleSignIn` simulates a request (`loading` on `Button`, ~900 ms) then `router.replace('/home')` —
  skipping onboarding, since Login implies a returning user. This differs from the entry screen's
  Google/Apple buttons, which have nowhere to go yet: this button's destination (`/home`) already exists.
- **"Mot de passe oublié ?" needed somewhere to land.** `src/app/auth/forgot-password.tsx` is a new
  placeholder route (`AuthPlaceholder`, same role as D-29's Login/Register stubs) — Forgot password is a
  later session, not this one.
- **Keyboard handling uses only React Native core** (`KeyboardAvoidingView` + `ScrollView`), no new
  dependency — `04_TECH_STACK.md`/`00_AGENT_INSTRUCTIONS.md` both favor the simplest option and avoiding
  overengineering.
- **i18n reorganized.** `auth.entry.or` / `continueWithGoogle` / `continueWithApple` moved up to `auth.or`
  etc. (top-level) since Login now needs them too — `auth.entry.*` keeps only what's genuinely entry-only
  (tagline, legal text). New `auth.login.*`, `auth.footer.noAccount`, `auth.showPassword`/`hidePassword`,
  `auth.emailPlaceholder`, and a new top-level `validation.*` namespace (`required`, `emailInvalid`) meant
  to be reused by every form screen, not just this one. `auth.email` changed from "Adresse e-mail" to
  "Email" to match the mockup's compact label (first real usage of that key).
- **Animation.** `FadeInUp` staggered across the heading, the form, and the footer link — consistent with
  every other screen; no loop, no new primitive.
- **Not done on purpose:** Register, Forgot password (next sessions); wiring Google/Apple to an actual
  destination (still nowhere to send them, D-29); "remember me" / persisted session (no session exists).

### D-32 — Authentication 3 "Inscription" (route `/auth/register`)

`RegisterScreen` replaces the `AuthPlaceholder` that `/auth/register` rendered since D-29. Measured on
tile 3 of the design mockup board, which shares its whole visual language with tile 2 (D-31): same navy
`auth.title`-style heading (`derived.authHeading`), same `AuthTopBar`, `TextField`, `OrDivider`,
`SocialButtons`, `AuthFooterLink`. Nothing new was built for those; this screen is mostly composition.

- **Password requirements checklist is new and live**, not decorative: `PasswordRequirements`
  (`features/auth/components/`) recomputes 3 rules on every keystroke — length ≥ 8, contains a letter
  _and_ a digit, contains a special character — and shows a filled/outline circle per rule (Lucide
  `circle-check` / `circle`, tinted `primary`/`border`). The mockup's third rule is explicitly labeled
  "(optionnel)", so only the first two are enforced on submit (`HAS_MIN_LENGTH`, `HAS_LETTER_AND_NUMBER`,
  exported for the screen's own validation to reuse instead of duplicating the regexes). A weak password
  gets one summary error (`validation.passwordWeak`) rather than repeating each unmet rule as text — the
  checklist above the field already shows which one.
- **Confirm-password field added after the initial build, on explicit request** (not in the mockup, which
  only has one password field with the live checklist as its safety net — `02_MVP_SCOPE.md` also only asks
  for one "if present in the design"). Same `TextField`/`secureTextEntry` pattern, its own show/hide
  toggle (`auth.showConfirmPassword`/`hideConfirmPassword`, distinct labels so both toggles have unique
  accessible names). `validate()` requires it non-empty and equal to `password`
  (`validation.passwordMismatch`); like every other field here, its error clears optimistically on the
  next edit and is re-checked on the next submit — no special-cased live re-validation against the other
  field, to stay consistent with the rest of the form.
- **"Prénom" is a new field** (`User` Lucide icon, required, no format check beyond non-empty) — the only
  genuinely new `TextField` usage; Email/Password are identical to Login's.
- **Same "any well-formed submission succeeds" simulation as Login** (D-31): no backend to register
  against, so `handleSignUp` simulates a request then `router.replace('/home')`. This skips the mockup's
  own post-registration screens (tiles 8–10: a welcome-back moment, location permission, "Tout est
  prêt") — those aren't built yet and are a different, later step (D-29's "not done on purpose", still
  true), not specific to Register.
- **i18n.** New `auth.register.*` (title reuses the same string as `auth.signUp` conceptually but is its
  own key — a heading and a nav-label copy can diverge later), `auth.footer.hasAccount` (mirrors
  `noAccount`, D-31), `validation.passwordWeak`. `firstNamePlaceholder` follows the same localization
  choice as `emailPlaceholder` (D-31): "Moussa" in French (the mockup's own persona), a generic "Alex" in
  English rather than a literal translation of a name.
- **Footer cross-link goes both ways.** Register's footer ("Déjà un compte ? Se connecter") pushes to
  `/auth/login`, mirroring Login's own footer pushing to `/auth/register` — a route test walks both
  directions.

### D-33 — Authentication 4 "Mot de passe oublié" (route `/auth/forgot-password`)

`ForgotPasswordScreen` replaces the `AuthPlaceholder` that `/auth/forgot-password` rendered since D-29.
Measured on tile 4 of the design mockup board — the simplest of the four screens built so far: `AuthTopBar`,
one `TextField`, one `Button`, no divider/social buttons/footer link.

- **The heading text is `auth.forgotPassword`**, the key that already existed and is used as the Login
  screen's link label ("Mot de passe oublié ?") — same string, same meaning, reused as-is rather than
  duplicated under a new key. The rest of the screen's copy is `auth.forgotPasswordScreen.*` (a sibling
  key, not nested under `forgotPassword`, since that key already holds a string, not an object).
- **The envelope illustration and its caption are static content, not a post-submit state.** They're part
  of the mockup's single screen (reassurance copy shown before you even submit), not a toggled
  "email sent" confirmation — so there's no second visual state to build here. Lucide `mail-open`, 64px,
  colored with the same `derived.authHeading` navy as the title (decorative, `accessible={false}`).
- **Only one field, so validation is a single `error` string**, not an object like Login/Register's
  `FormErrors` — simpler than reusing that shape for one field.
- **"Envoyer le code" simulates a request then `router.push('/auth/reset-code')`** (not `replace`: unlike
  Login/Register, this doesn't end the auth flow, it continues it — back should return here). That route
  is a new placeholder stub (`AuthPlaceholder`, same role as every other not-yet-built screen since D-20),
  for tile 5 "Code de réinitialisation" — a later session. Tiles 5–7 (code entry, new password, success)
  are their own screens, not built as part of this one, even though `02_MVP_SCOPE.md`'s brief groups
  "Forgot Password" as a single MVP item — the mockup breaks it into a small sub-flow, and the workflow's
  one-screen-at-a-time rule applies to each of them individually.

### D-34 — Authentication 5 "Code de réinitialisation" (route `/auth/reset-code`)

`ResetCodeScreen` replaces the `AuthPlaceholder` that `/auth/reset-code` rendered since D-33. Measured on
tile 5 of the design mockup board — a 6-digit OTP entry, one box per digit, one of them shown focused
(highlighted border) in the mockup.

- **New `OtpInput` component** (`features/auth/components/`): 6 boxes are a _presentation_ of one string
  value (`onChangeValue`, not per-box state), so the whole code can be set/cleared from outside (used by
  "Renvoyer le code"). Typing a digit auto-advances to the next box; backspace on an empty box goes back
  and clears the previous one; a same-tick multi-character input (a paste, or RNTL's `fireEvent.changeText`
  with a full string) distributes across the remaining boxes instead of being rejected — realistic for
  both an actual paste and how a code-entry field is normally tested. The focused box gets a `primary`
  border (matching the mockup's highlighted 3rd box); an invalid submission turns every box's border
  `error` red instead.
- **The email from the previous screen is threaded through as a route param**
  (`router.push({ pathname: '/auth/reset-code', params: { email } })` from `ForgotPasswordScreen`,
  read with `useLocalSearchParams`), so "Nous avons envoyé un code à **{email}**" shows the address the
  user actually typed — there's no shared auth store yet for this prototype, so a route param is the
  simplest way to carry one small piece of state one screen forward. It's optional: the screen degrades
  to just the prefix line if it's missing (e.g. the screen is opened directly, as the route-tree test
  for tile 5 alone does).
- **A fixed mock code (`123456`), not "any complete code succeeds"** (changed after the initial build, on
  request): there's still no backend to check a real code against, but the screen now simulates an actual
  check instead of accepting anything well-formed — a complete code that isn't `MOCK_VALID_CODE` is
  rejected with `validation.codeIncorrect` and stays on the screen, only `123456` proceeds. An incomplete
  code shows `validation.codeIncomplete` instead, without simulating a request at all. On success,
  `handleContinue` simulates a request then `router.push('/auth/new-password')` — a new placeholder stub
  for tile 6.
- **"Renvoyer le code" only clears the input**, front-end only — there is no email to actually resend, and
  no cooldown/rate-limit state invented for it (nothing in the mockup implies one).
- **The help card's background is `bg-primary/5`**, not a new palette color: sampled on the mockup it's a
  faint sage-tinted neutral close enough to a 4–5% tint of `primary` over the background that a dedicated
  token isn't worth adding for one decorative card. Lucide `mail-warning` for its icon (no exact mockup
  glyph match needed — same approximation spirit as D-25's icons).
