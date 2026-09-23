import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HorizontalCarousel } from '@/components/ui';
import { SectionHeader } from '@/features/home/components/SectionHeader';

import { SUGGESTION_MOODS, type SuggestionMood } from '../data/suggestionMoods';
import { DiscoverMoodCard, TILE_SIZE } from './DiscoverMoodCard';

type SuggestionsSectionProps = {
  selected: SuggestionMood['id'] | null;
  onSelect: (mood: SuggestionMood) => void;
};

const SPACING = 14;

/** "Suggestions pour toi" (Discover, sprint 6 §"Section 2"): moment/company/category tiles to inspire
 * browsing, not a real filter (see `DiscoverMoodCard`). Full-bleed + snap (`HorizontalCarousel`): reuses
 * the tile's own `TILE_SIZE` for the snap interval. */
export function SuggestionsSection({ selected, onSelect }: SuggestionsSectionProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-3" testID="discover-section-suggestions">
      <SectionHeader title={t('discover.sections.suggestions')} />
      <HorizontalCarousel
        data={SUGGESTION_MOODS}
        keyExtractor={(mood) => mood.id}
        itemWidth={TILE_SIZE}
        spacing={SPACING}
        renderItem={({ item }) => (
          <DiscoverMoodCard mood={item} selected={item.id === selected} onPress={onSelect} />
        )}
      />
    </View>
  );
}
