import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Clock from 'lucide-react-native/icons/clock';
import Flag from 'lucide-react-native/icons/flag';
import MapIcon from 'lucide-react-native/icons/map';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { fontFamily } from '@/theme/typography';
import type { Experience, Journey } from '@/types';

import {
  completedStepCount,
  remainingDistanceM,
  remainingDurationMin,
  upcomingSteps,
} from '../lib/progress';
import { formatDistance, formatDuration } from '../lib/format';
import { JourneyMapPreview } from './JourneyMapPreview';
import { JourneyProgressStepper } from './JourneyProgressStepper';
import { JourneyStats } from './JourneyStats';

type CurrentJourneyCardProps = {
  journey: Journey;
  experiencesById: ReadonlyMap<string, Experience>;
  categoryLabelFor: (experience: Experience) => string | null;
  onContinue: () => void;
};

const HERO_HEIGHT = 250;

/**
 * The journey in progress, at the top of the Parcours hub (sprint 11). After the "Sortie en cours"
 * reference: the current step's photo with the journey's title and a step indicator, then the step
 * itself, what comes next, what is left (time, distance, steps), a small map, and "Continuer mon
 * parcours" — which only opens `/journey/[id]`: progressing a step stays that screen's job.
 */
export function CurrentJourneyCard({
  journey,
  experiencesById,
  categoryLabelFor,
  onContinue,
}: CurrentJourneyCardProps) {
  const { t, i18n } = useTranslation();

  const experiences = useMemo(
    () =>
      journey.steps
        .map((step) => experiencesById.get(step.experienceId))
        .filter((experience): experience is Experience => experience !== undefined),
    [journey.steps, experiencesById],
  );

  const started = journey.startedAt !== null;
  const total = journey.steps.length;
  const focusIndex = started ? journey.currentStep : 0;
  const focusStep = journey.steps[focusIndex];
  const focus = focusStep ? experiencesById.get(focusStep.experienceId) : undefined;
  const next = upcomingSteps(journey)
    .map((step) => experiencesById.get(step.experienceId)?.title)
    .filter((title): title is string => !!title);

  const status = started
    ? t('journey.active.progress', { current: journey.currentStep + 1, total })
    : t('journey.hub.readyLabel');

  return (
    <View
      testID="current-journey-card"
      className="overflow-hidden rounded-hero border border-border bg-surface"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${journey.title}, ${status}`}
        onPress={onContinue}
        className="active:opacity-90"
        style={{ height: HERO_HEIGHT }}
      >
        <View className="absolute inset-0 bg-surfaceElevated">
          {focus?.coverImage ? (
            <Image
              source={focus.coverImage}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
          locations={[0, 0.4, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />

        <View className="absolute left-5 top-5 flex-row items-center gap-2 rounded-pill bg-black/35 px-3 py-1.5">
          <View
            className={started ? 'h-2 w-2 rounded-pill bg-accent' : 'h-2 w-2 rounded-pill bg-white'}
          />
          <Text variant="caption" className="font-bodySemibold text-white">
            {started ? t('journey.hub.currentLabel') : t('journey.hub.readyLabel')}
            {started ? ` · ${status}` : ''}
          </Text>
        </View>

        <View className="absolute inset-x-0 bottom-0 gap-4 p-5">
          <Text
            numberOfLines={2}
            className="text-white"
            style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 28, lineHeight: 32 }}
          >
            {journey.title}
          </Text>
          {total > 1 ? (
            <JourneyProgressStepper
              labels={experiences.map(
                (experience) => categoryLabelFor(experience) ?? experience.title,
              )}
              currentIndex={started ? journey.currentStep : -1}
            />
          ) : null}
        </View>
      </Pressable>

      <View className="gap-4 p-5">
        {focus && focusStep ? (
          <View className="flex-row items-center gap-3">
            <View className="h-16 w-16 overflow-hidden rounded-large bg-surfaceElevated">
              {focus.coverImage ? (
                <Image source={focus.coverImage} style={{ flex: 1 }} contentFit="cover" />
              ) : null}
            </View>
            <View className="flex-1 gap-0.5">
              <Text variant="caption" tone="primary" className="uppercase tracking-[1.5px]">
                {started ? t('journey.hub.currentStep') : t('journey.hub.firstStep')}
              </Text>
              <Text variant="h4" numberOfLines={1}>
                {focus.title}
              </Text>
              <Text variant="small" tone="secondary" numberOfLines={1}>
                {[categoryLabelFor(focus), focusStep.estimatedArrival].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        ) : (
          <Text variant="body" tone="secondary">
            {t('journey.active.emptySubtitle')}
          </Text>
        )}

        {focus ? (
          <View className="flex-row items-start gap-2 rounded-large bg-background px-4 py-3">
            <Text variant="small" tone="secondary" className="font-bodySemibold">
              {t('journey.hub.next')}
            </Text>
            <Text variant="small" className="flex-1" numberOfLines={2}>
              {next.length > 0 ? next.join(' → ') : t('journey.hub.lastStep')}
            </Text>
          </View>
        ) : null}

        {total > 0 ? (
          <JourneyStats
            stats={[
              {
                icon: Clock,
                value: formatDuration(remainingDurationMin(journey)),
                label: t('journey.hub.remainingTime'),
              },
              {
                icon: MapIcon,
                value: formatDistance(remainingDistanceM(journey), i18n.language),
                label: t('journey.hub.remainingDistance'),
              },
              {
                icon: Flag,
                value: t('journey.hub.stepsDone', { done: completedStepCount(journey), total }),
                label: t('journey.hub.steps'),
              },
            ]}
          />
        ) : null}

        {experiences.length > 0 ? (
          <View className="overflow-hidden rounded-card">
            <JourneyMapPreview
              experiences={experiences}
              start={journey.startLocation}
              selectedExperienceId={started ? (focus?.id ?? null) : null}
              height={150}
            />
          </View>
        ) : null}

        <Button label={t('journey.hub.continue')} trailingIcon={ArrowRight} onPress={onContinue} />
      </View>
    </View>
  );
}
