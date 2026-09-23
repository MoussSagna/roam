import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { SearchFilters } from '@/types';

export type SearchResultsView = 'list' | 'map';

const QUICK_FILTER_DISTANCE_KM = 2;

type SearchResultsHeaderProps = {
  resultCount: number;
  filters: SearchFilters;
  onChangeFilters: (filters: SearchFilters) => void;
  onOpenFilters: () => void;
  view: SearchResultsView;
  onChangeView: (view: SearchResultsView) => void;
};

/** Results header (Sprint 6 brief §6/§10): count, the three quick-filter chips from the mockup ("Tous /
 * Ouvert maintenant / < 2 km" — direct shortcuts into `SearchFilters`, not a fourth facet), the
 * "Filtres" entry into the full sheet, and the Liste/Carte toggle. */
export function SearchResultsHeader({
  resultCount,
  filters,
  onChangeFilters,
  onOpenFilters,
  view,
  onChangeView,
}: SearchResultsHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const isOpenNowSelected = !!filters.openNow;
  const isNearSelected = filters.maxDistanceKm === QUICK_FILTER_DISTANCE_KM;
  const isAllSelected = !isOpenNowSelected && !isNearSelected;

  return (
    <View className="gap-3" testID="search-results-header">
      <Text variant="body" tone="secondary">
        {t('search.results.count', { count: resultCount })}
      </Text>

      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row flex-wrap gap-2">
          <Chip
            label={t('search.results.quickFilters.all')}
            selected={isAllSelected}
            onPress={() => onChangeFilters({ ...filters, openNow: undefined, maxDistanceKm: undefined })}
          />
          <Chip
            label={t('search.results.quickFilters.openNow')}
            selected={isOpenNowSelected}
            onPress={() => onChangeFilters({ ...filters, openNow: !isOpenNowSelected || undefined })}
          />
          <Chip
            label={t('search.results.quickFilters.nearby')}
            selected={isNearSelected}
            onPress={() =>
              onChangeFilters({
                ...filters,
                maxDistanceKm: isNearSelected ? undefined : QUICK_FILTER_DISTANCE_KM,
              })
            }
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.results.filters')}
          onPress={onOpenFilters}
          hitSlop={8}
          className="flex-row items-center gap-1 active:opacity-70"
        >
          <SlidersHorizontal size={16} strokeWidth={1.8} color={colors.text} />
          <Text variant="small" className="font-bodyMedium">
            {t('search.results.filters')}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row self-start rounded-pill border border-border bg-surface p-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.results.viewList')}
          accessibilityState={{ selected: view === 'list' }}
          onPress={() => onChangeView('list')}
          className={`rounded-pill px-4 py-1.5 ${view === 'list' ? 'bg-primary' : ''}`}
        >
          <Text variant="small" tone={view === 'list' ? 'onPrimary' : 'default'}>
            {t('search.results.viewList')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.results.viewMap')}
          accessibilityState={{ selected: view === 'map' }}
          onPress={() => onChangeView('map')}
          className={`rounded-pill px-4 py-1.5 ${view === 'map' ? 'bg-primary' : ''}`}
        >
          <Text variant="small" tone={view === 'map' ? 'onPrimary' : 'default'}>
            {t('search.results.viewMap')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
