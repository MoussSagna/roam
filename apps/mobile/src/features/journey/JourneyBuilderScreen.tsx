import { useRouter } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Clock from 'lucide-react-native/icons/clock';
import Coins from 'lucide-react-native/icons/coins';
import MapIcon from 'lucide-react-native/icons/map';
import Plus from 'lucide-react-native/icons/plus';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInUp, STICKY_FOOTER_CLEARANCE, StickyActionFooter, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import type { Experience } from '@/types';

import { JourneyFlowHeader } from './components/JourneyFlowHeader';
import { JourneyStats } from './components/JourneyStats';
import { JourneyTimeline } from './components/JourneyTimeline';
import { useJourneyExperiences } from './hooks/useJourneyExperiences';
import { useLeaveCreation } from './hooks/useLeaveCreation';
import { useJourneyDraft } from './JourneyDraftContext';
import { formatBudget, formatDistance, formatDuration } from './lib/format';
import { buildPlan } from './lib/plan';

/**
 * Journey creation 5/6 — builder (`/journey/create/builder`): the selection as a vertical timeline
 * (arrival times, travel between steps), recomputed live by `buildPlan` as steps are moved up / down or
 * removed. "+ Ajouter une expérience" goes back to the suggestions (the draft keeps everything).
 */
export function JourneyBuilderScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const draft = useJourneyDraft();
  const { requestLeave, quitModal } = useLeaveCreation();
  const { byId, isLoading, categoryLabelFor } = useJourneyExperiences();

  const ordered = useMemo(
    () =>
      draft.experienceIds
        .map((id) => byId.get(id))
        .filter((experience): experience is Experience => experience !== undefined),
    [draft.experienceIds, byId],
  );
  const plan = useMemo(
    () => (draft.startLocation ? buildPlan(ordered, draft.startLocation, draft.startTime) : null),
    [ordered, draft.startLocation, draft.startTime],
  );

  const openExperience = (experience: Experience) =>
    router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
  const addExperience = () => router.navigate('/journey/create/suggestions');

  const isEmpty = !isLoading && ordered.length === 0;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="px-6">
          <JourneyFlowHeader onBack={() => router.back()} onClose={requestLeave} step={5} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: STICKY_FOOTER_CLEARANCE + 16,
            gap: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <FadeInUp style={{ gap: 16 }}>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 32, lineHeight: 38 }}
              className="text-text"
            >
              {t('journey.builder.title')}
            </Text>
            {plan && ordered.length > 0 ? (
              <JourneyStats
                stats={[
                  {
                    icon: Clock,
                    value: formatDuration(plan.estimatedDurationMin),
                    label: t('journey.stats.duration'),
                  },
                  {
                    icon: MapIcon,
                    value: formatDistance(plan.totalDistanceM, i18n.language),
                    label: t('journey.stats.distance'),
                  },
                  {
                    icon: Coins,
                    value: formatBudget(plan.estimatedBudgetEur),
                    label: t('journey.stats.budget'),
                  },
                ]}
              />
            ) : null}
          </FadeInUp>

          {isEmpty ? (
            <View className="items-center gap-2 rounded-card border border-dashed border-border px-6 py-10">
              <Text variant="h4" className="text-center">
                {t('journey.builder.emptyTitle')}
              </Text>
              <Text variant="body" tone="secondary" className="text-center">
                {t('journey.builder.emptySubtitle')}
              </Text>
            </View>
          ) : plan ? (
            <JourneyTimeline
              steps={plan.steps}
              experiencesById={byId}
              categoryLabelFor={categoryLabelFor}
              onPressExperience={openExperience}
              onMove={draft.moveExperience}
              onRemove={(index) => draft.removeExperience(draft.experienceIds[index])}
            />
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('journey.builder.addExperience')}
            onPress={addExperience}
            className="flex-row items-center justify-center gap-2 rounded-card border border-dashed border-primary py-4 active:opacity-70"
          >
            <Plus size={18} strokeWidth={2} color={colors.primary} />
            <Text variant="body" tone="primary" className="font-bodySemibold">
              {t('journey.builder.addExperience')}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <StickyActionFooter
        visible
        label={t('journey.builder.viewJourney')}
        icon={ArrowRight}
        disabled={ordered.length === 0}
        onPress={() => router.push('/journey/create/summary')}
      />
      {quitModal}
    </View>
  );
}
