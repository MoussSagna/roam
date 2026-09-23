import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui';
import { useTheme } from '@/theme';

type SearchFilterChipProps = {
  /** `true` when at least one filter is set (the chip shows as selected). */
  active: boolean;
  onPress: () => void;
};

/** The "Filtres" chip — shared by `SearchActionBar` (list) and `SearchMapScreen` so the entry into the
 * one filters sheet looks and reads the same in both. */
export function SearchFilterChip({ active, onPress }: SearchFilterChipProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Chip
      label={t('search.results.filters')}
      icon={<SlidersHorizontal size={16} strokeWidth={1.8} color={colors.text} />}
      selected={active}
      onPress={onPress}
    />
  );
}
