# Mobile — Conventions

Coding conventions of the mobile app. Navigation rules (back gesture) are in [`NAVIGATION.md`](NAVIGATION.md), theme and i18n in
[`THEME_AND_I18N.md`](THEME_AND_I18N.md), data access and testing in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Routes and screens

- Files in `src/app/` only declare routes and render a screen from `src/features/<feature>/`.
- Business logic stays out of components; UI never calls `fetch` (see _Data access_).
- Before building a screen: read its section in [`UX_SCREENS_AND_FLOWS.md`](../../../appdocs/product/UX_SCREENS_AND_FLOWS.md), list its states
  (loading / empty / error / success), its translation keys and the theme tokens it uses.

## Styling (NativeWind 4)

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

## Horizontal lists / carousels (sprint 6, [`DECISIONS.md`](DECISIONS.md) D-66)

**Horizontal lists and carousels of repeating data default to `FlatList horizontal`.** `ScrollView
horizontal` is reserved for a paging pager with its own custom scroll-position tracking (a hero, a
gallery) or other genuinely non-repeating/special-cased content — not for a plain list of cards.

- **Why**: virtualization and better performance on longer lists, one consistent component shape across
  the app, and readiness for real API data — a `FlatList` doesn't change shape once its `data` stops
  being a small fixed mock array.
