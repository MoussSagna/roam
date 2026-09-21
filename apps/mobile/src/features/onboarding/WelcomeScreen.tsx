import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, FadeInUp, Screen, Text } from '@/components/ui';

/**
 * Placeholder for the Welcome screen (docs/03_UX_SCREENS_AND_FLOWS.md → 02 Welcome).
 * It only proves that `/welcome` is routable; the real screen and CTAs come with onboarding.
 */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen className="justify-center gap-8">
      <FadeInUp>
        <View className="gap-4">
          <Text variant="h1" accessibilityRole="header">
            {t('welcome.title')}
          </Text>
          <Text variant="bodyLg" tone="secondary">
            {t('welcome.subtitle')}
          </Text>
        </View>
      </FadeInUp>
      <Button variant="secondary" label={t('common.back')} onPress={goBack} />
    </Screen>
  );
}
