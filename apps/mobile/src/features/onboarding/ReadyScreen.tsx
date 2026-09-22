import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInUp } from '@/components/ui';
import { brand, derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

import { useOnboardingNavigation } from './onboardingFlow';

const HORIZONTAL_MARGIN = 35;
const BUTTON_MARGIN = 32;
const BUTTON_HEIGHT = 83;
const TITLE_SIZE = 44;

/**
 * Onboarding 7 — "Prêt à explorer ?" (design mockup "Home Onboarding", last tile). A photo fills the
 * screen, so its colors do not follow the theme (the text sits on the sky, the button on the jacket).
 * "Commencer" ends the onboarding and enters the app.
 */
export function ReadyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { finish } = useOnboardingNavigation('ready');

  return (
    <View style={{ flex: 1, backgroundColor: derived.night }}>
      <StatusBar style="light" />
      <Image
        source={require('../../../assets/images/onboarding/ready-background.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        accessible={false}
      />

      <FadeInUp style={{ paddingTop: insets.top + 43, paddingHorizontal: HORIZONTAL_MARGIN }}>
        <RNText
          accessibilityRole="header"
          style={{
            color: derived.inkDeep,
            fontFamily: fontFamily.editorialSemibold,
            fontSize: TITLE_SIZE,
            lineHeight: 56,
          }}
        >
          {t('onboarding.ready.title')}
        </RNText>
        <RNText
          style={{
            marginTop: 3,
            color: derived.inkDeep,
            opacity: 0.85,
            fontFamily: fontFamily.body,
            fontSize: 18,
            lineHeight: 26,
          }}
        >
          {t('onboarding.ready.subtitle')}
        </RNText>
      </FadeInUp>

      <View style={{ flex: 1 }} />

      <FadeInUp
        delay={250}
        style={{ paddingBottom: Math.max(insets.bottom, 24) + 9, paddingHorizontal: BUTTON_MARGIN }}
      >
        <RNText
          accessible={false}
          style={{
            alignSelf: 'flex-end',
            marginRight: -4,
            marginBottom: 28,
            color: brand.white,
            fontFamily: fontFamily.script,
            fontSize: 27,
            lineHeight: 27,
            transform: [{ rotate: '-9deg' }],
          }}
        >
          {t('onboarding.ready.script')}
        </RNText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.ready.start')}
          onPress={finish}
          className="flex-row items-center justify-center rounded-large active:opacity-80"
          style={{
            height: BUTTON_HEIGHT,
            gap: 16,
            borderWidth: 1.5,
            borderColor: brand.white,
            backgroundColor: derived.forestDeep,
          }}
        >
          <RNText style={{ color: brand.white, fontFamily: fontFamily.body, fontSize: 20 }}>
            {t('onboarding.ready.start')}
          </RNText>
          <ArrowRight size={28} strokeWidth={1.5} color={brand.white} />
        </Pressable>
      </FadeInUp>
    </View>
  );
}
