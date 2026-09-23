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
  rejected with `validation.codeIncorrect` and stays on the screen, only `123456` proceeds. On success,
  `handleContinue` simulates a request then `router.push('/auth/new-password')` — a new placeholder stub
  for tile 6.
- **"Continuer" is disabled until all 6 digits are entered** (`disabled={!isComplete}` on `Button`, also
  requested after the initial build), instead of being always pressable and showing an "incomplete" error
  on press. That error state (and `validation.codeIncomplete`) became unreachable once the button can't be
  pressed while incomplete, so both were removed rather than left as dead code.
- **"Renvoyer le code" only clears the input**, front-end only — there is no email to actually resend, and
  no cooldown/rate-limit state invented for it (nothing in the mockup implies one).
- **The help card's background is `bg-primary/5`**, not a new palette color: sampled on the mockup it's a
  faint sage-tinted neutral close enough to a 4–5% tint of `primary` over the background that a dedicated
  token isn't worth adding for one decorative card. Lucide `mail-warning` for its icon (no exact mockup
  glyph match needed — same approximation spirit as D-25's icons).

### D-35 — Authentication 6 "Nouveau mot de passe" (route `/auth/new-password`)

`NewPasswordScreen` replaces the `AuthPlaceholder` that `/auth/new-password` rendered since D-33. Measured
on tile 6 of the design mockup board — almost entirely a composition of pieces `RegisterScreen` (D-32)
already built: `AuthTopBar`, two `TextField`s (`secureTextEntry`), `PasswordRequirements`. No new
component was needed.

- **Same password rules as Register, reused directly**: `HAS_MIN_LENGTH`/`HAS_LETTER_AND_NUMBER` from
  `PasswordRequirements` gate submission, `validation.passwordWeak`/`passwordMismatch` are the same keys,
  and `auth.register.confirmPassword` labels the second field — a new password being _set_ has no
  "correct answer" to check against the way the reset code did (D-34's mock value), it only has to satisfy
  its own rules and match its own confirmation, so Register's exact validation shape applies unchanged.
- **New keys are only the screen's own copy**: `auth.newPassword.title/subtitle/label/submit`. Everything
  else is reused.
- **"Mettre à jour" simulates a request then `router.push('/auth/reset-success')`** — a new placeholder
  stub for tile 7 ("Réinitialisation réussie"), the last screen of the forgot-password sub-flow. Its
  placeholder title, `auth.resetSuccess.title` ("Mot de passe mis à jour !"), is taken directly from that
  tile's own mockup heading rather than reusing an unrelated key, since no existing key fit.

### D-36 — Authentication 7 "Réinitialisation réussie" (route `/auth/reset-success`)

`ResetSuccessScreen` replaces the `AuthPlaceholder` that `/auth/reset-success` rendered since D-35 — the
last screen of the forgot-password sub-flow started at D-33. Measured on tile 7 of the design mockup
board: a success badge, heading (`auth.resetSuccess.title`, already added in D-35), a two-line subtitle,
a decorative landscape, and "Se connecter" in a card over it — the same photo/illustration-then-card shape
as the entry screen (D-29). No back button and no top bar, like the onboarding's `ReadyScreen`: this is
the end of a flow, not a step in one.

- **New `SuccessCheckmark`** (`features/auth/components/`), explicitly requested as a "nice to have" beyond
  the mockup's static icon: on mount, a thin ring pulses outward once and fades behind the badge
  (`opacity 0.5→0`, `scale 0.7→1.55`, 900 ms) while the filled circle springs in
  (`type: 'spring', damping: 11, stiffness: 170`) and the checkmark fades/scales in ~240 ms after that —
  a single, non-looping "success ping". `useReduceMotion()` drops the pulse and the spring/scale entirely,
  keeping only a plain fade, the same reduced-motion shape the profile-creation loader uses (D-27).
- **New `SuccessLandscape`** (`features/auth/components/`): the mockup's mountains/lake/evergreens
  illustration has no source asset, so it's approximated with flat, layered `react-native-svg` shapes at
  increasing opacity of the `primary` token (same approximation spirit as the onboarding's `MapPreview`,
  D-24) rather than reproducing it exactly. It fills its flex container and is anchored to the bottom
  (`preserveAspectRatio="xMidYMax slice"`), so it always reaches the card regardless of screen height.
- **"Se connecter" uses `router.replace('/auth/login')`**, not `push`: this is the natural end of the
  forgot-password sub-flow (D-33 to D-36), so back shouldn't return into it — same reasoning as
  `ReadyScreen`'s "Commencer" (D-26). It reuses `auth.signIn`, no new key.
- **Sub-flow now complete end to end**: `/auth/login` → "Mot de passe oublié ?" → `/auth/forgot-password`
  → `/auth/reset-code` (code `123456`) → `/auth/new-password` → `/auth/reset-success` → back to
  `/auth/login`. A route-tree test walks the whole chain.

## Sprint 2 close-out (2026-09-22)

### D-37 — `AuthPlaceholder` removed: dead code once all 7 auth screens were built

All 7 authentication routes (`/auth`, `login`, `register`, `forgot-password`, `reset-code`,
`new-password`, `reset-success`) render their real screen as of D-36 — none of them used
`AuthPlaceholder` anymore, so it (and its only i18n key, `auth.placeholder.comingSoon`) were deleted
during the sprint's final verification pass, rather than left as unreferenced code. Same treatment
`OnboardingPlaceholder` got in D-26 once the onboarding screens were all built; `SCREEN_INTEGRATION_WORKFLOW.md`
§7 now says to do this for any future placeholder too. **Reversible:** trivially — re-add if a new
not-yet-built screen needs a stand-in again.
No functional change: `pnpm check` (186 tests) passes identically before and after.

## Main navigation (2026-09-22)

### D-38 — Custom `tabBar` on `expo-router`'s `Tabs` (React Navigation bottom tabs), not `NativeTabs` or the headless `expo-router/ui` primitives

`04_TECH_STACK.md`/D-16 left bottom-tab navigation undecided. The sprint 3 brief (floating pill that
morphs into a bubble on scroll, expands on tap, always shows the active icon) needs full control over
layout and animation that a native tab bar cannot give:

- **`NativeTabs`** (`expo-router/unstable-native-tabs`) renders the platform's own native tab bar
  (SwiftUI/Jetpack Compose): no custom morph animation, no bubble state, ruled out by the brief's own
  §11 ("if `NativeTabs` doesn't allow this customization, don't force it").
- **The headless `expo-router/ui`** (`Tabs`/`TabList`/`TabTrigger`/`TabSlot`) is a newer, less-proven
  primitive in this project with no prior usage to build on.
- **`expo-router`'s `Tabs`** (`import { Tabs } from 'expo-router/tabs'`, not the package root — this
  version does not re-export it from `expo-router` itself) wraps `@react-navigation/bottom-tabs` and
  accepts a `tabBar` prop (`(props: BottomTabBarProps) => ReactNode`) that fully replaces the rendered
  bar while keeping the standard screen/route wiring (`<Tabs.Screen name="home" />` per file). This is
  React Navigation's own documented "custom tab bar" pattern, well-proven, and keeps inactive tab
  screens mounted (lazy on first visit, then kept alive) so switching tabs preserves scroll position —
  the brief's own "avoid losing scroll where the architecture allows it".
- `tabBar` is a prop of the navigator itself, not of `screenOptions` (a `BottomTabNavigationOptions` —
  confirmed by `tsc`, which is why `src/app/(tabs)/_layout.tsx` passes `tabBar={...}` directly to
  `<Tabs>` and keeps `headerShown: false` in `screenOptions`).

`RoamTabBar` (`src/features/navigation/`) draws the pill/bubble itself with `MotiView` (the app's usual
animation primitive) animating one `width` between the pill's full width and a square equal to its own
height (a perfect circle at `borderRadius: 999`), rather than two absolutely-stacked layers — simpler,
and the outer shape visibly changing size is what makes it read as a morph rather than a fade
(`opacity: 0` alone was explicitly ruled out by the brief). Collapsed, only the active tab's icon
renders (the other three unmount, they don't just go transparent) inside the same shrinking container.
**Reversible:** yes — swapping `tabBar` for a different render function, or the whole navigator for
`NativeTabs`, does not touch the four screens.

### D-39 — `/home` moved into a `(tabs)` route group; scroll-collapse is a plain JS threshold, not a Reanimated worklet

- **Route group, not a path segment.** `src/app/home.tsx` moved to `src/app/(tabs)/home.tsx`
  (`discover.tsx`, `favorites.tsx`, `profile.tsx` are new siblings); `(tabs)` is a _group_ folder
  (parentheses), so it adds no path segment — `/home` still resolves exactly as it did for the
  onboarding's "Commencer" and the login/register "any valid input succeeds" (`HOME_ROUTE` in
  `onboardingFlow.ts`, `router.replace('/home')` in `LoginScreen`/`RegisterScreen`): none of those
  needed to change. Tab order (`Accueil, Découvrir, Favoris, Profil`) comes from the explicit
  `<Tabs.Screen>` order in `(tabs)/_layout.tsx`, not the files' alphabetical order (which would put
  Discover first).
- **The collapse/expand state is a plain `useState<boolean>` in a `TabBarCollapseContext`**
  (`src/features/navigation/TabBarCollapseContext.tsx`), driven by a regular `onScroll` prop on each
  screen's `ScrollView`, not `react-native-reanimated`'s `useAnimatedScrollHandler`/shared values. Two
  reasons: (1) the project's Jest mock for Reanimated (`jest.setup.ts`, D-11) stubs
  `useAnimatedScrollHandler` as a no-op, which would make the collapse logic itself untestable; (2) the
  rest of the app's interactive animations (tile/row selection, D-21–D-23) already follow the same
  "plain state drives a `MotiView`'s `animate` prop" pattern — this keeps the tab bar consistent with
  that rather than introducing worklets for the first time outside the profile-creation loader (D-27,
  which needed them specifically to animate an SVG attribute Moti doesn't expose).
- **One shared boolean, not per-screen state:** switching tabs while collapsed keeps the bar collapsed
  and swaps the bubble's icon to the new active tab, matching the brief's §9 example. A `useRef`-based
  accumulator (`TabBarCollapseContext.tsx`) requires a sustained scroll of 12px in one direction (reset
  on direction change) before flipping state, and forces expanded within 24px of the top — avoids
  flipping on every pixel/bounce (brief §7) without needing a debounce timer.
- **Left-anchored, not centered or full-width**, `insets.left + 20` from the edge for both the pill and
  the bubble: matches the mockup (image `1.png`, tiles 03–06), and means only `width` needs to animate
  (no recentering math).

### D-40 — Placeholder screens: `common.comingSoon`/`common.placeholder` replace `home.comingSoon`; `discover` is a new feature

- **`home.comingSoon` (D-20-era placeholder key) became `common.comingSoon`**, same FR/EN wording,
  reused by all four tab screens instead of adding four near-identical `<feature>.comingSoon` keys —
  existing tests asserting the literal placeholder text (`onboardingRoutes.test.tsx`,
  `authRoutes.test.tsx`) needed no change since the rendered string is unchanged. `home.title`
  (headline), `favorites.title` ("Mes favoris") and `profile.title` ("Profil") are reused as each
  screen's heading since they already existed with the right meaning; `discover.title` is new (no
  prior "Découvrir" page title existed, only the `navigation.discover` tab label).
- **New shared primitives** (`src/components/ui/`): `ScrollScreen` (the `Screen` primitive's scrollable
  sibling — safe top inset, `bg-background`, forwards `onScroll`/`testID`) and `PlaceholderCard`
  (`common.placeholder`, "Bloc {index}") — eight per screen, enough height to make the scroll/collapse
  behavior obvious and testable. Bottom content padding is `insets.bottom + TAB_BAR_CLEARANCE` (100px,
  `features/navigation/tabBarConfig.ts`) so the last card clears the floating bar.
- **`src/features/discover/` is a new feature folder** (`favorites`/`profile` already existed as empty
  `.gitkeep` placeholders from the initial scaffold, now filled; their `.gitkeep` was removed).
  `DiscoverScreen`/`FavoritesScreen`/`ProfileScreen` are intentionally minimal — no real content, per
  the sprint 3 brief (§14, §19): replace their bodies, not their routes, when those features are built.

### D-41 — `RoamTabBar` redone as a static "floating glass pill"; collapse-to-bubble paused, not removed

- **The scroll-driven collapse/bubble morph (D-39, D-38) is temporarily disabled at the component**,
  per an explicit follow-up brief asking to validate the static visual first and add motion in a
  separate pass. `RoamTabBar` no longer reads `TabBarCollapseContext`; it always renders the full
  4-tab pill. The context, `useTabBarScrollHandler`, its provider in `(tabs)/_layout.tsx`, and the
  `onScroll` wiring in the four tab screens are all left in place (inert for now) so the morph can be
  reconnected without re-deriving that logic. `RoamTabBar.test.tsx`'s collapse assertions were removed
  along with the render branch they covered; they return with the morph.
- **Centered, not left-anchored, overriding D-39's "matches the mockup" rationale for this phase.** The
  follow-up brief is explicit (§6) that the pill must be horizontally centered with clearance on both
  sides, not pinned to the left edge. The outer wrapper now spans `left/right: inset + 20` with
  `alignItems: 'center'`, and the pill itself is content-width. D-39's left-anchoring was chosen so
  only `width` had to animate during collapse (no recentering math) — worth revisiting in the animation
  pass: keep the bubble centered (recenter on width change) or revert to left-anchored during collapse
  only.
- **Glass effect: `expo-blur`'s `BlurView`, not a plain translucent `View`.** Added as a new dependency
  (`apps/mobile/package.json`, `~57.0.3` via `expo install` to match SDK 57) since the brief calls for
  an actual frosted-glass blur, which a semi-transparent background alone can't produce. A `rgba`
  wash of the `surface` token (0.55 light / 0.45 dark, built with the existing `hexToRgbChannels`
  helper) sits on top of the blur for the "surface: blanc/cream translucide" direction, and a
  `rgba(255,255,255,0.35)` 1px border gives the glass-edge highlight the brief asks for literally
  (§12) — the one deliberately un-tokenized color in the component, since it is a decorative light
  catch rather than a themed surface (same precedent as the mood accent colors in `palette.ts`).

### D-42 — Tab bar visual finalization + tab-switch/active-tab animation (still no collapse/bubble)

- **Small, purely numeric finishing touches to the validated D-41 pill**, no structural change: bar
  68px tall (was 64), items 72px wide (was 68), icon badge 36px/icon 21px (was 34/20 — same ~0.58
  badge-to-icon ratio), bottom clearance 14px (was 20, still clearly off the safe-area edge), glass
  border alpha 0.42 and shadow opacity 0.16 (were 0.35/0.12) for a touch more separation from
  whatever's behind it, without turning it into a hard outline or a heavy shadow.
