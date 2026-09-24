import { useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Plus from 'lucide-react-native/icons/plus';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FadeInUp, ScrollScreen, Text } from '@/components/ui';
import { TAB_BAR_CLEARANCE } from '@/features/navigation/tabBarConfig';
import { useTabBarScrollHandler } from '@/features/navigation/TabBarCollapseContext';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { CurrentJourneyCard } from './components/CurrentJourneyCard';
import { JourneyHistoryCard } from './components/JourneyHistoryCard';
import { JourneyHubEmptyState } from './components/JourneyHubEmptyState';
import { useJourneyExperiences } from './hooks/useJourneyExperiences';
import { useJourney } from './journeyStore';

/**
 * The Parcours tab (`/journey`, sprint 11) — the entry point to journeys. It only decides what to show
 * from the existing `journeyStore`; the journey itself stays on `/journey/[id]` and creation on the
 * `/journey/create` flow:
 *
 * - a journey in progress → only that journey (`CurrentJourneyCard`: an edge-to-edge hero from the top
 *   of the screen, then its content; "Continuer mon parcours" → `/journey/[id]`) — no history, no
 *   "Créer un nouveau parcours" (one active journey at a time);
 * - none in progress, some completed → "Mes parcours": create, then the history;
 * - nothing at all → an empty state with "Créer mon parcours".
 */
export function JourneyHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const onScroll = useTabBarScrollHandler();
  const { journey, history, state, isLoading, error, reload } = useJourney();
  const {
    experiences,
    byId,
    isLoading: experiencesLoading,
    error: experiencesError,
    retry,
    categoryLabelFor,
  } = useJourneyExperiences();
  const active = state === 'active' ? journey : null;

  const covers = useMemo(
    () =>
      experiences
        .filter((experience) => experience.coverImage)
        .sort((a, b) => Number(!!b.isHero) - Number(!!a.isHero))
        .slice(0, 3)
        .map((experience) => experience.coverImage!),
    [experiences],
  );

  const openJourney = (id: string) => router.push({ pathname: '/journey/[id]', params: { id } });
  const create = () => router.push('/journey/create');

  // A journey in progress: the hero starts at the very top, edge to edge — no safe-area inset and no
  // horizontal padding here; the content under it keeps the page padding (`CurrentJourneyCard`).
  if (active && !isLoading && !experiencesLoading && !error && !experiencesError) {
    return (
      <View className="flex-1 bg-background">
        {isFocused ? <StatusBar style="light" /> : null}
        <ScrollView
          testID="journey-hub-scroll"
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
        >
          <FadeInUp>
            <CurrentJourneyCard
              journey={active}
              experiencesById={byId}
              categoryLabelFor={categoryLabelFor}
              onContinue={() => openJourney(active.id)}
              onOpenMap={() =>
                router.push({ pathname: '/journey/[id]/map', params: { id: active.id } })
              }
              onOpenExperience={(experience) =>
                router.push({ pathname: '/experience/[id]', params: { id: experience.id } })
              }
            />
          </FadeInUp>
        </ScrollView>
      </View>
    );
  }

  const header = (title: string, subtitle: string) => (
    <FadeInUp style={{ gap: 6 }}>
      <Text variant="caption" tone="primary" className="uppercase tracking-[2px]">
        {t('journey.hub.eyebrow')}
      </Text>
      <Text
        accessibilityRole="header"
        className="text-text"
        style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 34, lineHeight: 40 }}
      >
        {title}
      </Text>
      <Text variant="body" tone="secondary">
        {subtitle}
      </Text>
    </FadeInUp>
  );

  const historySection =
    history.length > 0 ? (
      <FadeInUp delay={120} style={{ gap: 12 }}>
        <Text variant="h4" accessibilityRole="header">
          {t('journey.hub.previousTitle')}
        </Text>
        <View testID="journey-history-list" className="gap-3">
          {history.map((item) => (
            <JourneyHistoryCard
              key={item.id}
              journey={item}
              experiencesById={byId}
              onPress={() => openJourney(item.id)}
            />
          ))}
        </View>
      </FadeInUp>
    ) : null;

  let body;
  if (isLoading || experiencesLoading) {
    body = (
      <Text variant="body" tone="secondary" className="mt-24 text-center">
        {t('common.loading')}
      </Text>
    );
  } else if (error || experiencesError) {
    body = (
      <View className="mt-24 items-center gap-4">
        <Text variant="body" tone="secondary" className="text-center">
          {t('journey.active.error')}
        </Text>
        <Button
          label={t('common.retry')}
          variant="secondary"
          onPress={() => (error ? void reload() : retry())}
        />
      </View>
    );
  } else if (history.length > 0) {
    body = (
      <>
        {header(t('journey.hub.historyTitle'), t('journey.hub.historySubtitle'))}
        <FadeInUp delay={60}>
          <Button
            label={t('journey.hub.createNew')}
            leadingIcon={<Plus size={20} strokeWidth={2} color={colors.primaryForeground} />}
            onPress={create}
          />
        </FadeInUp>
        {historySection}
      </>
    );
  } else {
    body = <JourneyHubEmptyState covers={covers} onCreate={create} />;
  }

  return (
    <ScrollScreen
      testID="journey-hub-scroll"
      onScroll={onScroll}
      contentContainerStyle={{
        paddingTop: 24,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        gap: 24,
      }}
    >
      {body}
    </ScrollScreen>
  );
}
