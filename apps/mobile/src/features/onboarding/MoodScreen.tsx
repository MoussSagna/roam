import Binoculars from 'lucide-react-native/icons/binoculars';
import Heart from 'lucide-react-native/icons/heart';
import Landmark from 'lucide-react-native/icons/landmark';
import Leaf from 'lucide-react-native/icons/leaf';
import Sparkles from 'lucide-react-native/icons/sparkles';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import UsersRound from 'lucide-react-native/icons/users-round';
import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Text as RNText, useWindowDimensions, View } from 'react-native';

import { FadeInUp, Text } from '@/components/ui';
import { moodAccents, useTheme, type MoodAccent } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { MoodTile } from './components/MoodTile';
import { RunnerIcon } from './components/RunnerIcon';
import type { SingleChoiceSlideProps } from './slideProps';

const HORIZONTAL_MARGIN = 30.6;
const GRID_MARGIN = 16.5;
const GRID_GAP_X = 11.5;
const GRID_GAP_Y = 15;
/** Tile size on the mockup (390 pt wide): about 111 × 118. */
const TILE_DESIGN_RATIO = 119 / 112;
const TILE_MIN_HEIGHT = 80;
/** Free space kept above and below the grid when the screen is short. */
const GRID_MIN_FREE_SPACE = 24;
const ICON_SIZE = 46;
const TITLE_MAX_SIZE = 28;
/** Width of the longest title line per point of font size (measured: 324 pt at 28 pt). */
const TITLE_WIDTH_PER_POINT = 11.7;

type Mood = {
  id: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  /** Tinted icon and peach tile of the mockup. */
  accent?: MoodAccent;
  warm?: boolean;
};

const MOODS: readonly Mood[] = [
  { id: 'curious', icon: Binoculars },
  { id: 'relaxed', icon: Leaf, accent: 'relaxed' },
  { id: 'festive', icon: Sparkles, accent: 'festive', warm: true },
  { id: 'cultural', icon: Landmark },
  { id: 'sporty', icon: RunnerIcon },
  { id: 'romantic', icon: Heart, accent: 'romantic', warm: true },
  { id: 'solo', icon: User },
  { id: 'friends', icon: Users },
  { id: 'family', icon: UsersRound },
];

const COLUMNS = 3;

/**
 * Onboarding 2 — "Quelle est ton humeur aujourd'hui ?" (design mockup "Home Onboarding", third tile).
 * Single choice, nothing selected at first (D-88). A slide of `OnboardingPager`, which holds the answer and
 * shows "Passer", the progress bars and "Suivant".
 */
export function MoodScreen({ selected, onSelect }: SingleChoiceSlideProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { colors, scheme } = useTheme();
  const [areaHeight, setAreaHeight] = useState<number | null>(null);

  // The longest title line must stay on one line on narrow screens (375 pt wide → 26 pt).
  const titleSize = Math.min(
    TITLE_MAX_SIZE,
    Math.floor((width - 2 * HORIZONTAL_MARGIN) / TITLE_WIDTH_PER_POINT),
  );
  const tileWidth = (width - 2 * GRID_MARGIN - (COLUMNS - 1) * GRID_GAP_X) / COLUMNS;
  const idealHeight = tileWidth * TILE_DESIGN_RATIO;
  // Shrink the tiles on short screens; never enlarge them beyond the design ratio.
  const fittingHeight =
    areaHeight === null
      ? idealHeight
      : (areaHeight - 2 * GRID_GAP_Y - GRID_MIN_FREE_SPACE) / (MOODS.length / COLUMNS);
  const tileHeight = Math.max(TILE_MIN_HEIGHT, Math.min(idealHeight, fittingHeight));
  const iconSize = Math.round(ICON_SIZE * Math.min(1, tileHeight / 119));

  const rows = Array.from({ length: MOODS.length / COLUMNS }, (_, r) =>
    MOODS.slice(r * COLUMNS, (r + 1) * COLUMNS),
  );

  return (
    <View className="flex-1 bg-background">
      <View>
        <FadeInUp>
          <RNText
            accessibilityRole="header"
            className="text-text"
            style={{
              marginTop: 35,
              marginHorizontal: HORIZONTAL_MARGIN,
              fontFamily: fontFamily.editorialSemibold,
              fontSize: titleSize,
              lineHeight: Math.round(titleSize * 1.25),
            }}
          >
            {t('onboarding.mood.title')}
          </RNText>
          <Text
            variant="body"
            tone="secondary"
            style={{
              marginTop: 7,
              marginHorizontal: HORIZONTAL_MARGIN,
              // Caps the line length so the subtitle breaks after "correspondent" like the mockup.
              maxWidth: 325,
              fontSize: 15,
              lineHeight: 24,
            }}
          >
            {t('onboarding.mood.subtitle')}
          </Text>
        </FadeInUp>
      </View>

      <View className="flex-1" onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}>
        <View style={{ flexGrow: 1, minHeight: GRID_MIN_FREE_SPACE * 0.6 }} />
        <FadeInUp delay={150}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('onboarding.mood.title').replace('\n', ' ')}
            style={{ paddingHorizontal: GRID_MARGIN, rowGap: GRID_GAP_Y }}
          >
            {rows.map((row, r) => (
              <View key={r} className="flex-row" style={{ columnGap: GRID_GAP_X }}>
                {row.map((mood) => (
                  <MoodTile
                    key={mood.id}
                    label={t(`onboarding.mood.${mood.id}` as 'onboarding.mood.curious')}
                    icon={mood.icon}
                    iconColor={mood.accent ? moodAccents[scheme][mood.accent] : colors.text}
                    selectedIconColor={colors.primaryForeground}
                    iconSize={iconSize}
                    selected={selected === mood.id}
                    warm={mood.warm}
                    width={tileWidth}
                    height={tileHeight}
                    onPress={() => onSelect(mood.id)}
                  />
                ))}
              </View>
            ))}
          </View>
        </FadeInUp>
        <View style={{ flexGrow: 2, minHeight: GRID_MIN_FREE_SPACE * 0.4 }} />
      </View>
    </View>
  );
}
