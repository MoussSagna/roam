import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Clock from 'lucide-react-native/icons/clock';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Chip,
  FadeInUp,
  STICKY_REVEAL_HEADER_HEIGHT,
  ScrollScreen,
  StickyRevealHeader,
  Text,
} from '@/components/ui';
import { getCategoryLabel } from '@/features/experiences/lib/categoryLabel';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { useCategories } from '@/hooks/useCategories';
import { useTheme } from '@/theme';
import type { Category, Experience } from '@/types';

import { HistoryEntryRow } from './components/HistoryEntryRow';
import { useHistoryExperiences } from './useHistoryExperiences';

/** Roughly the height of the in-content title below — same "proxy, not a pixel-exact measurement"
 * approach as Favorites'/Preferences' own `revealOffset` (`docs/DECISIONS.md` D-49/D-56/D-57). */
const HEADER_REVEAL_OFFSET = 70;
const STAGGER_STEP_MS = 50;
const MAX_STAGGER_MS = 300;

const HISTORY_SECTIONS = ['thisWeek', 'thisMonth', 'earlier'] as const;
type HistorySection = (typeof HISTORY_SECTIONS)[number];

/** Explicit map so each value stays a typed, checked i18n key, not a dynamic template literal
 * (`react-i18next`'s typed keys reject those — same pattern as `categoryLabel.ts`). */
const SECTION_LABEL_KEYS = {
  thisWeek: 'history.sections.thisWeek',
  thisMonth: 'history.sections.thisMonth',
  earlier: 'history.sections.earlier',
} as const satisfies Record<HistorySection, string>;

/**
 * "Mon historique" (profile, écran 4): completed experiences grouped by "Cette semaine"/"Ce
 * mois-ci"/"Plus tôt", with category filter chips above the list. Backed by `Experience.historyPeriod`
 * (`useHistoryExperiences`) — same "extend `Experience`, no parallel entity" choice as Favorites
 * (`docs/DECISIONS.md` D-57), documented for this screen as D-58. No removal interaction: history is a
 * read-only log, tapping a row opens the experience detail.
 */
export function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const categories = useCategories();
  const { history, isLoading } = useHistoryExperiences();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Not `useCallback`, same reason as `PreferencesScreen`'s own `handleScroll`: mutating a shared
  // value from inside a memoized callback trips this project's ref-immutability lint rule.
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }

  const categoryFor = useCallback(
    (experience: Experience): Category | undefined =>
      categories.find((item) => experience.categoryIds.includes(item.id)),
    [categories],
  );

  const categoryLabelFor = useCallback(
    (experience: Experience): string | null => {
      const category = categoryFor(experience);
      return category ? getCategoryLabel(t, category.slug) : null;
    },
    [categoryFor, t],
  );

  // "Tout" plus one chip per category actually present in the history pool, in first-appearance
  // order — derived from the real data rather than a fixed list, so every chip is guaranteed at
  // least one match (no "no results for this filter" state to design for, `docs/DECISIONS.md` D-58).
  const filterCategories = useMemo(() => {
    const seen = new Map<string, Category>();
    for (const experience of history) {
      const category = categoryFor(experience);
      if (category && !seen.has(category.id)) {
        seen.set(category.id, category);
      }
    }
    return Array.from(seen.values());
  }, [history, categoryFor]);

  const filteredHistory = useMemo(
    () =>
      selectedCategoryId
        ? history.filter((experience) => experience.categoryIds.includes(selectedCategoryId))
        : history,
    [history, selectedCategoryId],
  );

  const sections = useMemo(
    () =>
      HISTORY_SECTIONS.map((section) => ({
        section,
        items: filteredHistory.filter((experience) => experience.historyPeriod === section),
      })).filter((group) => group.items.length > 0),
    [filteredHistory],
  );

  const goToExperience = useCallback(
    (experience: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
    },
    [router],
  );

  const goToHome = useCallback(() => {
    router.push('/home');
  }, [router]);

  let rowIndex = 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollScreen
        testID="history-scroll"
        onScroll={handleScroll}
        contentContainerStyle={{
          // `ScrollScreen`'s own `SafeAreaView` already offsets content by `insets.top`; only the
          // floating header's own height needs adding on top of that.
          paddingTop: STICKY_REVEAL_HEADER_HEIGHT + 16,
          paddingBottom: insets.bottom + 32,
          gap: 20,
        }}
      >
        <Text variant="h2" accessibilityRole="header">
          {t('history.title')}
        </Text>

        {isLoading ? (
          <Text variant="body" tone="secondary" className="pt-16 text-center">
            {t('common.loading')}
          </Text>
        ) : history.length === 0 ? (
          <View className="items-center gap-4 pt-16">
            <View className="h-16 w-16 items-center justify-center rounded-pill bg-surfaceElevated">
              <Clock size={26} strokeWidth={1.5} color={colors.textSecondary} />
            </View>
            <Text variant="body" tone="secondary" className="text-center">
              {t('history.empty')}
            </Text>
            <Button label={t('history.findOuting')} onPress={goToHome} />
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 24 }}
            >
              <Chip
                label={t('history.filters.all')}
                selected={selectedCategoryId === null}
                onPress={() => setSelectedCategoryId(null)}
              />
              {filterCategories.map((category) => (
                <Chip
                  key={category.id}
                  label={getCategoryLabel(t, category.slug) ?? category.slug}
                  selected={selectedCategoryId === category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                />
              ))}
            </ScrollView>

            <View className="gap-6">
              {sections.map(({ section, items }) => (
                <View key={section} className="gap-2">
                  <SectionHeader title={t(SECTION_LABEL_KEYS[section])} />
                  {items.map((experience) => {
                    const delay = Math.min(rowIndex++ * STAGGER_STEP_MS, MAX_STAGGER_MS);
                    return (
                      <FadeInUp key={experience.id} delay={delay}>
                        <HistoryEntryRow
                          experience={experience}
                          categoryLabel={categoryLabelFor(experience)}
                          onPress={goToExperience}
                        />
                      </FadeInUp>
                    );
                  })}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollScreen>

      <StickyRevealHeader
        title={t('history.title')}
        scrollY={scrollY}
        revealOffset={HEADER_REVEAL_OFFSET}
        leftSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            hitSlop={12}
            className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          >
            <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
          </Pressable>
        }
      />
    </View>
  );
}
