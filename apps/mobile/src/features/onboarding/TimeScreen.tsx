import Clock from 'lucide-react-native/icons/clock';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text as RNText, useWindowDimensions, View } from 'react-native';

import { FadeInUp, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { ChoiceRow } from './components/ChoiceRow';
import type { SingleChoiceSlideProps } from './slideProps';

const HORIZONTAL_MARGIN = 30.6;
const LIST_MARGIN = 27;
const ROW_GAP = 10.5;
/** Row height on the mockup; rows shrink down to `ROW_MIN_HEIGHT` on short screens. */
const ROW_DESIGN_HEIGHT = 76;
const ROW_MIN_HEIGHT = 58;
/** Space between the subtitle and the first row. */
const LIST_TOP_GAP = 30;
const ICON_SIZE = 45;
const LIST_BOTTOM_GAP = 16;

const SUBTITLE_MAX_SIZE = 17;
/** Width of the longer subtitle line per point of font size (measured: 312 pt at 17 pt, plus margin). */
const SUBTITLE_WIDTH_PER_POINT = 18.8;

const TIMES = [
  { id: 'under1h', key: 'onboarding.time.under1h' },
  { id: 'oneToTwoH', key: 'onboarding.time.oneToTwoH' },
  { id: 'twoToFourH', key: 'onboarding.time.twoToFourH' },
  { id: 'over4h', key: 'onboarding.time.over4h' },
] as const;

/**
 * Onboarding 3 — "Combien de temps as-tu ?" (design mockup "Home Onboarding", fourth tile).
 * Single choice, nothing selected at first (D-88). A slide of `OnboardingPager`, which holds the answer and
 * shows "Passer", the progress bars and "Suivant".
 */
export function TimeScreen({ selected, onSelect }: SingleChoiceSlideProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [areaHeight, setAreaHeight] = useState<number | null>(null);

  // The longer subtitle line must stay on one line on narrow screens (375 pt wide → 16 pt).
  const subtitleSize = Math.min(
    SUBTITLE_MAX_SIZE,
    Math.floor((width - 2 * HORIZONTAL_MARGIN) / SUBTITLE_WIDTH_PER_POINT),
  );
  // Shrink the rows on short screens; never enlarge them beyond the design height.
  const fittingHeight =
    areaHeight === null
      ? ROW_DESIGN_HEIGHT
      : (areaHeight - LIST_TOP_GAP - LIST_BOTTOM_GAP - (TIMES.length - 1) * ROW_GAP) / TIMES.length;
  const rowHeight = Math.max(ROW_MIN_HEIGHT, Math.min(ROW_DESIGN_HEIGHT, fittingHeight));

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
              fontSize: 33,
              lineHeight: 40,
            }}
          >
            {t('onboarding.time.title')}
          </RNText>
          <Text
            variant="body"
            tone="secondary"
            style={{
              marginTop: 8,
              marginHorizontal: HORIZONTAL_MARGIN,
              fontSize: subtitleSize,
              lineHeight: 26,
            }}
          >
            {t('onboarding.time.subtitle')}
          </Text>
        </FadeInUp>
      </View>

      <View className="flex-1" onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}>
        <FadeInUp delay={150} style={{ marginTop: LIST_TOP_GAP }}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('onboarding.time.title').replace('\n', ' ')}
            style={{ marginHorizontal: LIST_MARGIN, rowGap: ROW_GAP }}
          >
            {TIMES.map((time) => (
              <ChoiceRow
                key={time.id}
                label={t(time.key)}
                icon={Clock}
                iconColor={colors.text}
                selectedIconColor={colors.primaryForeground}
                selected={selected === time.id}
                iconSize={iconSize}
                height={rowHeight}
                onPress={() => onSelect(time.id)}
              />
            ))}
          </View>
        </FadeInUp>
      </View>
    </View>
  );
}
