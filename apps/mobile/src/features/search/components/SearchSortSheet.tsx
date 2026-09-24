import X from 'lucide-react-native/icons/x';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';
import type { SearchSortOption } from '@/types';

import { SORT_OPTIONS } from '../data/sortOptions';

import { SortOptionRow } from './SortOptionRow';

/** Mirrors `SearchFiltersSheet`'s exit-animation handling (`docs/DECISIONS.md`): the underlying RN
 * `Modal` stays mounted this long after `visible` turns false so the slide-down actually plays. */
const EXIT_DURATION_MS = 200;

type SearchSortSheetProps = {
  visible: boolean;
  sort: SearchSortOption;
  onSelect: (sort: SearchSortOption) => void;
  onClose: () => void;
};

/**
 * Sort bottom sheet (sprint 8 §4): same `Modal` + backdrop + `MotiView` slide-up chrome as
 * `SearchFiltersSheet`, radiogroup of `SortOptionRow`s instead of a form — picking an option applies
 * it immediately and closes the sheet (no separate "Voir les résultats" step, unlike Filtres: a single
 * choice needs no draft/apply distinction). Entirely local — `sortResults` does the actual reordering.
 */
export function SearchSortSheet({ visible, sort, onSelect, onClose }: SearchSortSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [shouldRender, setShouldRender] = useState(visible);
  const [lastVisible, setLastVisible] = useState(visible);

  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) {
      setShouldRender(true);
    }
  }

  useEffect(() => {
    if (visible) return;
    const timeout = setTimeout(() => setShouldRender(false), EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ type: 'timing', duration: reduceMotion ? 0 : EXIT_DURATION_MS }}
        style={{ flex: 1 }}
      >
        <Pressable
          accessibilityRole="none"
          onPress={onClose}
          className="flex-1 justify-end bg-overlay/40"
        >
          <Pressable onPress={() => {}}>
            <MotiView
              from={{ translateY: reduceMotion ? 0 : 320 }}
              animate={{ translateY: visible || reduceMotion ? 0 : 320 }}
              transition={{ type: 'timing', duration: reduceMotion ? 0 : EXIT_DURATION_MS }}
              accessibilityViewIsModal
              className="gap-2 rounded-t-hero bg-surface px-6 pt-4"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              <View className="h-1 w-10 self-center rounded-pill bg-border" />

              <View className="flex-row items-center justify-between pt-2">
                <Text variant="h3" accessibilityRole="header">
                  {t('search.results.sort')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={onClose}
                  hitSlop={8}
                >
                  <X size={20} strokeWidth={1.8} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View accessibilityRole="radiogroup">
                {SORT_OPTIONS.map((option) => (
                  <SortOptionRow
                    key={option.value}
                    label={t(`search.sort.options.${option.value}`)}
                    icon={option.icon}
                    selected={sort === option.value}
                    onPress={() => {
                      onSelect(option.value);
                      onClose();
                    }}
                  />
                ))}
              </View>
            </MotiView>
          </Pressable>
        </Pressable>
      </MotiView>
    </Modal>
  );
}
