import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';

/** "ou" divider between the primary form and the social sign-in options. */
export function OrDivider() {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-3">
      <View className="h-[1px] flex-1 bg-border" />
      <Text variant="small" tone="secondary">
        {t('auth.or')}
      </Text>
      <View className="h-[1px] flex-1 bg-border" />
    </View>
  );
}
