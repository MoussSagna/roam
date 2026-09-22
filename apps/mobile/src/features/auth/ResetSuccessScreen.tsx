import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FadeInUp, Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';
import { derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

import { SuccessCheckmark } from './components/SuccessCheckmark';
import { SuccessLandscape } from './components/SuccessLandscape';

/**
 * Reset-success screen (design mockup "Authentification", tile 7 "Réinitialisation réussie") —
 * the last screen of the forgot-password sub-flow. Purely a confirmation: no form, no back
 * button (same "end of a flow" shape as the onboarding's `ReadyScreen`). "Se connecter" replaces
 * the route so the flow doesn't stay in the back-stack (`DECISIONS.md` D-36).
 */
export function ResetSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scheme, colors } = useTheme();
  const reduceMotion = useReduceMotion();

  // Measured on the mockup (light theme only, D-31); on a dark background it would be unreadable.
  const headingColor = scheme === 'dark' ? colors.text : derived.authHeading;

  return (
    <View className="flex-1 bg-background">
      <View style={{ flex: 1 }}>
        <FadeInUp
          delay={reduceMotion ? 0 : 50}
          style={{ alignItems: 'center', paddingTop: insets.top + 56, paddingHorizontal: 24 }}
        >
          <SuccessCheckmark reduceMotion={reduceMotion} />
          <RNText
            accessibilityRole="header"
            style={{
              marginTop: 20,
              color: headingColor,
              fontFamily: fontFamily.editorialSemibold,
              fontSize: 27,
              lineHeight: 34,
              textAlign: 'center',
            }}
          >
            {t('auth.resetSuccess.title')}
          </RNText>
          <Text
            variant="body"
            tone="secondary"
            style={{ marginTop: 8, textAlign: 'center', lineHeight: 22 }}
          >
            {t('auth.resetSuccess.subtitle')}
          </Text>
        </FadeInUp>

        <View style={{ flex: 1, marginTop: 16 }}>
          <SuccessLandscape />
        </View>
      </View>

      <FadeInUp delay={reduceMotion ? 0 : 350}>
        <View
          className="rounded-t-hero bg-surface px-6"
          style={{ paddingTop: 24, paddingBottom: Math.max(insets.bottom, 20) + 8 }}
        >
          <Button label={t('auth.signIn')} onPress={() => router.replace('/auth/login')} />
        </View>
      </FadeInUp>
    </View>
  );
}