- **Tab-switch entrance animation reads a shared "direction" instead of diffing routes itself.** New
  `TabTransitionContext` (mirrors `TabBarCollapseContext`'s shape): `RoamTabBar` sets `1`/`-1` — the
  tapped tab's index compared to the active one — right before calling `navigation.navigate`; the four
  `(tabs)/*.tsx` route files wrap their screen in the new `TabScreenTransition`, which reads it.
- **`TabScreenTransition` uses `react-native-reanimated` shared values directly, not a declarative
  Moti `animate`/`from`.** The entering screen must snap to a _fresh_ offset — computed from
  whatever `direction` is _right now_ — every time it gains focus, not interpolate from wherever it
  happened to be left (a plain `animate={{opacity: isFocused ? 1 : 0, translateX: ...}}` would reuse
  the offset from the _previous_ time that screen was hidden, which encodes the wrong direction after
  a back-and-forth like Home→Discover→Home). Remounting the screen on each focus (a Moti `key` trick)
  would get the direction right but discards the screen's state — in particular `ScrollView` position —
  on every tab switch, a regression the brief explicitly rules out (§10). Shared values read via a
  ref (synced in its own effect, not during render — the new `react-hooks/refs` lint rule forbids
  mutating a ref mid-render) sidestep both problems: the screen subtree never unmounts, and the
  snap-then-`withTiming` runs fresh off the latest direction every time `isFocused` flips true.
- **The active tab's icon badge animates with Moti**, unlike the screen transition: a `MotiView`
  behind the icon fades its `primary` fill in/out (opacity only, no `backgroundColor` interpolation,
  per the brief's §8 "prefer transform/opacity"), and the icon itself sits in a second `MotiView` keyed
  on focus state so switching triggers a fresh `spring` scale-in (`0.82 → 1`) — cheap to remount since
  it's a ~36px icon, not a whole screen. The label gets the same keyed-remount treatment for a light
  opacity fade. `useReduceMotion` (already used elsewhere) drops the spring/offset/translate in all
  three places, keeping only a short opacity change, per the brief's §9.
- **Collapse/bubble (D-41) still untouched**: `TabBarCollapseContext`, `useTabBarScrollHandler` and
  their screen wiring remain exactly as paused, unrelated to this pass.

### D-43 — Collapse-to-bubble reconnected: crossfade morph, left-anchored bubble, top-only auto-expand

- **`RoamTabBar` reads `TabBarCollapseContext` again** (paused since D-41); `TabBarCollapseContext`,
  `useTabBarScrollHandler` and the four screens' `onScroll` wiring needed no changes — they were kept
  live the whole time specifically so this step wouldn't have to re-derive them (D-41, D-42), which
  also means the "centralize collapse logic, don't duplicate it per screen" requirement (this brief's
  §15) was already satisfied before this pass started.
- **Crossfade, not a hard content swap.** The pre-D-41 version swapped the pill's children for the
  bubble's via a plain ternary the instant `collapsed` flipped, while only the container `width`
  animated — a real transformation of the shape, but an instant cut of the content. Now both the
  4-item row and the bubble's icon are always mounted, absolutely filling the same animated-width
  container, and crossfade via opacity while the container's `width`/`marginLeft` animate on the same
  spring — closer to the brief's "the capsule contracts around the icon" framing (§3-§4) than either a
  hard swap or literally repositioning 4 icons into 1. Both layers get
  `pointerEvents`/`accessibilityElementsHidden`/`importantForAccessibility` toggled with `collapsed` so
  the hidden one is neither tappable nor reachable by a screen reader (brief §9) — RNTL's `getByRole`
  respects the same hidden-from-accessibility flag, so tests assert the row is gone with
  `queryByRole(...).toBeNull()`, not `.not.toBeVisible()`.
- **Bubble is left-anchored (not centered) via an animated `marginLeft`, not `alignItems`.** The
  outer positioning wrapper (`left`/`right`/`bottom` insets, unchanged since D-41) no longer centers
  the pill with `alignItems: 'center'`; instead the pill's own `marginLeft` animates between a computed
  `centeredOffset` (expanded — `(availableWidth - pillWidth) / 2` via `useWindowDimensions`, visually
  identical to the old `alignItems: 'center'` result) and `0` (collapsed — flush with the wrapper's
  left inset, i.e. `insets.left + 20`). This resolves the open question D-41 flagged: the bubble slides
  left as it shrinks rather than staying centered, per this brief's §11.
- **Scroll handler's expand condition changed: reaching the top, not scrolling up.** D-39's original
  `useTabBarScrollHandler` expanded on _either_ reaching the top _or_ a sustained upward scroll
  anywhere on the page. This brief is explicit (§5-§6) that only reaching the top should auto-expand;
  scrolling up mid-page should leave it collapsed. The upward-scroll expand branch was removed —
  scrolling up now only resets the downward accumulator (so the next collapse needs a fresh sustained
  pull instead of picking up leftover progress), `TOP_ZONE` (24px, kept from D-39 — a literal `y <= 0`
  would make the expand feel like it never quite lands) is still the only path to `expand()`.
  `TabBarCollapseContext.test.tsx`'s "expands again once an upward scroll passes the threshold" test
  covered the removed behavior and was replaced with one asserting the new top-only rule plus one
  asserting the accumulator reset.
- **Bubble tap only expands** (`expand()`, not `navigate`), confirmed by
  `RoamTabBar.test.tsx`/`tabsRoutes.test.tsx`: `navigation.navigate` is asserted not called and the
  active tab stays the one from before the tap (brief §7-§8).

### D-44 — Mocked auth session (`isLoggedIn`) + `Stack.Protected` route protection

- **`AuthProvider`/`useAuth` (`apps/mobile/src/auth/`), not a bare `const isLoggedIn` in a screen.**
  Mirrors `ThemeProvider`/`useTheme()`'s exact shape (root-level context, `initial…` prop from
  `useBootstrap`, persisted via the existing `@/lib/storage` abstraction) since this is the same kind
  of cross-cutting, reactive, persisted app state — not a "feature", so it lives at `src/auth/` next
  to `src/theme/`, not under `src/features/auth/` (which holds the auth _screens_).
  `login()`/`logout()` delegate the actual (simulated) request to a new `repositories.auth`
  (`AuthRepository`, `services/repositories/types.ts` + `services/mock/auth.ts`) — the project's
  existing "screen → hook/service → repository (mock now, API later)" convention — while the
  provider itself owns the resulting `isLoggedIn` state and its persistence.
- **Persisted on purpose, reusing the existing storage abstraction** (`@/lib/storage`, already used
  for theme/language — no new dependency): "simulate a real user session" (brief §3) reasonably
  means it survives a restart, not just app-open-to-close. Storage failures already silently fall
  back to defaults (`lib/storage.ts`), so a corrupted/missing session value just means "logged out",
  never a crash.
- **`Stack.Protected` (`apps/mobile/src/features/navigation/AppRoutes.tsx`), not manual
  `router.reset`/imperative stack surgery** — the mechanism `expo-router` ~57 ships specifically for
  this. Two blocks, `guard={!isLoggedIn}` (welcome, the whole onboarding journey, the whole
  `auth/*` sub-flow) and `guard={isLoggedIn}` ((tabs)), plus an always-reachable `index` (the
  splash, which itself now reads `isLoggedIn` to replace to `/home` or `/welcome`). Flipping the
  guard removes the other block's screens from history outright — verified in
  `AppRoutes.test.tsx` (new: the six scenarios from the brief's §12) — which is what makes "no back
  to Login after signing in" and "no back to Home after logging out" hold via the hardware back
  button/gesture, not just via the explicit `router.replace` each screen still also calls (kept,
  since `Stack.Protected` alone only constrains _reachability_, not which screen is showing the
  instant the guard changes — see Expo Router's own auth guide for the same combination).
  `AppRoutes` is extracted out of `app/_layout.tsx` (which still owns font/theme bootstrap and
  native chrome) specifically so route tests can render the exact same guarded stack the app does,
  instead of each re-declaring it.
- **Onboarding and Register also call `login()`, exactly like Login** (explicit product decision,
  not inferred): both already ended on `/home` with no auth step before route protection existed
  (`RegisterScreen`, `ReadyScreen`'s "Commencer"), and gating `(tabs)` behind `isLoggedIn` would
  otherwise strand them. Treating "finished onboarding" and "just registered" as equally valid ways
  to become a session, alongside "just logged in", was confirmed rather than assumed since it's a
  product-logic call the brief didn't address.
- **Welcome → auth entry is `router.replace`, not `push`** (`WelcomeScreen.tsx`) — the one part of
  "no back to Welcome" `Stack.Protected` doesn't cover, since Welcome and the whole `auth/*` sub-flow
  sit in the _same_ `!isLoggedIn` guard block (crossing guards is what triggers the history purge,
  not moving within one). `auth/index → auth/login` and the register/login cross-links stay `push`
  on purpose — going back to the entry screen from Login is existing, tested behavior
  (`authRoutes.test.tsx`) the brief never asked to change, and replacing Welcome already removes it
  from history before any of those pushes happen.
- **A press with an async, timer-dependent handler (`login()`/`logout()`) must not be individually
  `await`ed in a test under fake timers**: `await fireEvent.press(...)` deadlocks, since nothing can
  advance the fake timer the handler is awaiting until that same await resolves. The fix used
  throughout (`LoginScreen.test.tsx`, `RegisterScreen.test.tsx`, `ReadyScreen.test.tsx`,
  `authRoutes.test.tsx`, `onboardingRoutes.test.tsx`, `AppRoutes.test.tsx`) is one shared `act()`
  wrapping both the press and `jest.advanceTimersByTimeAsync(...)`, not two separate ones (which
  still passes, but logs a spurious "state update not wrapped in act()").

## Home (2026-09-22)

### D-45 — Home rebuilt as an immersive discovery page; `Experience`/`Mood` extended instead of duplicated

Sprint 5 brief: replace the sprint 3 placeholder `/home` (D-39, "Cet écran arrive bientôt.") with the
real Home — a hero carousel, mood chips, and three horizontally-scrolling sections — from a supplied
design mockup, colors mapped to the existing ROAM tokens rather than copied from the mockup.

- **`Experience` (`src/types/experience.ts`) gained optional display fields** (`location`,
  `distanceLabel`, `durationLabel`, `priceLabel`, `rating`, `reviewCount`, `isPopular`, `isHero`,
  `isFavorite`, `tags`) instead of a second, parallel type — the brief asked to reuse an existing
  `Experience` type if one exists. `coverImageUrl?: string` (unused anywhere) became
  `coverImage?: ImageSourcePropType` so the same field fits both a local `require()`'d placeholder
  photo (used now) and a future remote URL, without a second image field.
- **`Mood` (`src/types/common.ts`) gained `festive`/`romantic`**, needed by the Home "Selon ton
  humeur" chips and reused directly on `Experience.moods` — one mood vocabulary, not a third one next
  to the existing `Mood` (context/recommendation matching) and `MoodScreen`'s own local, unrelated
  `Mood` type (onboarding tile ids, D-21).
- **Mock content lives in the existing mock repository** (`services/mock/data.ts`): 5 hero
  experiences (`isHero: true`), 3 "most popular" (`isPopular: true`) and 2 extra for "Des idées pour
  toi", on top of the original `exp-slow-afternoon` fixture (untouched, still covered by
  `repositories.test.ts`). Categories gained `restaurant`/`bar`/`culture`/`nature`/`experience`
  slugs. Images are **temporary**: the onboarding/auth photos already in the repo
  (`welcome-terrace.png`, `welcome-street.png`, `welcome-lake.png`, `welcome-cafe.png`,
  `entry-background.png`, `ready-background.jpg`, `profile-landscape.jpg`, `splash-background.png`),
  reused rather than downloading new ones, some more than once — replace with real experience photos
  later, ids/filenames unaffected.
- **The Home "moods" and "Lieux proches de toi" are static config**
  (`features/home/data/moods.ts`, `nearbyCategories.ts`), not a repository — the same precedent as
  `TAB_CONFIG` (navigation) and onboarding's own local `MOODS`: a fixed, small option list doesn't
  need an async interface built for it.
- **"Des idées pour toi" is a small, deterministic, explainable rule set**
  (`features/home/lib/pickForYou.ts`, unit-tested): a mood match, a preferred-category match, the
  top-rated popular experience, and the nearest one (parsed from the mock `distanceLabel`) — each
  rule skips an id already picked, topped up from the remaining pool. `07_DATA_AND_RECOMMENDATION.md`
  ("start deterministic, explainable scoring") applied to a fourth surface, not a scoring model.
- **New generic primitives** (`src/components/ui/`): `IconButton` and `SearchBar` — both listed in
  `06_DESIGN_SYSTEM.md`'s "Core" components but not built before this sprint. `Chip` gained an
  optional `icon` slot (additive prop, same pattern as `Button`'s `leadingIcon`, D-29) for the mood
  chips' icons.
- **Favorites are local, in-memory state only** (`useFavoriteExperienceIds`): no backend, no
  persistence, same "mock only" scope as the rest of this sprint (`08_AGENT_TODO.md` Phase F still
  covers the real favorites feature). Only ids the user actually toggled are kept in state, merged
  with the mock data's own `isFavorite` seed at read time — avoids a `setState` inside a `useEffect`
  (flagged by the `react-hooks/set-state-in-effect` lint rule) to seed it from the loaded experiences.
- **`expo-linear-gradient` added as a new dependency** (`~57.0.2`, matching SDK 57) for the hero's
  dark-gradient-over-photo overlay — same reasoning as `expo-blur` for the tab bar's glass effect
  (D-41): the brief calls for an actual gradient, which stacked flat views only approximate.
- **Hero text/icons are fixed white, not theme tokens** — same reasoning as the splash, auth entry
  and "Prêt à explorer ?" screens (D-18, D-26): the photo is dark enough in both themes that the
  overlay text stays legible regardless of light/dark mode. The hero's own CTA button is the one
  deliberate exception to "no hex/literal colors": `bg-white`/`text-white` are Tailwind's built-in
  colors (kept available by `tailwind.config.ts`'s `extend`), not a new hex value.
- **Only the active hero slide is exposed to accessibility tools**
  (`accessibilityElementsHidden`/`importantForAccessibility` on the other slides, same pattern as
  `RoamTabBar`'s collapsed/expanded layers, D-43): all 5 slides mount at once in the paging
  `ScrollView` (no virtualization library), so without this every slide's heading/CTA would be
  simultaneously queryable/announced.
- **"Voir l'expérience" needed somewhere to land.** `src/app/experience/[id].tsx` +
  `ExperienceDetailPlaceholder` (`src/features/experiences/`, previously an empty `.gitkeep`) is the
  same not-yet-built-screen pattern as `AuthPlaceholder`/`OnboardingPlaceholder` (D-20, D-29, D-37,
  both deleted once unused) — it reads the real title through `repositories.experiences.getById`
  where it can, and shows `common.comingSoon` otherwise; replace its body, not the route, when
  `02_MVP_SCOPE.md` §7's real experience detail screen is built. Added to `AppRoutes.tsx` under the
  existing `guard={isLoggedIn}` block, alongside `(tabs)`.
- **`RoamTabBar` and its `BottomTabBarProps` usage are untouched**, per this sprint's explicit scope:
  Home only adds a sibling route (`experience/[id]`) to `AppRoutes`, and wires into the existing
  `TabBarCollapseContext`/`useTabBarScrollHandler()` exactly like every other tab screen (D-38–D-43).
- **Not done on purpose** (frontend-only prototype, `08_AGENT_TODO.md`): a real search engine, GPS
  permission/geolocation, a real recommendation/scoring engine, and the experience detail screen
  itself — the placeholder above stands in for it.

## Home polish (2026-09-22)

### D-46 — Hero CTA dark-mode contrast, pull-to-stretch, and an independent floating header

Sprint 4: three targeted fixes on the already-validated Home (D-45), explicitly scoped to leave its
design, sections, main ROAM colors, `RoamTabBar` and mock data untouched.

- **Hero CTA in dark mode reuses `Button`'s existing `primary` variant instead of a new color.** The
  button was hardcoded to `bg-white` (a literal override on top of the `secondary` variant), paired
  with the `default` text tone — in dark mode that tone resolves to `derived.offWhite`, i.e.
  near-white text on a white button, unreadable. Switching to `variant={isDark ? 'primary' : 'secondary'}`
  (and dropping the `bg-white` override so `secondary`'s own `bg-surface` — white in light — applies
  unchanged) reuses the same `primary`/`primaryForeground` pair every other primary button in the app
  already relies on, already covered by `theme.test.ts`'s WCAG AA contrast assertions — no new token,
  and light mode is visually identical to before.
- **Pull-to-stretch reuses `react-native-reanimated`'s shared values directly, not
  `useAnimatedScrollHandler`.** `docs/DECISIONS.md` D-39 already documents that this project's Jest
  mock stubs `useAnimatedScrollHandler` as a no-op specifically so it doesn't have to be exercised in
  tests; adopting it here would have made the _existing_ tab-bar-collapse-from-Home tests
  (`tabsRoutes.test.tsx`) silently stop being exercised too, since it would have replaced the plain
  `ScrollView.onScroll` prop they rely on. Instead, `HomeScreen` keeps its ordinary `ScrollView` and a
  plain (non-`useCallback`) `onScroll` function that does three independent things on every native
  scroll tick: mutates a `useSharedValue` directly (the exact pattern `ProfileOrbit`'s loader progress
  already uses from a plain `useEffect`, D-27) with no React re-render, calls the existing
  `useTabBarScrollHandler()` callback unchanged, and calls the new `useScrollDirection` hook's setter.
  A `useAnimatedStyle` on an `Animated.View` wrapping `HeroCarousel` reads the shared value on the UI
  thread and interpolates `translateY`/`scale` — only on negative (pulled-down) offsets, clamped via
  `Extrapolation.CLAMP` so normal downward scrolling into the page is unaffected. Range tuned to a
  subtle effect (`HERO_OVERSCROLL_RANGE` 120px of pull → `HERO_MAX_SCALE` 1.15), the standard
  "stretchy header" recipe (`translateY` at half the pull, `scale` up) sized down from the versions
  usually written for a full-height hero.
  **Not `useCallback`:** mutating a shared value's `.value` from inside a memoized callback body trips
  `eslint-plugin-react-hooks`'s `react-hooks/immutability` rule (it cannot know Reanimated shared
  values are meant to be mutated exactly this way outside a worklet); a plain function recreated each
  render sidesteps it and costs nothing here, since `ScrollView.onScroll` identity doesn't need to be
  stable.
- **The notification bell moved out of `HeroCarousel` into a new `HomeHeader`**
  (`features/home/components/`), a small floating overlay (blur only, no colored wash, so the Hero
  stays the focal point) positioned above everything, independent of both the Hero and `RoamTabBar`.
  Its visibility is driven by a new, generic `useScrollDirection` hook (`src/hooks/`, unit-tested):
  same threshold/accumulator shape as `TabBarCollapseContext`'s `useTabBarScrollHandler`, but with its
  own up-scroll-shows branch — the tab bar deliberately dropped that exact branch for its own UI
  (D-43), so this is a standalone hook, not a shared one, keeping the two behaviors from ever mixing
  state (this sprint's explicit "ne mélange pas leurs états"). Fed from the same `onScroll` tick as the
  tab bar and the stretch effect, but through its own setter — three independent consumers of one
  physical scroll stream, not a shared state object.
- **`HeroCarousel` lost its `onPressNotifications` prop** (now unused there) but kept `topInset` (still
  positions the location badge). No other change to the carousel's own swipe/dots/CTA-navigation
  behavior.
- **Not done on purpose:** a genuinely native (thread-driven) hide/show for the header — its own
  visibility flip is a small, infrequent `setState` (only on threshold crossings, exactly like the
  pre-existing tab-bar-collapse pattern), not per-pixel, so it doesn't need the UI-thread treatment the
  continuous stretch value does.

### D-47 — Header background fades out at the very top, not just while hidden

Same-day follow-up: at the top of the page the header's blur/wash was always rendered (only its
visibility — via D-46's `visible` — ever changed), so the Hero always had a faint frosted strip across
its top even at rest. `useScrollDirection` now also returns `atTop` (already computed internally, it
just wasn't exposed) alongside `visible`, so `HomeHeader` can tell "shown because we're at the top"
from "shown because the user scrolled back up mid-page". The `BlurView` moved into its own `MotiView`
that fades its `opacity` between 0 (`atTop`, nothing rendered behind the bell — the Hero photo shows
through bare) and 1 (scrolled, kept for legibility against whatever section is behind the header once
it reappears) — animated, not an instant cut. The bell's own circular backdrop (`bg-black/25`) is
unrelated and unchanged: it keeps the icon legible against the Hero photo regardless of scroll
position, only the header's full-width background layer responds to `atTop`.

## Experience detail & gallery (2026-09-22)

### D-48 — Real experience detail + gallery screens; `Experience` extended again, no shared-element library

Sprint 5 brief: replace `ExperienceDetailPlaceholder` (D-45) with the real detail screen from a
supplied mockup, plus a dedicated full-screen gallery reached by tapping the hero image, with a
hero -> gallery transition and a synced double-`FlatList` gallery (main pager + thumbnail strip).

- **`Experience` gained detail fields instead of a second type**, same precedent as D-45:
  `images` (gallery, falls back to `[coverImage]` when absent), `address`, `openingHoursLabel`,
  `transport` (`{ line, walkLabel }`), `highlights`, `reviews` (new `ExperienceReview` type) and
  `similarExperienceIds`. All optional, all plain already-formatted mock strings (D-09/D-10).
- **Mock data**: every experience in `services/mock/data.ts` (11 existing + 3 new: `exp-hasard-ludique`,
  `exp-mama-shelter`, `exp-bellevilloise` — referenced only from `exp-rooftop-sunset`'s "Suggestions
  similaires", matching the supplied mockup's example almost verbatim) now carries the full detail set.
  `images` is built by `buildGallery()`: the experience's own cover first, then a deterministic rotating
  slice of the same 8-photo pool `coverImage` already draws from (D-45) — no new photos. A small shared
  `reviews` pool (5 objects) is reused across experiences the same way photos are. **Not** given a
  `distanceLabel` on `exp-slow-afternoon` despite adding its other detail fields: `pickForYou.test.ts`'s
  fixture is independent, but `HomeScreen.test.tsx`'s "Des idées pour toi" assertions depend on
  `exp-panoramic-walk` (800 m) staying the nearest experience — giving `exp-slow-afternoon` a shorter
  distance would have won that rule and silently changed Home's own test expectations.
- **Reasons ("Pourquoi ROAM te le propose ?") are derived, not stored per item**
  (`features/experiences/lib/whyRecommended.ts`, unit-tested): interests (has a mood), budget (free/
  under10/10to25), nearby (≤ 5 km, parsed from `distanceLabel`), open now (has `openingHoursLabel`) —
  `07_DATA_AND_RECOMMENDATION.md`'s "reasons must be based on actual matched constraints" applied
  literally, same spirit as `pickForYou`'s own rule set (D-45) rather than a fixed list in the mock data.
- **Gallery route is flat (`app/gallery/[id].tsx`), not nested under `experience/[id]/`.** A nested
  `experience/[id]/index.tsx` + `experience/[id]/gallery.tsx` pair was considered (URL-wise the more
  "correct" shape) but every dynamic route in this app so far is a single flat segment
  (`experience/[id]`, `auth/*`, `onboarding/*`); nesting a second dynamic layer under one `Stack` with no
  scoped `_layout.tsx` was an unverified pattern for this Expo Router version, and the brief only asks
  for "an equivalent route", not a specific URL shape. `heroX/heroY/heroW/heroH` (the tapped hero's
  measured on-screen rect) and `index` travel as string search params. Same flat precedent for the CTA
  placeholder: `app/itinerary/create.tsx`, not nested under `experience/`.
- **Hero -> gallery transition: a measured-rect Reanimated morph, not a shared-element library.**
  `react-native-shared-element` (the usual React Navigation answer) is unmaintained and not installed;
  nothing in the current stack (`04_TECH_STACK.md`) provides real cross-screen shared elements. Per the
  brief's own fallback instruction, `ExperienceHero` measures its pager's window rect
  (`View.measureInWindow`) on press and passes it through the route params above; `ExperienceGalleryScreen`
  drives one `useSharedValue` (`progress`, 0 = collapsed to that rect, 1 = fullscreen) with `withTiming`,
  interpolating an absolutely-positioned `Animated.Image` overlay's top/left/width/height between the two,
  while the real gallery content underneath fades in behind it (`opacity: progress`) — by the time the
  overlay reaches fullscreen it exactly covers the same photo the content is already showing, so the
  overlay is hidden and the content takes over seamlessly. Closing reverses the same interpolation before
  calling `router.back()`. Skipped entirely (instant show/hide) when `useReduceMotion()` is true, or when
  the route is reached without a rect (e.g. a future deep link) — `canMorph` gates the whole thing.
  `gestureEnabled: false` + `animation: 'fade'` on the route (`AppRoutes.tsx`) so the native swipe-back
  gesture can't bypass the closing animation; a `BackHandler` listener routes the Android hardware back
  button through the same `handleClose`.
  **Lint note:** mutating `progress.value` had to be done from plain functions declared _before_ any
  `useEffect` that also touches `progress` (not `useCallback`, and not after those effects in source
  order) to satisfy `eslint-plugin-react-hooks`'s immutability check — the same "plain function, not
  memoized" shape as `HomeScreen`'s pull-to-stretch `onScroll` (D-46), just also order-sensitive here.
  Keeping the latest `handleClose` reachable from a stable `BackHandler` subscription uses a ref updated
  from its own effect (`useEffect(() => { ref.current = handleClose; })`), not a direct assignment during
  render, which this lint config also rejects.
- **Double `FlatList` sync (gallery)**: one shared `activeIndex` state — the main pager's
  `onMomentumScrollEnd` computes it from `contentOffset.x`, a thumbnail press sets it directly and calls
  `scrollToIndex` on the main list; either path also re-centers the thumbnail strip via its own
  `scrollToIndex({ viewPosition: 0.5 })` in a `useEffect` keyed on `activeIndex`. Both lists use a fixed
  `getItemLayout` (screen width / thumbnail size + gap) so `scrollToIndex`/`initialScrollIndex` work
  without waiting for layout. **Bug caught by its own test**: the gallery's initial `activeIndex` must be
  `useState(initialIndex)` as-is, not clamped against `images.length` at declaration time — `experience`
  (and so `images`) is still `[]` on the very first render (it loads asynchronously via `useExperience`),
  so a clamp evaluated in the `useState` initializer permanently pinned the index to 0.
- **"Pourquoi ROAM te le propose ?", "Voir sur la carte" and the reviews/highlights sections all reuse
  existing pieces**: `MapPreviewRow` reuses onboarding's `MapPreview` illustration (still not a real map
  — `04_TECH_STACK.md` — and not yet navigable, there is no map screen); `SimilarExperiencesSection`
  reuses Home's `ExperienceCard` and its own `useFavoriteExperienceIds` instance (separate from the
  hero's own, same "no shared favorites state" scope as D-45); `SectionHeader` gained an optional
  `seeAllLabel` prop (additive, same pattern as `Chip`'s `icon` slot, D-45) so "Voir tous les avis" isn't
  a near-duplicate component. New, feature-scoped-only pieces: `Badge` (a non-`Pressable` display pill —
  `Chip` is always a button, and a badge that does nothing must not claim `accessibilityRole="button"`),
  `InfoGrid`, `ReviewCard`, `HighlightsSection` (icons cycle through a fixed decorative set, same
  "decorative only, label carries the meaning" precedent as `moodAccents`), `WantMoreCta`.
- **Category chip and the two other hero badges use a small, explicit i18n map**
  (`experience.categories.*`, `lib/categoryLabel.ts`), not a dynamic template literal key — this
  project's typed i18n keys (checked against `fr.json`) reject a dynamic key built from a template
  string at compile time. "À proximité" reuses the same ≤ 5 km rule as the "nearby" reason above; "Coup
  de cœur" is shown for `isPopular` experiences (mockup's "Coup de ❤️" example, reworded — no emoji in
  the translated string, consistent with the rest of the app's copy).
- **Fixed white icons/text on the hero and a fixed black gallery background**, not theme tokens — same
  exception as the Home hero and splash/auth screens (D-18, D-26, D-45): both sit on a photo dark enough
  in both themes for the overlay content to stay legible regardless of light/dark mode.
- **Share uses React Native's real `Share.share()`**, not a mocked no-op — unlike `SearchBar`'s search
  field (no query engine exists to call), a native share sheet is a genuine, already-available platform
  API, so there was no reason to fake it.
- **Not done on purpose** (frontend-only prototype): a real map screen to land on from "Voir sur la
  carte" (still a static preview, exactly like the onboarding location screen's own `MapPreview`), and
  the itinerary/journey screen itself — `CreateJourneyPlaceholder`
  (`features/itinerary/`) + `app/itinerary/create.tsx` is the same not-yet-built-screen pattern as
  `ExperienceDetailPlaceholder` was (D-45), deleted the same way once its route's real screen exists.

## Experience detail polish (2026-09-22)

### D-49 — Sticky header/footer, one fixed CTA, and a swipe bug fixed in `ExperienceHero`

Same-day follow-up, explicitly scoped to interaction/scroll behavior only — no design, palette or
content changes beyond removing one named section.

- **The hero's swipe was silently broken: a `Pressable` wrapped the whole pager `ScrollView`.** A
  `Pressable` ancestor negotiates the touch responder before its scrollable child gets a chance to claim
  a horizontal drag, so the pager could still be tapped but not reliably swiped. Fixed by moving to one
  `Pressable` **per slide**, `ScrollView` outermost — the same shape every other pressable-inside-a-
  horizontal-`ScrollView` in this app already uses (`ExperienceCard` on Home) and the one place D-48
  should have followed to begin with. Not caught by `ExperienceHero.test.tsx` before this fix, and still
  isn't a regression guard after it: RNTL's `fireEvent.scroll` calls `onScroll` directly, bypassing the
  native touch/responder negotiation the bug lived in — that layer isn't something this test setup can
  exercise either way. The fix is verified by matching a known-working pattern already shipped elsewhere,
  not by a new test.
- **Back/share/favorite moved out of `ExperienceHero` into a new `ExperienceDetailHeader`, rendered as a
  sibling overlay above the `ScrollView`, not inside the Hero.** They had to: `ExperienceHero` is the
  `ScrollView`'s first child, so anything positioned inside it scrolls away with the photo — incompatible
  with "the header stays visible" (brief item 9). Same extraction precedent as `HomeHeader` (D-46: the
  bell moved out of `HeroCarousel` for the identical reason). `ExperienceHero`'s own prop surface shrank
  to `{ images, title, onOpenGallery }`.
- **Header title reveal uses "scrolled roughly past the hero" as its trigger, not the title's exact
  measured position.** `getHeroHeight()` (extracted from `ExperienceHero` into `lib/heroHeight.ts` so
  both the hero and the screen agree on one number) minus the header's own height gives `revealOffset`;
  a `useAnimatedStyle` interpolates opacity over the `FADE_RANGE` (60px) leading up to it, driven by a
  `scrollY` shared value mutated from the screen's `onScroll` — cheap (no per-pixel `setState`) and
  visually "the title arrives as the hero disappears behind the header", which is what the brief actually
  asks for. A pixel-exact alternative (measuring the title `View`'s real position, e.g. via
  `measureLayout` against the `ScrollView`) was considered and rejected: it would need a native
  measurement that isn't stable in this test renderer, whereas the hero-height proxy is a plain formula
  both screens already share and is exercised by existing tests (`getHeroHeight` reused, not duplicated).
  **Icon color doesn't track the crossfade**: every header button keeps its fixed white icon on its own
  permanent `bg-black/25` circular backdrop (the exact treatment `HomeHeader`'s bell and the pre-D-49
  hero buttons already used) — legible over the raw photo and over the wash alike, so there was no need
  to interpolate icon color (SVG icons take a plain `color` string, not an animatable style prop; doing
  this properly would need `useAnimatedProps` per icon for a purely cosmetic gain).
- **The sticky CTA gets its own hook, `useCtaVisibility`, instead of reusing `useScrollDirection`.** The
  brief's rule is different from Home's header: hidden while actively scrolling down, but shown again
  the instant the scroll _ends_ (`onScrollEndDrag`/`onMomentumScrollEnd`) as well as on any upward
  scroll — `useScrollDirection` has no "scroll ended" signal at all (it only reacts to sustained
  direction changes) and deliberately shouldn't gain one just for this screen (item 15: three independent
  systems — header, CTA, `RoamTabBar` — must not share state). Same threshold shape (12px accumulator)
  and unit-test style as `useScrollDirection.test.ts`.
- **The CTA footer is a `MotiView` slide+fade (translateY/opacity), same idiom as `HomeHeader`**, wrapping
  a plain `bg-surface` bar with a top border and `bottomInset + 12` of extra bottom padding so it never
  touches the Home Indicator edge (item 1). `ExperienceDetailFooter` exports `FOOTER_CLEARANCE` (108px)
  for the screen's `ScrollView` `contentContainerStyle.paddingBottom`, replacing the old flat `+ 32`, so
  the last section (now "Suggestions similaires") is never hidden behind the floating bar.
- **"Envie d'en faire plus ?" is deleted, not hidden**: the component (`WantMoreCta.tsx`) and its
  `experience.wantMore.*` i18n keys are removed outright — the brief calls this CTA "désormais
  représentée uniquement par le CTA sticky", i.e. superseded, not a duplicate to keep around unused. The
  inline (non-sticky) "Créer mon parcours" button that used to sit between `WhyRoamSection` and
  `ReviewsSection` is also gone — it is the same action, now permanently reachable via the footer, so
  showing it twice would be redundant rather than a second, distinct feature.
- **Header/footer crossfade and slide are not unit-tested for their animated values**, only for what
  they gate (`ExperienceDetailHeader.test.tsx` checks the title renders and the buttons work regardless
  of scroll position; `ExperienceDetailScreen.test.tsx` checks the CTA button's presence/absence via
  `getByRole`/`queryByRole`, the same pattern `HomeHeader`'s own tests already use for its visibility).
  Reason: this project's Reanimated Jest mock stubs `interpolate` as a no-op (confirmed by inspecting the
  mock directly), the same category of gap D-39 already documents for `useAnimatedScrollHandler` — there
  is nothing meaningful to assert about an interpolated opacity value under it.
- **Reduced motion**: the footer's slide/fade already goes through `useReduceMotion()` (drops the
  `translateY`, shortens the duration — identical to `HomeHeader`'s handling). The header's crossfade is
  a direct function of scroll position, not a timed animation independent of user input, so there is no
  separate motion to suppress; it inherently has no bounce, spring or autoplay to turn off.

## Profile (2026-09-22)

### D-50 — Profile 1 "Profil principal" (route `/profile`); `UserRepository` added; ten sub-screens stubbed

Sprint 5, one screen at a time (`docs/SCREEN_INTEGRATION_WORKFLOW.md`): `ProfileScreen` replaces the
sprint 3 placeholder (D-40) with the real main screen from the supplied mockup board (tile 01) — header,
stats, and the grouped menu (préférences/favoris/historique/statistiques, langue/thème, aide/confidentialité,
déconnexion). Screens 2–11 of the mockup board (edit profile, préférences, favoris, historique,
statistiques, langue, thème, aide, confidentialité, the logout popup) are explicitly **not** built this
session — each gets its own session and validation, per the brief's "one screen at a time" rule.

- **No user/session data existed beyond `AuthContext`'s `isLoggedIn`.** `User` (`types/user.ts`) gained
  optional display fields (`age`, `city`, `bio`, `stats: UserStats`) instead of a second type — same
  precedent as `Experience`'s repeated extensions (D-45, D-48). A new `UserRepository.getCurrentUser()`
  (`services/mock/user.ts`) follows the existing `Screen → hook → Repository → mock` convention
  (`useCurrentUser`, mirroring `useExperience`); the mocked profile (`services/mock/data.ts` →
  `currentUser`, "Moussa", 33, Paris) is the one from the mockup. `bio` is plain mock content, not an
  i18n key — same "entity content is plain strings" precedent as place/experience descriptions (D-09).
- **No avatar photo exists, so `ProfileAvatar` falls back to an initial-letter circle** (`bg-accent`,
  first letter of `displayName`) instead of inventing or cropping one — the exact precedent `ReviewCard`
  already established for reviewer avatars with no photo asset. Shows `avatarUrl` once a real one exists;
  no temporary crop was created for this screen.
- **Ten menu rows lead to screens not built this session; each gets a `ProfilePlaceholder` route**
  (`features/profile/components/ProfilePlaceholder.tsx`, same shape as `CreateJourneyPlaceholder`/
  `ExperienceDetailPlaceholder`, D-45/D-48): `/profile/{edit,preferences,favorites,history,statistics,
language,theme,help,privacy,settings}`. Replace each route's body, not its path, when that screen's own
  session comes; delete `ProfilePlaceholder` once nothing references it (D-37's precedent).
- **"Mes favoris" and "Mon historique" get their own `/profile/*` routes, distinct from the existing
  `/favorites` tab.** The mockup's tiles 03–04 show them as pushed screens with a back arrow and no tab
  bar, not the tab bar's own Favoris screen — so this keeps the two entry points separate for now rather
  than repointing the row at the tab. Which one (if either) the real "Mes favoris" screen (écran 5) ends
  up reusing is that screen's own decision, not decided here.
- **The mockup's header Settings gear icon has no dedicated screen in this sprint's 11-screen list**
  (Langue/Thème/Aide/Confidentialité are already separate menu rows). Simplest reversible choice: it
  pushes its own placeholder, `/profile/settings`, reusing the already-present-but-unused
  `settings.title` i18n key ("Paramètres") as that placeholder's heading — same treatment as every other
  not-yet-built destination on this screen, not a special case.
- **Langue and Thème rows show their live current value**, not the mockup's static "Français"/"Système":
  `i18n.language` (guarded by `isLanguage`) and `useTheme().preference` are already reactive app state, so
  showing anything else would be a mock fiction the app doesn't need. Both values are resolved through an
  explicit key map (`LANGUAGE_LABEL_KEYS`/`THEME_LABEL_KEYS` in `ProfileScreen.tsx`), not a dynamic
  template-literal key — this project's typed i18n keys reject those (same pattern as `categoryLabel.ts`,
  D-48).
- **New generic-looking pieces stay feature-scoped, not promoted to `components/ui/`**: `ProfileAvatar`,
  `ProfileHeader`, `ProfileStats`, `ProfileMenuRow` are all specific to this screen's exact shapes (a menu
  row with an icon-in-a-tinted-circle, an optional subtitle _or_ trailing value, a chevron) — reusing
  `Button`/`IconButton`/`Text`/`ScrollScreen` for everything generic rather than inventing a competing
  "Card" primitive (`06_DESIGN_SYSTEM.md` lists one, but nothing here needed its full shape).
- **Logout keeps its existing direct behavior (no confirmation), unchanged from the sprint 3 placeholder.**
  The confirmation popup is explicitly écran 11 of this sprint's plan, its own session; adding it here
  would be building ahead of the one-screen-at-a-time rule.
- **`fireEvent.press` must be individually awaited (RNTL v14, `DEVELOPMENT.md`'s own testing convention) —
  confirmed the hard way**: an early draft of `ProfileScreen.test.tsx` fired eight unawaited presses in one
  test, which logged "overlapping act() calls" and left the _next_ test's fresh render unable to find its
  own elements (a real cross-test failure, not a flake) until every press was awaited.
- **Not done on purpose**: the ten linked screens themselves, and the logout confirmation popup (each a
  later session); a "Card" design-system primitive (not needed yet); persisting the mocked profile (no
  backend, `08_AGENT_TODO.md` Phase F still open).

### D-51 — Profile 3 "Mes préférences" (route `/profile/preferences`); new `Slider` primitive, no new dependency

Sprint 5, skipping écran 2 ("Modifier mon profil") on explicit request — the brief named this screen
next. `PreferencesScreen` replaces the `ProfilePlaceholder` that `/profile/preferences` rendered since
D-50, from the mockup's tile 02: types d'expériences and ambiance (multi-select tile grids), budget and
distance (sliders), "Réinitialiser" and "Enregistrer mes préférences".

- **No slider existed and none of `react-native`'s installed dependencies provide one** (no
  `@react-native-community/slider`, no gesture-handler). Built `Slider` (`components/ui/`, the
  `06_DESIGN_SYSTEM.md` "Core" component this sprint needed for the first time) on `PanResponder`
  (React Native core) instead of adding a dependency for something a touch handler already core to the
  platform can do — same reasoning as every other "build it on what's installed" choice in this project
  (D-41's `expo-blur` was added only because a flat view genuinely couldn't fake a blur; a drag gesture
  needs no such thing). `accessibilityRole="adjustable"` + `accessibilityValue` + increment/decrement
  `accessibilityActions` make it usable without a drag gesture (VoiceOver/TalkBack).
- **`react-hooks/refs` (this project's stricter-than-usual lint config, seen before in D-48's
  `BackHandler` note) rejected the obvious `useRef(PanResponder.create(...)).current` lazy-init**, and
  then rejected passing a ref-reading closure into `PanResponder.create` even from inside a `useMemo`
  factory. Fixed by dropping the ref entirely: track width lives only in `useState` (already needed for
  rendering the thumb's position), read directly by the touch handler closed over inside the `useMemo`
  factory (deps: `min, max, step, onValueChange, trackWidth`) — no ref anywhere in the component.
- **"Types d'expériences" reuses onboarding's exact 8-item vocabulary, not a new one.** The mockup's
  labels (Restaurants, Bars & Soirées, Culture, Nature, Activités, Shopping, Bien-être, Événements) are
  verbatim `onboarding.interests.*` (`InterestsScreen.tsx`, D-25) — same ids, same i18n keys, reused
  directly rather than duplicated. `EXPERIENCE_TYPES` (`features/profile/data/experienceTypes.ts`)
  re-declares the small id/icon list (including a cross-feature import of onboarding's `RunnerIcon`/
  `LotusIcon` — same reuse precedent as `MapPreviewRow` reusing onboarding's `MapPreview`, D-48) rather
  than relocating onboarding's own file, to avoid touching an already-validated screen for this session.
  `InterestTile` (`features/onboarding/components/`) is reused as-is, cross-feature, for the same reason
  — it already is exactly "an icon + label checkbox tile"; a percentage-free numeric `width`/`height` is
  computed from `useWindowDimensions()` instead of onboarding's own height-constrained shrink logic,
  since this screen scrolls and isn't fitted into one fixed-height step.
- **"Ambiance" is a new, screen-specific vocabulary — not a reuse of `Mood` or `Company`.** The mockup's
  six tags (Calme, Festive, Romantique, Entre amis, En famille, Solo) mix mood-like and company-like
  concepts in one flat multi-select set that matches neither the onboarding `MoodScreen`'s own 9-tile
  vocabulary (single choice) nor `Company` (single choice, and wrong grammatical gender for "ambiance",
  a feminine noun: "Festive" here, "Festif" everywhere else in the app). New ids/keys
  (`preferences.ambiance.*`, `features/profile/data/ambianceOptions.ts`), icons mirrored from the
  onboarding Mood screen's own choices for the concepts they share, for visual consistency.
- **New `ProfilePreferences` type (`types/user.ts`), not the existing `UserPreference`.** The onboarding
  model's budget is a discrete `BudgetRange` bucket; this screen's budget is a continuous per-person
  euro amount on a slider — genuinely different shapes, not a duplicate. Documented as local screen
  state only, like the rest of this screen; no repository, since there is nothing to fetch (the mockup's
  own default selection is hard-coded local state, the same pattern as every onboarding question
  screen's own pre-selected default, D-21 to D-25) and "Enregistrer" only needs to simulate a delay.
- **"Enregistrer mes préférences" simulates a save then `router.back()`** (700 ms, no next screen to
  push to — this is a settings save, not a flow step) instead of a toast/confirmation UI, which nothing
  else in the app has yet. "Réinitialiser" resets all four fields to the same mockup defaults, front-end
  only, per `02_MVP_SCOPE.md`'s "Tout reste mocké" for this screen.
- **A `fireEvent(el, 'accessibilityAction', …)` call needed the same await as `fireEvent.press`** (D-50
  already found this for presses): an unawaited accessibility-action fire in one test corrupted the
  _next_ test's render the same way, confirming the rule is about every `fireEvent` call, not just
  `.press`.
- **Not done on purpose**: dragging the slider thumb itself isn't exercised by a test (RNTL fires
  `PanResponder` callbacks by calling the underlying gesture responder handlers directly, which is
  possible but adds little over the already-covered increment/decrement path that exercises the same
  `onValueChange` wiring); persisting preferences (no backend); the other nine `/profile/*` placeholders
  (each its own session).

### D-52 — `StickyActionFooter` extracted from experience detail's CTA footer; Preferences reuses it

Polish pass, explicitly scoped to presentation/positioning only, requested before moving past
`/profile/preferences`: "Enregistrer mes préférences" moves from an inline button at the end of the
scrollable content to a floating sticky footer, matching experience detail's "Créer mon parcours"
(D-49) exactly rather than inventing a second visual language for the same kind of control.

- **`ExperienceDetailFooter` (`features/experiences/components/`) is promoted to
  `StickyActionFooter` (`components/ui/`), not duplicated.** Its exact rendering — a full-bleed
  `bg-surface` bar with a top border sitting flush against the screen's edges (not a floating
  inset/rounded card), `MotiView` slide+fade tied to a `visible` prop, safe-area bottom padding — is
  preserved byte-for-byte; only the API changed shape (`icon`, `disabled` and `variant` became
  optional, generic props instead of a hardcoded `Sparkles` trailing icon and an implicit `primary`
  Button). `bottomInset` was dropped as a prop: the component now calls `useSafeAreaInsets()` itself
  (item 4 of the brief: the shared component owns safe-area handling, not each screen), which is a
  behavior-preserving change since it reads the exact same context either way.
- **`useCtaVisibility` (scroll-direction/scroll-end visibility) moved from `features/experiences/` to
  `hooks/`**, alongside `useScrollDirection` — it was already 100% generic (no `Experience` reference
  anywhere in it), so it belongs with the other cross-feature hooks rather than a single feature
  folder, and Preferences needed the exact same behavior (item 7 of the brief: reuse the hook, don't
  re-derive the logic). `FOOTER_CLEARANCE` was renamed `STICKY_FOOTER_CLEARANCE` and now lives with the
  component it describes.
- **`ScrollScreen` gained two additive, optional props** (`onScrollEndDrag`/`onMomentumScrollEnd`,
  forwarded straight to its `ScrollView`) instead of switching `PreferencesScreen` to a raw
  `ScrollView` like `ExperienceDetailScreen` uses — `ScrollScreen` already owned the safe-area/padding
  boilerplate Preferences relies on, and every existing call site is unaffected by two new, unused-by-
  default props (same "additive prop" precedent as `Button`'s `loading`/`leadingIcon`, D-29, and
  `Chip`'s `icon`, D-45).
- **`ExperienceDetailScreen`'s own behavior and tests are unchanged.** The refactor only swaps which
  file the footer/hook come from and how `bottomInset` is supplied; `ExperienceDetailScreen.test.tsx`
  (including the two scroll-hide/reveal tests) passes with zero modifications, which is the actual
  proof "no visual/functional regression" holds — not just a visual read.
- **Preferences' footer is not centered/inset with margins on every side**, despite an earlier draft of
  this brief describing a floating card that never touches any screen edge — the _actual_,
  already-validated experience detail footer is a full-width bar flush to the left/right/bottom edges
  (safe-area bottom padding only, no card/rounded/glass treatment), and item 5 of this brief is explicit
  that the new footer must match that "EXACTEMENT". Reusing the real implementation, not the
  abstract description that didn't match it, is what keeps "no two different systems for the same
  thing" true.
- **Not done on purpose**: no visual change to either screen's footer beyond what "share one component"
  requires; `PreferencesScreen`'s own save/reset business logic is untouched, only its CTA's
  presentation moved.

## Navigation (2026-09-22)

### D-53 — Native back gesture disabled by default; button-only back navigation

Global navigation rule, not scoped to one screen: back navigation should be controlled by ROAM's own
UI (a back button calling `router.back()`), not the platform's native edge-swipe/interactive-pop
gesture. `AppRoutes.tsx`'s root `<Stack>` now sets `gestureEnabled: false` in its `screenOptions`,
applying to every `Stack.Screen` (including the ones inside each `Stack.Protected` block — it's one
navigator, `Stack.Protected` only conditions which screens are registered) unless a screen overrides
it.

- **Audit before changing anything, per the brief**: grepped the whole app for existing
  `gestureEnabled`/`screenOptions` usage (only `gallery/[id]` had one, `false`, from D-48) and read
  every route file plus `DECISIONS.md` for any screen documented as relying on the gesture. Two
  patterns turned up, both genuine, both kept working:
  - **The entire onboarding question flow has no back button at all** — `MoodScreen`, `TimeScreen`,
    `BudgetScreen`, `LocationScreen`, `InterestsScreen`, `ProfileCreationScreen` and `ReadyScreen`
    (verified in code: none renders a `Pressable`/back control for it). D-21 says this outright ("No
    visible 'Retour' — the mockup has none; going back is the native gesture / hardware button of the
    stack"), D-27 confirms it for the profile-creation loader ("the back gesture stays enabled") and
    that going back from `ready` lands on `interests` (`profile-creation` is `replace`d out of
    history, so gesture-back from `ready` is the _only_ way there). Disabling the gesture on any of
    these would have silently trapped the user going forward-only through onboarding.
  - **`AuthEntryScreen` has no back button either** — D-29 says so explicitly ("the mockup's
    Login/Register/Forgot-password tiles all have it, Entry doesn't"), and it's reached by `push` from
    Welcome (D-30), so the gesture is its only way back. Login, Register, Forgot password, Reset code
    and New password all _do_ have `AuthTopBar` (a real back button) — they get the new default
    (gesture off) with zero loss, since the button still works.
  - **`ResetSuccessScreen` has no back button either, but this is not an exception**: D-36 is explicit
    that this is deliberate ("this is the end of a flow, not a step in one"), i.e. the screen was never
    meant to be reachable backward at all — the previously-enabled default gesture was an unintentional
    gap against the screen's own documented intent, not a validated behavior to preserve. It gets the
    new default (gesture off) like every undocumented screen.
- **Each exception is a `Stack.Screen`-level `options={{ gestureEnabled: true }}` override, commented
  in place in `AppRoutes.tsx`** with its reason and source decision — not a `Stack.Protected`-level
  `screenOptions` override, since that block also contains screens (Login, Register, the rest of the
  forgot-password sub-flow) that should get the new default, not the exception.
- **Carousels, galleries, sliders and any Reanimated/`PanResponder` gesture are architecturally
  unrelated** to the Stack navigator's own edge-swipe-back (a `react-native-screens`/native-stack
  feature, not a JS touch responder) — nothing about them needed touching, and the existing
  `ExperienceHero.test.tsx`/`ExperienceGalleryScreen.test.tsx`/`useCtaVisibility.test.ts` suites (and
  every route-tree test) pass unmodified, which is the practical proof.
- **Not unit-tested directly**: `gestureEnabled` isn't a prop any existing test asserts on (a `grep`
  turned up zero precedent, including for `gallery/[id]`'s own D-48 setting) — it configures
  `react-native-screens`' native container, not something RNTL's rendered tree exposes as a queryable
  element, the same category of "not meaningfully testable under this test setup" `D-49` already
  documents for the header/footer crossfade. The full existing suite (44 files, 296 tests, every
  route-tree test included) was run instead to confirm nothing broke, which is what an untestable
  option's regression check actually looks like here.
- **`docs/DEVELOPMENT.md`** gained a "Navigation back gesture" convention (the rule, the exception list
  and why the "internal gestures are unaffected" claim holds) and
  **`docs/SCREEN_INTEGRATION_WORKFLOW.md`**'s validation step gained the three checklist items the
  brief asked for.
- **Not done on purpose**: no change to any screen's own back-button UI or `router.back()` calls (the
  brief is explicit this is presentation/config only); no new "swipe to dismiss" pattern introduced
  anywhere it didn't already exist.

### D-54 — Global toast feedback (`react-native-toast-message`); Preferences' save gets a success toast

Polish pass: "Enregistrer mes préférences" now shows a success toast after the mocked save resolves,
instead of only navigating back silently. No toast/snackbar mechanism existed anywhere in the app
before this (grepped for "toast"/"snackbar"/"notification" across `src/`, nothing).

- **`react-native-toast-message@2.5.2`** (latest stable, no beta — `3.0.0-beta.1` exists and was
  skipped), added via `pnpm add` rather than `expo install` since it's not an Expo-maintained package
  (same distinction as `moti`/`lucide-react-native`, both plain `pnpm add`s). Zero runtime dependencies
  and no native module (confirmed by inspecting its own `package.json` and source — `GestureContext` is
  a plain `React.createContext`, not `react-native-gesture-handler`), so it needed no compatibility
  bridging for RN 0.86/Expo 57 and works the same in Expo Go as a dev build.
- **Mounted once, at the app root** (`<AppToast />` in `app/_layout.tsx`, a sibling of `<AppRoutes />`,
  after it in render order so it stacks on top): the library's own `Toast.show()`/`Toast.hide()` are
  already a global singleton API by design (no Context/Provider needed to call them from anywhere), so
  "mount once" here means the _visual_ host, not a data provider.
- **`showToast(variant, { title, message? })`** (`lib/toast.ts`) is the only sanctioned entry point —
  no screen imports `react-native-toast-message` directly. Only `'success' | 'error'` exist today
  (this sprint's actual need, per the brief's own "ne développe pas un système complet de
  notifications"); `'warning' | 'info'` are a type-and-config-case addition later, not a redesign.
- **ROAM-styled `config`, not the library's default look**: `AppToast` renders a small
  `surfaceElevated` card (icon + `Text variant="label"` + optional secondary line) through the
  library's `config` prop, reusing existing tokens/`Text`/Lucide icons (`circle-check`/`circle-x`) —
  the same "shadow via explicit style props, not a `shadow-*` className" convention `RoamTabBar` already
  established, sized down for a small card instead of a full bar.
- **Always top-positioned** (`position="top"`, offset by `useSafeAreaInsets().top`): the brief asks
  that the toast never collide with `RoamTabBar` or a screen's `StickyActionFooter`, both bottom-
  anchored; anchoring the toast to the opposite edge sidesteps that class of collision entirely instead
  of computing per-screen bottom clearance.
- **The error path is real, working code, but not reachable through today's mocked save.** `wait()`
  (`PreferencesScreen.tsx`) never rejects — no screen's simulated request does anywhere in this app
  (`AuthRepository.login`/`logout`, D-29/D-31's "any well-formed input succeeds", never reject either).
  `handleSave`'s `try/catch` calls `showToast('error', …)` on a rejection, which is genuine
  forward-compatible wiring for when a real save exists, not dead code — but it can't be exercised by
  driving `PreferencesScreen` itself without inventing an arbitrary failure the brief's own "ne modifie
  pas la logique de préférences" argues against. The error _rendering_ (card, icon, a11y role) is fully
  unit-tested at the `AppToast` level instead, which exercises the exact same code the real failure
  path would hit.
- **Auto-dismiss is not unit-tested.** `ToastUI`/`AnimatedContainer` (library internals) never unmount
  a shown toast's content — only an `Animated.Value`-driven style changes — so
  `queryByText(...).toBeNull()` after advancing fake timers can't observe it; the same "not meaningfully
  testable under this test setup" category `D-49` already documents for Reanimated-driven visibility.
  The auto-hide _timer itself_ (`setTimeout(cb, visibilityTime)`) is plain, well-understood library
  code, not something this app's own logic needs to re-prove.
- **Reduced motion**: `AppToast` shortens the library's `animationConfig` duration to 120 ms instead of
  its spring default when `useReduceMotion()` is true — the same "shorten, don't fully strip" compromise
  used for `HomeHeader`/`ExperienceDetailFooter`, since the library exposes one opaque animated value,
  not separately toggleable translate/opacity/scale channels.
- **Not done on purpose**: `warning`/`info` variants (not needed this sprint); wiring `showToast` into
  any other screen (only Preferences' save asked for it); a queue for multiple simultaneous toasts (the
  library's own `// TODO: use a queue when Toast is already visible` — out of scope, and Preferences'
  own `if (saving) return` already prevents overlapping saves from ever triggering two toasts back to
  back).

### D-55 — `StickyRevealHeader` extracted for future screens; experience detail's own header untouched

Explicit brief: generalize experience detail's scroll-reveal header (transparent → background/title
fade in once the hero's title scrolls out of view, D-49) into a reusable component **for future
screens**, without migrating or risking the already-validated `ExperienceDetailHeader`.

- **New component, not a refactor of the existing one.** `StickyRevealHeader` (`components/ui/`) is
  written fresh, informed by `ExperienceDetailHeader`'s logic (same `scrollY`/`revealOffset`/
  `fadeRange` crossfade via `interpolate`+`useAnimatedStyle`, same absolute/`zIndex`/`box-none`
  positioning), but `ExperienceDetailHeader.tsx` and `ExperienceDetailScreen.tsx` are **not touched** —
  zero risk to a validated screen, confirmed by `ExperienceDetailHeader.test.tsx`/
  `ExperienceDetailScreen.test.tsx` passing unmodified.
- **Why not extract in place instead**: `ExperienceDetailHeader` hardcodes three specific actions
  (back/share/favorite, not a slot API) and fixed white-on-black-backdrop icons — correct for a header
  that only ever sits over a photo, but not a safe default for an unknown future screen that might not.
  Reshaping it into a generic slot-based, theme-aware component _in place_ would have been the kind of
  "modify a validated screen for a future, unconfirmed need" the brief explicitly rules out (item 6).
- **API is two `ReactNode` slots (`leftSlot`/`rightSlot`) instead of fixed action props**, the same
  "component owns chrome, screen owns content" split `StickyActionFooter` already established (D-52):
  the header doesn't know or care what a future screen puts in them (an `IconButton`, nothing, two
  buttons) — no assumed action set to get wrong.
- **Safe area is internal** (`useSafeAreaInsets()` inside the component, not a `topInset` prop) — same
  precedent as `StickyActionFooter` dropping its `bottomInset` prop (D-52): the component owns safe
  area per the brief's own list of responsibilities, not the screen.
- **Reveal background is blur + a `surface`-tinted wash, not blur alone** — reusing `RoamTabBar`'s exact
  glass recipe (`hexToRgbChannels(colors.surface)` at 0.75/0.85 alpha, D-41) instead of
  `ExperienceDetailHeader`'s plain `BlurView`. A bare blur only reads as "a background" over a photo;
  since this header is meant for screens that may not have one, the wash makes the reveal legible
  either way — a deliberate generalization, not a copy of the original's exact visual.
- **`docs/DEVELOPMENT.md` gained a "Sticky headers with a scroll-position reveal" convention**,
  explicit that existing headers (`ExperienceDetailHeader`, `HomeHeader`, `AuthTopBar`, …) are
  **not migrated now** and will be harmonized in one dedicated pass at the end of the project — not
  screen-by-screen as new components appear.
- **Not done on purpose at the time**: adopting `StickyRevealHeader` on any existing screen — Preferences
  got it the same day, on request, see D-56; a `children`/arbitrary-content slot beyond title + two
  action slots (nothing concrete needs it yet — additive later if a real screen does); migrating any
  other header.

### D-56 — `StickyRevealHeader` applied to Preferences (first real adoption)

Same-day follow-up, explicit request to see `StickyRevealHeader` (D-55) on a real, already-shipped
screen rather than only as an unused primitive. Chosen over Profile's main screen or a new demo-only
screen (asked the user; Preferences was the answer) — nothing else about Preferences' design,
sliders, tiles or save/reset logic changed.

- **No hero to reveal past, unlike experience detail — so the screen needed a small restructure, not
  just a header swap.** Preferences never had a separate "big in-content title" the way experience
  detail's H1 sits below its hero: the title _was_ the header row. Moving back/"Réinitialiser" into
  `StickyRevealHeader`'s `leftSlot`/`rightSlot` (pinned, always visible — unchanged from before) only
  works if something still occupies the content's own top once the floating header's title is hidden
  at rest, so a plain `Text variant="h2"` "Mes préférences" (`accessibilityRole="header"`) was added at
  the top of the scrollable content, directly above the existing intro paragraph. This is new content
  in the screen, not a copy of chrome — same as experience detail's own H1 title.
- **`HEADER_REVEAL_OFFSET = 56`** is a visually-tuned approximation of that new heading's height, the
  same "proxy, not a pixel-exact measurement" precedent `revealOffset` already sets in experience
  detail (D-49) — expect it to need a small tweak once seen on a real device, not a sign of a deeper
  problem.
- **Back/"Réinitialiser" keep their exact previous look** (a plain `Pressable` + `ChevronLeft`/`Text`,
  `colors.text`/`primary`, no circular backdrop) — unlike experience detail's white-icon-on-black-
  backdrop treatment, which assumes a photo is always underneath. Preferences has no such photo, so
  the backdrop styling wouldn't have made sense; keeping the pre-existing, already-legible plain style
  was the safer, minimal choice over inventing a new backdrop rule for one screen.
- **Padding math**: `ScrollScreen`'s own `SafeAreaView` already offsets content by `insets.top`, so the
  content's added `paddingTop` only needs `STICKY_REVEAL_HEADER_HEIGHT` (+ a little breathing room) —
  adding `insets.top` again would have double-counted it and pushed the content down twice as far as
  intended. Caught before running anything, by re-deriving the two containers' coordinate spaces rather
  than guessing.
- **Not verified on a physical device/simulator by the agent** — this environment has no simulator
  attached. All checks that don't require eyes on a real screen (types, lint, the full existing test
  suite, unmodified) pass; the visual result (crossfade timing, spacing) still needs a look on-device,
  which is exactly what this change was requested for.

### D-57 — Profile 4 "Mes favoris" (route `/profile/favorites`); no separate Lieux/Expériences data split

Sprint 5, one screen at a time: `FavoritesScreen` (`features/profile/`) replaces the `ProfilePlaceholder`
that `/profile/favorites` rendered since D-50, from the mockup's tile 03 — thumbnail rows, a heart to
remove, an empty state, `StickyRevealHeader` (D-55/D-56). This is the _profile_ favorites screen, distinct
from the `/favorites` tab (still sprint-3 placeholder content, untouched this session — D-50 already
reserved that separation).

- **Backed entirely by `Experience.isFavorite`, not a new `Place`-favoriting system.** The mockup shows a
  "Lieux"/"Expériences" segmented control, but nothing in the current data model draws that line: every
  mock entity (including single-location items like "Rooftop Sunset" or "Musée d'Art Moderne") is an
  `Experience`, already carrying every display field a "Lieux" row would need (image, category, location,
  price). `Place` (`types/place.ts`) is unused scaffolding kept only to prove the repository pattern
  (D-09) — two fields, no `list()`, two fixture rows, referenced nowhere in the UI. Building it out to
  back a second tab would duplicate fields `Experience` already has under a different name, exactly what
  `docs/SCREEN_INTEGRATION_WORKFLOW.md`'s "reuse before creating" argues against. The `cat-experience`
  category that could in principle separate "a place" from "a composed outing" is itself unused by every
  mock experience, so a category-based split would always leave one tab empty — decorative, not
  functional. The task's own functional spec talks only about "expériences" throughout, which matches this
  choice. **Not reproduced on purpose**; revisit if/when a real place-level favoriting concept exists.
- **Removal is local component state on top of the mock seed (`useFavoriteExperiences`), not a shared
  favorites store.** Same known gap as Home's own toggle (`useFavoriteExperienceIds`, D-45): this screen
  and Home do not sync with each other (no backend, no global store yet) — removing a favorite here
  doesn't un-favorite it on Home and vice versa. Forward-compatible: swapping the hook's body for a real
  `FavoriteRepository` later doesn't change the screen's props.
- **Five mock experiences were seeded `isFavorite: true`** (`exp-dinner-view`, `exp-nature-getaway`,
  `exp-jazz-night`, `exp-mama-shelter`, `exp-bellevilloise`) so the screen has real content instead of an
  empty list by default — matching the mockup's own populated state. Deliberately **not**
  `exp-rooftop-sunset`, `exp-lake-hike` or `exp-modern-art-museum` (the three `isPopular` experiences):
  `HomeScreen.test.tsx`'s favorite-toggle test counts "Ajouter aux favoris"/"Retirer des favoris" buttons
  within Home's own "populaire" section and assumes all three start unfavorited, and
  `ExperienceDetailScreen.test.tsx` defaults to `exp-rooftop-sunset` assuming the same — found by running
  the full suite after the first seeding attempt, not by inspection alone.
- **New feature-scoped `FavoriteExperienceRow`** (`features/profile/components/`), a full-width list row
  (thumbnail, title, "category · location", a heart button), not a reuse of Home's `ExperienceCard`: that
  component is a wide, image-heavy horizontal-scroll card (fixed 260px width) built for Home's carousel
  sections, not a dense vertical list — reusing it verbatim would not match the mockup's row density. The
  heart button reuses the exact nested-`Pressable`-inside-a-`Pressable` pattern `ExperienceCard` already
  established (tapping it doesn't also trigger the row's own navigation, D-45) and the same
  `home.favoriteRemove` label (identical action, no new key).
- **Category label resolved via the existing `useCategories()`/`getCategoryLabel()` pair**
  (`hooks/useCategories.ts`, `features/experiences/lib/categoryLabel.ts`), cross-feature reuse rather than
  a second resolver — same precedent as `MapPreviewRow` reusing onboarding's `MapPreview` (D-48).
- **Header follows Preferences' own restructure** (D-56): no hero to reveal past, so a plain in-content
  `Text variant="h2"` stands in for the title until `StickyRevealHeader`'s own title crossfades in past
  `HEADER_REVEAL_OFFSET`. Back button only — no right-side action (no reset/settings equivalent here).
- **Empty state reuses `favorites.empty`/`favorites.discover`**, i18n keys already sitting in both locale
  files, unused, since before this screen was built — no new key needed. "Découvrir" pushes to
  `/discover`, the same destination Home's own "Voir tout" links use.
- **Animation**: `FadeInUp` per row with a small stagger (`Math.min(index * 60, 240)` ms), consistent with
  the rest of the app's unguarded `FadeInUp` usage (`ProfileScreen`, `SimilarExperiencesSection`) — not
  gated behind `useReduceMotion()`, matching that same precedent (a single-shot fade+translate, not a loop
  or rotation). No exit animation on removal: the item disappears on the next render, same "instant" result
  the brief asked for; `AnimatePresence` isn't used anywhere else in this codebase yet, so adding it here
  for one interaction would be a new pattern, not a reuse.
- **Not done on purpose**: place-level favoriting (see above); a shared cross-screen favorites store (no
  backend, `08_AGENT_TODO.md` Phase F); swipe-to-delete (the heart-tap removal already matches the app's
  one existing favorite-toggle affordance, no need for a second gesture); a route-tree test (this screen's
  test is a standalone component test, same convention `PreferencesScreen.test.tsx` already set — no
  `/profile/*` sub-route has one).

### D-58 — Profile 5 "Mon historique" (route `/profile/history`); `Experience` extended again, dynamic category filter

Sprint 5, one screen at a time: `HistoryScreen` (`features/profile/`) replaces the `ProfilePlaceholder`
that `/profile/history` rendered since D-50, from the mockup's tile 04 — category filter chips, entries
grouped by "Cette semaine"/"Ce mois-ci"/"Plus tôt", each row showing a thumbnail, title, "category ·
location", a visit date and a chevron (no removal interaction — `02_MVP_SCOPE.md` §10 only asks to "show
completed experiences", unlike Favorites' explicit removal requirement).

- **`Experience` gained `visitedAt`/`historyPeriod` instead of a new history/outing entity** — same choice
  as `isFavorite` (D-57): `Experience` already carries every display field a history row needs, so a
  parallel "CompletedOuting" type would duplicate them under a different name. `visitedAt` is a plain,
  already-formatted string (`"Sam. 16 mars 2024"`), the same "no separate formatting layer for mock data"
  convention `ExperienceReview.date` already set (D-09/D-10) — it is only ever displayed, never parsed.
  `historyPeriod` (`'thisWeek' | 'thisMonth' | 'earlier'`) is a **precomputed** bucket, not derived from
  `visitedAt` at render time: the mock dates are fixed in the past, so comparing them against the real
  "today" would keep sliding every entry into `earlier` as real time passes — authoring the bucket
  directly keeps the screen's grouping stable regardless of when it's opened.
- **Six mock experiences were seeded** (`exp-rooftop-sunset`, `exp-modern-art-museum` → this week;
  `exp-slow-afternoon`, `exp-panoramic-walk` → this month; `exp-picnic-park`, `exp-hasard-ludique` →
  earlier), chosen to be unaffected by the constraint D-57 already found the hard way: three of them
  (`exp-rooftop-sunset`, `exp-modern-art-museum`, and D-57's own picks) overlap with `isPopular`/
  `isFavorite` fixtures, but `visitedAt`/`historyPeriod` are brand-new fields nothing else reads, so unlike
  `isFavorite` they cannot affect any existing test's assertions regardless of which experiences carry
  them — confirmed by running the full suite, not just inspected.
- **Filter chips are derived from the history pool's own categories, not a fixed "Tout/Restaurants/
  Bars/Culture" list copied from the mockup.** The mockup shows a fixed four; reproducing it verbatim would
  either go stale against whatever experiences actually carry `historyPeriod`, or need inventing a
  distinction the data doesn't drive. Deriving "Tout" + one chip per category actually present (first
  appearance order, via `useCategories()`/`getCategoryLabel()` — the same cross-feature reuse Favorites
  already established, D-57/D-48) means every generated chip is guaranteed at least one match, which also
  sidesteps designing a "no results for this filter" state entirely — selecting any chip can only ever
  narrow the list, never empty it outright (only clearing all history could do that, which is the existing
  empty state).
- **New feature-scoped `HistoryEntryRow`** (`features/profile/components/`), `FavoriteExperienceRow`'s
  shape (thumbnail, title, "category · location") minus the heart, plus a visit date line and a trailing
  chevron (`ChevronRight`, same icon/size/color `ProfileMenuRow` already uses for "this row opens
  something") instead of a nested `Pressable` action — no second interaction to protect from bubbling here.
- **Section headers reuse Home's `SectionHeader`** (title only, no `onSeeAll`) rather than a new heading
  component — same cross-feature reuse precedent as `SimilarExperiencesSection`.
- **`history.title` was corrected from "Mes expériences" to "Mon historique"/"My history"**, matching
  `profile.history` (the menu row's own label, and what the mockup's header actually shows) — the key
  existed, unused, since before this screen was built but held a different, never-shown string; the
  mismatch would have made the same destination show two different names depending on which screen you
  came from. Same kind of stale-key fix as D-23. `history.redo` ("Refaire") stays unused: the mockup's
  history rows show only a chevron, no per-row secondary action — left in place rather than removed, same
  "unused key left in place" precedent as D-25's `eyebrow`/`selected`/`addInterest…`.
- **New `history.filters.all` / `history.sections.{thisWeek,thisMonth,earlier}` keys**, added to both
  locale files (parity test enforces it).
- **Empty state reuses `history.empty`, and "Trouver une sortie" (`history.findOuting`) pushes to
  `/home`**, not `/discover` — unlike Favorites' "Découvrir" (D-57), which matches `/discover`'s own name
  almost literally, "Trouver une sortie" ("find an outing") is `03_UX_SCREENS_AND_FLOWS.md`'s own
  description of Home's purpose ("Purpose: start a new outing"), so Home is the more literal destination
  for this specific wording.
- **Animation**: `FadeInUp` per row, stagger continues across section boundaries (a single running index
  rather than resetting per section) so the whole list reads as one progressive reveal, not three separate
  ones — same unguarded-`FadeInUp` precedent as Favorites (D-57).
- **Not done on purpose**: a "no results for this filter" state (see above, structurally unreachable);
  removing/editing a history entry (not in scope, `02_MVP_SCOPE.md` §10); a route-tree test (standalone
  component test, same convention as Favorites/Preferences).

### D-59 — Profile 6 "Mes statistiques" (route `/profile/statistics`); `react-native-gifted-charts` added, used only for the donut

Sprint 5, one screen at a time, from a design mockup this session was told is final ("le design est déjà
défini... ne le redesign pas"): `StatisticsScreen` (`features/profile/`) replaces the `ProfilePlaceholder`
that `/profile/statistics` rendered since D-50 — time-range chips, three summary cards, three breakdown
sections (genres, mood donut, cities), an insight card.

- **`react-native-gifted-charts` was added (`pnpm add`, 1.4.78), used for exactly one chart: the mood
  donut.** No chart library existed before this screen (grepped `package.json` and `src/` for
  `chart|gifted|victory|d3-|skia`, only `react-native-svg` — already a dependency, used for icons/
  illustrations, not a charting layer). Its only real peer dependency, `expo-linear-gradient`, is already
  part of the Expo SDK, so nothing new needed native linking or a dev-client rebuild — it works in Expo
  Go. `react-native-gifted-charts`/`gifted-charts-core` ship untranspiled ESM, so both were added to
  `jest.config.js`'s `esmPackages` list (same reason `moti`/`lucide-react-native` are there) — the test
  suite failed with "Unexpected token 'export'" until they were, the same failure mode `react-native-css-
interop` already documents for this project's ESM handling.
- **The genre/city proportion bars are deliberately NOT built on the charting library.** They are a label
  - percentage + a single horizontal fill, not a chart with axes/gridlines/categories — the library's
    `BarChart` is shaped for that, and fitting a plain proportion-bar row into its API would mean fighting
    its own bar-chart rendering for a shape it isn't built for (component/spacing/radius all governed by its
    own props, not NativeWind classes). `PercentBarRow` (`features/profile/components/`) is a themed `View`
    instead: a full-width track (`bg-border`) with a colored fill sized to the percentage, animated in via
    `MotiView`'s `scaleX` (`transformOrigin: 'left'`, a plain RN style prop, no extra dependency) — full
    control over the exact look, same "build it on what's installed" reasoning as `Slider` (D-51). The mood
    donut, by contrast, is a genuine circular chart (real arc math for 5 proportional slices) — the one case
    in this screen where hand-rolling would cost more than it's worth, so it uses the library's own `PieChart`
    (`donut`, `innerRadius`, `centerLabelComponent` for "N sorties" in the middle) instead.
- **New decorative color tokens**: `moodBreakdownColors` (5 named hues: relaxed/curious/festive/romantic/
  family) and `genreChartColors` (6 categorical hues, cycled by index) in `theme/tokens.ts`, plus
  `chartBlue(OnDark)`/`chartViolet(OnDark)` in `palette.ts` — the only two genuinely new hues; `relaxed`/
  `festive`/`romantic` reuse the exact same `derived.moodGreen`/`moodOrange`/`moodCoral` constants
  `moodAccents` already uses for the onboarding mood tiles' icons (same concepts, so same colors), rather
  than inventing parallel ones. `moodAccents` itself (typed `MoodAccent = 'relaxed'|'festive'|'romantic'`,
  scoped to the onboarding mood tiles) was **not** extended with `curious`/`family` and reused here: it's a
  different screen's decoration with its own narrower scope, and widening its type to fit an unrelated
  chart would couple the two for no shared benefit — a new, separate token pair is the safer, minimal
  choice (same "why not extract in place" reasoning `StickyRevealHeader` used against reshaping
  `ExperienceDetailHeader`, D-55).
- **The three summary cards reuse `UserStats` (`useCurrentUser`), not new data** — "12 Sorties / 36 Lieux
  découverts / 8 Favoris" are the exact same numbers the main Profile screen already shows (`ProfileStats`,
  D-50); the donut's center label reuses `stats.outings` again, so both places on this one screen agree.
  **`StatCard` is a new, separate component from `ProfileStats`**, not a reuse: the mockup's three cards
  are individually bordered with an icon above the number, `ProfileStats` is one continuous row divided by
  vertical rules with no icons (mockup tile 01) — same data, a genuinely different presentation the brief
  asked not to simplify away, so forcing `ProfileStats`' shape onto it would have meant redesigning one of
  the two mockups, not "reusing a component."
- **Genre labels reuse `EXPERIENCE_TYPES`** (`features/profile/data/experienceTypes.ts`, D-51) for both the
  id list and the i18n key/label — the mockup's six genres (Culture, Restaurants, Bars & Soirées, Nature,
  Activités, Événements) are an exact subset of that already-built 8-item vocabulary (itself reused from
  onboarding's "Centres d'intérêt"), so `GENRE_BREAKDOWN` (`data/statisticsBreakdown.ts`) only carries an
  `id`/`percentage` pair per genre and looks the label/icon up from `EXPERIENCE_TYPES` at render time —
  the third reuse of that same vocabulary in this codebase, not a fourth copy of the label strings.
- **"Ton humeur lors des sorties" is its own new vocabulary (`relaxed/curious/festive/romantic/family`),
  not a reuse of `Mood` or the Preferences screen's `AMBIANCE_OPTIONS`.** Neither matches: `Mood`'s own
  labels are "Calme"/"Découvrir" (context/onboarding wording, not "Détendu"/"Curieux"), and
  `AMBIANCE_OPTIONS` has no "curious" concept at all and spells "festive" as "Festive" not "Festif" — same
  "screen-specific vocabulary, not a forced reuse of an almost-but-not-quite-matching enum" reasoning
  `AMBIANCE_OPTIONS` itself already used against `Mood`/`Company` (D-51). New `statistics.moods.*` i18n
  keys.
- **All breakdown numbers (genres/moods/cities/the three cards) are static, curated mock content — none of
  it is computed from the favorites/history pools.** Same "plain mock content" precedent as `UserStats`
  itself and place/experience descriptions (D-09/D-50): nothing in this prototype tracks a real per-outing
  genre, mood or city yet, so inventing a computation over the 6 history entries or 5 favorites would be a
  fake precision this MVP doesn't have data to back.
- **Time-range chips ("Tout"/"30 jours"/"6 mois"/"1 an") are local selection state only — they do not
  change any displayed number.** Building four genuinely different datasets for a value nothing else in
  this app tracks per-range would be invented precision, not a real feature; the chips are a faithful,
  interactive reproduction of the mockup's own control (single-choice, "Tout" selected by default), wired
  the same "control exists, not yet backed by real logic" way this prototype already accepts elsewhere
  (the onboarding `LocationScreen`'s position/city choice, D-24; the auth entry screen's Google/Apple
  buttons with nowhere to go yet, D-29).
- **Header follows Favorites'/History's own restructure** (D-57/D-58): no hero to reveal past, a plain
  in-content `Text variant="h2"` stands in for the title until `StickyRevealHeader`'s own title crossfades
  in. `profile.statistics` ("Mes statistiques") is reused directly for both the menu row and this screen's
  own title — unlike `history.title`, which needed a fix, this key already matched, nothing to change.
- **Animation**: `FadeInUp` staggers the range chips' row, the three cards, and each section (unguarded,
  same precedent as Favorites/History); `PercentBarRow`'s fill and the donut both honor
  `useReduceMotion()` — the bars skip the `scaleX` grow-in (render at full width immediately), and the
  donut's `isAnimated` prop is set to `false` (the library exposes one opaque animation toggle, not
  separate translate/opacity/scale channels — same "shorten/disable, don't fully decompose" compromise
  `AppToast`/`HomeHeader` already use for an opaque third-party animation).
- **Not done on purpose**: computing any figure from real data (see above); a fourth chart type beyond the
  donut (nothing else in the mockup needs one); wiring the time-range chips to change numbers (see above);
  a route-tree test (standalone component test, same convention as Favorites/History/Preferences).

### D-60 — Profile 7 "Langue" (route `/profile/language`); languages are derived, never hardcoded in the screen

Sprint 5, one screen at a time, explicit brief: build the language list from the i18n layer's own
source of truth, not a list authored in `LanguageScreen`. `LanguageScreen` (`features/profile/`)
replaces the `ProfilePlaceholder` that `/profile/language` rendered since D-50.

- **`getAvailableLanguages()` (`src/i18n/index.ts`) is the single new abstraction, not a bigger one.**
  The brief's own suggested shape (`getAvailableLanguages`/`getCurrentLanguage`/`changeLanguage`/
  `persistLanguage`) already exists in three quarters: reading the current language is already the
  one-line `isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE` pattern `ProfileScreen`
  itself uses (D-50) — no wrapper needed; `setLanguage()` already changes **and** persists in one call
  (D-08). Only "the selectable list" had no home yet, so only that one function was added — adding the
  other three would have been the "unnecessary abstraction" the brief explicitly warns against.
- **Each language's native name is read from its own resource bundle, not the active one.**
  `getAvailableLanguages()` calls `i18n.getResource(code, 'translation', \`settings.languages.${code}\`)`for every`code`in`SUPPORTED_LANGUAGES`— a self-referential lookup (French's own bundle is asked
for French's own name), not`t()`(which always resolves against whatever language is *currently
active*). This matters concretely: switching the UI to English must still show "Français", not a
translation of it — verified by a test that flips the active language first. The existing`settings.languages.*` keys already exist in **every** locale file (`ProfileScreen`'s own
`LANGUAGE_LABEL_KEYS`/D-50 already reused them for the menu row's value), and because `t()`in that
call site always resolves against the active language too, every existing cross-entry (fr.json's own`settings.languages.en`, en.json's own `settings.languages.fr`) turns out to be dead weight — nothing
reads them. Left in place rather than pruned: removing unused JSON values isn't this screen's job, and
churning a shared, already-validated file for a cleanup unrelated to the brief isn't worth the risk.
**A new locale only needs to add its own `settings.languages.<code>` key to its own file** — not
  every other file's.
- **Flags are a small, separate, purely decorative map (`LANGUAGE_FLAGS`), not part of the translation
  resources.** A flag isn't translatable text, so it has no natural home in `fr.json`/`en.json`; kept as
  its own `Partial<Record<Language, string>>` in `i18n/index.ts` so a language missing a flag still
  renders (just without one) instead of the whole list breaking. Plain Unicode emoji (🇫🇷/🇬🇧), not a new
  icon library or asset: the brief explicitly asks not to add a dependency for "quelques drapeaux", and
  nothing in this codebase renders flag icons anywhere yet.
- **Adding a language: add its resource file + register it in `SUPPORTED_LANGUAGES`/`resources`
  (`i18n/index.ts`) + give that file its own `settings.languages.<code>` key + optionally add it to
  `LANGUAGE_FLAGS`.** Nothing in `LanguageScreen` changes — verified by a test that mocks
  `getAvailableLanguages()` to return a third, fake language (`es`) and asserts it renders correctly,
  which is the only way to exercise "a language was added" without actually shipping a new locale file
  just for a test. The `SUPPORTED_LANGUAGES` array/`resources` object remain the one unavoidable,
  explicit-import step Metro requires (no `require.context`-style dynamic glob import exists for Expo/
  Metro the way it does for webpack) — documented as a deliberate, accepted technical constraint, not
  something this screen works around.
- **New `LanguageOptionRow`** (`features/profile/components/`): flag, native name, a checkmark
  (`colors.primary`) when active — plain rows, no border/card treatment, same list density as
  `FavoriteExperienceRow`/`HistoryEntryRow` (D-57/D-58). `accessibilityRole="radiogroup"`/`"radio"` +
  `accessibilityState={{ checked }}`, the exact same single-choice pattern the onboarding `MoodScreen`
  already established (D-21) — reused, not reinvented.
- **Selecting a row applies immediately and stays on the screen** — no save button, no navigation away:
  the brief's own point 6 ("mettre à jour... immédiatement") and the existing `setLanguage()` behavior
  (already fire-and-persist, no confirmation step anywhere else it's used) both point the same way. No
  `StickyActionFooter` needed, unlike Preferences (D-52), which has several fields to commit at once.
- **Header follows the same restructure as every other profile sub-screen this sprint**
  (`StickyRevealHeader`, in-content `h2` title, D-56/D-57/D-58/D-59). `settings.language` ("Langue") is
  reused directly for both the menu row and this screen's own title, same "already matches, nothing to
  fix" case as `profile.statistics` (D-59), unlike `history.title` (D-58).
- **Animation**: `FadeInUp` staggers the rows on mount (unguarded, same precedent as every other list
  this sprint); the checkmark itself has no separate animation (no loop, no scale) — appearing/
  disappearing with the row's own re-render is enough, nothing to gate behind `useReduceMotion()`.
- **Not done on purpose**: pruning the now-confirmed-unused cross-language `settings.languages.*`
  entries in `fr.json`/`en.json` (see above — out of scope, no functional effect); a `getCurrentLanguage()`/
  `persistLanguage()` wrapper (see above, already covered); a route-tree test (standalone component test,
  same convention as every other profile sub-screen this sprint).

### D-61 — Profile 8 "Thème" (route `/profile/theme`); reuses `THEME_PREFERENCES`, no design image this session

Sprint 5, one screen at a time: `ThemeScreen` (`features/profile/`) replaces the `ProfilePlaceholder`
that `/profile/theme` rendered since D-50. Built from memory of the same mockup board's tile 08 (no
fresh image was attached this session) plus `05_THEME_AND_I18N.md`'s own documented order — Light,
Dark, System — used to resolve the one point of genuine uncertainty (see below).

- **Reuses `THEME_PREFERENCES` (`theme/tokens.ts`) directly, not a second list.** Same "derive, don't
  hardcode" principle "Langue" established (D-60), but simpler here: the theme preference set is a
  small, fixed enum (light/dark/system) that doesn't grow file-by-file the way locales do, so there is
  no dynamic-derivation mechanism to build — iterating the existing array is already the correct,
  minimal choice. Grepped every usage of `THEME_PREFERENCES` first (only `isThemePreference`'s
  membership check) to confirm reusing it for display order wouldn't couple two unrelated concerns.
- **Row order (Light, Dark, System) was not re-verified against the mockup pixel-for-pixel** — this
  session had no image attached, only a text instruction to follow "l'écran fourni" from earlier in the
  project. Recall of the board's own tile 08 was genuinely uncertain on ordering (System first, or
  Light first), so the order was resolved from the one written source available:
  `05_THEME_AND_I18N.md`'s own "Theme switching UX" section, which lists "Light / Dark / System" —
  matching `THEME_PREFERENCES`'s own declared order for free. **Flag for visual re-check**: if the
  actual mockup shows a different order, this is a one-line change (`THEME_PREFERENCES`'s declared
  order, or a local display-order override in this screen — not a redesign).
- **New `ThemeOptionRow`** (`features/profile/components/`): icon (in a tinted circle, matching
  `ProfileMenuRow`'s own icon treatment) + label + checkmark when active — same shape and
  `radiogroup`/`radio` semantics as "Langue"'s `LanguageOptionRow` (D-60), a `LucideIcon` in place of
  the flag emoji since a theme preference has no flag-like asset. Not a generalized shared row
  component covering both screens: the two leading elements (a `LucideIcon` component vs. an emoji
  string) have different prop shapes, and this is only the second use — same "don't abstract on the
  second occurrence" restraint the rest of this sprint's small per-screen row components already show
  (`FavoriteExperienceRow`, `HistoryEntryRow`).
- **Selecting a row calls the existing `useTheme().setPreference` directly** — already resolves
  `system` against the OS scheme and persists under `roam.theme` (D-05); no new persistence, no second
  provider. Applies immediately, stays on the screen, same "no save button, no navigate-away" choice as
  "Langue" (D-60): a preference switch, not a multi-field form to commit (unlike Preferences, D-52).
- **Icons**: `Sun`/`Moon`/`Monitor` (Lucide) — `Monitor` for "Système" rather than reusing
  `ProfileMenuRow`'s own `SunMoon` (that one represents "theme" as a menu-row concept generically; here
  each of the three rows needs its own distinct, literal icon).
- **Animation**: `FadeInUp` staggers the three rows on mount (unguarded, same precedent as every other
  list this sprint); no separate checkmark animation, same reasoning as "Langue".
- **Not done on purpose**: verifying the exact row order/spacing against the real mockup image (see
  above, flagged for human review); a route-tree test (standalone component test, same convention as
  every other profile sub-screen this sprint).

## Logout confirmation, navigation fix, general audit (2026-09-23)

### D-62 — `ConfirmationModal` (generic, reusable); logout confirmation; `AuthTopBar`'s dead back button fixed at the source

End-of-sprint stabilization pass, from a provided reference image (a centered dialog, "Se déconnecter ?" /
reassurance copy / Annuler + Se déconnecter). Three things, in dependency order: a reusable confirmation
dialog, wiring it into logout, and fixing a real, pre-existing navigation bug the brief flagged
independently ("Login affiche un bouton retour qui plante").

- **`ConfirmationModal` (`components/ui/`) is a centered card, not a bottom sheet.** The reference image
  shows visible margins on every side (not flush to the bottom edge), so a bottom sheet would have been
  copying the wrong pattern despite the decorative handle bar at the top (kept anyway — it's in the
  image, and it's harmless on a centered card). Built on RN's own `Modal` (`transparent`,
  `onRequestClose` wired to `onCancel` — the Android hardware-back handler, for free) since no
  modal/bottom-sheet library exists anywhere in this codebase yet (grepped first) — no new dependency.
- **Exit animation needed a small, deliberate state pattern, not a naïve `useEffect` + `setState`.** RN's
  `Modal` disappears the instant `visible` goes `false`, with no chance for an exit fade/scale to play.
  Fix: an internal `shouldRender` state that mirrors `visible` immediately when it turns `true` (adjusted
  **during render**, not inside an effect — React's own documented "adjusting state when a prop changes"
  recipe, which avoids both an extra blank frame and this project's `react-hooks/set-state-in-effect`
  lint rule, which flags a synchronous `setState` inside an effect body but not one inside a `setTimeout`
  callback), and only flips back to `false` after `EXIT_DURATION_MS` (180 ms) once `visible` turns
  `false`, via a timeout in a `useEffect` — the legitimate "subscribe to a timer, update state in its
  callback" shape the same lint rule's own message describes as fine.
- **`variant: 'default' | 'destructive'` tints the icon and picks the confirm button's variant** —
  logout itself uses `default` (the reference image's confirm button is ROAM's ordinary primary green,
  not red; "tes données resteront en sécurité" is reassurance copy, not a scare warning), but the prop is
  real and wired for a future confirmation that does need it (e.g. delete account).
- **`Button` gained a third variant, `destructive` (`bg-error`), to make that prop actually do
  something** — additive, every existing call site unaffected, same "extending an existing primitive
  beats a one-off style override" precedent as `loading`/`leadingIcon` (D-29) and `Chip`'s `icon` (D-45).
  This was necessary, not optional: NativeWind "ignores class order for conflicts" (`DEVELOPMENT.md`'s
  own styling convention) — passing a `bg-error` override via `className` to the existing `primary`
  variant would silently not have worked, only a real variant does.
- **The component owns display/animation/interaction only — no logout logic inside it.** `ProfileScreen`
  still owns `handleLogout` (`logout()` then `router.replace('/auth/login')`, unchanged from before this
  session) and now also a `logoutModalVisible` boolean; the row opens the modal instead of calling
  `handleLogout` directly, `onCancel` closes it, `onConfirm` calls the existing handler. New
  `profile.logoutConfirm.title`/`description` i18n keys; `confirmLabel`/`cancelLabel` reuse the existing
  `profile.logout`/`common.cancel` keys rather than duplicating that text under a new key.
- **The actual back-button bug, found by reading `AuthTopBar.tsx`, not by guessing**: its `Pressable`
  rendered unconditionally and called `router.back()` unconditionally. On the _normal_ auth flow (Login
  reached by `push` from `auth/index`, D-44's own "going back to the entry screen from Login is existing,
  tested behavior... the brief never asked to change") that's correct and was already working —
  `AppRoutes.test.tsx` Scenario 4 already asserted `router.canGoBack() === false` right after logout, which
  meant `Stack.Protected`'s guard-swap history purge (D-44) was already doing its job at the navigator
  level. The bug was purely presentational: a back button rendered and pressable even though there was
  provably nothing behind it, which is what "une erreur apparaît" on press describes (a `GO_BACK` action
  with no handler). **Fix, entirely inside `AuthTopBar`**: `const canGoBack = router.canGoBack();` gates
  whether the `Pressable` renders at all (a same-size empty `View` keeps the wordmark's position
  unchanged either way) — one check, in the one component responsible for rendering that button, not
  `canGoBack()` guards scattered across call sites (the brief explicitly warned against that shape of
  patch). Every other screen using `AuthTopBar` (Register, ForgotPassword, ResetCode, NewPassword) is
  always reached by `push`, so `canGoBack()` is always `true` for them today — zero behavior change,
  confirmed by their existing test suites passing unmodified once their `useRouter` mocks gained
  `canGoBack: () => true` (see below).
- **No navigation-reset mechanism was changed.** `router.replace('/auth/login')` (not `push`) was already
  the call in `ProfileScreen`, and `Stack.Protected`'s guard swap was already correctly purging history —
  both pre-dated this session and are exactly what the brief asked for ("supprimer l'historique
  permettant de revenir dans l'application authentifiée"), already true, already tested. Fixing the
  presentational bug was the actual missing piece, not a deeper navigation-architecture problem.
- **Five existing auth-screen test files needed a one-line mock update, not a rewrite**: `LoginScreen`,
  `RegisterScreen`, `ForgotPasswordScreen`, `ResetCodeScreen`, `NewPasswordScreen` each mock `useRouter`
  without a `canGoBack`, which `AuthTopBar` now calls unconditionally — every one of them failed with
  "canGoBack is not a function" until their mock gained `canGoBack: () => true` (matching their real,
  unchanged behavior: back is always available on these screens' own tests). Found by running the full
  suite after the fix, not by inspection — the right way to catch this class of change.
- **Two more existing tests broke on contact, both expected**: `ProfileScreen.test.tsx`'s old "pressing
  'Se déconnecter' logs out" test (logout is no longer immediate — split into three tests: opens the
  modal without logging out, confirming logs out, cancelling doesn't) and `AppRoutes.test.tsx` Scenario 4
  (same reason; rewritten to press through the modal, plus a new Scenario 4b that exercises the
  cancel path and asserts — at the real, unmocked router level this time — that Login shows no "Retour"
  button after logout, the end-to-end proof of the fix). Disambiguating "Se déconnecter" queries once
  both the menu row and the modal's confirm button can be on screen at once needed `getAllByRole` (row is
  always index `0`, confirm is always the last) rather than the usual single `getByRole` — a just-cancelled
  modal can still be mid exit-animation (still mounted, `EXIT_DURATION_MS` not yet elapsed) when a test
  presses the row again, so an assertion that it had already fully unmounted proved unreliable under this
  suite's fake-timer setup and was dropped in favor of asserting the behavior that actually matters
  (no premature navigation).
- **Animation**: backdrop + card both fade in (card also scales/translates in slightly), `useReduceMotion()`
  drops the scale/translate and shortens the duration to `0` — same "shorten/simplify, don't fully
  redesign" compromise as every other reduce-motion screen this sprint. Respects the project's Moti/
  Reanimated-only rule; no new animation dependency.
- **Audit findings** (ran full `pnpm check` + coverage after the fix, not just the new code): no other
  screen renders an unconditional back button the same way `AuthTopBar` did (grepped every
  `router.back()` call site); no other test file's `useRouter` mock was missing a method a component now
  calls; coverage sits at 91.8% statements / 75.5% branches / 92.97% lines project-wide (see
  `08_AGENT_TODO.md` Phase G for the standing "not done on purpose" list this doesn't change) — the
  weakest spots remain framework bootstrap code with no meaningful branches to test
  (`app/_layout.tsx`, `hooks/useBootstrap.ts`, `theme/navigationTheme.ts`, all pre-existing, all 0%
  branches, none touched this session) and a handful of single-path decorative icon components
  (`GoogleIcon`, `AppleIcon`, `LotusIcon`, `RunnerIcon`, `EuroGlyph` — one SVG path each, no real branch
  to exercise). Every file touched this session individually sits at 100% statements
  (`AuthTopBar`/`AppRoutes` are additionally 100% branches too); `ConfirmationModal`'s remaining branch
  gaps are the `reduceMotion === true` paths and the unused-by-logout `destructive` variant, neither
  exercised by `ProfileScreen`'s own tests since logout doesn't use them — not artificially padded with
  tests that don't reflect a real call site.
- **Not done on purpose**: a bottom-sheet variant of `ConfirmationModal` (the reference image reads as
  centered, not a sheet — see above); wiring `variant="destructive"` anywhere yet (nothing in this sprint
  needs it); adding `canGoBack`-based guards to any _other_ back button in the app (grepped, none share
  `AuthTopBar`'s bug — each existing gesture exception in `AppRoutes.tsx` is a screen with no back button
  at all, a different, already-correct case, D-53); a `getCurrentSession()`-style new auth abstraction
  (the brief's own §7 keeps the mocked session exactly as it is — `AuthProvider`/`useAuth`, D-44 — no
  API, JWT, Prisma or backend introduced).

## Profile / Settings split (2026-09-23)

### D-63 — Profile becomes identity/activity/taste; a new, real Settings screen holds configuration

Refactor, not a new screen from scratch: `ProfileScreen` (sprint 5 écran 1, D-50) is rebuilt around
"qui je suis, ce que j'aime et ce que je fais sur ROAM"; everything that was account/app configuration
moves to a new `SettingsScreen`, reached from the existing gear icon (`/profile/settings`, already
wired to that route since D-50 — a `ProfilePlaceholder` until now). No route was added, renamed or
duplicated: every destination this session touches already existed.

- **What moved, and why each one qualifies as "configuration" and not "taste/activity"**: Préférences
  (row removed from Profile's menu, `/profile/preferences` itself untouched — see "two entry points"
  below), Langue, Thème, Aide & Support, Confidentialité, Se déconnecter (+ its `ConfirmationModal`,
  D-62, moved verbatim — same `logout()`/`router.replace('/auth/login')` call, no new logic). "Modifier
  mon profil" also gained a **second** entry point in Settings' "Compte" group (`/profile/edit`,
  unchanged route) — the brief's own suggested structure asks for it there, alongside the pencil-edit
  button already on `ProfileHeader`, the same "more than one door to the same room" pattern already
  established for Preferences (see below).
- **Two access points to Preferences, one screen — not two.** `PreferencesScreen`/`/profile/preferences`
  is completely unchanged; both "Profil → Ce que j'aime → Modifier" and "Paramètres → Mes préférences"
  `router.push` the exact same route. The brief was explicit this must not become two different
  Preferences screens, and reusing one route from two call sites needed no new code to keep that true.
- **`SettingsScreen` reuses `ProfileMenuRow` for every row** — the brief's own instruction ("ne crée pas
  inutilement de nouveaux patterns si un composant SettingsRow/ListItem existe déjà") is satisfied
  literally: that component already _is_ the settings-row shape (icon, label, optional value/subtitle,
  chevron), unchanged. Group headers ("Compte", "Préférences ROAM", "Apparence", "Support",
  "Confidentialité & données", "Session") are a plain `Text variant="caption"` each — not a new
  component, since a static label above a group needed nothing more.
- **"Ce que j'aime" shows the current `DEFAULT_EXPERIENCE_TYPES`/`DEFAULT_AMBIANCE` selection
  (`Chip`, unselected style, non-interactive), not a richer, invented tag list.** `PreferencesScreen`'s
  own selection state is local to that screen (D-51: "no repository, nothing persisted") — there is no
  shared, queryable "user's current preferences" to read from anywhere else yet. Reading the exact same
  default constants `PreferencesScreen` itself seeds from is the only truthful thing Profile can show
  without inventing a fake selection or building the shared-state layer the brief explicitly scoped out
  ("ne fais pas un gros refactor global"). Reused as-is: `EXPERIENCE_TYPES`/`AMBIANCE_OPTIONS`
  (`features/profile/data/`, D-51) for the id/icon/i18n-key list, filtered down to the default ids.
- **"Parcours en cours" is new UI over a small, purpose-built mock overlay
  (`data/activeJourney.ts`/`useActiveJourney`), not a new itinerary system.** There is no
  itinerary-progress feature yet (`itinerary/create` is still `CreateJourneyPlaceholder`,
  `04_TECH_STACK.md`), so "current step 2 of 5" etc. has nothing real to compute from. Same "extend
  `Experience`... no, actually don't" call as the statistics screen's breakdowns (D-59): here the
  progress fields are kept in their own small record (`experienceId` + `currentStep`/`totalSteps`/
  `nextStep`) rather than added to `Experience` itself, because journey progress is per-user session
  state conceptually, not a property of the experience — the hook joins the two at read time
  (`repositories.experiences.getById`) instead. The referenced experience (`exp-live-concert`) was
  chosen deliberately **not** already seeded as a favorite or history entry (D-57/D-58), so this
  section reads as its own distinct thing instead of visually overlapping the favorites/history
  previews directly below it — confirmed the hard way, by an initial pick (`exp-jazz-night`) that _was_
  also a favorite, producing ambiguous duplicate-text test queries once both sections rendered it.
  "Continuer mon parcours" pushes the existing `itinerary/create` placeholder (the one registered
  route this app has for "an itinerary flow", D-48) rather than inventing a new route for a screen that
  doesn't exist; "Voir sur la carte" from the brief's own mockup was **not** built — no map screen exists
  yet (`features/map` is an empty `.gitkeep`) and the brief itself marks that action "éventuellement".
- **New `ExperiencePreviewCard`, not a reuse of Home's `ExperienceCard`.** The favorites/history
  previews are a fixed 3-column row sized to a third of the screen width; `ExperienceCard` is a fixed
  260px horizontal-scroll card (Home's carousels) — forcing that width into a 3-up grid would have
  meant fighting its own sizing, not reusing it. The new card is deliberately smaller and simpler (image,
  title, one subtitle line, an optional decorative badge slot) — the favorites preview passes a small
  static heart badge (no toggle: removal stays the full Favorites screen's job, same "preview, not a
  second full feature" scope as the rest of this section), the history preview passes none.
- **Both preview rows hide themselves when empty** (`favorites.length > 0` / `history.length > 0`)
  rather than rendering their own nested empty state — Profile is a preview surface for those lists, and
  the real empty states already exist on `/profile/favorites`/`/profile/history` (D-57/D-58); duplicating
  them here would be a second copy of the same UI for a screen this brief didn't ask to touch.
- **New `ActivitySummaryCard`, reusing `UserStats` (`useCurrentUser`) — same numbers as the top
  `ProfileStats` row, a second, year-framed presentation of them**, not new data. Same "same data,
  different shape, so a different component" reasoning the statistics screen's own `StatCard` already
  used against `ProfileStats` (D-59).
- **Not done on purpose**: a shared/persisted preferences store (see above — explicitly out of the
  "no big refactor" scope); a real itinerary-progress system behind "Parcours en cours" (see above); a
  "Voir sur la carte" action (no map screen exists); deleting or renaming any existing route (every
  destination already existed); touching `PreferencesScreen`, `FavoritesScreen`, `HistoryScreen`,
  `StatisticsScreen`, `LanguageScreen`, `ThemeScreen` or any other already-validated screen beyond what
  points to them.

### D-64 — `ProfileScreen` adopts `StickyRevealHeader` (follow-up to D-63)

Same-day follow-up: `ProfileScreen` was the one screen this sprint's Profile/Settings refactor left on
the plain inline title row (`Text` + gear `IconButton` in a `flex-row`); every sub-screen it links to
already uses `StickyRevealHeader` (D-56 onward). Brought in line, no other change.

- **Same restructure as every other adoption**: the in-content `h2` "Profil" stands in for the title
  until the floating header's own title crossfades in past `HEADER_REVEAL_OFFSET` (70, the same proxy
  value used everywhere else this sprint); the settings gear moved from the inline row into the
  header's `rightSlot` — same icon, same `accessibilityLabel`, same destination, so the existing test
  asserting `router.push('/profile/settings')` needed no change.
- **No `leftSlot`**: unlike the pushed `/profile/*` sub-screens (which all show a back button there),
  Profile is a tab root reached from the tab bar, not pushed — there is nothing to go back to, so the
  slot is simply omitted (the component already renders nothing when a slot isn't passed, same as
  `HomeHeader`'s own no-back-button header).
- **Scroll handling merges two independent concerns in one function**, `handleScroll`: mutating
  `scrollY.value` for the header's own crossfade, and forwarding the same event to the existing
  `useTabBarScrollHandler()` for `RoamTabBar`'s collapse — the exact pattern `HomeScreen` already
  established for combining its own hero-stretch shared value with the tab bar handler, not a new one.
- **Not done on purpose**: a scroll-driven reveal test at the screen level — same "not meaningfully
  testable under this setup" category D-49/D-55 already document for this exact crossfade; the
  mechanism itself stays covered by `StickyRevealHeader.test.tsx`.

## Discover (2026-09-23)

### D-65 — Discover 1: immersive editorial discovery (route `/discover`); new `Collection` type/repository

`DiscoverScreen` (`src/features/discover/`) replaces the sprint 3 placeholder. Sprint 6 brief:
Discover is an editorial "magazine vivant de sorties", explicitly **not** a social feed — no profiles,
followers, stories, comments or like counts. Built on two mock pools through the same
`Screen -> hook -> Repository -> mock` pattern as Home (`useDiscoverData`).

- **New domain type and repository: `Collection`** (`src/types/collection.ts`, `CollectionRepository`
  in `services/repositories/types.ts`). An editorial grouping of experiences around a theme ("Les plus
  beaux rooftops de Paris", "Quand il pleut"…) — distinct from `Experience` (a composed outing) and from
  a `Category` (a place taxonomy). Mock fixtures live alongside the existing ones in
  `services/mock/data.ts` (`collections`), same "plain, already-formatted strings" convention as
  `Experience` (D-09/D-10); `isFeatured` marks the two shown in "Sélection ROAM", the rest only appear
  in "Explorer par envie" (no collection is shown under two different cards at once).
- **No `StickyRevealHeader`.** Unlike Experience Detail or Profile, Discover has no full-bleed hero photo
  at the very top for a header to reveal over — its own "hero" (Sélection ROAM) is an inset card further
  down the page. A plain in-flow title (the sprint 3 placeholder's own shape, kept) is the correct fit,
  not a gap in adopting the pattern.
- **Secondary-nav tabs actually filter the page**, rather than being cosmetic: "Pour toi" (default) shows
  the full editorial mix (`RoamSelectionSection`, `SuggestionsSection`, the immersive card, `NearbySection`,
  `TrendingSection`, `CollectionsSection`); "Tendances"/"À proximité"/"Collections" narrow the page down to
  the one section they name (`DiscoverScreen`'s `TAB_SECTIONS` map). The mockup only shows "Pour toi", so
  the other three tabs' content mix was a judgment call, not a documented design.
- **"Suggestions pour toi" (Ce soir / Entre amis / En couple / Culture / Nature / Activités) is a
  different, smaller vocabulary than Home's own mood chips** (`HOME_MOODS`): moment/company/category
  shortcuts to inspire browsing, not a filter on the `Mood` type. Static config (`SUGGESTION_MOODS`,
  same "no repository for a fixed option list" precedent as `HOME_MOODS`/`NEARBY_CATEGORIES`), purely
  presentational — selecting a tile only highlights it, same "local state, nothing wired to it yet"
  precedent as the onboarding mood/interests screens.
- **The "grande expérience immersive" section's headline/subtitle are static editorial copy**
  (`discover.immersive.*`, e.g. "Pour une soirée qui change"), deliberately independent from whichever
  experience is picked underneath it (`pickImmersiveExperience`: first festive-mood experience, or the
  first one). Reusing the picked experience's own `title`/`description` instead was considered and
  rejected: the section should read as a standing "night out" invitation, not one specific place's
  self-description that happens to change every time the mock pool changes.
- **Reused rather than duplicated:** `ExperienceCard` and `SectionHeader` (from `features/home/components/`,
  same cross-feature precedent as `SimilarExperiencesSection`) for "Près de toi" and "Ce qui fait envie en
  ce moment" — the brief's own description of those cards (image, distance, rating, tap-to-open) is
  exactly `ExperienceCard`'s existing shape. `parseDistanceMeters` (Home's `pickForYou.ts`) is exported and
  reused by `pickNearby.ts` rather than re-implemented.
- **One configurable `DiscoverCollectionCard`, not two near-duplicate components**: `variant="hero"` (image
  then title/subtitle/CTA below it, "Sélection ROAM") and `variant="compact"` (title overlaid on the image,
  "Explorer par envie") are one component, per the brief's own "évalue s'il peut être rendu configurable"
  guidance (§7).
- **New placeholder routes, same pattern as every other one this project has needed**
  (`CreateJourneyPlaceholder`/`ProfilePlaceholder`, D-45/D-50): `collection/[id]` (`CollectionDetailPlaceholder`,
  shows the real collection's own title, not a new i18n key) for "tap a collection", and `/map`
  (`MapPlaceholder`, `features/map/`, reusing the existing `map.title` key) for "Voir la carte" — neither
  screen is built this sprint (`08_AGENT_TODO.md` still lists Itinerary/Map as not done).
- **States**: loading/error/empty are real, not just content (`useDiscoverData` tracks `isError` — the mock
  repositories never reject today, but the hook stays ready for a real API implementation that can, unlike
  `useHomeExperiences` which only tracks `isLoading`).

### D-66 — Horizontal lists/carousels default to `FlatList`; existing `ScrollView horizontal` carousels audited, not migrated

New project-wide rule, requested for this sprint and meant to outlive it:

> Horizontal lists and carousels of repeating data default to `FlatList horizontal`. `ScrollView
horizontal` is reserved for a paging pager with its own custom scroll-position tracking (a hero,
> a gallery) or other genuinely non-repeating/special-cased content — not for a plain list of cards.

Reasons (documented in `DEVELOPMENT.md`'s new "Horizontal lists / carousels" section): virtualization,
better performance on longer lists, a consistent component shape across the app, and readiness for real
API data (a `FlatList` doesn't change shape when its `data` stops being a small fixed mock array).

- **Applied to every carousel/list built for Discover this sprint** (`DiscoverTabs`, `RoamSelectionSection`,
  `SuggestionsSection`, `NearbySection`, `TrendingSection`, `CollectionsSection`) — all `FlatList horizontal`,
  none of them `ScrollView`. The one exception, `ImmersiveExperienceCard`, is a single fixed card, not a
  repeating list, so the rule doesn't apply to it (a plain `View`).
- **Audit of existing screens** (brief §15) found these `ScrollView horizontal` carousels of repeating data,
  none migrated this sprint (see below for why):
  - `HomeScreen.tsx`: the mood chips, "Les expériences les plus populaires", "Lieux proches de toi" and
    "Des idées pour toi" sections (4 carousels).
  - `SimilarExperiencesSection.tsx` (experience detail): "Suggestions similaires".
  - `HistoryScreen.tsx` (profile): the category filter chip row.
- **Not migrated, on purpose** — the brief itself asks for restraint here ("si une migration présente un
  risque important, ne la fais pas immédiatement; documente-la plutôt") and states the sprint's real goal
  is putting the strategy in place and applying it to Discover, not retrofitting every existing screen:
  - Each of the three files above is an already-validated, tested screen (`HomeScreen.test.tsx`,
    `ExperienceDetailScreen.test.tsx`, `HistoryScreen.test.tsx`, plus the route-tree tests that scroll
    `home-scroll` by testID) — a mechanical `ScrollView` -> `FlatList` swap is low-risk in isolation, but
    touching four sections across three screens for no user-visible change, with no code owner asking for
    it yet, is exactly the kind of scope creep `00_AGENT_INSTRUCTIONS.md` warns against ("avoid
    overengineering", "prioritize the core user journey").
  - Migrate each one **the next time that screen is touched for an unrelated reason** (a bug fix, a new
    section, a design change) — do not do it as a drive-by change, and do not do all of them in one sweep
    either: one screen, one focused change, same "one screen per session" discipline as
    `SCREEN_INTEGRATION_WORKFLOW.md`.
- **Deliberately excluded from the rule** (not carousels of repeating data, kept as `ScrollView`):
  - `HeroCarousel.tsx` (Home) and `ExperienceHero.tsx` (experience detail): paging `ScrollView`s with their
    own `ref`-based `scrollTo`, `onScroll`-driven `activeIndex`/shared-value tracking, and (Home) a
    pull-to-stretch `Animated.View` wrapper — a `FlatList` buys virtualization neither needs (both show at
    most 5 slides) at the cost of rebuilding that tracking against `FlatList`'s different ref API, for a
    UI role (a full-bleed hero pager) that isn't "a list of cards" in the first place.
  - Every vertical page-container `ScrollView` (`ScrollScreen`, the auth screens' own `ScrollView` +
    `KeyboardAvoidingView`, `ExperienceDetailScreen`'s main scroll) — the rule is about **horizontal**
    carousels of repeating items; a page's own vertical scroll container is a different thing entirely.

## Discover carousels: full-bleed + snap (2026-09-23)

### D-67 — `HorizontalCarousel` (generic, reusable); Discover's five carousels bleed past the page padding and snap

Follow-up requested after reviewing D-65/D-66 on device: Discover's carousels sat inside the page's own
`px-6` padding, so "peek" cards were visually boxed in (clipped by that padding instead of bleeding to the
screen's physical edge) and swiping didn't settle cleanly on a card boundary. Explicitly **not** a
redesign — no section, card, color, text, navigation or animation changed; this only touches how the five
existing `FlatList`s scroll and are positioned.

- **New primitive: `components/ui/HorizontalCarousel.tsx`.** A thin `FlatList` wrapper, not a new
  abstraction over cards/data: it owns exactly two mechanics — full-bleed positioning and snap — and
  passes everything else (`data`, `renderItem`, `keyExtractor`, …) straight through. Checked first for an
  existing carousel component to adapt (brief §7); none existed, so this is new, placed in
  `components/ui/` (not `features/discover/`) since nothing about it is Discover-specific — any future
  screen with the same "padded page, full-bleed peek-card carousel" shape can reuse it as-is.
- **Full bleed**: `marginHorizontal: -sidePadding` on the `FlatList` (default 24, matching `px-6`) cancels
  the parent's padding; a matching `paddingHorizontal: sidePadding` in `contentContainerStyle` keeps the
  first/last item aligned with the rest of the page's content rather than touching the physical screen
  edge. A wrapper `View` with negative margin around an untouched `FlatList` was considered and rejected
  as an unnecessary extra layer — the negation belongs on the scrollable element itself.
- **Snap**: `snapToInterval={itemWidth + spacing}`, `snapToAlignment="start"`, `decelerationRate="fast"`,
  exactly as requested. `pagingEnabled` was evaluated for the Sélection ROAM hero cards (brief's own
  suggestion for "cards occupying exactly one page") and rejected: once full-bleed, the carousel's own
  frame is the full window width, but the hero card itself is narrower
  (`windowWidth - 2 * sidePadding`, `DiscoverCollectionCard`'s `getHeroCardWidth`) — paging by the frame's
  width would drift out of alignment with the card's actual width after a few swipes. `snapToInterval`
  computed from the card's real width doesn't have that mismatch, so it's used uniformly for all five
  carousels rather than special-casing the hero one.
- **One exported width constant per card, not a second hardcoded copy in each section** — the exact
  failure mode brief §5 warns about ("ne mets pas une valeur arbitraire en dur"): `ExperienceCard` exports
  `CARD_WIDTH` (used by `NearbySection`/`TrendingSection`), `DiscoverMoodCard` exports `TILE_SIZE`
  (`SuggestionsSection`), `DiscoverCollectionCard` exports `COMPACT_WIDTH` (`CollectionsSection`) and
  `getHeroCardWidth(windowWidth)` (`RoamSelectionSection`, which calls `useWindowDimensions()` itself and
  passes the same number both to the card and to the carousel's `itemWidth`). None of these exports change
  what the card looks like — purely making an already-fixed value or already-existing formula reusable.
- **`DiscoverTabs` (the secondary-nav chip row) was deliberately left untouched.** It's a navigation
  control, not a "peek card" carousel — the reported problem (cards clipped by the page's padding) doesn't
  really apply to a row of pill-shaped chips, and bleeding the tab selector to the screen edges wasn't
  asked for; doing it anyway would be exactly the "modifier la navigation" this pass was told not to do.
- **Existing `ScrollView horizontal` carousels (D-66's audit) are unaffected** — this pass only touches
  Discover's own `FlatList`s; Home's mood/popular/nearby/for-you sections, experience detail's
  "Suggestions similaires" and the history screen's category filter still use their original
  `ScrollView`s, unchanged. `HorizontalCarousel` exists now as the target shape for whenever one of them
  is migrated later, but adopting it there is still its own, separate change (D-66 still applies: migrate
  one screen at a time, not as a drive-by of this pass).
- **New test file `HorizontalCarousel.test.tsx`.** No visible role/text distinguishes a full-bleed,
  snapping `FlatList` from a plain one, so — unlike the rest of this codebase's component tests — it reads
  the rendered `FlatList` element's own props via a `testID` passed straight through
  (`screen.getByTestId(...).props`), the only query that can actually see `style`/`snapToInterval`/etc.
  `UNSAFE_getByType` (the more common React Testing Library escape hatch for this) doesn't exist in this
  project's RNTL version (14.0.1) — `getByTestId` reaches the same props on the host node without it.

### D-68 — Sprint 6: one shared `SearchScreen` for Home and Discover; mocked illustrated map with pins

Both `SearchBar`s (Home, Discover) were fully inert since their introduction (D-09/D-45/D-65's own note:
"a mocked search field — no real query engine in this sprint"). Sprint 6 wires them to a single shared
search experience rather than building two — the brief was explicit that Home and Discover must open the
exact same flow, only the entry context (placeholder copy) differs.

- **Route: `app/search.tsx` → `features/search/SearchScreen.tsx`.** A single route, not a nested
  folder — filters and the map are in-screen state (a bottom sheet / a Liste-Carte toggle), not
  sub-routes, so there is nothing else to register. Reads `context: 'home' | 'discover'` and
  `openFilters: '1'` via `useLocalSearchParams` — the first only picks between the two already-existing
  `home.search.placeholder` / `discover.search.placeholder` i18n keys, the second opens the filter sheet
  immediately (the trailing filter icon on either `SearchBar`). `SearchBar` itself needed no new props:
  `onPress` already flowed through via its `...PressableProps` spread; only Home/Discover's own JSX
  changed, to pass `onPress`/`onPressFilter` that `router.push({ pathname: '/search', params: {...} })`.
- **Data layer, same `Screen -> hook -> Repository -> mock` layering as the rest of the app.** New
  `SearchRepository` (`suggest`/`search`) added to `Repositories`, implemented in
  `services/mock/search.ts`: deterministic, accent/case-insensitive substring matching against title,
  description, tags, moods and the resolved category slug — explicitly no fuzzy/AI matching (brief §2).
  `useSearch` owns query/filter/result state (two phases: debounced `suggest()` while typing,
  `search()` once submitted, re-run whenever `filters` changes afterwards). No new fixtures: filters over
  the existing experience pool.
- **`react-hooks/set-state-in-effect` shaped `useSearch`'s two effects**: neither ever calls `setState`
  synchronously in the effect body (only inside a `.then()`), matching `useDiscoverData`/
  `useHomeExperiences`'s own discipline. `isLoading` therefore flips to `true` from the *event handlers*
  that trigger a new search (`submit`/the returned, wrapped `setFilters`), not from inside the effect —
  the effect's job is only to fetch and then resolve `isLoading` back to `false`.
- **Recent searches persisted through the existing `lib/storage.ts` `AsyncStorage` wrapper** (`useRecentSearches`,
  new `STORAGE_KEYS.recentSearches`), same low-risk pattern already used for theme/language — no new
  storage abstraction. Deduped by normalized query text (newest first, capped at 10); id is the trimmed
  query itself rather than a generated one, since a search is already unique by that text.
- **"Explorer par envie" reuses Discover's `SUGGESTION_MOODS`/`DiscoverMoodCard` as-is**, rather than a
  parallel vocabulary for what is visually the same tile — its **first real wiring**: on Discover
  selecting one is purely presentational (documented there as "no downstream filtering yet"); here it
  submits the mood's translated label as the search query.
- **Filters: `SearchFiltersSheet`, a bottom sheet built on `ConfirmationModal`'s own `Modal` + backdrop +
  `MotiView` plumbing** (same exit-duration/`reduceMotion` handling), but sliding up from the bottom edge
  instead of scaling in centered — no dedicated `BottomSheet` primitive existed to reuse, and this is the
  closest existing modal machinery. Works on a local draft, committed only through "Voir X résultats" (a
  live count re-queries `search()` as the draft changes); category options come from
  `repositories.categories.list()` via the already-existing `useCategories`/`getCategoryLabel` (not a new
  dynamic-key lookup — `react-i18next`'s typed keys reject a template built from an untyped
  `Category.slug: string`, which is exactly what `getCategoryLabel` was already built to solve);
  budget options reuse the existing `context.budget.<value>` labels rather than duplicating them. Distance
  and "Quand ?" are fixed chip rows (1/3/5/10 km, Maintenant/Aujourd'hui/Ce week-end), not the `Slider`
  primitive — the brief's own mockup shows discrete choices here, unlike Preferences' continuous range.
- **Map: no real map SDK.** `features/map/ExperienceMapView.tsx` reuses onboarding `MapPreview`'s
  decorative streets/parks illustration (now exported from there as `MAP_STREETS`/`MAP_PARKS`/
  `MAP_DESIGN_WIDTH`/`MAP_DESIGN_HEIGHT` instead of duplicated), scaled to fill its container, with one
  pin per experience positioned by a deterministic hash of its id — explicitly mock positioning, not real
  geocoding (`Experience` has no `coordinates`, only `Place` does; resolving every place through it would
  add async complexity with no real payoff for an illustration). One shared component, not two parallel
  map systems: `MapPlaceholder` (the standalone `/map` route, Discover's "Voir la carte") now renders it
  over a small `pickNearby` pool instead of "coming soon" text, and `SearchScreen`'s own Liste/Carte
  toggle renders it **inline** with the current filtered results — inline, not a navigation to `/map`,
  because that route has no way to receive an arbitrary result set through serializable route params.
- **Results list: a new `SearchResultCard`, not a reuse of `ExperienceCard`.** Same content/iconography,
  but stretched to the list's own width — `ExperienceCard`'s `CARD_WIDTH` (260) is tuned for a horizontal
  carousel, not a single-column `FlatList`; reusing it directly would leave dead space on a full-width
  vertical list. `SearchResultsList` is a `FlatList`, not a `ScrollView` (brief §8), with `ListEmptyComponent`
  → `SearchEmptyState` (brief §11's three relax-a-constraint actions mirror
  `07_DATA_AND_RECOMMENDATION.md`'s "No perfect match" guidance almost verbatim: relax distance, relax a
  filter, fall back to trending) plus a "Peut-être que ça te plaira" `HorizontalCarousel` reusing
  `pickTrending`, not a new picking rule.
- **New test files**: `SearchScreen.test.tsx`, `SearchFiltersSheet.test.tsx`, `SearchResultsHeader.test.tsx`,
  `SearchSuggestionsList.test.tsx`, `SearchEmptyState.test.tsx`, `useRecentSearches.test.ts`,
  `services/mock/search.test.ts`, `features/map/ExperienceMapView.test.tsx`, and route-level
  `searchRoutes.test.tsx` (same `renderRouter`-over-the-real-`src/app` shape as `discoverRoutes.test.tsx`)
  covering Home → Search, Discover → Search, Search → Experience Detail, and back navigation. Existing
  `HomeScreen.test.tsx`/`DiscoverScreen.test.tsx` gained the new `onPress`/`onPressFilter` assertions.

### D-69 — Sticky search on Home and Discover: two mechanisms, one shared idiom, no forced unification

Follow-up requested right after D-68: neither `SearchBar` was reachable while scrolling. Home
complicated this further — it already has a floating sticky header (`HomeHeader`, the notification
bell); a second, independent sticky search bar would have been exactly the "two overlapping sticky
zones" the brief ruled out.

**The decision that shaped everything else**: `HomeHeader`'s bell has three existing, deliberate tests
(`HomeScreen.test.tsx`) asserting it hides on a sustained scroll down and reveals on scroll up
(`useScrollDirection`, D-46/D-47). Nothing in this task asked to change that interaction, so it was
treated as a hard constraint, not a detail to redesign around — the whole solution was built to
preserve it exactly rather than switch Home to a different sticky mechanism for the sake of a single
shared component.

- **Discover** — no existing sticky header, so it gets `StickyRevealHeader` directly, via a new
  `centerSlot?: ReactNode` prop (`components/ui/StickyRevealHeader.tsx`), mutually exclusive with
  `title`. It renders inside the exact same crossfading `Animated.View` the title already used (same
  `revealStyle`/`interpolate`, untouched) — the only difference is `pointerEvents`: `"none"` for a
  title (decorative), `"box-none"` for `centerSlot` (must stay tappable once revealed — a `SearchBar`,
  unlike a title, is the whole point of showing it). All 7 `title`-only callers (Profile, Settings,
  Preferences, Favorites, History, Statistics, Language, Theme) are byte-for-byte unaffected — the new
  branch only activates when `centerSlot` is passed. `DiscoverScreen.tsx` adds one
  `useSharedValue(0)` `scrollY`, folded into its existing `onScroll` (same "one handler, several
  consumers" composition `HomeScreen`/`ProfileScreen` already use), and a `SEARCH_REVEAL_OFFSET = 120`
  local constant — the same kind of round, unmeasured proxy the 7 `HEADER_REVEAL_OFFSET` screens
  already use, sized a bit larger for Discover's taller two-line title block above the bar.
- **Home** — `HomeHeader` (`features/home/components/`) is extended in place, not migrated to
  `StickyRevealHeader`: a new `searchSlot?: ReactNode` + `showSearch?: boolean` prop pair adds a second
  row below the existing (untouched) bell row, inside its own `MotiView` animating `height`/`opacity`
  between `0` and a fixed row height as `showSearch` toggles — a smooth grow/fade, never an instant
  snap. The whole zone's `visible`/`atTop`-driven translateY/opacity/wash — what the three existing
  tests assert on — is untouched; the search row rides along with it, so it hides when the bell hides
  and reappears when it reappears. This *is* "one zone, not two": literally the same floating element,
  not two components kept in sync. `showSearch` is a new, independent signal (scrolled past the Hero),
  computed in `HomeScreen.tsx` from a new `features/home/lib/heroHeight.ts` (`HERO_HEIGHT_RATIO`,
  `HERO_MIN_HEIGHT`, `getHeroHeight`) — Home's own hero-height constants relocated out of
  `HeroCarousel.tsx` (same numbers, zero visual change) so `HomeScreen` can compute
  `getHeroHeight(windowHeight) - HEADER_HEIGHT` (now exported from `HomeHeader.tsx`) without
  duplicating them, mirroring `features/experiences/lib/heroHeight.ts`'s existing shape rather than a
  hardcoded guess — Home's Hero varies far more by device than Discover's title block does, so a
  measured formula was worth it here where a round constant wasn't.
- **Why two mechanisms, not one shared component**: `StickyRevealHeader`'s "always pinned, wash
  crossfades" model and `HomeHeader`'s "hides on sustained scroll down" model are genuinely different
  UX contracts, and Home's is the one with three tests already codifying it as intentional. Forcing
  Home onto `StickyRevealHeader` would have been a real, unrequested behavior change (the bell would
  stop hiding on scroll-down) disguised as a refactor. What *is* shared: the visual language (Moti,
  blur + `surface`-tinted wash, safe-area handling, `useReduceMotion`) and the underlying idiom (an
  in-flow element untouched, a floating twin that reveals past an offset) — applied through whichever
  existing, already-tested mechanism actually fits each screen.
- **No visual duplicate, and no new accessibility-hiding either**: both the in-flow and the floating
  `SearchBar` always trigger the identical `router.push('/search', ...)`, so a brief overlap during the
  crossfade window is inconsequential — tapping "the search bar" does the right thing regardless of
  which instance intercepts the touch. This is exactly the level of care the existing title-reveal
  pattern already has (the in-flow title on 7 screens is never hidden from accessibility once the
  sticky one crossfades in, either) — matching it was a deliberate choice to avoid a new inconsistency
  and scope creep, not an oversight.
- **Tests updated for the new second instance**: `DiscoverScreen.test.tsx`/`HomeScreen.test.tsx`/
  `searchRoutes.test.tsx`/`onboardingRoutes.test.tsx` (Home is reached at the end of onboarding) now use
  `getAllByRole('search')`/`getAllByText(...)` where a query used to assume a single `SearchBar`, plus
  new tests: `StickyRevealHeader.test.tsx` covers `centerSlot` (renders instead of `title`, stays
  interactive — same "no crossfade assertion, the Jest Reanimated mock stubs `interpolate`" scope as
  its existing tests); `HomeScreen.test.tsx` covers pressing the header-docked search bar once
  scrolled past the Hero. The three pre-existing notification-button scroll tests were **not** changed
  and still pass.

## Sprint 7 — real maps

### D-70 — `react-native-maps` is the map solution; `MapPlaceholder`s are replaced one screen at a time; Map screen first

**Rule (do not break):** _Les MapPlaceholder sont remplacées progressivement, une screen à la fois. Chaque
intégration doit être validée avant de passer à la suivante._ Each integration ends with tests, a commit and a
stop for visual validation.

**Audit (start of sprint 7).** No real map SDK existed. The surfaces that stood in for a map are:

| # | Screen / route                                    | Surface today                                                       | Status                  |
| - | ------------------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| 1 | Map — `/map` (Discover "Voir la carte")           | `MapScreen` (was named `MapPlaceholder`) → **`RoamMap`**            | **Done (this decision)** |
| 2 | Search — Liste/Carte toggle (`/search`)           | `ExperienceMapView` (illustrated map + hash-positioned pins)        | **Done in sprint 8 (D-71)** |
| 3 | Experience detail — "Voir sur la carte"           | `MapPreviewRow` → onboarding `MapPreview` illustration              | To do                   |
| 4 | Onboarding location — "Où souhaites-tu sortir ?"  | `MapPreview` illustration (a decorative preview, not a real place)  | To do (may stay static) |

There is no itinerary map, outing/live map or place-detail map yet (`features/itinerary`, `outing`,
`recommendations` are empty or placeholders); they will get `RoamMap` when those screens are built.

**Choices.**

- **`react-native-maps` 1.27.2** (`npx expo install`, SDK 57-compatible), the only map library. No Google Places,
  Directions or Geocoding API, no backend, no network call: the data is mocked.
- **Layering** — `Screen → hook → repository (mock) → RoamMap → react-native-maps`. Only
  `features/map/components/RoamMap.tsx` and `ExperienceMarker.tsx` import the vendor; the rest of the app sees
  `MapMarkerData` (`features/map/types/map.types.ts`), so switching provider (`04_TECH_STACK.md`: Google Maps or
  Mapbox) touches those two files. Created and nothing more: `RoamMap`, `ExperienceMarker`,
  `ExperienceMapCard` (the selection card, extracted from `ExperienceMapView` so the two maps share it while the
  illustrated one is being phased out), `useNearbyMapExperiences`, `lib/region.ts`, `MapScreen`. Polyline, user
  location and camera controls are **not** built (nothing needs them yet).
- **`RoamMap` role**: draws markers, frames them once on mount (`getRegionForCoordinates`; Paris when empty),
  reports marker/map taps. It does not own selection — the screen does (`useNearbyMapExperiences`). Frame is
  `overflow-hidden rounded-large`, so the native view is clipped to the same radius as before.
- **Data** — `Experience` gained an optional `coordinates` (mock Paris coordinates on the 14 mock
  experiences, `services/mock/data.ts`). This replaced the hash-of-the-id positioning of the illustrated map.
  No separate `places` repository was added: the existing `ExperienceRepository` already serves the pool, and
  `Place` (which has coordinates) is not joined to experiences yet. A future API implementation returns real
  coordinates through the same repository.
- **Scope of the swap** — only `/map` uses `RoamMap`. `ExperienceMapView` (Search) is untouched apart from using
  the shared `ExperienceMapCard`. `MapPlaceholder.tsx` was renamed `MapScreen.tsx` (it stopped being a placeholder
  in sprint 6) — the route file `app/map.tsx` is otherwise unchanged.
- **Interactions**: pan/zoom (native), tap a pin → selected pin + bottom card, tap it again / tap the map / the
  card's close button → deselect, "Voir le lieu" → `experience/[id]`. Rotation, pitch, compass and the Android
  toolbar are off. The back button is the screen's own (`router.back()`); the native swipe-back stays disabled
  (D-53), and the map's own pan gesture is unaffected. The screen does not scroll (map is `flex-1`), so no
  ScrollView/gesture conflict exists.
- **Dark mode**: `userInterfaceStyle` follows the app theme, which Apple Maps (iOS) honors. Google Maps (Android)
  keeps its native light style: a dark `customMapStyle` would need hex colors outside the theme tokens
  (`DEVELOPMENT.md` forbids them in components), so it is deferred, documented rather than half-done.
- **Expo Go vs development build.** Works in Expo Go (iOS: Apple Maps; Android: Google Maps through Expo Go's own
  key) with no key in the repo. For a **development/production build** the Google Maps SDK needs a key, to be
  provided through EAS secrets / an untracked config, **never committed**: `expo.android.config.googleMaps.apiKey`
  (Android, mandatory) and `expo.ios.config.googleMapsApiKey` (iOS, only if `provider="google"` is chosen — Apple
  Maps needs none). Nothing else is required: no location permission (the user position is not shown).
- **Tests** — `jest.setup.ts` mocks `react-native-maps` globally with `src/test/reactNativeMapsMock.tsx`
  (`MapView` → a `View` keeping its props, `Marker` → a pressable named after `accessibilityLabel`).
  `RoamMap.test.tsx`, `MapScreen.test.tsx`, `region.test.ts`; the Discover → Map route tests now assert `RoamMap`.
- **Future real data**: real coordinates/routes come with the place provider, geolocation and routing phases
  (`08_AGENT_TODO.md` Phase E): `Polyline` for itineraries, a user-location marker, camera control — added to
  `RoamMap` only when a screen needs them.

### D-71 — Sprint 8: Search redesigned (Trier / Filtrer / Carte); Search's map becomes a full-screen `RoamMap`

Second surface of the D-70 replacement ("une screen à la fois"), together with a rework of Search's results flow.
Front-end only: no backend, no Places/Directions API, no new library.

**Flow.** LIST = `SearchInput` → `[Trier] [Filtres] [Carte]` → result count + active sort → results. MAP = `SearchInput`
→ `[Filtres]` alone → full-screen `RoamMap` → `ExperienceMapCard` for the selected pin. One `SearchScreen`, one
`view: 'list' | 'map'` state — no new route.

**Decisions.**

- **One shared action row, not two.** `SearchActionBar` (replaces `SearchResultsHeader`) renders both shapes from a
  `view` prop, built from the existing `Chip` (icon + label; `selected` = "a non-default sort / any filter is active").
  No new button primitive.
- **Removed on purpose, to follow the new (simpler) brief:** the "Tous / Ouvert maintenant / < 2 km" quick-filter chips
  and the Liste/Carte segmented toggle. "Ouvert maintenant" and distance remain reachable in the filters sheet (1/3/5/10 km —
  the 2 km shortcut is gone), so nothing is lost but a shortcut; keeping a quick-chip row would have duplicated the filter
  system the brief forbids duplicating. Their i18n keys (`search.results.quickFilters.*`) were deleted with them.
- **Wording:** the button says "Filtres" (the app's existing string, also the sheet's title) rather than the mockup's verb
  "Filtrer"; "Trier" is new (`search.results.sort`), and also titles the sort sheet, mirroring Filtres.
- **Sort is client-side.** `SearchSortOption` (`types/search.ts`) = recommended / nearest / topRated / priceAsc / priceDesc;
  `features/search/lib/sortResults.ts` is a pure, stable transform of what `SearchRepository.search()` returned
  (`recommended` = the repository's order). Distance reuses `parseDistanceMeters`; price sorts by the budget bracket
  (`BudgetRange` order) because the mock has no numeric price. `SearchSortSheet` copies `SearchFiltersSheet`'s `Modal` +
  `MotiView` slide-up chrome; rows are `SortOptionRow` (the `LanguageOptionRow` shape); picking a row applies and closes —
  a single choice needs no draft/"apply" step. The active sort is echoed next to the count (mockup's "Recommandées").
- **Single source of truth.** `results → sortResults → sortedResults` feeds the list, the count and the map. The map has no
  search/filter logic (`toMapMarkers(sortedResults)` only). Filters are the one `SearchFiltersSheet`, opened from either
  mode; applying re-runs the search, so the map re-mounts framed on the new markers. Query, filters, sort and the selected
  pin live in `SearchScreen`, above both views, so a Liste ↔ Carte round trip loses none of them (the pin stays selected
  as long as it is still among the results).
- **Reuse.** `RoamMap`, `ExperienceMarker`, `ExperienceMapCard` unchanged in behavior; `RoamMap` gained `rounded`
  (default `true`) so Search's map can bleed to the screen edges — a prop, since NativeWind can't override a class by order.
  `isPinnable`/`toMapMarkers` moved to `features/map/lib/markers.ts` (Map screen and Search share them; an experience
  without `coordinates` stays in the list, gets no pin, crashes nothing).
- **Way back to the list.** The action row must only show "Filtrer" in map mode, so the return control is a floating
  "Liste" pill on the map itself (top right), not a repurposed "Carte" chip. Obvious, one tap, no new route.
- **Header and safe area.** The back chevron + "Recherche" title stay above the search field in every state: the app has no
  swipe-back (D-53) and Search must always be leavable. The `SearchInput` is a real text field outside the scrolling
  area, which already makes it "sticky" in list mode and the same single instance above the map (no duplicate, no double
  header). `SafeAreaView edges={['top']}` is unchanged; the map bleeds under the bottom inset, and the selected-pin card adds it.
- **Tab bar.** Nothing to do: `/search` is a root `Stack` screen beside `(tabs)`, so the floating tab bar is not rendered in
  list or map mode — the map is immersive without touching `RoamTabBar`.
- **Deleted:** `ExperienceMapView` (+ test) — nothing used it any more (the same "delete a stand-in once unreferenced"
  precedent as the placeholders); `MapPreview` no longer exports `MAP_STREETS`/`MAP_PARKS`, which only it had needed.
- **Not done / visual checks left to the user:** Android stays on Google Maps' light style in dark mode (D-70);
  the camera re-frames whenever the result set changes (filters) rather than preserving pan/zoom; carousels are untouched.
- **Tests:** `SearchActionBar`, `SearchSortSheet`, `sortResults`, `searchFilters`, `markers` unit tests; `SearchScreen`
  covers list/map layout, sort reordering, marker selection + "Voir le lieu", filtering from the map, the floating "Liste"
  button, no-results-on-map, and query/filters/sort/selection surviving list ↔ map.
