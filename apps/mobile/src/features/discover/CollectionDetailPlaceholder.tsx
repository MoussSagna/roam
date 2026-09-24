import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

type CollectionDetailPlaceholderProps = {
  /** The collection's own (plain, mock) title, not an i18n key — same convention as its other mock
   * content (`docs/DECISIONS.md` D-09/D-10). `undefined` when the id didn't resolve. */
  title?: string;
};

/**
 * Stand-in for the collection/selection detail screen (sprint 6 brief §10 "Navigation": "tap
 * collection -> Collection / sélection"), not built this sprint — same role `CreateJourneyPlaceholder`/
 * `ProfilePlaceholder` played before their screens existed. Replace this body, not the route
 * (`collection/[id]`), when that screen is built.
 */
export function CollectionDetailPlaceholder({ title }: CollectionDetailPlaceholderProps) {
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
          {title ?? t('discover.sections.collections')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('common.comingSoon')}
        </Text>
      </View>
    </Screen>
  );
}
