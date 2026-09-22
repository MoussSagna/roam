import { useRouter } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

type AuthPlaceholderProps = {
  title: string;
};

/**
 * Stand-in for an authentication screen not built yet (same role as the onboarding routes had
 * before their screens existed, `DECISIONS.md` D-20), so "Se connecter" / "Créer un compte" from
 * the entry screen have somewhere to land instead of hitting an unmatched route. Replace the body
 * of the route file that renders this when the real screen is built; the route path stays.
 */
export function AuthPlaceholder({ title }: AuthPlaceholderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={() => router.back()}
        hitSlop={12}
        className="mt-2 h-11 w-11 items-center justify-center active:opacity-60"
      >
        <ArrowLeft size={24} strokeWidth={1.5} color={colors.text} />
      </Pressable>
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text variant="h3">{title}</Text>
        <Text variant="body" tone="secondary">
          {t('auth.placeholder.comingSoon')}
        </Text>
      </View>
    </Screen>
  );
}
