import { useLocalSearchParams, useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ListIcon from 'lucide-react-native/icons/list';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { pickTrending } from '@/features/discover/lib/pickTrending';
import { useFavoriteExperienceIds } from '@/features/home/useFavoriteExperienceIds';
import { useHomeExperiences } from '@/features/home/useHomeExperiences';
import { ExperienceMapCard } from '@/features/map/components/ExperienceMapCard';
import { RoamMap } from '@/features/map/components/RoamMap';
import { toMapMarkers } from '@/features/map/lib/markers';
import { useTheme } from '@/theme';
import type { Experience, SearchSortOption } from '@/types';

import { ExploreByMoodSection } from './components/ExploreByMoodSection';
import { RecentSearchList } from './components/RecentSearchList';
import { SearchActionBar, type SearchResultsView } from './components/SearchActionBar';
import { SearchEmptyState } from './components/SearchEmptyState';
import { SearchFiltersSheet } from './components/SearchFiltersSheet';
import { SearchInput } from './components/SearchInput';
import { SearchResultsList } from './components/SearchResultsList';
import { SearchSortSheet } from './components/SearchSortSheet';
import { SearchSuggestionsList } from './components/SearchSuggestionsList';
import { TrendingChips } from './components/TrendingChips';
import { TRENDING_CHIPS } from './data/trendingChips';
import { hasActiveFilters } from './lib/searchFilters';
import { sortResults } from './lib/sortResults';
import { useRecentSearches } from './useRecentSearches';
import { useSearch } from './useSearch';

type SearchScreenParams = {
  /** Which entry point opened Search — only changes the placeholder copy (Sprint 6 brief §3), the
   * underlying search logic is identical either way. */
  context?: 'home' | 'discover';
  /** `'1'` opens the filter sheet immediately (the trailing filter icon on either `SearchBar`). */
  openFilters?: string;
};

/**
 * Global search (sprint 6, redesigned sprint 8 — `docs/DECISIONS.md` D-71). States driven by
 * `useSearch`: **initial** (no query yet — recent/trending/explore-by-mood), **typing** (live
 * suggestions), **results**, itself either the **list** view (`SearchActionBar` + `SearchResultsList`,
 * results' own **empty** state) or the **map** view (a full-screen `RoamMap` over the exact same
 * results). `Screen -> hook -> Repository -> mock`, same layering as the rest of the app; sort/filters
 * are a pure client-side transform of whatever the repository already returned (sprint 8 §4/§18).
 */
export function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<SearchScreenParams>();

  const { experiences } = useHomeExperiences();
  const { favoriteIds, toggleFavorite } = useFavoriteExperienceIds(experiences);
  const { recentSearches, addRecentSearch, removeRecentSearch } = useRecentSearches();
  const {
    queryText,
    setQueryText,
    filters,
    setFilters,
    suggestions,
    results,
    isLoading,
    hasSubmitted,
    submit,
    reset,
  } = useSearch();

  const [view, setView] = useState<SearchResultsView>('list');
  const [sort, setSort] = useState<SearchSortOption>('recommended');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(params.openFilters === '1');
  // Lifted above the map (not local to it) so a selected pin survives a Carte -> Liste -> Carte
  // round trip (sprint 8 §8: "conserver... sélection éventuelle").
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const placeholder =
    params.context === 'discover' ? t('discover.search.placeholder') : t('home.search.placeholder');

  const fallbackExperiences = useMemo(() => pickTrending(experiences, 6), [experiences]);
  // The single source of truth for both views (sprint 8 §7): the map never runs its own search or
  // filtering, it only draws pins for whatever `sortedResults` already is.
  const sortedResults = useMemo(() => sortResults(results, sort), [results, sort]);
  const mapMarkers = useMemo(() => toMapMarkers(sortedResults), [sortedResults]);
  const selectedMapExperience = sortedResults.find((exp) => exp.id === selectedMapId) ?? null;

  const goToExperience = useCallback(
    (experience: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
    },
    [router],
  );

  const runSearch = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      submit(trimmed);
      addRecentSearch(trimmed);
    },
    [submit, addRecentSearch],
  );

  const handleClear = useCallback(() => {
    reset();
    setView('list');
    setSelectedMapId(null);
  }, [reset]);

  const handleSeeTrending = useCallback(() => {
    runSearch(t(TRENDING_CHIPS[0].labelKey));
  }, [runSearch, t]);

  const toggleMapMarker = useCallback((id: string) => {
    setSelectedMapId((current) => (current === id ? null : id));
  }, []);
  const clearMapSelection = useCallback(() => setSelectedMapId(null), []);

  const isInitial = !hasSubmitted && queryText.trim().length === 0;
  const isTyping = !hasSubmitted && queryText.trim().length > 0;

  const actionBar = (
    <SearchActionBar
      view={view}
      resultCount={sortedResults.length}
      sortLabel={t(`search.sort.options.${sort}`)}
      isSortActive={sort !== 'recommended'}
      isFiltersActive={hasActiveFilters(filters)}
      onOpenSort={() => setSortSheetVisible(true)}
      onOpenFilters={() => setFiltersVisible(true)}
      onPressMap={() => setView('map')}
    />
  );

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="gap-4 px-6 pb-4 pt-3">
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
              hitSlop={12}
              className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
            >
              <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
            </Pressable>
            <Text variant="h3" accessibilityRole="header">
              {t('search.title')}
            </Text>
          </View>

          <SearchInput
            value={queryText}
            onChangeText={setQueryText}
            onSubmit={() => runSearch(queryText)}
            onClear={handleClear}
            placeholder={placeholder}
            autoFocus={!hasSubmitted}
          />
        </View>

        {isInitial ? (
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ gap: 28, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <RecentSearchList
              recentSearches={recentSearches}
              onSelect={runSearch}
              onRemove={removeRecentSearch}
            />
            <TrendingChips onSelect={runSearch} />
            <ExploreByMoodSection onSelect={runSearch} />
          </ScrollView>
        ) : isTyping ? (
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <SearchSuggestionsList
              suggestions={suggestions}
              experiences={experiences}
              onSelectQuery={runSearch}
              onSelectExperience={goToExperience}
            />
          </ScrollView>
        ) : view === 'list' ? (
          <View className="flex-1 px-6">
            {actionBar}

            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <Text variant="body" tone="secondary">
                  {t('common.loading')}
                </Text>
              </View>
            ) : (
              <SearchResultsList
                results={sortedResults}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onPressExperience={goToExperience}
                emptyStateElement={
                  <SearchEmptyState
                    onExpandArea={() => setFilters({ ...filters, maxDistanceKm: undefined })}
                    onClearFilters={() => setFilters({})}
                    onSeeTrending={handleSeeTrending}
                    fallbackExperiences={fallbackExperiences}
                    favoriteIds={favoriteIds}
                    onToggleFavorite={toggleFavorite}
                    onPressExperience={goToExperience}
                  />
                }
              />
            )}
          </View>
        ) : (
          // Map mode (sprint 8 §6): near edge-to-edge — only the action row (Filtrer alone) keeps the
          // page's own side padding, the map itself bleeds to the screen edges (`RoamMap`'s
          // `rounded={false}`).
          <View className="flex-1">
            <View className="px-6 pb-3">{actionBar}</View>

            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <Text variant="body" tone="secondary">
                  {t('common.loading')}
                </Text>
              </View>
            ) : (
              <View className="flex-1">
                <RoamMap
                  markers={mapMarkers}
                  selectedMarkerId={selectedMapExperience?.id ?? null}
                  onPressMarker={toggleMapMarker}
                  onPressMap={clearMapSelection}
                  rounded={false}
                />

                {/* The way back to the list (sprint 8 §12) — the action row above only ever shows
                    "Filtrer" in map mode, so the return control lives on the map itself instead. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('search.results.viewList')}
                  onPress={() => setView('list')}
                  hitSlop={8}
                  className="absolute right-4 top-4 flex-row items-center gap-1.5 rounded-pill border border-border bg-surface px-4 py-2.5 active:opacity-80"
                >
                  <ListIcon size={16} strokeWidth={1.8} color={colors.text} />
                  <Text variant="small" className="font-bodyMedium">
                    {t('search.results.viewList')}
                  </Text>
                </Pressable>

                {selectedMapExperience ? (
                  <ExperienceMapCard
                    experience={selectedMapExperience}
                    onPressView={goToExperience}
                    onClose={clearMapSelection}
                  />
                ) : null}
              </View>
            )}
          </View>
        )}
      </SafeAreaView>

      <SearchFiltersSheet
        visible={filtersVisible}
        filters={filters}
        queryText={queryText}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          if (!hasSubmitted) {
            submit(queryText);
          }
        }}
        onClose={() => setFiltersVisible(false)}
      />

      <SearchSortSheet
        visible={sortSheetVisible}
        sort={sort}
        onSelect={setSort}
        onClose={() => setSortSheetVisible(false)}
      />
    </View>
  );
}
