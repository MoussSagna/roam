import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Clock from 'lucide-react-native/icons/clock';
import MapPin from 'lucide-react-native/icons/map-pin';
import RouteIcon from 'lucide-react-native/icons/route';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { RoamMap } from '@/features/map/components/RoamMap';
import { useTheme } from '@/theme';
import { brand } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';
import type { Experience, Journey, JourneyStep } from '@/types';

import { formatDistance, formatDuration } from '../lib/format';
import { journeyMapData } from '../lib/journeyMap';
import { completedStepCount, upcomingSteps } from '../lib/progress';

type CurrentJourneyCardProps = {
  journey: Journey;
  experiencesById: ReadonlyMap<string, Experience>;
  categoryLabelFor: (experience: Experience) => string | null;
  onContinue: () => void;
  onOpenMap: () => void;
  onOpenExperience: (experience: Experience) => void;
};

/** Hero height below the status bar (the safe-area inset is added on top). */
const HERO_HEIGHT = 320;
/** How far the content sheet rides up over the bottom of the photo. */
const SHEET_OVERLAP = 24;
const MINI_MAP_HEIGHT = 176;

function HeroFact({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon size={15} strokeWidth={1.8} color={brand.white} />
      <Text variant="small" className="text-white/90">
        {label}
      </Text>
    </View>
  );
}

type StepRowProps = {
  experience: Experience;
  step: JourneyStep;
  badge?: string;
  onPress: () => void;
  testID: string;
};

/** One step as a tappable row (photo, name, visit length · arrival, chevron) → the experience. */
function StepRow({ experience, step, badge, onPress, testID }: StepRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={[badge, experience.title].filter(Boolean).join(', ')}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-card bg-surface p-3 active:opacity-80"
    >
      <View className="h-[72px] w-[72px] overflow-hidden rounded-large bg-surfaceElevated">
        {experience.coverImage ? (
          <Image source={experience.coverImage} style={{ flex: 1 }} contentFit="cover" />
        ) : null}
      </View>
      <View className="flex-1 gap-1">
        {badge ? (
          <View className="flex-row items-center gap-1.5 self-start rounded-pill bg-primary/10 px-2.5 py-0.5">
            <View className="h-1.5 w-1.5 rounded-pill bg-primary" />
            <Text variant="caption" tone="primary" className="font-bodySemibold">
              {badge}
            </Text>
          </View>
        ) : null}
        <Text
          numberOfLines={1}
          className="text-text"
          style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 19, lineHeight: 24 }}
        >
          {experience.title}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Clock size={13} strokeWidth={1.8} color={colors.textSecondary} />
          <Text variant="small" tone="secondary" numberOfLines={1}>
            {formatDuration(step.estimatedDurationMin)} ·{' '}
            {t('journey.map.arrival', { time: step.estimatedArrival })}
          </Text>
        </View>
      </View>
      <ChevronRight size={20} strokeWidth={1.8} color={colors.textSecondary} />
    </Pressable>
  );
}

/**
 * The journey in progress — the whole Parcours hub in that state (sprints 11–12, D-82, D-85). After
 * the "Parcours en cours" references: an edge-to-edge hero from the very top (the current step's
 * photo; "Parcours en cours", the title, experiences · duration · distance, "1 / 3 étapes" and a
 * progress bar), then — page padding, no border — the current step, "Continuer mon parcours" (opens
 * `/journey/[id]`: progressing stays that screen's job), a tappable mini-map of the route ("Voir la
 * carte du parcours" → `/journey/[id]/map`, drawn from the same `journeyMapData` as that screen) and
 * the next step. The parent must not pad it.
 */
