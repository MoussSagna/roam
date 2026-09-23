import ArrowUpDown from 'lucide-react-native/icons/arrow-up-down';
import MapIcon from 'lucide-react-native/icons/map';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { SearchFilterChip } from './SearchFilterChip';

type SearchActionBarProps = {
  resultCount: number;
  sortLabel: string;
  isSortActive: boolean;
  isFiltersActive: boolean;
  onOpenSort: () => void;
  onOpenFilters: () => void;
  /** Opens `SearchMapScreen` (`/search/map`). */
  onPressMap: () => void;
};

/**
 * Search list's action row (sprint 8 §1/§3, D-71): [Trier] [Filtres] [Carte] plus the result count and
 * the active sort. Built from the existing `Chip` (icon + label; `selected` reflects an active choice)
 * — no new button primitive. The map screen has its own, single "Filtres" chip
 * (`SearchFilterChip`), so this bar only ever has one shape.
 */
export function SearchActionBar({
  resultCount,
  sortLabel,
  isSortActive,
  isFiltersActive,
  onOpenSort,
  onOpenFilters,
  onPressMap,
}: SearchActionBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="gap-3" testID="search-action-bar">
      <View className="flex-row items-center gap-2">
        <Chip
          label={t('search.results.sort')}
          icon={<ArrowUpDown size={16} strokeWidth={1.8} color={colors.text} />}
          selected={isSortActive}
          onPress={onOpenSort}
        />
        <SearchFilterChip active={isFiltersActive} onPress={onOpenFilters} />
        <Chip
          label={t('search.results.viewMap')}
          icon={<MapIcon size={16} strokeWidth={1.8} color={colors.text} />}
          onPress={onPressMap}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <Text variant="body" tone="secondary">
          {t('search.results.count', { count: resultCount })}
        </Text>
        <Text variant="small" tone="secondary">
          {sortLabel}
        </Text>
      </View>
    </View>
  );
}
