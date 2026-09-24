import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip } from '@/components/ui';
import { SectionHeader } from '@/features/home/components/SectionHeader';

import { TRENDING_CHIPS } from '../data/trendingChips';

type TrendingChipsProps = {
  onSelect: (query: string) => void;
};

/** "Tendances" (Sprint 6 brief §4): a wrapping grid of chips, not a carousel — the mockup shows a
 * 2x2-ish block, unlike Discover's single-row carousels. Tapping one submits it as the query. */
export function TrendingChips({ onSelect }: TrendingChipsProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-3" testID="search-section-trending">
      <SectionHeader title={t('search.trending.title')} />
      <View className="flex-row flex-wrap gap-2">
        {TRENDING_CHIPS.map((chip) => {
          const label = t(chip.labelKey);
          return <Chip key={chip.id} label={label} onPress={() => onSelect(label)} />;
        })}
      </View>
    </View>
  );
}
