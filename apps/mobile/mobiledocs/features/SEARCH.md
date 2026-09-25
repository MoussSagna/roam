# Mobile — Search

Shared global search (sprint 6, [`DECISIONS.md`](../DECISIONS.md) D-68; flow redesigned in sprint 8, D-71), reached from both Home's and
Discover's `SearchBar` (`router.push({ pathname: '/search', params: { context } })`) — one screen, not two: the
`context` param only changes which existing placeholder copy is shown
(`home.search.placeholder`/`discover.search.placeholder`). Built on a `SearchRepository`
(`services/mock/search.ts`, deterministic text/facet matching, no real query engine) over the existing
mock experience pool. **No backend**: search, filters and sort are all local/mocked.

Two routes over **one shared state** (`SearchSessionProvider`, mounted by the nested layout `app/search/_layout.tsx`):

**`/search` — `SearchScreen` (list)**

```text
back + title
  ↓
SearchInput
  ↓
[ Trier ] [ Filtres ] [ Carte ]     ← SearchActionBar (shared Chip)
  ↓
"N expériences"            <active sort>
  ↓
SearchResultsList → SearchResultCard …
```

**`/search/map` — `SearchMapScreen` (full screen, opened by "Carte")**

```text
RoamMap — absolute fill, edge to edge, no fixed height, no ScrollView      (the surface)
  ▲ overlay (pointerEvents="box-none", under the Safe Area top inset)
  ├─ [‹ back]  SearchInput          ← same field/logic as the list
  ├─ [ Filtres ]                    ← SearchFilterChip → the one SearchFiltersSheet
  └─ ExperienceMapCard (bottom)     ← when a pin is selected → "Voir le lieu" → experience/[id]
```

| State              | Component(s)                                                                                                                               | Notes                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial (no query) | `RecentSearchList` + `TrendingChips` + `ExploreByMoodSection`                                                                              | Recent searches persisted via `lib/storage.ts` (`useRecentSearches`); trending is a static chip grid; explore-by-mood reuses Discover's `SUGGESTION_MOODS`/`DiscoverMoodCard`                                       |
| Typing             | `SearchSuggestionsList`                                                                                                                    | Debounced `suggest()`; query-text suggestions then up to a few matching experiences                                                                                                                                 |
| Results — list     | `SearchActionBar` + `SearchResultsList` (`FlatList`)                                                                                       | Trier/Filtres/Carte `Chip`s (`selected` = an active sort/filter), result count + active sort label; results are `SearchResultCard`, a full-width sibling of `ExperienceCard`                                        |
| Results — map      | `SearchMapScreen` (`/search/map`): `RoamMap` (`rounded={false}`, absolute fill) + `SearchInput` + `SearchFilterChip` + `ExperienceMapCard` | Markers = `toMapMarkers(sortedResults)`; the map never searches/filters itself; results without `coordinates` stay in the list but get no pin                                                                       |
| Sort               | `SearchSortSheet` + `SortOptionRow` + `lib/sortResults.ts`                                                                                 | Bottom sheet (same chrome as the filters sheet), picking a row applies + closes; Recommandé / Plus proche / Mieux noté / Prix croissant / Prix décroissant — a pure client-side reorder of the repository's results |
| Filters            | `SearchFiltersSheet`                                                                                                                       | **One** bottom sheet opened from both `SearchScreen` and `SearchMapScreen`; category (`useCategories`), distance, budget (`context.budget.*`), "Quand ?", options; local draft, live result count                   |
| Empty              | `SearchEmptyState`                                                                                                                         | Relax-distance / clear-filters / see-trending actions ([`RECOMMENDATION.md`](../../../../appdocs/domain/RECOMMENDATION.md)'s "no perfect match" guidance) plus a `pickTrending` fallback carousel                   |

**Single source of truth.** `SearchSessionProvider` (`features/search/SearchSessionContext.tsx`) wraps `useSearch()` and adds
the sort, the recent searches, the selected map pin and `runSearch`/`applyFilters`; `sortedResults = sortResults(results, sort)`
feeds the list, the count _and_ the map markers. Both screens read it through `useSearchSession()`, so "Carte" and back lose
nothing, and the map has no search logic of its own. Leaving `/search` unmounts the provider → the next visit starts fresh.
**Navigation**: "Carte" = `router.push('/search/map')` (fade), the map's ‹ = `router.back()` (`router.replace('/search')` if
there is nothing behind it, e.g. a deep link); native swipe-back stays off (the nested `Stack` repeats `gestureEnabled: false`).
**Tab bar**: `/search` and `/search/map` are inside a root `Stack` screen next to `(tabs)`, so the floating tab bar is never
shown on them — nothing to hide, `RoamTabBar` untouched. **Sticky search**: the list's `SearchInput` sits outside the scrolling
list; the map's floats above the map.

Favorites reuse Home's `useFavoriteExperienceIds`; a result/suggestion/map-pin tap pushes to
`experience/[id]` (`ExperienceDetailScreen`) — no separate detail screen. See D-68 and D-71 for the full
rationale and trade-offs.
