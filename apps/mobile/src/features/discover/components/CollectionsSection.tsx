import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { SectionHeader } from '@/features/home/components/SectionHeader';
import type { Collection } from '@/types';

import { DiscoverCollectionCard } from './DiscoverCollectionCard';

type CollectionsSectionProps = {
  collections: readonly Collection[];
  onPress: (collection: Collection) => void;
};

/** "Explorer par envie" (Discover, sprint 6 §"Section 6"): a compact grid of the non-featured editorial
 * collections — the featured ones already have their own, larger card in "Sélection ROAM"; showing them
 * again here would just duplicate the same collection under two cards. */
export function CollectionsSection({ collections, onPress }: CollectionsSectionProps) {
  const { t } = useTranslation();

  if (collections.length === 0) {
    return null;
  }

  return (
    <View className="gap-3" testID="discover-section-collections">
      <SectionHeader title={t('discover.sections.collections')} />
      <FlatList
        horizontal
        data={collections}
        keyExtractor={(collection) => collection.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 24 }}
        renderItem={({ item }) => (
          <DiscoverCollectionCard collection={item} variant="compact" onPress={onPress} />
        )}
      />
    </View>
  );
}
