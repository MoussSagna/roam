import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HorizontalCarousel } from '@/components/ui';
import { DiscoverMoodCard, TILE_SIZE } from '@/features/discover/components/DiscoverMoodCard';
import { SUGGESTION_MOODS } from '@/features/discover/data/suggestionMoods';
import { SectionHeader } from '@/features/home/components/SectionHeader';

const SPACING = 14;

type ExploreByMoodSectionProps = {
  onSelect: (query: string) => void;
};

/**
 * "Explorer par envie" (Sprint 6 brief §4): reuses Discover's `SUGGESTION_MOODS`/`DiscoverMoodCard`
 * as-is rather than a parallel vocabulary — same tiles, and their **first real wiring**: on Discover
 * selecting one is purely presentational; here it submits the mood's label as the search query.
 */
export function ExploreByMoodSection({ onSelect }: ExploreByMoodSectionProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-3" testID="search-section-explore">
      <SectionHeader title={t('search.explore.title')} />
      <HorizontalCarousel
        data={SUGGESTION_MOODS}
        keyExtractor={(mood) => mood.id}
        itemWidth={TILE_SIZE}
        spacing={SPACING}
        renderItem={({ item }) => (
          <DiscoverMoodCard
            mood={item}
            selected={false}
            onPress={(mood) => onSelect(t(mood.labelKey))}
          />
        )}
      />
    </View>
  );
}