- **Good practices**: a stable `keyExtractor` (the item's own id, not its index, once one exists);
  `renderItem` stays a plain function unless a card is expensive enough to be worth `React.memo`; don't
  reshape/recreate the `data` array on every render (memoize it if it's derived); consider a loading/empty
  state once a section's data can genuinely be empty (Discover's sections return `null` when their pool
  is empty, rather than rendering an empty `FlatList`). Don't reach for `getItemLayout`, `windowSize` or
  other virtualization tuning prematurely — only when a real performance problem shows up.
- **Not a carousel**: a single, non-repeating block (Discover's `ImmersiveExperienceCard`) or a paging
  pager with its own `ref`/shared-value scroll tracking (Home's `HeroCarousel`, experience detail's
  `ExperienceHero`) stay a plain `View` or `ScrollView` respectively — the rule is about lists of
  repeating items, not every horizontally-laid-out thing.
- **Existing `ScrollView horizontal` carousels were audited, not migrated** (Home's mood/popular/nearby/
  for-you sections, experience detail's "Suggestions similaires", the history screen's category filter):
  each is an already-validated, tested screen, and the sprints that introduced this rule focused on
  putting the strategy in place and applying it to Discover, not retrofitting every existing screen in
  one sweep. Migrate one of them the next time it's touched for an unrelated reason — see
  [`DECISIONS.md`](DECISIONS.md) D-66.

### Full-bleed carousels and snapping ([`DECISIONS.md`](DECISIONS.md) D-67)

A carousel of partial-width "peek" cards sitting inside a page's own horizontal padding (`px-6`) gets
visually boxed in: cards near either edge are clipped by that padding instead of bleeding to the screen's
physical edge, and nothing about `ScrollView`/`FlatList` prevents that on its own. `components/ui/`'s
`HorizontalCarousel` (all of Discover's own carousels use it, `RoamSelectionSection` /
`SuggestionsSection` / `NearbySection` / `TrendingSection` / `CollectionsSection`) is the reusable fix:

- **Full bleed**: `marginHorizontal: -sidePadding` on the `FlatList` itself cancels the parent's padding
  (`sidePadding` defaults to 24, matching `px-6`), while `contentContainerStyle`'s matching
  `paddingHorizontal: sidePadding` keeps the first/last item aligned with the rest of the page's content
  instead of touching the physical screen edge. Reach for this whenever a horizontal carousel sits inside
  a padded page and should visually escape that padding — not just in Discover.
- **Snap**: `snapToInterval={itemWidth + spacing}`, `snapToAlignment="start"`,
  `decelerationRate="fast"`. `itemWidth` must be the exact value the card renders at — a fixed constant
  (`ExperienceCard`'s `CARD_WIDTH`, `DiscoverMoodCard`'s `TILE_SIZE`, `DiscoverCollectionCard`'s
  `COMPACT_WIDTH`) or a value derived from `useWindowDimensions()` the same way the card derives it
  (`DiscoverCollectionCard`'s `getHeroCardWidth`) — **exported by the card itself and imported by the
  section**, not a second hardcoded copy that can silently drift out of sync with what actually renders.
  `pagingEnabled` was considered instead for the hero cards (near-full-width) and rejected: the carousel's
  own frame is full window width once it's full-bleed, but the hero card's width is
  `windowWidth - 2 * sidePadding` — narrower than the frame — so paging (which pages by the scroll view's
  own frame width) would drift out of alignment after a few swipes; `snapToInterval` computed from the
  card's real width doesn't have that problem.
- **Not every horizontal list needs this**: `HorizontalCarousel` takes `snapEnabled` (default `true`) for
  a future non-snapping full-bleed use, and `DiscoverTabs` (the secondary-nav chip row) was deliberately
  left as a plain, padded `FlatList` — it's a navigation control, not a "peek card" carousel, and bleeding
  it to the edges wasn't asked for.

## Animation (Moti)

Keep motion subtle (fade, small translate, ~1.03 scale on selection). `FadeInUp` is the reference
appearance animation. Moti runs on Reanimated 4 + `react-native-worklets`.

- `MotiView` takes `style`, **not** `className` (NativeWind does not process it): a `className` on it is silently
  ignored (no flex, no background). Use `style` with `useTheme().colors`, or a plain `View` around it.
- Reduced motion: `useReduceMotion()` (`src/hooks/`) follows the OS setting; drop translations, scales, rotations and
  loops when it is true (`ProfileCreationScreen` shows the pattern). Reanimated's own `useReducedMotion` is not in its Jest mock.
- Animating an SVG attribute (the loader ring): `Animated.createAnimatedComponent(Circle)` + `useAnimatedProps`.
- Timed sequences (front-end simulations): a `setTimeout` schedule created in one `useEffect` and cleared in its cleanup
  (see `features/onboarding/profileCreation.ts`), tested with Jest fake timers.

## Sticky headers with a scroll-position reveal

`StickyRevealHeader` (`components/ui/`, sprint 5, [`DECISIONS.md`](DECISIONS.md) D-55) is a generic sticky header
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

**Sticky search (sprint 6, [`DECISIONS.md`](DECISIONS.md) D-69):** Home's and Discover's `SearchBar`s are now
reachable while scrolling. The in-flow `SearchBar` on each screen is untouched (same position, same
"at load" behavior); a second, floating instance of the same `SearchBar` fades in once the in-flow one
has scrolled past the sticky zone — the exact reveal-past-`revealOffset` idiom above, just with a
`SearchBar` instead of a title. Two different mechanisms, chosen per screen rather than forced into one:

- **Discover** has no existing sticky header, so it uses `StickyRevealHeader` directly, via its new
  `centerSlot?: ReactNode` prop (additive, `title`-only callers unaffected) — content that must stay
  tappable once revealed, unlike a title (`pointerEvents="box-none"` instead of `"none"`).
- **Home already has one** (`HomeHeader`, the notification bell) with its own tested, direction-based
  hide/show contract (`useScrollDirection` — hides on a sustained scroll down, reveals on any scroll
  up). Changing that contract wasn't asked for, so `HomeHeader` was extended in place instead of
  switched to `StickyRevealHeader`: a new `searchSlot`/`showSearch` prop pair adds a second row that
  rides along with the existing bell row's visibility — one zone, not two overlapping ones. `showSearch`
  is its own signal (scrolled past the Hero, via the new `features/home/lib/heroHeight.ts`, mirroring
  `features/experiences/lib/heroHeight.ts`), independent of the bell's `visible`/`atTop`.
- A momentary overlap between the in-flow and the floating instance during the crossfade is expected
  and harmless (both trigger the identical navigation) — the same characteristic the title-reveal
  pattern above already has, unaddressed, across every `StickyRevealHeader` screen; no extra
  accessibility-hiding was added for search either, to stay consistent rather than introduce a new
  inconsistency.

## Toasts

Global feedback (a save succeeding/failing, and similar one-off confirmations) goes through
`showToast('success' | 'error', { title, message? })` (`src/lib/toast.ts`) — never call
`react-native-toast-message` (`Toast.show`) directly from a screen. This is the only toast/snackbar
mechanism in the app (sprint 5, [`DECISIONS.md`](DECISIONS.md) D-54).

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

## Icons

Use Lucide, **one import per icon** — never the package root:

```ts
import ArrowRight from 'lucide-react-native/icons/arrow-right';
```

The root barrel pulls ~1 600 icons into the bundle (and makes Jest 10× slower). Colors come from
`useTheme().colors` (icons cannot use NativeWind classes).

## Assets

The logo files, the wordmark, the splash photo and the auth entry photo (`assets/images/auth/entry-background.png`)
are official. The app icon and the Android adaptive icon are still placeholders, and so are the onboarding photos in
`assets/images/onboarding/` (the four welcome photos, `ready-background.jpg` and `profile-landscape.jpg`) — **temporary**
crops of the mockups (see the READMEs there). Which file is used for what is documented in
[`apps/mobile/assets/images/logo/README.md`](../assets/images/logo/README.md). Fonts are loaded from `@expo-google-fonts/*` (Plus Jakarta Sans, Inter, Newsreader, Mrs Saint Delafield); import each
weight from its own entry point (e.g. `@expo-google-fonts/inter/400Regular`) to keep the bundle small.
