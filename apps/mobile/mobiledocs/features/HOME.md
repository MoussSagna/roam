# Mobile — Home

Immersive discovery page (sprint 5, [`DECISIONS.md`](../DECISIONS.md) D-45), built on the mock experience pool through the
existing `ExperienceRepository`/`CategoryRepository` (`useHomeExperiences`), not the sprint 3 placeholder.

| Section                             | Component                                                              | Notes                                                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Hero carousel                       | `features/home/components/HeroCarousel.tsx`                            | Full-bleed, swipeable, paging `ScrollView`; dots (`CarouselDots`) + prev/next; the `isHero` experiences (API mode: best-rated 5, D-96) |
| Search bar                          | `components/ui/SearchBar.tsx`                                          | Opens the shared `/search` (`context: 'home'`); sticky — see "Sticky headers" (D-69)/"Search" below                                    |
| Selon ton humeur                    | `Chip` (icon slot) + `features/home/data/moods.ts`                     | 5 mood chips, single choice, drives "Des idées pour toi"                                                                               |
| Les expériences les plus populaires | `features/home/components/ExperienceCard.tsx`                          | The `isPopular` experiences (API mode: most reviewed, D-96)                                                                            |
| Lieux proches de toi                | `features/home/components/NearbyCard.tsx` + `data/nearbyCategories.ts` | 5 static category shortcuts (no geolocation)                                                                                           |
| Des idées pour toi                  | `ExperienceCard` (reused) + `useForYouRecommendations`                 | `RecommendationRepository` (API-12, D-99): `GET /recommendations` in API mode, `pickForYou` in mock mode                               |

`ExperienceCard` is shared by "Les expériences les plus populaires" and "Des idées pour toi" (same card
shape) rather than duplicated per section. Favorites are local state (`useFavoriteExperienceIds`), no
persistence. "Voir l'expérience" pushes to `experience/[id]` (`ExperienceDetailScreen`,
`features/experiences/`, sprint 5). Home reuses `useTabBarScrollHandler()` /
`TabBarCollapseContext` like every other tab screen; `RoamTabBar` itself was not touched this sprint.

**Polish (sprint 4, [`DECISIONS.md`](../DECISIONS.md) D-46):** the Hero's CTA switches to the `primary` `Button` variant
in dark mode (was unreadable white-on-white); pulling down past the top stretches the Hero image via a
`react-native-reanimated` shared value + `useAnimatedStyle` on an `Animated.View` wrapping
`HeroCarousel` (mutated from a plain `onScroll`, not `useAnimatedScrollHandler` — see D-46 for why);
the notification bell moved out of `HeroCarousel` into a new floating `HomeHeader`
(`features/home/components/`) that shows/hides with scroll direction via a new, generic
`useScrollDirection` hook (`src/hooks/`), fully independent of `TabBarCollapseContext`.

## API mode (DATA-8)

The pool comes from `repositories.experiences.list()` — the API catalog in API mode
([`../MOBILE_API_INTEGRATION.md`](../MOBILE_API_INTEGRATION.md)). The API serves no hero/popular flag, so
`lib/pickFeatured.ts` falls back to the best-rated / most-reviewed experiences when none is flagged (D-96). A failed
load shows an error state (message + "Réessayer") instead of an endless loading screen. While it loads, Home is not
replaced by a wait (API-12, D-100): the mood chips and nearby tiles show at once, `HeroSkeleton` and
`ExperienceCarouselLoading` (a spinner, then skeleton cards after 300 ms) stand where the hero and the popular cards
will be, and "Des idées pour toi" loads the same way on its own. The four horizontal sections are `HorizontalCarousel`s
(`FlatList`, full-bleed past the page's `px-6`): cards snap on `CARD_WIDTH + 16`, tiles on `NEARBY_CARD_WIDTH + 18`,
mood chips without snap. API experiences have no image yet: the cards' existing no-photo state is used.
