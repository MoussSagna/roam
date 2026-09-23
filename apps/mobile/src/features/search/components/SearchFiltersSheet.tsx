import { MotiView } from 'moti';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Text } from '@/components/ui';
import { getCategoryLabel } from '@/features/experiences/lib/categoryLabel';
import { useCategories } from '@/hooks/useCategories';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { repositories } from '@/services';
import type { BudgetRange, SearchFilters } from '@/types';

/** Mirrors `ConfirmationModal`'s exit-animation handling: the underlying RN `Modal` stays mounted this
 * long after `visible` turns false so the slide-down actually gets to play. */
const EXIT_DURATION_MS = 200;

/** Share of the screen height the sheet may take. It's a pixel cap (from `useWindowDimensions`), not a
 * `max-h-[%]` class: the sheet's parent is content-sized, so a percentage resolved against it capped
 * nothing and the sheet grew to fit every chip. The sections scroll inside the cap; the buttons stay put. */
const MAX_HEIGHT_RATIO = 0.6;

const DISTANCE_OPTIONS_KM = [1, 3, 5, 10] as const;
const BUDGET_OPTIONS: readonly BudgetRange[] = ['free', 'under10', '10to25', '25to50', '50plus'];
const WHEN_OPTIONS = ['now', 'today', 'weekend'] as const;

type SearchFiltersSheetProps = {
  visible: boolean;
  filters: SearchFilters;
  queryText: string;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
};

/**
 * Filters bottom sheet (Sprint 6 brief §9), built on `ConfirmationModal`'s `Modal` + backdrop +
 * `MotiView` plumbing (same exit-duration/`reduceMotion` handling) but sliding up from the bottom edge
 * instead of scaling in centered. Works on a local draft, committed to the screen only through "Voir X
 * résultats" (or discarded by the backdrop/close) — the live count re-queries the mock search
 * repository as the draft changes, same deterministic matching the results screen itself uses.
 */
export function SearchFiltersSheet({
  visible,
  filters,
  queryText,
  onApply,
  onClose,
}: SearchFiltersSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [shouldRender, setShouldRender] = useState(visible);
  const [lastVisible, setLastVisible] = useState(visible);
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const categories = useCategories();
  const [resultCount, setResultCount] = useState(0);

  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) {
      setShouldRender(true);
      setDraft(filters);
    }
  }

  useEffect(() => {
    if (!visible) return;
    let active = true;
    repositories.search.search(queryText, draft).then((results) => {
      if (active) setResultCount(results.length);
    });
    return () => {
      active = false;
    };
  }, [visible, queryText, draft]);

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
              className="gap-4 rounded-t-hero bg-surface px-6 pt-4"
              style={{
                maxHeight: windowHeight * MAX_HEIGHT_RATIO,
                paddingBottom: insets.bottom + 12,
              }}
            >
              <View className="h-1 w-10 self-center rounded-pill bg-border" />
              <Text variant="h3" accessibilityRole="header">
                {t('search.filters.title')}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                <FilterSection title={t('search.filters.category')}>
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      label={getCategoryLabel(t, category.slug) ?? category.slug}
                      selected={draft.categoryId === category.id}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          categoryId: current.categoryId === category.id ? undefined : category.id,
                        }))
                      }
                    />
                  ))}
                </FilterSection>

                <FilterSection title={t('search.filters.distance')}>
                  {DISTANCE_OPTIONS_KM.map((km) => (
                    <Chip
                      key={km}
                      label={t('search.filters.distanceValue', { count: km })}
                      selected={draft.maxDistanceKm === km}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          maxDistanceKm: current.maxDistanceKm === km ? undefined : km,
                        }))
                      }
                    />
                  ))}
                </FilterSection>

                <FilterSection title={t('search.filters.budget')}>
                  {BUDGET_OPTIONS.map((budget) => (
                    <Chip
                      key={budget}
                      label={t(`context.budget.${budget}`)}
                      selected={draft.budget === budget}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          budget: current.budget === budget ? undefined : budget,
                        }))
                      }
                    />
                  ))}
                </FilterSection>

                <FilterSection title={t('search.filters.when')}>
                  {WHEN_OPTIONS.map((when) => (
                    <Chip
                      key={when}
                      label={t(`search.filters.whenValue.${when}`)}
                      selected={draft.when === when}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          when: current.when === when ? undefined : when,
                        }))
                      }
                    />
                  ))}
                </FilterSection>

                <FilterSection title={t('search.filters.options')} last>
                  <Chip
                    label={t('search.filters.openNow')}
                    selected={!!draft.openNow}
                    onPress={() =>
                      setDraft((current) => ({ ...current, openNow: !current.openNow }))
                    }
                  />
                  <Chip
                    label={t('search.filters.walkable')}
                    selected={!!draft.walkable}
                    onPress={() =>
                      setDraft((current) => ({ ...current, walkable: !current.walkable }))
                    }
                  />
                </FilterSection>
              </ScrollView>

              <View className="flex-row gap-3 pt-2">
                <Button
                  label={t('search.filters.reset')}
                  variant="secondary"
                  className="flex-1"
                  onPress={() => setDraft({})}
                />
                <Button
                  label={t('search.filters.apply', { count: resultCount })}
                  variant="primary"
                  className="flex-1"
                  onPress={() => {
                    onApply(draft);
                    onClose();
                  }}
                />
              </View>
            </MotiView>
          </Pressable>
        </Pressable>
      </MotiView>
    </Modal>
  );
}

function FilterSection({
  title,
  children,
  last = false,
}: {
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <View className={`gap-3 ${last ? 'pb-1' : 'pb-4'}`}>
      <Text variant="small" tone="secondary" className="font-bodyMedium">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}
