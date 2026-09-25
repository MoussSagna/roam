import { useRouter } from 'expo-router';
import Clock from 'lucide-react-native/icons/clock';
import Coins from 'lucide-react-native/icons/coins';
import MapIcon from 'lucide-react-native/icons/map';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
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
 * Journey creation — builder, "Ton parcours" (`/journey/create/builder`), the LAST step (sprint 12,
 * D-86): the selection as a vertical timeline (arrival times, travel between steps), recomputed live by
 * `buildPlan` as steps are moved up / down or removed. "+ Ajouter une expérience" goes back to the
 * suggestions (the draft keeps everything). "Créer mon parcours" is the one moment the draft becomes
 * the `active` journey (saved through the repository); the flow then gives way to `/journey/[id]`.
 */
export function JourneyBuilderScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const draft = useJourneyDraft();
  const { requestLeave, quitModal } = useLeaveCreation();
  const { byId, isLoading, categoryLabelFor } = useJourneyExperiences();
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
  const addExperience = () => router.navigate('/journey/create/suggestions');

  const isEmpty = !isLoading && ordered.length === 0;

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

          {createError ? (
            <View accessibilityRole="alert" className="gap-3 rounded-large bg-error/10 p-4">
              <Text variant="body" tone="error">
                {t(
                  createError === 'alreadyActive'
                    ? 'journey.builder.alreadyActive'
                    : 'journey.builder.createError',
                )}
              </Text>
              {createError === 'alreadyActive' && current ? (
                <Button
                  label={t('journey.builder.viewActive')}
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
        label={t('journey.builder.create')}
        icon={Play}
        loading={creating}
        disabled={ordered.length === 0 || !draft.toDraft()}
        onPress={() => void create()}
      />
      {quitModal}
    </View>
  );
}
