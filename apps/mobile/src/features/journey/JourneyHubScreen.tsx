import { useRouter } from 'expo-router';
import Plus from 'lucide-react-native/icons/plus';
import Route from 'lucide-react-native/icons/route';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ConfirmationModal, FadeInUp, ScrollScreen, Text } from '@/components/ui';
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
 * - a journey in progress → it comes first ("Continuer mon parcours" → `/journey/[id]`), then the past
 *   ones, then a discreet "Créer un nouveau parcours" (one active journey at a time: it explains that
 *   instead of starting a flow that would be refused at the end);
 * - none in progress, some completed → "Mes parcours": create, then the history;
 * - nothing at all → an empty state with "Créer mon parcours".
 */
export function JourneyHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
  const [activeExistsVisible, setActiveExistsVisible] = useState(false);
  const [openActiveOnExit, setOpenActiveOnExit] = useState(false);

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
  const requestCreate = () => (active ? setActiveExistsVisible(true) : create());

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
      <FadeInUp delay={active ? 200 : 120} style={{ gap: 12 }}>
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
  } else if (active) {
    body = (
      <>
        {header(t('journey.hub.activeTitle'), t('journey.hub.activeSubtitle'))}
        <FadeInUp delay={100}>
          <CurrentJourneyCard
            journey={active}
            experiencesById={byId}
            categoryLabelFor={categoryLabelFor}
            onContinue={() => openJourney(active.id)}
          />
        </FadeInUp>
        {historySection}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('journey.hub.createNew')}
          onPress={requestCreate}
          className="flex-row items-center justify-center gap-2 rounded-card border border-dashed border-border py-4 active:opacity-70"
        >
          <Plus size={18} strokeWidth={2} color={colors.textSecondary} />
          <Text variant="body" tone="secondary" className="font-bodySemibold">
            {t('journey.hub.createNew')}
          </Text>
        </Pressable>
      </>
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
    <>
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

      <ConfirmationModal
        visible={activeExistsVisible}
        title={t('journey.hub.activeExistsTitle')}
        description={t('journey.hub.activeExistsDescription', { title: active?.title ?? '' })}
        confirmLabel={t('journey.hub.activeExistsView')}
        cancelLabel={t('common.close')}
        icon={Route}
        onConfirm={() => {
          setOpenActiveOnExit(true);
          setActiveExistsVisible(false);
        }}
        onCancel={() => setActiveExistsVisible(false)}
        onExited={() => {
          // Navigate once the dialog is gone (D-78).
          if (openActiveOnExit && active) openJourney(active.id);
          setOpenActiveOnExit(false);
        }}
      />
    </>
  );
}
