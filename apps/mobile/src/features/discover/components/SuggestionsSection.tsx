import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { SectionHeader } from '@/features/home/components/SectionHeader';

import { SUGGESTION_MOODS, type SuggestionMood } from '../data/suggestionMoods';
import { DiscoverMoodCard } from './DiscoverMoodCard';

type SuggestionsSectionProps = {
  selected: SuggestionMood['id'] | null;
  onSelect: (mood: SuggestionMood) => void;
};

/** "Suggestions pour toi" (Discover, sprint 6 §"Section 2"): moment/company/category tiles to inspire
 * browsing, not a real filter (see `DiscoverMoodCard`). */
export function SuggestionsSection({ selected, onSelect }: SuggestionsSectionProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-3" testID="discover-section-suggestions">
      <SectionHeader title={t('discover.sections.suggestions')} />
      <FlatList
        horizontal
        data={SUGGESTION_MOODS}
        keyExtractor={(mood) => mood.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 14, paddingRight: 24 }}
        renderItem={({ item }) => (
          <DiscoverMoodCard mood={item} selected={item.id === selected} onPress={onSelect} />
        )}
      />
    </View>
  );
}
