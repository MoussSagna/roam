import MapPin from 'lucide-react-native/icons/map-pin';
import Navigation from 'lucide-react-native/icons/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, Text as RNText, useWindowDimensions, View } from 'react-native';

import { Chip, FadeInUp, Text } from '@/components/ui';
import { START_SPOTS } from '@/features/journey/data/startSpots';
import { RoamMap } from '@/features/map/components/RoamMap';
import type { MapMarkerData } from '@/features/map/types/map.types';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { ChoiceRow } from './components/ChoiceRow';
import type { LocationSlideProps } from './slideProps';

const HORIZONTAL_MARGIN = 28;
const LIST_MARGIN = 23;
const ROW_GAP = 9.5;
/** Row height on the mockup; rows shrink down to `ROW_MIN_HEIGHT` on short screens. */
const ROW_DESIGN_HEIGHT = 72;
const ROW_MIN_HEIGHT = 56;
/** Space between the subtitle and the first row, and under the map. */
const LIST_TOP_GAP = 30;
const BOTTOM_GAP = 8;
/** The map takes what is left under the choices, never less than this. */
const MAP_MIN_HEIGHT = 120;
/** Room kept for the hint line and the gaps around it when sizing the rows. */
const HINT_SPACE = 64;
const ICON_SIZE = 38;
const ICON_SLOT = 50;
const ICON_LEFT = 14;

const TITLE_MAX_SIZE = 29;
/** Width of the title per point of font size (measured: 332 pt at 29 pt, plus margin). */
const TITLE_WIDTH_PER_POINT = 11.45;

/** Keeps the camera still: the whole map is useful area (the chrome is outside it). */
const MAP_FOCUS_INSETS = { top: 0, bottom: 0 };

type Feedback = 'denied' | 'blocked' | 'unavailable';

/**
 * Onboarding 5 — "Où souhaites-tu sortir ?" (D-89): the same choices as the journey's "On part d'où ?"
 * — "Ma position actuelle" and "Choisir un lieu" (its spots) — over an interactive `RoamMap` that shows
 * and glides to the selected location. The device position is asked for only when "Ma position
 * actuelle" is pressed; refusing it (or no fix) never blocks: a spot can always be picked by hand, and
 * the last choice wins. A slide of `OnboardingPager`, which holds the answer.
 */
