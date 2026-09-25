import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Info from 'lucide-react-native/icons/info';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, STICKY_REVEAL_HEADER_HEIGHT, Text } from '@/components/ui';
import { ExperienceMapFooter } from '@/features/map/components/ExperienceMapFooter';
import { RoamMap } from '@/features/map/components/RoamMap';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';
import { brand } from '@/theme/palette';
import type { Experience } from '@/types';

import { useJourneyExperiences } from './hooks/useJourneyExperiences';
import { findJourney, useJourney } from './journeyStore';
import { formatDuration } from './lib/format';
import { JOURNEY_START_MARKER_ID, journeyMapData } from './lib/journeyMap';

/** Slide distance until the footer has been measured. */
const FOOTER_FALLBACK_HEIGHT = 320;
const SLIDE_MS = 240;

type JourneyMapScreenProps = {
  journeyId?: string;
};

/**
 * Full-screen map of the journey in progress (`/journey/[id]/map`, sprint 12, D-85), opened from the
 * Parcours hub's mini-map. The same shape as the experience map (`ExperienceMapScreen`, D-73–D-75):
 * `RoamMap` edge to edge, a transparent header (back + an always-visible "Parcours en cours" pill),
 * `ExperienceMapFooter` over the bottom edge that a bare-map tap slides away (an "info" button brings
 * it back). The markers and the line come from `journeyMapData` — the very data the mini-map draws:
 * the start point, then each step's photo with its number, the current one highlighted.
 *
 * One selection state, `selectedExperienceId` (the current step until a marker is tapped), drives the
 * selected marker, the camera focus and the footer, so the footer always describes the marker shown
 * as selected.
 */
export function JourneyMapScreen({ journeyId }: JourneyMapScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();
  const journeys = useJourney();
  const journey = findJourney(journeys, journeyId);
  const { byId, categoryLabelFor, isLoading: experiencesLoading } = useJourneyExperiences();
  const [pickedExperienceId, setPickedExperienceId] = useState<string | null>(null);
  const [footerVisible, setFooterVisible] = useState(true);
  const [footerHeight, setFooterHeight] = useState(FOOTER_FALLBACK_HEIGHT);

  const map = useMemo(
    () => (journey ? journeyMapData(journey, byId, t('journey.location.startPoint')) : null),
    [journey, byId, t],
  );
  const stepMarkers = map?.markers.filter((marker) => marker.id !== JOURNEY_START_MARKER_ID) ?? [];
  const selectedExperienceId =
    pickedExperienceId ?? map?.currentExperienceId ?? stepMarkers[0]?.id ?? null;
  const selectedExperience = selectedExperienceId ? byId.get(selectedExperienceId) : undefined;
  const selectedIndex = journey
    ? journey.steps.findIndex((step) => step.experienceId === selectedExperienceId)
    : -1;
  const selectedStep = journey?.steps[selectedIndex];
  const isCurrent = !!map && selectedExperienceId === map.currentExperienceId;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/journey');
  }, [router]);

  // A step marker selects its experience (never deselects: the footer always has one to show) and
  // brings the footer back if a bare-map tap had hidden it. The start point is not an experience.
  const selectMarker = useCallback((id: string) => {
    if (id === JOURNEY_START_MARKER_ID) return;
    setPickedExperienceId(id);
    setFooterVisible(true);
  }, []);
  const hideFooter = useCallback(() => setFooterVisible(false), []);
  const showFooter = useCallback(() => setFooterVisible(true), []);
  const handleFooterLayout = useCallback(
    (event: LayoutChangeEvent) => setFooterHeight(event.nativeEvent.layout.height),
    [],
  );
  const openExperience = useCallback(
    (experience: Experience) =>
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } }),
    [router],
  );

  const focusInsets = useMemo(
    () => ({ top: STICKY_REVEAL_HEADER_HEIGHT + insets.top, bottom: footerHeight }),
    [insets.top, footerHeight],
  );

  const backButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={goBack}
      hitSlop={8}
      className="h-11 w-11 items-center justify-center rounded-pill bg-black/25 active:opacity-80"
    >
      <ChevronLeft size={22} strokeWidth={2} color={brand.white} />
    </Pressable>
  );

  if (journeys.isLoading || experiencesLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text variant="body" tone="secondary">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (!journey || !map || stepMarkers.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text variant="body" tone="secondary" className="text-center">
          {journeys.error ? t('journey.active.error') : t('journey.map.notFound')}
        </Text>
        <Button label={t('common.back')} variant="secondary" onPress={goBack} />
      </View>
    );
  }

  const duration = reduceMotion ? 0 : SLIDE_MS;
  const title =
    journey.status === 'completed' ? t('journey.map.completedTitle') : t('journey.map.title');
  const subtitle =
    selectedExperience && selectedStep
      ? [
          categoryLabelFor(selectedExperience),
          t('journey.map.visit', { duration: formatDuration(selectedStep.estimatedDurationMin) }),
          t('journey.map.arrival', { time: selectedStep.estimatedArrival }),
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

  return (
    <View className="flex-1 bg-background">
      <RoamMap
        markers={map.markers}
        route={map.route}
        selectedMarkerId={selectedExperienceId}
        onPressMarker={selectMarker}
        onPressMap={hideFooter}
        focusInsets={focusInsets}
        rounded={false}
        style={StyleSheet.absoluteFill}
      />

      {/* Transparent header over the map: back, and the journey's state, always visible. */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top, height: STICKY_REVEAL_HEADER_HEIGHT + insets.top }}
      >
        {backButton}
        <View
          testID="journey-map-title"
          accessibilityRole="header"
          className="flex-row items-center gap-2 rounded-pill bg-surface px-4 py-2.5"
          style={{
            shadowColor: colors.overlay,
            shadowOpacity: 0.15,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <View className="h-2 w-2 rounded-pill bg-primary" />
          <Text variant="label">{title}</Text>
        </View>
        <View className="h-11 w-11" />
      </View>

      {selectedExperience ? (
        <MotiView
          testID="journey-map-footer-slot"
          from={{ translateY: footerHeight }}
          animate={{ translateY: footerVisible ? 0 : footerHeight }}
          transition={{ type: 'timing', duration }}
          onLayout={handleFooterLayout}
          pointerEvents={footerVisible ? 'auto' : 'none'}
          accessibilityElementsHidden={!footerVisible}
          importantForAccessibility={footerVisible ? 'auto' : 'no-hide-descendants'}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        >
          <ExperienceMapFooter
            experience={selectedExperience}
            subtitle={subtitle}
            badge={
              isCurrent
                ? t('journey.hub.currentStep')
                : t('journey.map.step', { number: selectedIndex + 1 })
            }
            badgeHighlighted={isCurrent}
            onPressView={openExperience}
          />
        </MotiView>
      ) : null}

      {!footerVisible ? (
        <MotiView
          from={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration, delay: reduceMotion ? 0 : 120 }}
          style={{ position: 'absolute', right: 16, bottom: insets.bottom + 16 }}
        >
          <IconButton
            icon={Info}
            accessibilityLabel={t('map.showInfo')}
            onPress={showFooter}
            size={48}
          />
        </MotiView>
      ) : null}
    </View>
  );
}