export function CurrentJourneyCard({
  journey,
  experiencesById,
  categoryLabelFor,
  onContinue,
  onOpenMap,
  onOpenExperience,
}: CurrentJourneyCardProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const map = useMemo(
    () => journeyMapData(journey, experiencesById, t('journey.location.startPoint')),
    [journey, experiencesById, t],
  );
  // `RoamMap` frames its markers once: remount it when the set of points changes.
  const mapKey = map.markers.map((marker) => marker.id).join('|');

  const started = journey.startedAt !== null;
  const total = journey.steps.length;
  const done = completedStepCount(journey);
  const focusIndex = started ? journey.currentStep : 0;
  const focusStep = journey.steps[focusIndex];
  const focus = focusStep ? experiencesById.get(focusStep.experienceId) : undefined;
  const nextStep = upcomingSteps(journey)[0];
  const next = nextStep ? experiencesById.get(nextStep.experienceId) : undefined;

  const facts = [
    {
      icon: MapPin,
      label:
        total === 1
          ? t('journey.hub.experienceCountOne')
          : t('journey.hub.experienceCount', { count: total }),
    },
    { icon: Clock, label: formatDuration(journey.estimatedDurationMin) },
    ...(journey.totalDistanceM > 0
      ? [{ icon: RouteIcon, label: formatDistance(journey.totalDistanceM, i18n.language) }]
      : []),
  ];
  const progressLabel = t('journey.hub.stepsDone', { done, total });

  return (
    <View testID="current-journey-card">
      <Pressable
        testID="current-journey-hero"
        accessibilityRole="button"
        accessibilityLabel={`${journey.title}, ${progressLabel}`}
        onPress={onContinue}
        className="active:opacity-90"
        style={{ height: insets.top + HERO_HEIGHT }}
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
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.35, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />

        <View
          className="absolute inset-x-0 bottom-0 gap-3 px-6"
          style={{ paddingBottom: SHEET_OVERLAP + 20 }}
        >
          <View className="flex-row items-center gap-2 self-start rounded-pill bg-black/35 px-3 py-1.5">
            <View className="h-2 w-2 rounded-pill bg-accent" />
            <Text
              variant="caption"
              className="font-bodySemibold uppercase tracking-[1.5px] text-white"
            >
              {t('journey.hub.inProgress')}
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            className="text-white"
            style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 34, lineHeight: 40 }}
          >
            {journey.title}
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
            {facts.map((fact) => (
              <HeroFact key={fact.label} icon={fact.icon} label={fact.label} />
            ))}
          </View>
          {total > 0 ? (
            <View className="mt-1 gap-2">
              <Text variant="label" className="text-white">
                {progressLabel}
              </Text>
              <View
                testID="journey-progress-bar"
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: total, now: done }}
                className="h-1.5 overflow-hidden rounded-pill bg-white/25"
              >
                <View
                  className="h-full rounded-pill bg-accent"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </View>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View
        className="gap-4 rounded-t-hero bg-background px-6 pt-6"
        style={{ marginTop: -SHEET_OVERLAP }}
      >
        {focus && focusStep ? (
          <StepRow
            testID="current-step-row"
            experience={focus}
            step={focusStep}
            badge={started ? t('journey.hub.currentStep') : t('journey.hub.firstStep')}
            onPress={() => onOpenExperience(focus)}
          />
        ) : (
          <Text variant="body" tone="secondary">
            {t('journey.active.emptySubtitle')}
          </Text>
        )}

        <Button label={t('journey.hub.continue')} trailingIcon={ArrowRight} onPress={onContinue} />

        {map.markers.length > 1 ? (
          <Pressable
            testID="journey-mini-map"
            accessibilityRole="button"
            accessibilityLabel={t('journey.map.open')}
            onPress={onOpenMap}
            className="overflow-hidden rounded-card active:opacity-90"
            style={{ height: MINI_MAP_HEIGHT }}
          >
            <RoamMap
              key={mapKey}
              markers={map.markers}
              route={map.route}
              selectedMarkerId={map.currentExperienceId}
              interactive={false}
              rounded={false}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']}
              locations={[0.45, 1]}
              style={{ position: 'absolute', inset: 0 }}
            />
            <View
              pointerEvents="none"
              className="absolute inset-x-0 bottom-0 flex-row items-center justify-between px-4 pb-3"
            >
              <Text variant="label" className="text-white">
                {t('journey.map.open')}
              </Text>
              <View className="h-9 w-9 items-center justify-center rounded-pill bg-surface">
                <ChevronRight size={18} strokeWidth={2} color={colors.text} />
              </View>
            </View>
          </Pressable>
        ) : null}

        {focus ? (
          <View className="gap-2">
            <Text variant="small" tone="secondary" className="font-bodySemibold">
              {t('journey.hub.nextStep')}
            </Text>
            {next && nextStep ? (
              <StepRow
                testID="next-step-row"
                experience={next}
                step={nextStep}
                onPress={() => onOpenExperience(next)}
              />
            ) : (
              <Text variant="body" tone="secondary">
                {t('journey.hub.lastStep')}
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
