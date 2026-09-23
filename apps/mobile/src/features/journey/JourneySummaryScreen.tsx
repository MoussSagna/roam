import { useRouter } from 'expo-router';
import Clock from 'lucide-react-native/icons/clock';
import Coins from 'lucide-react-native/icons/coins';
import Flag from 'lucide-react-native/icons/flag';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import MapIcon from 'lucide-react-native/icons/map';
import Play from 'lucide-react-native/icons/play';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Sunrise from 'lucide-react-native/icons/sunrise';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  FadeInUp,
  STICKY_FOOTER_CLEARANCE,
  StickyActionFooter,
  Text,
} from '@/components/ui';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import type { Experience } from '@/types';

import { JourneyFlowHeader } from './components/JourneyFlowHeader';
import { JourneyMapPreview } from './components/JourneyMapPreview';
import { JourneyStats } from './components/JourneyStats';
import { JourneyTimeline } from './components/JourneyTimeline';
import { useJourneyExperiences } from './hooks/useJourneyExperiences';
import { useLeaveCreation } from './hooks/useLeaveCreation';
import { useJourneyDraft } from './JourneyDraftContext';
import { ActiveJourneyExistsError, createJourney, useJourney } from './journeyStore';
import { formatBudget, formatDistance, formatDuration } from './lib/format';
import { buildPlan } from './lib/plan';

type CreateError = 'alreadyActive' | 'failed' | null;

/**
 * Journey creation 6/6 — summary (`/journey/create/summary`): totals, a small map of the route, the
 * timeline, and "Créer mon parcours" — the one moment a draft becomes the `active` journey (saved
 * through the repository), after which the flow is replaced by the journey's own screen.
 */
export function JourneySummaryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const draft = useJourneyDraft();
  const { requestLeave, quitModal } = useLeaveCreation();
  const { byId, categoryLabelFor } = useJourneyExperiences();
  const { journey: current } = useJourney();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<CreateError>(null);

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

  const create = async () => {
    const journeyDraft = draft.toDraft();
    if (!journeyDraft || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createJourney(
        journeyDraft,
        t('journey.defaultTitle', { mood: t(`journey.moods.${journeyDraft.context.mood}`) }),
      );
      // The flow is done: its whole stack gives way to the journey's own screen.
      router.replace({ pathname: '/journey/[id]', params: { id: created.id } });
    } catch (error) {
      setCreating(false);
      setCreateError(error instanceof ActiveJourneyExistsError ? 'alreadyActive' : 'failed');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="px-6">
          <JourneyFlowHeader onBack={() => router.back()} onClose={requestLeave} step={6} />
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
          <FadeInUp style={{ gap: 8 }}>
            <View className="flex-row items-center gap-2">
              <Sparkles size={18} strokeWidth={1.8} color={colors.primary} />
              <Text variant="caption" tone="primary" className="uppercase tracking-[2px]">
                {t('journey.intro.eyebrow')}
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 32, lineHeight: 38 }}
              className="text-text"
            >
              {t('journey.summary.title')}
            </Text>
            {plan ? (
              <Text variant="body" tone="secondary">
                {[
                  `${ordered.length} ${t('journey.stats.experiences').toLowerCase()}`,
                  formatDuration(plan.estimatedDurationMin),
                  formatBudget(plan.estimatedBudgetEur),
                ].join(' · ')}
              </Text>
            ) : null}
          </FadeInUp>

          {plan ? (
            <FadeInUp delay={100}>
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
                  { icon: Sunrise, value: draft.startTime, label: t('journey.stats.start') },
                  { icon: Flag, value: plan.endTime, label: t('journey.stats.end') },
                  {
                    icon: Sparkles,
                    value: String(ordered.length),
                    label: t('journey.stats.experiences'),
                  },
                ]}
              />
            </FadeInUp>
          ) : null}

          <FadeInUp delay={160}>
            <View className="overflow-hidden rounded-card">
              <JourneyMapPreview experiences={ordered} start={draft.startLocation} />
            </View>
          </FadeInUp>

          {plan ? (
            <JourneyTimeline
              steps={plan.steps}
              experiencesById={byId}
              categoryLabelFor={categoryLabelFor}
              onPressExperience={openExperience}
            />
          ) : null}

          <View className="flex-row gap-3 rounded-card bg-primary/10 p-4">
            <Lightbulb size={20} strokeWidth={1.8} color={colors.primary} />
            <View className="flex-1 gap-1">
              <Text variant="label">{t('journey.summary.encouragementTitle')}</Text>
              <Text variant="small" tone="secondary">
                {t('journey.summary.encouragement')}
              </Text>
            </View>
          </View>

          {createError ? (
            <View accessibilityRole="alert" className="gap-3 rounded-large bg-error/10 p-4">
              <Text variant="body" tone="error">
                {t(
                  createError === 'alreadyActive'
                    ? 'journey.summary.alreadyActive'
                    : 'journey.summary.createError',
                )}
              </Text>
              {createError === 'alreadyActive' && current ? (
                <Button
                  label={t('journey.summary.viewActive')}
                  variant="secondary"
                  onPress={() =>
                    router.replace({ pathname: '/journey/[id]', params: { id: current.id } })
                  }
                />
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <StickyActionFooter
        visible
        label={t('journey.summary.create')}
        icon={Play}
        loading={creating}
        disabled={!draft.toDraft()}
        onPress={() => void create()}
      />
      {quitModal}
    </View>
  );
}
