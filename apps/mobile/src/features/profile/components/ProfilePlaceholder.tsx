import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

type ProfilePlaceholderProps = {
  title: string;
};

/**
 * Stand-in for a not-yet-built profile sub-screen (préférences, favoris, historique, statistiques,
 * langue, thème, aide, confidentialité, paramètres, édition), one screen per sprint 5 session
 * (`docs/SCREEN_INTEGRATION_WORKFLOW.md`) — same role `CreateJourneyPlaceholder`/
 * `ExperienceDetailPlaceholder` played before their screens existed (`docs/DECISIONS.md` D-45, D-48).
 * Replace the body of the route that uses it, not the route path, when that screen's turn comes.
 */
export function ProfilePlaceholder({ title }: ProfilePlaceholderProps) {
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
          {title}
        </Text>
        <Text variant="body" tone="secondary">
          {t('common.comingSoon')}
        </Text>
      </View>
    </Screen>
  );
}
