import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useTranslation } from 'react-i18next';
import { Pressable, Text as RNText, View } from 'react-native';

import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

/**
 * Back button + small "ROAM" wordmark, shared by every auth screen except the entry screen. The
 * back button only renders when there is actually somewhere to go back to
 * (`router.canGoBack()`) — every screen using this bar is normally reached by `push` (from `auth/index`
 * or a cross-link), where that's always true, but Login can also be reached via the post-logout
 * `Stack.Protected` guard swap (`docs/DECISIONS.md`), which leaves nothing behind it. Rendering a
 * back button there would call `router.back()` with no route to resolve. A same-size empty `View`
 * keeps the wordmark's position identical either way.
 */
export function AuthTopBar() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const canGoBack = router.canGoBack();

  return (
    <View className="flex-row items-center justify-between">
      {canGoBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          hitSlop={12}
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
        >
          <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
        </Pressable>
      ) : (
        <View className="h-11 w-11" />
      )}
      <RNText
        style={{ color: colors.primary, fontFamily: fontFamily.editorialSemibold, fontSize: 21 }}
      >
        {t('brand.name')}
      </RNText>
    </View>
  );
}
