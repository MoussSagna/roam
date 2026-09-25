# Mobile — Design system implementation

How the shared design direction ([`appdocs/design/DESIGN_SYSTEM.md`](../../../appdocs/design/DESIGN_SYSTEM.md)) is implemented in the mobile app.

Implemented in `apps/mobile/src/theme/` and exposed through `tailwind.config.ts` (NativeWind 4).

- **Colors:** the seven palette colors are in `palette.ts`; components use semantic tokens only
  ([`THEME_AND_I18N.md`](../../../appdocs/design/THEME_AND_I18N.md)). Values derived for accessibility and for the dark theme live next to them.
- **Typography:** Plus Jakarta Sans (headings, 600/700) and Inter (body, 400/500/600), loaded with
  `@expo-google-fonts/*`. Two more families are required by the mockups ([`DECISIONS.md`](DECISIONS.md) D-18, D-19):
  **Newsreader** (serif; 400 for the splash headline, 600 for onboarding titles) and **Mrs Saint
  Delafield** (handwritten accent line). Text variant `cta` = Inter Regular 19/26 for button labels. Use `<Text variant="…">`. Mobile scale: Display 40/44, H1 32/38, H2 28/34,
  H3 24/30, H4 20/26, Body Large 18/28, Body 16/24, Small 14/20, Caption 12/16, plus `label`
  (Body semibold, buttons/chips).
- **Spacing:** Tailwind's default 4px scale, a superset of the documented values (4…96).
- **Radius:** `rounded-small|medium|large|card|hero|pill` = 8 / 12 / 20 / 24 / 32 / 999 px.
- **Colors (light):** `primary` `#1A3E30`, `text` `#060A0E`, `textSecondary` `#454F5B` — values measured
  on the onboarding mockups ([`DECISIONS.md`](DECISIONS.md) D-19).
- **Icons:** Lucide (`lucide-react-native`), one import per icon.
- **Components built so far:** `Text`, `Button` (primary, secondary; 64 px high, 20 px radius, optional
  trailing icon), `Chip`, `Screen`, `FadeInUp`, `Logo`; onboarding: `WelcomeCollage`, `ProgressBars`, `ChoiceRow`, `MoodTile`, `InterestTile`, `ProfileOrbit`, `ProfileChecklist`, `ProfileScene`. None of the "Core" components of this document beyond `Button` and
  `Chip` exist yet (selectors, cards, navigation, sheet, map marker…). (Later sprints added `IconButton`,
  `SearchBar`, `TextField` and `Slider` — see the per-feature tables in [`features/`](features/) for where each is used.)
- **Motion:** Moti. `FadeInUp` = fade + 12 px translateY over 500 ms. Selection scale (~1.03) and staggered
  entries are used in the onboarding, which also has a timed, staggered loader sequence (the profile creation, D-27). Reduced motion: `useReduceMotion`.
- **Logo:** official logo files (light, dark, icon) and the wordmark are in use; the app icon and the
  Android adaptive icon are still temporary placeholders. Details and file roles:
  [`apps/mobile/assets/images/logo/README.md`](../assets/images/logo/README.md).
- **Splash screen:** implemented from the design mockup (`apps/mobile/src/features/splash/`); see
  [`DECISIONS.md`](DECISIONS.md) D-18 for the known differences with the mockup.
- **Responsive:** only the mobile layout exists. Tablet and desktop are not addressed yet.
