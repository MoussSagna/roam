import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Clock from 'lucide-react-native/icons/clock';
import Coins from 'lucide-react-native/icons/coins';
import MapIcon from 'lucide-react-native/icons/map';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import { useMemo } from 'react';
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
import { ProgressBars } from '@/features/onboarding/components/ProgressBars';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import type { Experience } from '@/types';

import type { JourneyStepState } from './components/JourneyStepCard';
import { JourneyMapPreview } from './components/JourneyMapPreview';
import { JourneyStats } from './components/JourneyStats';
import { JourneyTimeline } from './components/JourneyTimeline';
import { useJourneyExperiences } from './hooks/useJourneyExperiences';
import { completeCurrentStep, findJourney, startJourney, useJourney } from './journeyStore';
import { formatBudget, formatDistance, formatDuration } from './lib/format';

type ActiveJourneyScreenProps = {
  journeyId?: string;
};

/**
 * The created journey (`/journey/[id]`, sprint 10) — the one place a journey is shown (it no longer
 * lives in the Profile), whether it is the current one or a completed one from the history (sprint 11,
 * opened from the Parcours tab's hub). Progress, totals, map, timeline with done / current / upcoming steps, and a
 * CTA that follows the state: "Commencer" → "Continuer mon parcours" (next step) → "Terminer mon
 * parcours" → completed. "+ Ajouter une expérience" goes to Discover, where an experience's CTA reads
 * "Ajouter au parcours".
 */
