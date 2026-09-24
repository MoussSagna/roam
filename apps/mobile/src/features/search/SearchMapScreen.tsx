import { useLocalSearchParams, useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import { ExperienceMapCard } from '@/features/map/components/ExperienceMapCard';
import { RoamMap } from '@/features/map/components/RoamMap';
import { isPinnable, toMapMarkers } from '@/features/map/lib/markers';
import type { Experience } from '@/types';

import { SearchFilterChip } from './components/SearchFilterChip';
import { SearchFiltersSheet } from './components/SearchFiltersSheet';
import { SearchInput } from './components/SearchInput';
import { hasActiveFilters } from './lib/searchFilters';
import { useSearchSession } from './SearchSessionContext';

type SearchMapParams = {
  /** Same entry-point hint `SearchScreen` gets; only picks the placeholder copy. */
  context?: 'home' | 'discover';
};

/**
 * Search's full-screen map (`/search/map`, D-72). The map is the screen's surface — `RoamMap` fills the
 * whole screen (absolute fill, no fixed height, no ScrollView, no rounded corners) and the controls
 * float above it in a `pointerEvents="box-none"` overlay, so panning still works anywhere the controls
 * aren't: back + the search field on one row, the one "Filtres" chip below, and the selected
 * experience's `ExperienceMapCard` at the bottom.
 *
 * It owns no search logic: query, filters, sort and results come from the shared
 * `SearchSessionProvider` (the same state `SearchScreen` renders), the pins are
 * `toMapMarkers(sortedResults)`, and filters are the one `SearchFiltersSheet`. Back is `router.back()`
 * — to the list, with everything still there. Like `/search`, it is a root-`Stack` route beside
 * `(tabs)`, so the floating tab bar isn't rendered here.
 */
export function SearchMapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<SearchMapParams>();
  const {
    queryText,
    setQueryText,
    filters,
    sortedResults,
    isLoading,
    selectedMapId,
    setSelectedMapId,
    runSearch,
    applyFilters,
    reset,
  } = useSearchSession();
  const [filtersVisible, setFiltersVisible] = useState(false);

  const placeholder =
    params.context === 'discover' ? t('discover.search.placeholder') : t('home.search.placeholder');

  const markers = useMemo(() => toMapMarkers(sortedResults), [sortedResults]);
  // A new result set means a new frame: `RoamMap` frames its markers once on mount, so the key remounts
  // it only when the *set* of pins changes (not on selection, not on a reorder).
  const markersKey = useMemo(
    () =>
      markers
        .map((marker) => marker.id)
        .sort()
        .join('|'),
    [markers],
  );
  const selectedExperience =
    sortedResults.find((experience) => experience.id === selectedMapId && isPinnable(experience)) ??
    null;

  const goBackToList = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/search');
    }
  }, [router]);

  const handleClear = useCallback(() => {
    // Nothing left to map once the search is cleared: back to the list's initial state.
    reset();
    goBackToList();
  }, [reset, goBackToList]);

  const toggleMarker = useCallback(
    (id: string) => setSelectedMapId(selectedMapId === id ? null : id),
    [selectedMapId, setSelectedMapId],
  );
  const clearSelection = useCallback(() => setSelectedMapId(null), [setSelectedMapId]);

  const goToExperience = useCallback(
    (experience: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
    },
    [router],
  );

  return (
    <View className="flex-1 bg-background">
      <RoamMap
        key={markersKey}
        markers={markers}
        selectedMarkerId={selectedExperience?.id ?? null}
        onPressMarker={toggleMarker}
        onPressMap={clearSelection}
        rounded={false}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <View pointerEvents="box-none" className="gap-3 px-4 pt-2">
          <View pointerEvents="box-none" className="flex-row items-center gap-2">
            <IconButton
              icon={ChevronLeft}
              accessibilityLabel={t('common.back')}
              onPress={goBackToList}
              size={56}
            />
            <View className="flex-1">
              <SearchInput
                value={queryText}
                onChangeText={setQueryText}
                onSubmit={() => runSearch(queryText)}
                onClear={handleClear}
                placeholder={placeholder}
              />
            </View>
          </View>

          <View pointerEvents="box-none" className="flex-row">
            <SearchFilterChip
              active={hasActiveFilters(filters)}
              onPress={() => setFiltersVisible(true)}
            />
          </View>
        </View>
      </SafeAreaView>

      {!isLoading && sortedResults.length === 0 ? (
        <View
          pointerEvents="none"
          testID="search-map-empty"
          className="absolute inset-x-0 top-1/2 items-center px-6"
        >
          <View className="rounded-pill border border-border bg-surface px-5 py-3">
            <Text variant="body">{t('search.empty.title')}</Text>
          </View>
        </View>
      ) : null}

      {selectedExperience ? (
        <ExperienceMapCard
          experience={selectedExperience}
          onPressView={goToExperience}
          onClose={clearSelection}
        />
      ) : null}

      <SearchFiltersSheet
        visible={filtersVisible}
        filters={filters}
        queryText={queryText}
        onApply={applyFilters}
        onClose={() => setFiltersVisible(false)}
      />
    </View>
  );
}
