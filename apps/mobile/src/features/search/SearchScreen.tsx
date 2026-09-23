import { useLocalSearchParams, useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { pickTrending } from '@/features/discover/lib/pickTrending';
import { useFavoriteExperienceIds } from '@/features/home/useFavoriteExperienceIds';
import { useHomeExperiences } from '@/features/home/useHomeExperiences';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

import { ExploreByMoodSection } from './components/ExploreByMoodSection';
import { RecentSearchList } from './components/RecentSearchList';
import { SearchActionBar } from './components/SearchActionBar';
import { SearchEmptyState } from './components/SearchEmptyState';
import { SearchFiltersSheet } from './components/SearchFiltersSheet';
import { SearchInput } from './components/SearchInput';
import { SearchResultsList } from './components/SearchResultsList';
import { SearchSortSheet } from './components/SearchSortSheet';
import { SearchSuggestionsList } from './components/SearchSuggestionsList';
import { TrendingChips } from './components/TrendingChips';
import { TRENDING_CHIPS } from './data/trendingChips';
import { hasActiveFilters } from './lib/searchFilters';
import { useSearchSession } from './SearchSessionContext';

type SearchScreenParams = {
  /** Which entry point opened Search — only changes the placeholder copy (Sprint 6 brief §3), the
   * underlying search logic is identical either way. */
  context?: 'home' | 'discover';
  /** `'1'` opens the filter sheet immediately (the trailing filter icon on either `SearchBar`). */
  openFilters?: string;
};

/**
 * Global search (sprint 6, redesigned sprint 8 — `docs/DECISIONS.md` D-71/D-72): the **list** side.
 * States driven by the shared search session: **initial** (recent/trending/explore-by-mood), **typing**
 * (live suggestions) and **results** (`SearchActionBar` + `SearchResultsList`, with its own **empty**
 * state). "Carte" opens `SearchMapScreen` (`/search/map`) — a separate full-screen route over the same
 * `SearchSessionProvider` state. Sort/filters are a client-side transform of what the repository
 * returned (`Screen -> session -> useSearch -> Repository -> mock`).
 */
export function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<SearchScreenParams>();

  const { experiences } = useHomeExperiences();
  const { favoriteIds, toggleFavorite } = useFavoriteExperienceIds(experiences);
  const {
    queryText,
    setQueryText,
    filters,
    suggestions,
    sortedResults,
    isLoading,
    hasSubmitted,
    sort,
    setSort,
    recentSearches,
    removeRecentSearch,
    runSearch,
    applyFilters,
    reset,
  } = useSearchSession();

  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(params.openFilters === '1');

  const placeholder =
    params.context === 'discover' ? t('discover.search.placeholder') : t('home.search.placeholder');

  const fallbackExperiences = useMemo(() => pickTrending(experiences, 6), [experiences]);

  const goToExperience = useCallback(
    (experience: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
    },
    [router],
  );

  const goToMap = useCallback(() => {
    router.push({
      pathname: '/search/map',
      params: params.context ? { context: params.context } : {},
    });
  }, [router, params.context]);

  const handleSeeTrending = useCallback(() => {
    runSearch(t(TRENDING_CHIPS[0].labelKey));
  }, [runSearch, t]);

  const isInitial = !hasSubmitted && queryText.trim().length === 0;
  const isTyping = !hasSubmitted && queryText.trim().length > 0;

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
            onClear={reset}
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
        ) : (
          <View className="flex-1 px-6">
            <SearchActionBar
              resultCount={sortedResults.length}
              sortLabel={t(`search.sort.options.${sort}`)}
              isSortActive={sort !== 'recommended'}
              isFiltersActive={hasActiveFilters(filters)}
              onOpenSort={() => setSortSheetVisible(true)}
              onOpenFilters={() => setFiltersVisible(true)}
              onPressMap={goToMap}
            />

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
                    onExpandArea={() => applyFilters({ ...filters, maxDistanceKm: undefined })}
                    onClearFilters={() => applyFilters({})}
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
        )}
      </SafeAreaView>

      <SearchFiltersSheet
        visible={filtersVisible}
        filters={filters}
        queryText={queryText}
        onApply={applyFilters}
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
