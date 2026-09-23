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
import { ExperienceMapView } from '@/features/map/ExperienceMapView';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

import { ExploreByMoodSection } from './components/ExploreByMoodSection';
import { RecentSearchList } from './components/RecentSearchList';
import { SearchEmptyState } from './components/SearchEmptyState';
import { SearchFiltersSheet } from './components/SearchFiltersSheet';
import { SearchInput } from './components/SearchInput';
import { SearchResultsHeader, type SearchResultsView } from './components/SearchResultsHeader';
import { SearchResultsList } from './components/SearchResultsList';
import { SearchSuggestionsList } from './components/SearchSuggestionsList';
import { TrendingChips } from './components/TrendingChips';
import { TRENDING_CHIPS } from './data/trendingChips';
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
 * Global search (Sprint 6): the single screen both Home's and Discover's search bars open. Four
 * states driven by `useSearch`: **initial** (no query yet — recent/trending/explore-by-mood),
 * **typing** (live suggestions), **results** (list or the mocked map), and results' own **empty**
 * state. `Screen -> hook -> Repository -> mock`, same layering as the rest of the app.
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
  }, [reset]);

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
        ) : (
          <View className="flex-1 px-6">
            <SearchResultsHeader
              resultCount={results.length}
              filters={filters}
              onChangeFilters={setFilters}
              onOpenFilters={() => setFiltersVisible(true)}
              view={view}
              onChangeView={setView}
            />

            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <Text variant="body" tone="secondary">
                  {t('common.loading')}
                </Text>
              </View>
            ) : view === 'map' ? (
              <View className="flex-1 pt-4">
                <ExperienceMapView experiences={results} onPressExperience={goToExperience} />
              </View>
            ) : (
              <SearchResultsList
                results={results}
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
    </View>
  );
}
