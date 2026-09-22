import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useTranslation } from 'react-i18next';
import { Pressable, Text as RNText, View } from 'react-native';

import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

/** Back button + small "ROAM" wordmark, shared by every auth screen except the entry screen. */
export function AuthTopBar() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center justify-between">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={() => router.back()}
        hitSlop={12}
        className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
      >
        <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
      </Pressable>
      <RNText
        style={{ color: colors.primary, fontFamily: fontFamily.editorialSemibold, fontSize: 21 }}
      >
        {t('brand.name')}
      </RNText>
    </View>
  );
}
