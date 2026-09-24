import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Compass from 'lucide-react-native/icons/compass';
import Heart from 'lucide-react-native/icons/heart';
import MapPin from 'lucide-react-native/icons/map-pin';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Chip,
  FadeInUp,
  STICKY_REVEAL_HEADER_HEIGHT,
  ScrollScreen,
  StickyRevealHeader,
  Text,
} from '@/components/ui';
import { useTheme, genreChartColors, moodBreakdownColors } from '@/theme';

import { MoodDonutChart } from './components/MoodDonutChart';
import { PercentBarRow } from './components/PercentBarRow';
import { StatCard } from './components/StatCard';
import {
  CITY_BREAKDOWN,
  GENRE_BREAKDOWN,
  MOOD_BREAKDOWN,
  STATISTICS_RANGES,
} from './data/statisticsBreakdown';
import { EXPERIENCE_TYPES } from './data/experienceTypes';
import { useCurrentUser } from './useCurrentUser';

/** Roughly the height of the in-content title below — same "proxy, not a pixel-exact measurement"
 * approach as Favorites'/History's own `revealOffset` (`docs/DECISIONS.md` D-49/D-57/D-58). */
const HEADER_REVEAL_OFFSET = 70;

/** Explicit map so each value stays a typed, checked i18n key (same pattern as `categoryLabel.ts`). */
const RANGE_LABEL_KEYS = {
  all: 'statistics.ranges.all',
  '30d': 'statistics.ranges.30d',
  '6m': 'statistics.ranges.6m',
  '1y': 'statistics.ranges.1y',
} as const;

const MOOD_LABEL_KEYS = {
  relaxed: 'statistics.moods.relaxed',
  curious: 'statistics.moods.curious',
  festive: 'statistics.moods.festive',
  romantic: 'statistics.moods.romantic',
  family: 'statistics.moods.family',
} as const;

const DEFAULT_STATS = { outings: 0, placesDiscovered: 0, favorites: 0 };

/**
 * "Mes statistiques" (profile, écran 5): three summary cards, then three breakdown sections —
 * "Tes genres préférés" (proportion bars), "Ton humeur lors des sorties" (donut, `MoodDonutChart`),
 * "Villes visitées" (proportion bars) — and an insight card. Static, curated numbers
 * (`data/statisticsBreakdown.ts`), same "plain mock content" convention as `UserStats`
 * (`docs/DECISIONS.md` D-09/D-50) — nothing here is computed from the favorites/history pools.
 */
export function StatisticsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { user } = useCurrentUser();
  const [selectedRange, setSelectedRange] = useState<(typeof STATISTICS_RANGES)[number]>('all');

  const stats = user?.stats ?? DEFAULT_STATS;

  // Not `useCallback`, same reason as `PreferencesScreen`'s own `handleScroll`: mutating a shared
  // value from inside a memoized callback trips this project's ref-immutability lint rule.
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }

  const genreColors = genreChartColors[scheme];
  const moodColors = moodBreakdownColors[scheme];

  return (
    <View style={{ flex: 1 }}>
      <ScrollScreen
        testID="statistics-scroll"
        onScroll={handleScroll}
        contentContainerStyle={{
          // `ScrollScreen`'s own `SafeAreaView` already offsets content by `insets.top`; only the
          // floating header's own height needs adding on top of that.
          paddingTop: STICKY_REVEAL_HEADER_HEIGHT + 16,
          paddingBottom: insets.bottom + 32,
          gap: 28,
        }}
      >
        <Text variant="h2" accessibilityRole="header">
          {t('profile.statistics')}
        </Text>

        <View className="flex-row" style={{ gap: 10 }}>
          {STATISTICS_RANGES.map((range) => (
            <Chip
              key={range}
              label={t(RANGE_LABEL_KEYS[range])}
              selected={selectedRange === range}
              onPress={() => setSelectedRange(range)}
            />
          ))}
        </View>

        <View className="flex-row" style={{ gap: 12 }}>
          <FadeInUp delay={0} style={{ flex: 1 }}>
            <StatCard icon={Compass} value={stats.outings} label={t('profile.stats.outings')} />
          </FadeInUp>
          <FadeInUp delay={80} style={{ flex: 1 }}>
            <StatCard
              icon={MapPin}
              value={stats.placesDiscovered}
              label={t('profile.placesDiscovered')}
            />
          </FadeInUp>
          <FadeInUp delay={160} style={{ flex: 1 }}>
            <StatCard icon={Heart} value={stats.favorites} label={t('profile.stats.favorites')} />
          </FadeInUp>
        </View>

        <FadeInUp delay={200}>
          <View className="gap-4">
            <Text variant="h4">{t('statistics.sections.genres')}</Text>
            <View className="gap-4">
              {GENRE_BREAKDOWN.map((item, index) => {
                const type = EXPERIENCE_TYPES.find((entry) => entry.id === item.id);
                return (
                  <PercentBarRow
                    key={item.id}
                    label={type ? t(type.key) : item.id}
                    percentage={item.percentage}
                    color={genreColors[index % genreColors.length]}
                    delay={240 + index * 60}
                  />
                );
              })}
            </View>
          </View>
        </FadeInUp>

        <FadeInUp delay={240}>
          <View className="gap-4">
            <Text variant="h4">{t('statistics.sections.moods')}</Text>
            <MoodDonutChart
              centerValue={stats.outings}
              centerLabel={t('profile.stats.outings')}
              data={MOOD_BREAKDOWN.map((item) => ({
                value: item.percentage,
                color: moodColors[item.id],
                label: t(MOOD_LABEL_KEYS[item.id]),
              }))}
            />
          </View>
        </FadeInUp>

        <FadeInUp delay={280}>
          <View className="gap-4">
            <Text variant="h4">{t('statistics.sections.cities')}</Text>
            <View className="gap-4">
              {CITY_BREAKDOWN.map((item, index) => (
                <PercentBarRow
                  key={item.key}
                  label={t(item.key)}
                  percentage={item.percentage}
                  color={genreColors[index % genreColors.length]}
                  delay={320 + index * 60}
                />
              ))}
            </View>
          </View>
        </FadeInUp>

        <FadeInUp delay={360}>
          <View className="flex-row items-start gap-3 rounded-card bg-primary/5 p-4">
            <Sparkles size={18} strokeWidth={1.8} color={colors.primary} />
            <Text variant="small" tone="secondary" className="flex-1">
              {t('statistics.insight')}
            </Text>
          </View>
        </FadeInUp>
      </ScrollScreen>

      <StickyRevealHeader
        title={t('profile.statistics')}
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