export function LocationScreen({ selected, onSelect }: LocationSlideProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { permission, locating, locate } = useCurrentLocation();
  const [areaHeight, setAreaHeight] = useState<number | null>(null);
  /** "Choisir un lieu" pressed: its spots are shown (a UI state, not a location). */
  const [choosingSpot, setChoosingSpot] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // The title must stay on one line on narrow screens (375 pt wide → 27 pt).
  const titleSize = Math.min(
    TITLE_MAX_SIZE,
    Math.floor((width - 2 * HORIZONTAL_MARGIN) / TITLE_WIDTH_PER_POINT),
  );
  // Rows and map share the space under the subtitle: the rows shrink first, the map keeps the rest.
  const rowHeight =
    areaHeight === null
      ? ROW_DESIGN_HEIGHT
      : Math.max(
          ROW_MIN_HEIGHT,
          Math.min(
            ROW_DESIGN_HEIGHT,
            (areaHeight - LIST_TOP_GAP - ROW_GAP - HINT_SPACE - MAP_MIN_HEIGHT - BOTTOM_GAP) / 2,
          ),
        );
  const iconSize = Math.round(ICON_SIZE * Math.min(1, rowHeight / ROW_DESIGN_HEIGHT));

  const manual = choosingSpot || selected?.source === 'manual';

  const locateMe = async () => {
    setChoosingSpot(false);
    setFeedback(null);
    const result = await locate();
    if (!result) return;
    if (result.status === 'located') {
      onSelect({
        source: 'current',
        label: t('onboarding.location.currentLabel'),
        coordinates: result.coordinates,
      });
      return;
    }
    setFeedback(result.status);
    // Never a dead end: the spots are the way forward without the position.
    setChoosingSpot(true);
  };

  const chooseSpot = (spot: (typeof START_SPOTS)[number]) => {
    setFeedback(null);
    onSelect({ source: 'manual', label: spot.label, coordinates: spot.coordinates });
  };

  // One marker, the selected location. Its id follows the coordinates so a new position is a new
  // selection, which `RoamMap` glides to.
  const markers = useMemo<MapMarkerData[]>(
    () =>
      selected
        ? [
            {
              id: `onboarding-location:${selected.coordinates.latitude},${selected.coordinates.longitude}`,
              title: selected.label,
              coordinate: selected.coordinates,
            },
          ]
        : [],
    [selected],
  );

  let hint: string | null = null;
  if (locating) hint = t('onboarding.location.locating');
  else if (feedback) hint = t(`onboarding.location.${feedback}`);
  else if (permission === 'unknown' && !selected) hint = t('onboarding.location.explain');

  return (
    <View className="flex-1 bg-background">
      <View>
        <FadeInUp>
          <RNText
            accessibilityRole="header"
            className="text-text"
            style={{
              marginTop: 30,
              marginHorizontal: HORIZONTAL_MARGIN,
              fontFamily: fontFamily.editorialSemibold,
              fontSize: titleSize,
              lineHeight: 35,
            }}
          >
            {t('onboarding.location.title')}
          </RNText>
          <Text
            variant="body"
            tone="secondary"
            style={{
              marginTop: 7,
              marginHorizontal: HORIZONTAL_MARGIN,
              fontSize: 17,
              lineHeight: 24,
            }}
          >
            {t('onboarding.location.subtitle')}
          </Text>
        </FadeInUp>
      </View>

      <View
        className="flex-1"
        style={{ paddingBottom: BOTTOM_GAP }}
        onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}
      >
        <FadeInUp
          delay={150}
          style={{ flex: 1, marginTop: LIST_TOP_GAP, marginHorizontal: LIST_MARGIN }}
        >
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('onboarding.location.title')}
            style={{ rowGap: ROW_GAP }}
          >
            <ChoiceRow
              label={t('onboarding.location.current')}
              icon={Navigation}
              iconColor={colors.text}
              selectedIconColor={colors.primaryForeground}
              iconSize={iconSize}
              slotWidth={ICON_SLOT}
              paddingLeft={ICON_LEFT}
              labelSize={17}
              selected={!manual && selected?.source === 'current'}
              height={rowHeight}
              onPress={() => void locateMe()}
            />
            <ChoiceRow
              label={t('onboarding.location.place')}
              icon={MapPin}
              iconColor={colors.text}
              selectedIconColor={colors.primaryForeground}
              iconSize={iconSize}
              slotWidth={ICON_SLOT}
              paddingLeft={ICON_LEFT}
              labelSize={17}
              selected={manual}
              height={rowHeight}
              onPress={() => {
                setFeedback(null);
                setChoosingSpot(true);
              }}
            />
          </View>

          {hint ? (
            <View
              accessibilityLiveRegion="polite"
              className="flex-row flex-wrap items-center gap-x-2"
              style={{ marginTop: 10 }}
            >
              <Text variant="small" tone="secondary">
                {hint}
              </Text>
              {feedback === 'blocked' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('onboarding.location.openSettings')}
                  onPress={() => void Linking.openSettings()}
                  hitSlop={8}
                  className="active:opacity-60"
                >
                  <Text variant="label" tone="primary">
                    {t('onboarding.location.openSettings')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {manual ? (
            <View className="flex-row flex-wrap gap-2" style={{ marginTop: 12 }}>
              {START_SPOTS.map((spot) => (
                <Chip
                  key={spot.id}
                  label={spot.label}
                  selected={selected?.source === 'manual' && selected.label === spot.label}
                  onPress={() => chooseSpot(spot)}
                />
              ))}
            </View>
          ) : null}

          <View style={{ flex: 1, minHeight: MAP_MIN_HEIGHT, marginTop: 14 }}>
            <RoamMap
              testID="onboarding-location-map"
              markers={markers}
              selectedMarkerId={markers[0]?.id ?? null}
              focusInsets={MAP_FOCUS_INSETS}
            />
          </View>
        </FadeInUp>
      </View>
    </View>
  );
}
