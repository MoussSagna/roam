import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Gift from 'lucide-react-native/icons/gift';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text as RNText, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FadeInUp, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { ChoiceRow } from './components/ChoiceRow';
import { EuroGlyph } from './components/EuroGlyph';
import { ProgressBars } from './components/ProgressBars';
import { useOnboardingNavigation } from './onboardingFlow';

const HORIZONTAL_MARGIN = 30.6;
const LIST_MARGIN = 27;
const ROW_GAP = 9.5;
/** Row height on the mockup; rows shrink down to `ROW_MIN_HEIGHT` on short screens. */
const ROW_DESIGN_HEIGHT = 75;
const ROW_MIN_HEIGHT = 52;
/** Space between the subtitle and the first row. */
const LIST_TOP_GAP = 24;
const LIST_BOTTOM_GAP = 16;
const ICON_SIZE = 40;

const TITLE_MAX_SIZE = 34;
/** Width of the title per point of font size (measured: 319 pt at 34 pt, plus margin). */
const TITLE_WIDTH_PER_POINT = 9.6;
const SUBTITLE_MAX_SIZE = 18;
/** Width of the longer subtitle line per point of font size (measured: 311 pt at 18 pt, plus margin). */
const SUBTITLE_WIDTH_PER_POINT = 18;

const BUDGETS = [
  { id: 'free', key: 'onboarding.budget.free', icon: Gift },
  { id: 'under10', key: 'onboarding.budget.under10', icon: EuroGlyph },
  { id: 'from10to30', key: 'onboarding.budget.from10to30', icon: EuroGlyph },
  { id: 'from30to50', key: 'onboarding.budget.from30to50', icon: EuroGlyph },
  { id: 'over50', key: 'onboarding.budget.over50', icon: EuroGlyph },
] as const;

/**
 * Onboarding 4 — "Quel est ton budget ?" (design mockup "Home Onboarding", fifth tile).
 * Single choice; the mockup shows "Moins de 10 €" selected, so it is the default.
 */
export function BudgetScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { next, skip } = useOnboardingNavigation('budget');
  const [selected, setSelected] = useState<(typeof BUDGETS)[number]['id']>('under10');
  const [areaHeight, setAreaHeight] = useState<number | null>(null);

  // Title and subtitle lines must not wrap on narrow screens (375 pt wide → 32 pt and 17 pt).
  const textWidth = width - 2 * HORIZONTAL_MARGIN;
  const titleSize = Math.min(TITLE_MAX_SIZE, Math.floor(textWidth / TITLE_WIDTH_PER_POINT));
  const subtitleSize = Math.min(
    SUBTITLE_MAX_SIZE,
    Math.floor(textWidth / SUBTITLE_WIDTH_PER_POINT),
  );

  // Shrink the rows on short screens; never enlarge them beyond the design height.
  const fittingHeight =
    areaHeight === null
      ? ROW_DESIGN_HEIGHT
      : (areaHeight - LIST_TOP_GAP - LIST_BOTTOM_GAP - (BUDGETS.length - 1) * ROW_GAP) /
        BUDGETS.length;
  const rowHeight = Math.max(ROW_MIN_HEIGHT, Math.min(ROW_DESIGN_HEIGHT, fittingHeight));
  const iconSize = Math.round(ICON_SIZE * Math.min(1, rowHeight / ROW_DESIGN_HEIGHT));

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.skip')}
          onPress={skip}
          hitSlop={12}
          className="self-end active:opacity-60"
          style={{ marginRight: 26, marginTop: 17 }}
        >
          <Text variant="small" tone="secondary">
            {t('common.skip')}
          </Text>
        </Pressable>

        <FadeInUp>
          <RNText
            accessibilityRole="header"
            className="text-text"
            style={{
              marginTop: 29,
              marginHorizontal: HORIZONTAL_MARGIN,
              fontFamily: fontFamily.editorialSemibold,
              fontSize: titleSize,
              lineHeight: Math.round(titleSize * 1.22),
            }}
          >
            {t('onboarding.budget.title')}
          </RNText>
          <Text
            variant="bodyLg"
            tone="secondary"
            style={{
              marginTop: 7,
              marginHorizontal: HORIZONTAL_MARGIN,
              fontSize: subtitleSize,
              lineHeight: 25.5,
            }}
          >
            {t('onboarding.budget.subtitle')}
          </Text>
        </FadeInUp>
      </View>

      <View className="flex-1" onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}>
        <FadeInUp delay={150} style={{ marginTop: LIST_TOP_GAP }}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('onboarding.budget.title')}
            style={{ marginHorizontal: LIST_MARGIN, rowGap: ROW_GAP }}
          >
            {BUDGETS.map((budget) => (
              <ChoiceRow
                key={budget.id}
                label={t(budget.key)}
                icon={budget.icon}
                iconColor={colors.text}
                selectedIconColor={colors.primaryForeground}
                iconSize={iconSize}
                labelSize={17}
                accessibilityLabel={budget.id === 'free' ? undefined : `${t(budget.key)}\u00a0€`}
                selected={selected === budget.id}
                height={rowHeight}
                onPress={() => setSelected(budget.id)}
              />
            ))}
          </View>
        </FadeInUp>
      </View>

      <View style={{ paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: 20 }}>
        <ProgressBars count={5} index={2} />
        <Button
          label={t('common.next')}
          trailingIcon={ArrowRight}
          onPress={next}
          className="mt-[21px]"
        />
      </View>
    </View>
  );
}
