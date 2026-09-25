# Mobile — Home

Immersive discovery page (sprint 5, [`DECISIONS.md`](../DECISIONS.md) D-45), built on the mock experience pool through the
existing `ExperienceRepository`/`CategoryRepository` (`useHomeExperiences`), not the sprint 3 placeholder.

| Section                             | Component                                                              | Notes                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Hero carousel                       | `features/home/components/HeroCarousel.tsx`                            | Full-bleed, swipeable, paging `ScrollView`; dots (`CarouselDots`) + prev/next; the 5 `isHero` experiences |
| Search bar                          | `components/ui/SearchBar.tsx`                                          | Opens the shared `/search` (`context: 'home'`); sticky — see "Sticky headers" (D-69)/"Search" below       |
| Selon ton humeur                    | `Chip` (icon slot) + `features/home/data/moods.ts`                     | 5 mood chips, single choice, drives "Des idées pour toi"                                                  |
| Les expériences les plus populaires | `features/home/components/ExperienceCard.tsx`                          | The 3 `isPopular` experiences                                                                             |
| Lieux proches de toi                | `features/home/components/NearbyCard.tsx` + `data/nearbyCategories.ts` | 5 static category shortcuts (no geolocation)                                                              |
| Des idées pour toi                  | `ExperienceCard` (reused) + `features/home/lib/pickForYou.ts`          | Deterministic 4-rule pick, unit-tested                                                                    |

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
