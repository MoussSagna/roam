import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HorizontalCarousel } from '@/components/ui';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import type { Collection } from '@/types';

import { COMPACT_WIDTH, DiscoverCollectionCard } from './DiscoverCollectionCard';

type CollectionsSectionProps = {
  collections: readonly Collection[];
  onPress: (collection: Collection) => void;
};

const SPACING = 12;

/** "Explorer par envie" (Discover, sprint 6 §"Section 6"): a compact grid of the non-featured editorial
 * collections — the featured ones already have their own, larger card in "Sélection ROAM"; showing them
 * again here would just duplicate the same collection under two cards. Full-bleed + snap
 * (`HorizontalCarousel`): reuses the card's own `COMPACT_WIDTH`. */
export function CollectionsSection({ collections, onPress }: CollectionsSectionProps) {
  const { t } = useTranslation();

  if (collections.length === 0) {
    return null;
  }

  return (
    <View className="gap-3" testID="discover-section-collections">
      <SectionHeader title={t('discover.sections.collections')} />
      <HorizontalCarousel
        data={collections}
        keyExtractor={(collection) => collection.id}
        itemWidth={COMPACT_WIDTH}
        spacing={SPACING}
        renderItem={({ item }) => (
          <DiscoverCollectionCard collection={item} variant="compact" onPress={onPress} />
        )}
      />
    </View>
  );
}
