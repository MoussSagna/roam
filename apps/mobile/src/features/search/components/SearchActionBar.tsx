import ArrowUpDown from 'lucide-react-native/icons/arrow-up-down';
import MapIcon from 'lucide-react-native/icons/map';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type SearchResultsView = 'list' | 'map';

const ICON_SIZE = 16;

type SearchActionBarProps = {
  view: SearchResultsView;
  /** List mode only: shown next to the result count. */
  resultCount: number;
  sortLabel: string;
  isSortActive: boolean;
  isFiltersActive: boolean;
  onOpenSort: () => void;
  onOpenFilters: () => void;
  /** Switches to the map. Not called in map mode — that row has no "Carte" chip to press
   * (sprint 8 §6: only "Filtrer" stays visible there; see `SearchScreen`'s floating "Liste" button for
   * the way back). */
  onPressMap: () => void;
};

/**
 * Search's action row (sprint 8 §1/§3): one shared component for both of its shapes — list mode's
 * [Trier] [Filtrer] [Carte] plus the result count, and map mode's lone [Filtrer] — rather than two
 * separate bars, since they're the same visual language (`Chip`, icon + label, `selected` reflecting
 * an active choice) just narrowed by `view`. Reuses `Chip` (sprint 8 §3: "ne pas créer trois composants
 * différents"), sized like every other `Chip` in the app — no new touch-target primitive.
 */
export function SearchActionBar({
  view,
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
        {view === 'list' ? (
          <>
            <Chip
              label={t('search.results.sort')}
              icon={<ArrowUpDown size={ICON_SIZE} strokeWidth={1.8} color={colors.text} />}
              selected={isSortActive}
              onPress={onOpenSort}
            />
            <Chip
              label={t('search.results.filters')}
              icon={<SlidersHorizontal size={ICON_SIZE} strokeWidth={1.8} color={colors.text} />}
              selected={isFiltersActive}
              onPress={onOpenFilters}
            />
            <Chip
              label={t('search.results.viewMap')}
              icon={<MapIcon size={ICON_SIZE} strokeWidth={1.8} color={colors.text} />}
              onPress={onPressMap}
            />
          </>
        ) : (
          <Chip
            label={t('search.results.filters')}
            icon={<SlidersHorizontal size={ICON_SIZE} strokeWidth={1.8} color={colors.text} />}
            selected={isFiltersActive}
            onPress={onOpenFilters}
          />
        )}
      </View>

      {view === 'list' ? (
        <View className="flex-row items-center justify-between">
          <Text variant="body" tone="secondary">
            {t('search.results.count', { count: resultCount })}
          </Text>
          <Text variant="small" tone="secondary">
            {sortLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
