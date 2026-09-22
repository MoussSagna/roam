import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen, Text } from '@/components/ui';

/**
 * Placeholder of the home screen (03 in `03_UX_SCREENS_AND_FLOWS.md`), the end of the onboarding.
 * Replace the body with the real screen; the route (`/home`) does not change.
 */
export function HomeScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <View className="flex-1 justify-center gap-3">
        <Text variant="h2" accessibilityRole="header">
          {t('home.title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('home.comingSoon')}
        </Text>
      </View>
    </Screen>
  );
}
