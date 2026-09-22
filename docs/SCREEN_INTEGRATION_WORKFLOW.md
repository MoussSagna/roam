# ROAM — Screen Integration Workflow

Standard procedure for turning one design mockup screen into a screen in the mobile app. Used since the
onboarding sprint (`DECISIONS.md` D-19 to D-27) and formalized here for the authentication sprint
(D-28 onward). **One screen per session; stop and wait for human validation before the next one.**

```text
Read the docs
    ↓
Inspect what already exists
    ↓
Analyze the design
    ↓
Reuse before creating
    ↓
Implement
    ↓
Animate
    ↓
Wire navigation
    ↓
Validate (types, lint, tests, themes, a11y)
    ↓
Update the docs
    ↓
STOP — human validation
```

## 1. Read the context

Read the relevant `.md` files before touching any code: `00_AGENT_INSTRUCTIONS.md`,
`01_PRODUCT_CONTEXT.md`, `02_MVP_SCOPE.md`, `03_UX_SCREENS_AND_FLOWS.md`, `05_THEME_AND_I18N.md`,
`06_DESIGN_SYSTEM.md`, `DECISIONS.md`, `DEVELOPMENT.md`. They are the source of truth; if a document is
stale, check the code before changing the doc (see `00_AGENT_INSTRUCTIONS.md`).

## 2. Inspect the existing codebase

Search for, in this order, before writing anything new:

- **Components** — `src/components/ui/` (design-system primitives: `Text`, `Button`, `Chip`, `Screen`,
  `FadeInUp`), `src/components/brand/` (`Logo`), and the target feature's own `components/` folder
  (e.g. `src/features/onboarding/components/`).
- **Tokens / theme** — `src/theme/tokens.ts` (semantic color tokens), `src/theme/palette.ts` (raw
  colors — never import directly in a screen), `src/theme/typography.ts` (`fontFamily`, `fontSize`,
  `textVariantClasses`).
- **Icons** — Lucide first (`lucide-react-native/icons/<name>`, one import per icon). A custom SVG
  component (`RunnerIcon`, `LotusIcon`, `GoogleIcon`…) only when Lucide has no matching glyph
  (brand logos, or a shape Lucide doesn't draw).
- **Navigation** — the feature's flow helper if one exists (e.g. `onboardingFlow.ts`,
  `useOnboardingNavigation`); otherwise `useRouter()` from `expo-router` directly.
- **Hooks / utils** — `src/hooks/` (`useBootstrap`, `useReduceMotion`), `src/lib/` (`cx`, storage).
- **i18n keys** — `src/i18n/locales/fr.json` for an existing key with the same meaning before adding
  one (e.g. `auth.signIn` already existed and was reused as-is for two different screens).

## 3. Analyze the design

From the mockup, identify:

- structure and layout (full-bleed photo? card/sheet? form? list?);
- visual hierarchy (title, subtitle, primary vs. secondary actions);
- spacing, typography, color roles — map every color to a semantic token, never a hex value;
- components needed, and which ones already exist;
- interactive states: default, pressed, selected, disabled, loading, error;
- what the states in `03_UX_SCREENS_AND_FLOWS.md` → "Important states" imply for this screen
  (loading / empty / error where relevant);
- animation opportunities (entrance, selection, transition);
- how it behaves on a short screen (iPhone SE-class, 375 × 667) — what shrinks first.

If only a flattened mockup image is available (no separate photo/asset export), a temporary low-resolution
crop is acceptable, **only if documented as temporary** (see `assets/images/onboarding/README.md` and
`assets/images/auth/README.md` for the pattern) — a short README next to the asset naming what's temporary
and what the replacement should look like. Never bake user-facing text into an image: render it with
`Text`/`RNText` and an i18n key even if that means the code-rendered text roughly overlaps mockup pixels
baked into a temporary crop underneath it.

## 4. Reuse before creating

Default to an existing component. Create a new one only when nothing fits, and put it:

- in `src/components/ui/` if it is a generic, cross-feature primitive (this is rare — extending an
  existing primitive, e.g. adding `loading`/`leadingIcon` to `Button`, is usually the better move and
  keeps every screen that uses it consistent);
- in `<feature>/components/` if it is specific to that feature's screens.

## 5. Implement

- Route files in `src/app/` stay thin: they just render a screen from `src/features/<feature>/`.
- Style with NativeWind `className`, semantic tokens only (`bg-background`, `text-textSecondary`…).
  Raw colors are forbidden in components; add a token in `tokens.ts` (light **and** dark) if the design
  needs one that doesn't exist yet.
- Typography goes through `<Text variant="…">`; never set a font family/size by hand except for a
  documented, deliberate exception (e.g. a serif display size measured from a mockup, as the splash
  and onboarding titles do — record it in `DECISIONS.md` if it introduces something new).
- All visible copy comes from `src/i18n/locales/{fr,en}.json`, added to **both** files (a test enforces
  parity). Keys are semantic (`auth.entry.continueWithGoogle`), never screen-coordinate based.
- Every screen considers loading / empty / error / success states where the UX doc calls for them, even
  in a front-end-only prototype (see `00_AGENT_INSTRUCTIONS.md` → "Definition of done").

## 6. Animation (Moti)

Reuse `FadeInUp` (fade + 12 px translateY, 500 ms) as the default entrance; stagger with `delay`.
Selection feedback: scale ~1.02–1.03. Keep motion subtle — it should never slow down completing a form.
`MotiView` takes `style`, not `className`. Honor `useReduceMotion()` wherever a screen has more than the
default fade (loops, larger translations, rotations).

## 7. Navigation

Add routes in `src/app/` without breaking existing ones. If a screen's primary action leads to a screen
that isn't built yet in this sprint, add a minimal placeholder route (see `AuthPlaceholder`,
`DECISIONS.md` D-20 and D-29) so navigation doesn't hit "Unmatched Route" — the placeholder has no
design content, just a title and a way back; replace its body, not its route path, when that screen's
turn comes.

## 8. Validation

Before presenting the screen:

```bash
pnpm check   # format:check + typecheck + lint + test
```

Also check by hand: light **and** dark theme, French **and** English, navigation actions (including
back), and that the screen matches the design at a short screen width (375 px) as well as the reference
width. Add/update the screen's test file (`renderWithProviders`, `fireEvent`) and, if it introduces new
routes, a route-tree test (see `authRoutes.test.tsx` / `onboardingRoutes.test.tsx`).

## 9. Update the documentation

Update whichever of these actually changed:

- `DEVELOPMENT.md` — new route(s)/screen in the relevant table, new convention if one was introduced;
- `DECISIONS.md` — a new entry for any non-obvious choice (temporary asset, a design token change, a
  navigation choice not shown in the mockup…), following the existing numbering;
- `08_AGENT_TODO.md` — check off the screen once it is done;
- `docs/README.md` — the one-line "current status" if the sprint's overall state changed.

Keep it factual and only as long as needed — do not pad the docs.

## 10. Human validation — STOP

Once the checks above pass and the screen is committed, **stop**. Do not start the next screen in the
same session, even if its design is already known or provided. Wait for explicit validation/instruction.
