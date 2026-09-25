# ROAM — Design System Context

## Visual direction

Keywords:
- editorial;
- warm;
- natural;
- minimal;
- curious;
- human;
- premium;
- playful.

ROAM should feel like a companion for going out, not a booking platform or map clone.

## Core palette

These are the initial design directions, not immutable brand guidelines.

```text
Forest: #3F624E
Cream:  #F7F4ED
White:  #FFFFFF
Ink:    #171B18
Stone:  #747873
Peach:  #E9CDB9
Sage:   #DDE7DE
```

All colors must eventually be represented through theme tokens so dark mode can replace them.

## Typography

Initial proposal:
- display/headings: Plus Jakarta Sans or equivalent;
- body: Inter.

Hierarchy:
- Display 56/60 desktop;
- H1 40/44;
- H2 32/38;
- H3 24/30;
- H4 20/26;
- Body Large 18/28;
- Body 16/24;
- Small 14/20;
- Caption 12/16.

Mobile typography should be scaled down appropriately.

## Spacing

Use a 4px base:
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.

## Radius

```text
small: 8px
medium: 12px
large: 20px
card: 24px
hero: 32px
pill: 999px
```

## Components

Core:
- Button
- IconButton
- Chip
- MoodSelector
- DurationSelector
- BudgetSelector
- CompanySelector
- LocationSelector
- RecommendationCard
- ExperienceCard
- PlaceCard
- ItineraryStep
- TravelConnector
- FeedbackOption
- BottomNavigation
- TopBar
- Modal/BottomSheet
- MapMarker

## Recommendation card

Priority component.

It should communicate:
1. image;
2. experience name;
3. duration;
4. price;
5. distance;
6. categories/tags;
7. why it fits;
8. action.

Use immersive images as backgrounds/hero areas where appropriate.

## Motion

Keep motion subtle:
- fade;
- small translate;
- scale ~1.03 for selection;
- staggered card entry;
- itinerary steps appearing progressively.

Avoid excessive animation that slows task completion.

## Images

Prefer:
- authentic;
- atmospheric;
- editorial;
- natural light;
- human/lifestyle context.

The product sells an experience, not only a place.

## Responsive

Mobile-first reference:
- approximately 390 × 844.

Also support:
- tablet;
- desktop around 1440 × 900.

Desktop should not simply be a stretched mobile layout.

---

## Implementation notes (mobile, updated 2026-09-21)

Implemented in `apps/mobile/src/theme/` and exposed through `tailwind.config.ts` (NativeWind 4).

- **Colors:** the seven palette colors are in `palette.ts`; components use semantic tokens only
  (`05_THEME_AND_I18N.md`). Values derived for accessibility and for the dark theme live next to them.
- **Typography:** Plus Jakarta Sans (headings, 600/700) and Inter (body, 400/500/600), loaded with
  `@expo-google-fonts/*`. Two more families are required by the mockups (`DECISIONS.md` D-18, D-19):
  **Newsreader** (serif; 400 for the splash headline, 600 for onboarding titles) and **Mrs Saint
  Delafield** (handwritten accent line). Text variant `cta` = Inter Regular 19/26 for button labels. Use `<Text variant="…">`. Mobile scale: Display 40/44, H1 32/38, H2 28/34,
  H3 24/30, H4 20/26, Body Large 18/28, Body 16/24, Small 14/20, Caption 12/16, plus `label`
  (Body semibold, buttons/chips).
- **Spacing:** Tailwind's default 4px scale, a superset of the documented values (4…96).
- **Radius:** `rounded-small|medium|large|card|hero|pill` = 8 / 12 / 20 / 24 / 32 / 999 px.
- **Colors (light):** `primary` `#1A3E30`, `text` `#060A0E`, `textSecondary` `#454F5B` — values measured
  on the onboarding mockups (`DECISIONS.md` D-19).
- **Icons:** Lucide (`lucide-react-native`), one import per icon.
- **Components built so far:** `Text`, `Button` (primary, secondary; 64 px high, 20 px radius, optional
  trailing icon), `Chip`, `Screen`, `FadeInUp`, `Logo`; onboarding: `WelcomeCollage`, `ProgressBars`, `ChoiceRow`, `MoodTile`, `InterestTile`, `ProfileOrbit`, `ProfileChecklist`, `ProfileScene`. None of the "Core" components of this document beyond `Button` and
  `Chip` exist yet (selectors, cards, navigation, sheet, map marker…). (Later sprints added `IconButton`,
  `SearchBar`, `TextField` and `Slider` — see `DEVELOPMENT.md`'s per-feature tables for where each is used.)
- **Motion:** Moti. `FadeInUp` = fade + 12 px translateY over 500 ms. Selection scale (~1.03) and staggered
  entries are used in the onboarding, which also has a timed, staggered loader sequence (the profile creation, D-27). Reduced motion: `useReduceMotion`.
- **Logo:** official logo files (light, dark, icon) and the wordmark are in use; the app icon and the
  Android adaptive icon are still temporary placeholders. Details and file roles:
  `apps/mobile/assets/images/logo/README.md`.
- **Splash screen:** implemented from the design mockup (`apps/mobile/src/features/splash/`); see
  `DECISIONS.md` D-18 for the known differences with the mockup.
- **Responsive:** only the mobile layout exists. Tablet and desktop are not addressed yet.