export function ActiveJourneyScreen({ journeyId }: ActiveJourneyScreenProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { journey: current, history, state, isLoading, error, reload } = useJourney();
  const journey = findJourney({ journey: current, history }, journeyId);
  const { byId, isLoading: experiencesLoading, categoryLabelFor } = useJourneyExperiences();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/journey');
  };
  const openExperience = (experience: Experience) =>
    router.push({ pathname: '/experience/[id]', params: { id: experience.id } });

  const experiences = useMemo(
    () =>
      (journey?.steps ?? [])
        .map((step) => byId.get(step.experienceId))
        .filter((experience): experience is Experience => experience !== undefined),
    [journey, byId],
  );

  const backButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={goBack}
      hitSlop={12}
      className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
    >
      <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
    </Pressable>
  );

  if (isLoading || experiencesLoading || error || !journey) {
    const message =
      isLoading || experiencesLoading
        ? t('common.loading')
        : error
          ? t('journey.active.error')
          : t('journey.active.notFound');
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView style={{ flex: 1 }} className="px-6">
          {backButton}
          <View className="flex-1 items-center justify-center gap-4">
            <Text variant="body" tone="secondary" className="text-center">
              {message}
            </Text>
            {error ? (
              <Button label={t('common.retry')} variant="secondary" onPress={() => void reload()} />
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const completed = journey.status === 'completed';
  const started = journey.startedAt !== null;
  const total = journey.steps.length;
  const isEmpty = total === 0;
  const isLastStep = journey.currentStep >= total - 1;

  const stateFor = (index: number): JourneyStepState => {
    if (completed || (started && index < journey.currentStep)) return 'done';
    if (started && index === journey.currentStep) return 'current';
    return 'upcoming';
  };

  const currentExperience = started && !completed ? experiences[journey.currentStep] : undefined;

  // The journey is over only once its status is `completed` (never just by opening it): that is when
  // the feedback is asked (sprint 12).
  const finishStep = async () => {
    const saved = await completeCurrentStep();
    if (saved?.status === 'completed') {
      router.push({ pathname: '/journey/[id]/feedback', params: { id: saved.id } });
    }
  };

  // A completed journey opened from the history while another one is under way offers no "new
  // journey": there can only be one active journey at a time.
  const cta = completed
    ? state === 'active'
      ? null
      : { label: t('journey.active.createNew'), onPress: () => router.push('/journey/create') }
    : isEmpty
      ? null
      : !started
        ? { label: t('journey.active.start'), onPress: () => void startJourney() }
        : {
            label: t(isLastStep ? 'journey.active.finish' : 'journey.active.continue'),
            onPress: () => void finishStep(),
          };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: STICKY_FOOTER_CLEARANCE + 16,
            gap: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="h-14 flex-row items-center justify-between">
            {backButton}
            {!completed ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('journey.edit.action')}
                onPress={() =>
                  router.push({ pathname: '/journey/[id]/edit', params: { id: journey.id } })
                }
                hitSlop={8}
                className="flex-row items-center gap-1.5 rounded-pill bg-primary/10 px-4 py-2 active:opacity-70"
              >
                <Pencil size={15} strokeWidth={2} color={colors.primary} />
                <Text variant="label" tone="primary">
                  {t('journey.edit.action')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <FadeInUp style={{ gap: 8 }}>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 32, lineHeight: 38 }}
              className="text-text"
            >
              {completed ? t('journey.active.completedTitle') : t('journey.active.title')}
            </Text>
            <Text variant="body" tone="secondary">
              {journey.title}
            </Text>
            {completed ? (
              <Text variant="small" tone="secondary">
                {t('journey.active.completedSubtitle')}
              </Text>
            ) : null}
          </FadeInUp>

          {!isEmpty ? (
            <View className="gap-2">
              <ProgressBars
                count={total}
                index={completed ? total - 1 : started ? journey.currentStep : -1}
              />
              <Text variant="small" tone="secondary" className="text-center">
                {completed
                  ? t('journey.active.completedTitle')
                  : started
                    ? t('journey.active.progress', { current: journey.currentStep + 1, total })
                    : t('journey.active.ready')}
              </Text>
            </View>
          ) : null}

          {!isEmpty ? (
            <JourneyStats
              stats={[
                {
                  icon: Clock,
                  value: formatDuration(journey.estimatedDurationMin),
                  label: t('journey.stats.duration'),
                },
                {
                  icon: MapIcon,
                  value: formatDistance(journey.totalDistanceM, i18n.language),
                  label: t('journey.stats.distance'),
                },
                {
                  icon: Coins,
                  value: formatBudget(journey.estimatedBudgetEur),
                  label: t('journey.stats.budget'),
                },
              ]}
            />
          ) : null}

          {currentExperience ? (
            <View className="gap-1 rounded-card bg-primary p-4">
              <Text variant="caption" tone="onPrimary" className="uppercase tracking-[2px]">
                {t('journey.active.current')}
              </Text>
              <Text variant="h4" tone="onPrimary">
                {currentExperience.title}
              </Text>
            </View>
          ) : null}

          {!isEmpty ? (
            <View className="overflow-hidden rounded-card">
              <JourneyMapPreview
                experiences={experiences}
                start={journey.startLocation}
                selectedExperienceId={currentExperience?.id ?? null}
              />
            </View>
          ) : null}

          {isEmpty ? (
            <View className="items-center gap-2 rounded-card border border-dashed border-border px-6 py-10">
              <Text variant="h4" className="text-center">
                {t('journey.active.emptyTitle')}
              </Text>
              <Text variant="body" tone="secondary" className="text-center">
                {t('journey.active.emptySubtitle')}
              </Text>
            </View>
          ) : (
            <JourneyTimeline
              steps={journey.steps}
              experiencesById={byId}
              categoryLabelFor={categoryLabelFor}
              onPressExperience={openExperience}
              stateFor={stateFor}
            />
          )}

          {!completed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('journey.active.addExperience')}
              onPress={() => router.navigate('/discover')}
              className="flex-row items-center justify-center gap-2 rounded-card border border-dashed border-primary py-4 active:opacity-70"
            >
              <Plus size={18} strokeWidth={2} color={colors.primary} />
              <Text variant="body" tone="primary" className="font-bodySemibold">
                {t('journey.active.addExperience')}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {cta ? <StickyActionFooter visible label={cta.label} onPress={cta.onPress} /> : null}
    </View>
  );
}
