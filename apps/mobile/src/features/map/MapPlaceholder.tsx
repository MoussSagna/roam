import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Stand-in for the Map screen (`03_UX_SCREENS_AND_FLOWS.md` §12, `08_AGENT_TODO.md` Phase B "Map
 * placeholder"), not built this sprint — Discover's "Voir la carte" link needs somewhere to land, same
 * role `CreateJourneyPlaceholder`/`ProfilePlaceholder` played before their screens existed. Replace
 * this body, not the route (`/map`), when the real map screen is built.
 */
export function MapPlaceholder() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen className="gap-6 pt-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={() => router.back()}
        hitSlop={12}
        className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
      >
        <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
      </Pressable>

      <View className="gap-2">
        <Text variant="h2" accessibilityRole="header">
          {t('map.title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('common.comingSoon')}
        </Text>
      </View>
    </Screen>
  );
}
