import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Landmark from 'lucide-react-native/icons/landmark';
import Martini from 'lucide-react-native/icons/martini';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import TreeDeciduous from 'lucide-react-native/icons/tree-deciduous';
import Utensils from 'lucide-react-native/icons/utensils';
import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Text as RNText, useWindowDimensions, View } from 'react-native';

import { FadeInUp, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { InterestTile } from './components/InterestTile';
import { LotusIcon } from './components/LotusIcon';
import { RunnerIcon } from './components/RunnerIcon';
import type { MultipleChoiceSlideProps } from './slideProps';

const HORIZONTAL_MARGIN = 30.6;
const GRID_MARGIN = 23;
const GRID_GAP_X = 12;
const GRID_GAP_Y = 11.4;
const COLUMNS = 2;
/** Tile height / width on the mockup (about 165 × 99.5). Tiles shrink down to `TILE_MIN_HEIGHT` on short screens. */
const TILE_RATIO = 99.5 / 165;
const TILE_MIN_HEIGHT = 64;
/** Space between the subtitle and the first row, and under the last row. */
const GRID_TOP_GAP = 22.7;
const GRID_BOTTOM_GAP = 12;
const ICON_SIZE = 35;

const TITLE_MAX_SIZE = 30;
/** Width of the title per point of font size (measured on the render, plus margin). */
const TITLE_WIDTH_PER_POINT = 11.25;

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/** `iconScale` evens out glyphs that fill less of their box than Lucide's. */
const INTERESTS: readonly { id: string; key: string; icon: IconComponent; iconScale?: number }[] = [
  { id: 'culture', key: 'onboarding.interests.culture', icon: Landmark },
  { id: 'restaurants', key: 'onboarding.interests.restaurants', icon: Utensils },
  { id: 'nightlife', key: 'onboarding.interests.nightlife', icon: Martini },
  { id: 'nature', key: 'onboarding.interests.nature', icon: TreeDeciduous, iconScale: 1.2 },
  { id: 'activities', key: 'onboarding.interests.activities', icon: RunnerIcon, iconScale: 1.2 },
  { id: 'shopping', key: 'onboarding.interests.shopping', icon: ShoppingBag },
  { id: 'wellness', key: 'onboarding.interests.wellness', icon: LotusIcon, iconScale: 1.2 },
  { id: 'events', key: 'onboarding.interests.events', icon: CalendarDays },
];

/**
 * Onboarding 6 — "Qu'est-ce qui t'intéresse ?" (design mockup "Home Onboarding", seventh tile).
 * Multiple choice, nothing selected at first; at least one interest is needed to move on (D-88), "at
 * least 3" stays a recommendation (03_UX_SCREENS_AND_FLOWS.md). A slide of `OnboardingPager`, which
 * holds the answers and shows "Passer", the progress bars and "Suivant".
 */
export function InterestsScreen({ selected, onToggle }: MultipleChoiceSlideProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [areaHeight, setAreaHeight] = useState<number | null>(null);

  // The title must stay on one line on narrow screens (375 pt wide → 28 pt).
  const titleSize = Math.min(
    TITLE_MAX_SIZE,
    Math.floor((width - 2 * HORIZONTAL_MARGIN) / TITLE_WIDTH_PER_POINT),
  );

  const rowCount = INTERESTS.length / COLUMNS;
  const tileWidth = (width - 2 * GRID_MARGIN - (COLUMNS - 1) * GRID_GAP_X) / COLUMNS;
  const idealHeight = tileWidth * TILE_RATIO;
  // Shrink the tiles on short screens; never enlarge them beyond the design ratio.
  const fittingHeight =
    areaHeight === null
      ? idealHeight
      : (areaHeight - GRID_TOP_GAP - GRID_BOTTOM_GAP - (rowCount - 1) * GRID_GAP_Y) / rowCount;
  const tileHeight = Math.max(TILE_MIN_HEIGHT, Math.min(idealHeight, fittingHeight));
  const iconSize = Math.round(ICON_SIZE * Math.min(1, tileHeight / (TILE_RATIO * 165)));

  const rows = Array.from({ length: rowCount }, (_, r) =>
    INTERESTS.slice(r * COLUMNS, (r + 1) * COLUMNS),
  );

  return (
    <View className="flex-1 bg-background">
      <View>
        <FadeInUp>
          <RNText
            accessibilityRole="header"
            className="text-text"
            style={{
              marginTop: 32,
              marginHorizontal: HORIZONTAL_MARGIN,
              fontFamily: fontFamily.editorialSemibold,
              fontSize: titleSize,
              lineHeight: 36,
            }}
          >
            {t('onboarding.interests.title')}
          </RNText>
          <Text
            variant="body"
            tone="secondary"
            style={{
              marginTop: 8,
              marginHorizontal: HORIZONTAL_MARGIN,
              fontSize: 18.5,
              lineHeight: 26,
            }}
          >
            {t('onboarding.interests.subtitle')}
          </Text>
        </FadeInUp>
      </View>

      <View className="flex-1" onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}>
        <FadeInUp delay={150} style={{ marginTop: GRID_TOP_GAP }}>
          <View
            accessibilityLabel={t('onboarding.interests.title')}
            style={{ marginHorizontal: GRID_MARGIN, rowGap: GRID_GAP_Y }}
          >
            {rows.map((row, r) => (
              <View key={r} className="flex-row" style={{ columnGap: GRID_GAP_X }}>
                {row.map((interest) => (
                  <InterestTile
                    key={interest.id}
                    label={t(interest.key as 'onboarding.interests.culture')}
                    icon={interest.icon}
                    iconColor={colors.text}
                    selectedIconColor={colors.primaryForeground}
                    iconSize={iconSize}
                    iconScale={interest.iconScale}
                    selected={selected.has(interest.id)}
                    width={tileWidth}
                    height={tileHeight}
                    onPress={() => onToggle(interest.id)}
                  />
                ))}
              </View>
            ))}
          </View>
        </FadeInUp>
      </View>
    </View>
  );
}
