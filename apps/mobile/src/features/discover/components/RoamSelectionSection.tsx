import { FlatList } from 'react-native';

import type { Collection } from '@/types';

import { DiscoverCollectionCard } from './DiscoverCollectionCard';

type RoamSelectionSectionProps = {
  collections: readonly Collection[];
  onPress: (collection: Collection) => void;
};

/**
 * "Sélection ROAM" (Discover, sprint 6 §"Section 1"): the page's strongest visual moment, one large
 * immersive card per featured collection. No `SectionHeader` here — the "SÉLECTION ROAM" label already
 * lives on each card as a badge (`DiscoverCollectionCard`, `variant="hero"`), so a second title above
 * the carousel would repeat it.
 */
export function RoamSelectionSection({ collections, onPress }: RoamSelectionSectionProps) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <FlatList
      horizontal
      data={collections}
      keyExtractor={(collection) => collection.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 16, paddingRight: 24 }}
      renderItem={({ item }) => (
        <DiscoverCollectionCard collection={item} variant="hero" onPress={onPress} />
      )}
    />
  );
}
