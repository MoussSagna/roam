// One icon per import: the package root would pull ~1600 icons into the bundle.
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text as RNText, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FadeInUp, Text } from '@/components/ui';
import { fontFamily } from '@/theme/typography';

import { COLLAGE_DESIGN_HEIGHT, WelcomeCollage } from './components/WelcomeCollage';
import { useOnboardingNavigation } from './onboardingFlow';

const HORIZONTAL_MARGIN = 30.6;

/**
 * Onboarding 1 — "Bienvenue sur ROAM" (design mockup "Home Onboarding", first tile after the splash).
 */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { next, skip } = useOnboardingNavigation('welcome');
  const [collageHeight, setCollageHeight] = useState<number | null>(null);

  // Shrink the collage on short screens; never enlarge it beyond the design size.
  const scale =
    collageHeight === null ? 1 : Math.min(1, Math.max(0.6, collageHeight / COLLAGE_DESIGN_HEIGHT));

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
              marginTop: 9,
              marginHorizontal: HORIZONTAL_MARGIN,
              fontFamily: fontFamily.editorialSemibold,
              fontSize: 37,
              lineHeight: 46,
            }}
          >
            {t('onboarding.welcome.title')}
          </RNText>
          <Text
            variant="bodyLg"
            tone="secondary"
            style={{
              marginTop: 4,
              marginLeft: HORIZONTAL_MARGIN,
              marginRight: 18,
              lineHeight: 26,
            }}
          >
            {t('onboarding.welcome.subtitle')}
          </Text>
        </FadeInUp>
      </View>

      <View
        className="flex-1 justify-center"
        onLayout={(e) => setCollageHeight(e.nativeEvent.layout.height)}
      >
        <FadeInUp delay={200}>
          <WelcomeCollage width={width} scale={scale} />
        </FadeInUp>
      </View>

      <View style={{ paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: 20 }}>
        <Button
          label={t('common.next')}
          trailingIcon={ArrowRight}
          onPress={next}
          className="mt-[18px]"
        />
      </View>
    </View>
  );
}
