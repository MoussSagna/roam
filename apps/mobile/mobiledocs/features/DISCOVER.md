# Mobile — Discover

Immersive, editorial discovery page (sprint 6, [`DECISIONS.md`](../DECISIONS.md) D-65), replacing the sprint 3 placeholder.
Built on the mock experience pool and a new `Collection` pool (`useDiscoverData`, both through their own
repositories) — not a social feed: no profiles, followers, stories, comments or like counts
([`UX_SCREENS_AND_FLOWS.md`](../../../../appdocs/product/UX_SCREENS_AND_FLOWS.md) sprint 6 brief).

| Section                        | Component                                                                     | Notes                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secondary nav                  | `features/discover/components/DiscoverTabs.tsx`                               | "Pour toi" / "Tendances" / "À proximité" / "Collections", `FlatList horizontal`; narrows which sections show (`DiscoverScreen`'s `TAB_SECTIONS`) |
| Search bar                     | `components/ui/SearchBar.tsx`                                                 | Reused from Home; opens the shared `/search` (`context: 'discover'`); sticky — see "Sticky headers" (D-69)/"Search" below                        |
| Sélection ROAM                 | `RoamSelectionSection.tsx` + `DiscoverCollectionCard` (`variant="hero"`)      | Featured (`Collection.isFeatured`) editorial collections, `FlatList horizontal`                                                                  |
| Suggestions pour toi           | `SuggestionsSection.tsx` + `DiscoverMoodCard.tsx` + `data/suggestionMoods.ts` | Ce soir / Entre amis / En couple / Culture / Nature / Activités — presentational only, `FlatList horizontal`                                     |
| Grande expérience immersive    | `components/ImmersiveExperienceCard.tsx` + `lib/pickImmersiveExperience.ts`   | One fixed card (not a carousel); static editorial copy, links to a picked experience                                                             |
| Près de toi                    | `NearbySection.tsx` + `lib/pickNearby.ts`                                     | Reuses Home's `ExperienceCard`; "Voir la carte" → `/map` (real `RoamMap`, sprint 7), `FlatList horizontal`                                       |
| Ce qui fait envie en ce moment | `TrendingSection.tsx` + `lib/pickTrending.ts`                                 | Reuses Home's `ExperienceCard`, highest-rated first, `FlatList horizontal`                                                                       |
| Explorer par envie             | `CollectionsSection.tsx` + `DiscoverCollectionCard` (`variant="compact"`)     | Non-featured collections only (the featured ones already have their own card above), `FlatList horizontal`                                       |

Every carousel on this page (all but the secondary nav) is `components/ui/HorizontalCarousel.tsx`, not a
plain `FlatList` or `ScrollView` — full-bleed past the page's own padding, snaps one card at a time; see
"Horizontal lists / carousels" below. "Voir l'expérience"/a card tap pushes to `experience/[id]`; a collection tap pushes to
`collection/[id]` (`CollectionDetailPlaceholder`, not the real screen yet). Favorites reuse Home's own
`useFavoriteExperienceIds` (in-memory, no persistence). Discover reuses `useTabBarScrollHandler()` like
every other tab screen, but has no floating/`StickyRevealHeader` chrome of its own: unlike Experience
Detail or Profile, it has no full-bleed hero photo at the very top for a header to reveal over.
