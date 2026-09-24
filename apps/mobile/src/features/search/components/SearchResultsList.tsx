import type { ReactElement } from 'react';
import { FlatList, View } from 'react-native';

import type { Experience } from '@/types';

import { SearchResultCard } from './SearchResultCard';

type SearchResultsListProps = {
  results: readonly Experience[];
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  onPressExperience: (experience: Experience) => void;
  emptyStateElement: ReactElement;
};

/**
 * Vertical results list (Sprint 6 brief §8): a `FlatList`, not a `ScrollView` holding every card —
 * stable `keyExtractor`, `ListEmptyComponent` for the "no results" state, ready for a real API's
 * pagination later without a rewrite. The results header (count/quick filters/Filtres/Liste-Carte) is
 * owned by `SearchScreen` itself, not this list, so it stays visible when the view switches to the map.
 */
export function SearchResultsList({
  results,
  favoriteIds,
  onToggleFavorite,
  onPressExperience,
  emptyStateElement,
}: SearchResultsListProps) {
  return (
    <FlatList
      testID="search-results-list"
      style={{ flex: 1 }}
      data={results}
      keyExtractor={(experience) => experience.id}
      renderItem={({ item }) => (
        <SearchResultCard
          experience={item}
          isFavorite={favoriteIds.has(item.id)}
          onToggleFavorite={onToggleFavorite}
          onPress={onPressExperience}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListEmptyComponent={emptyStateElement}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
