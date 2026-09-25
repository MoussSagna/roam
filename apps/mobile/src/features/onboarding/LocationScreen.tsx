import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import Navigation from 'lucide-react-native/icons/navigation';
import Search from 'lucide-react-native/icons/search';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text as RNText, useWindowDimensions, View } from 'react-native';

import { FadeInUp, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { ChoiceRow } from './components/ChoiceRow';
import { MAP_ASPECT, MapPreview } from './components/MapPreview';
import type { SingleChoiceSlideProps } from './slideProps';

const HORIZONTAL_MARGIN = 28;
const LIST_MARGIN = 23;
const ROW_GAP = 9.5;
/** Row height on the mockup; rows shrink down to `ROW_MIN_HEIGHT` on short screens. */
const ROW_DESIGN_HEIGHT = 72;
const ROW_MIN_HEIGHT = 56;
/** Space between the subtitle and the first row, between the rows and the map, and under the map. */
const LIST_TOP_GAP = 30;
const MAP_GAP = 2;
const BOTTOM_GAP = 8;
const MAP_MIN_HEIGHT = 110;
const ICON_SIZE = 38;
const ICON_SLOT = 50;
const ICON_LEFT = 14;

const TITLE_MAX_SIZE = 29;
/** Width of the title per point of font size (measured: 332 pt at 29 pt, plus margin). */
const TITLE_WIDTH_PER_POINT = 11.45;

const PLACES = [
  { id: 'current', key: 'onboarding.location.current', icon: Navigation },
  { id: 'city', key: 'onboarding.location.city', icon: Search },
  { id: 'nearby', key: 'onboarding.location.nearby', icon: LocateFixed },
] as const;

/**
 * Onboarding 5 — "Où souhaites-tu sortir ?" (design mockup "Home Onboarding", sixth tile).
 * Single choice, nothing selected at first (D-88). Nothing asks for the position yet: the choice is
 * local, and the map is an illustration (see D-24). A slide of `OnboardingPager`, which holds the answer
 * and shows "Passer", the progress bars and "Suivant".
 */
export function LocationScreen({ selected, onSelect }: SingleChoiceSlideProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [areaHeight, setAreaHeight] = useState<number | null>(null);

  // The title must stay on one line on narrow screens (375 pt wide → 27 pt).
  const titleSize = Math.min(
    TITLE_MAX_SIZE,
    Math.floor((width - 2 * HORIZONTAL_MARGIN) / TITLE_WIDTH_PER_POINT),
  );

  // Rows and map share the space under the subtitle. The map gives way first, then the rows;
  // neither grows beyond the mockup.
  const mapWidth = width - 2 * LIST_MARGIN;
  const mapDesignHeight = mapWidth * MAP_ASPECT;
  const free =
    areaHeight === null ? null : areaHeight - LIST_TOP_GAP - 2 * ROW_GAP - MAP_GAP - BOTTOM_GAP;
  const rowsAtDesign = PLACES.length * ROW_DESIGN_HEIGHT;
  let rowHeight = ROW_DESIGN_HEIGHT;
  let mapHeight = mapDesignHeight;
  if (free !== null && free < rowsAtDesign + mapDesignHeight) {
    mapHeight = Math.max(MAP_MIN_HEIGHT, free - rowsAtDesign);
    if (free < rowsAtDesign + MAP_MIN_HEIGHT) {
      rowHeight = Math.max(ROW_MIN_HEIGHT, (free - MAP_MIN_HEIGHT) / PLACES.length);
    }
  }
  const iconSize = Math.round(ICON_SIZE * Math.min(1, rowHeight / ROW_DESIGN_HEIGHT));

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

      <View className="flex-1" onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}>
        <FadeInUp delay={150} style={{ marginTop: LIST_TOP_GAP }}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('onboarding.location.title')}
            style={{ marginHorizontal: LIST_MARGIN, rowGap: ROW_GAP }}
          >
            {PLACES.map((place) => (
              <ChoiceRow
                key={place.id}
                label={t(place.key)}
                icon={place.icon}
                iconColor={colors.text}
                selectedIconColor={colors.primaryForeground}
                iconSize={iconSize}
                slotWidth={ICON_SLOT}
                paddingLeft={ICON_LEFT}
                labelSize={17}
                selected={selected === place.id}
                height={rowHeight}
                onPress={() => onSelect(place.id)}
              />
            ))}
          </View>
          <View style={{ marginHorizontal: LIST_MARGIN, marginTop: MAP_GAP }}>
            <MapPreview
              width={mapWidth}
              height={mapHeight}
              city={t('onboarding.location.previewCity')}
              country={t('onboarding.location.previewCountry')}
            />
          </View>
        </FadeInUp>
      </View>
    </View>
  );
}
