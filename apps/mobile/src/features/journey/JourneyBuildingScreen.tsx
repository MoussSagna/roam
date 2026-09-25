import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text as RNText, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { ORBIT_DESIGN_SIZE, ProfileOrbit } from '@/features/onboarding/components/ProfileOrbit';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { type JourneyBuildLine, JourneyBuildChecklist } from './components/JourneyBuildChecklist';
import { useJourneyDraft } from './JourneyDraftContext';
import {
  BUILD_PHASE,
  BUILD_RING_PROGRESS,
  orbitStageFor,
  useJourneyBuilding,
} from './lib/building';

const SIDE_MARGIN = 24;
/** Height reserved for the orbit; it shrinks on short screens (same rule as the profile creation). */
const ORBIT_AREA_HEIGHT = 296;
const ORBIT_AREA_MIN_HEIGHT = 190;
const CARD_MAX_WIDTH = 320;

/** Fade + small rise, delayed; the rise is dropped under reduced motion (as in the profile creation). */
function Reveal({
  delay = 0,
  reduceMotion,
  children,
}: {
  delay?: number;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: reduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay }}
    >
      {children}
    </MotiView>
  );
}

/**
 * Journey creation — "On prépare ton parcours" (`/journey/create/building`, sprint 12, D-84), between
 * "On part d'où ?" and the suggestions. A front-end SIMULATION in the spirit of the onboarding's
 * profile creation (whose `ProfileOrbit` it reuses): ~3.5 s, nothing to press, then it replaces itself
 * with the suggestions (so back from there returns to "On part d'où ?", not here). The checklist reads
 * the draft — start, ambiance, time, budget — and never writes it: the journey stays a draft.
 */
export function JourneyBuildingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const draft = useJourneyDraft();
  const [orbitAreaHeight, setOrbitAreaHeight] = useState<number>(ORBIT_AREA_HEIGHT);

  const goToSuggestions = useCallback(
    () => router.replace('/journey/create/suggestions'),
    [router],
  );
  const phase = useJourneyBuilding(goToSuggestions);

  const lines = useMemo<JourneyBuildLine[]>(() => {
    const known: (JourneyBuildLine | null)[] = [
      draft.startLocation
        ? {
            key: 'start',
            label: t('journey.building.start', { place: draft.startLocation.label }),
            showAt: BUILD_PHASE.start,
            doneAt: BUILD_PHASE.start,
          }
        : null,
      draft.mood
        ? {
            key: 'mood',
            label: t('journey.building.mood', {
              mood: t(`journey.moodAdjectives.${draft.mood}`),
            }),
            showAt: BUILD_PHASE.mood,
            doneAt: BUILD_PHASE.mood,
          }
        : null,
      draft.duration
        ? {
            key: 'duration',
            label: t('journey.building.duration', {
              duration: t(`journey.durations.${draft.duration}`),
            }),
            showAt: BUILD_PHASE.duration,
            doneAt: BUILD_PHASE.duration,
          }
        : null,
      draft.budget
        ? {
            key: 'budget',
            label: t(`journey.budgetNames.${draft.budget}`),
            showAt: BUILD_PHASE.budget,
            doneAt: BUILD_PHASE.budget,
          }
        : null,
    ];
    return [
      ...known.filter((line): line is JourneyBuildLine => line !== null),
      {
        key: 'building',
        label:
          phase >= BUILD_PHASE.done ? t('journey.building.ready') : t('journey.building.building'),
        showAt: BUILD_PHASE.building,
        doneAt: BUILD_PHASE.done,
      },
    ];
  }, [draft.startLocation, draft.mood, draft.duration, draft.budget, phase, t]);

  const orbitSize = Math.max(170, Math.min(ORBIT_DESIGN_SIZE, orbitAreaHeight, width - 40));
  const cardMargin = Math.max(SIDE_MARGIN, (width - CARD_MAX_WIDTH) / 2);
  const leaving = phase >= BUILD_PHASE.leaving;

  return (
    <MotiView
      testID="journey-building"
      animate={{ opacity: leaving ? 0 : 1, translateY: leaving && !reduceMotion ? -10 : 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: SIDE_MARGIN,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <RNText
          className="text-text"
          style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 22, lineHeight: 32 }}
        >
          {t('brand.name')}
        </RNText>
        <Reveal delay={150} reduceMotion={reduceMotion}>
          <Text variant="small" tone="secondary">
            {t('journey.building.waiting')}
          </Text>
        </Reveal>
      </View>

      <View
        className="items-center justify-center"
        style={{ height: ORBIT_AREA_HEIGHT, minHeight: ORBIT_AREA_MIN_HEIGHT, flexShrink: 1 }}
        onLayout={(event) => setOrbitAreaHeight(event.nativeEvent.layout.height)}
      >
        <ProfileOrbit
          size={orbitSize}
          stage={orbitStageFor(phase)}
          reduceMotion={reduceMotion}
          ringProgress={BUILD_RING_PROGRESS}
          accessibilityLabel={t('journey.building.accessibility')}
        />
      </View>

      <Reveal delay={250} reduceMotion={reduceMotion}>
        <RNText
          accessibilityRole="header"
          className="text-text"
          style={{
            textAlign: 'center',
            marginHorizontal: SIDE_MARGIN,
            fontFamily: fontFamily.editorialSemibold,
            fontSize: 29,
            lineHeight: 36,
          }}
        >
          {t('journey.building.title')}
        </RNText>
      </Reveal>
      <Reveal delay={400} reduceMotion={reduceMotion}>
        <Text
          variant="small"
          tone="secondary"
          style={{ textAlign: 'center', marginTop: 4, marginHorizontal: SIDE_MARGIN }}
        >
          {t('journey.building.subtitle')}
        </Text>
      </Reveal>

      <View style={{ marginTop: 20, marginHorizontal: cardMargin }}>
        <JourneyBuildChecklist lines={lines} phase={phase} reduceMotion={reduceMotion} />
      </View>

      <View style={{ flex: 1, minHeight: Math.max(insets.bottom, 16) }} />
    </MotiView>
  );
}
