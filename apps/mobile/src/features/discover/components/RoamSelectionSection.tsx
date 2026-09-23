import { useWindowDimensions } from 'react-native';

import { HorizontalCarousel } from '@/components/ui';
import type { Collection } from '@/types';

import { DiscoverCollectionCard, getHeroCardWidth } from './DiscoverCollectionCard';

type RoamSelectionSectionProps = {
  collections: readonly Collection[];
  onPress: (collection: Collection) => void;
};

const SPACING = 16;

/**
 * "Sélection ROAM" (Discover, sprint 6 §"Section 1"): the page's strongest visual moment, one large
 * immersive card per featured collection. No `SectionHeader` here — the "SÉLECTION ROAM" label already
 * lives on each card as a badge (`DiscoverCollectionCard`, `variant="hero"`), so a second title above
 * the carousel would repeat it.
 *
 * Full-bleed + snap (`HorizontalCarousel`): `itemWidth` reuses the card's own `getHeroCardWidth`, so the
 * snap interval always matches exactly what's rendered, however the window is sized.
 */
export function RoamSelectionSection({ collections, onPress }: RoamSelectionSectionProps) {
  const { width: windowWidth } = useWindowDimensions();

  if (collections.length === 0) {
    return null;
  }

  return (
    <HorizontalCarousel
      data={collections}
      keyExtractor={(collection) => collection.id}
      itemWidth={getHeroCardWidth(windowWidth)}
      spacing={SPACING}
      renderItem={({ item }) => (
        <DiscoverCollectionCard collection={item} variant="hero" onPress={onPress} />
      )}
    />
  );
}
