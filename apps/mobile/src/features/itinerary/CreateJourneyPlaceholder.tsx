import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

type CreateJourneyPlaceholderProps = {
  experienceId?: string;
};

/**
 * Stand-in for the itinerary screen (`02_MVP_SCOPE.md` §5, `03_UX_SCREENS_AND_FLOWS.md` §11), not
 * built this sprint (sprint 5 §20): the experience detail's "Créer mon parcours" / "Créer un parcours
 * personnalisé" CTAs need somewhere to land, same role `ExperienceDetailPlaceholder` played before it
 * (`docs/DECISIONS.md` D-45/D-48, both deleted once unused). Replace this body, not the route, when
 * the real itinerary screen is built.
 */
export function CreateJourneyPlaceholder({
  experienceId: _experienceId,
}: CreateJourneyPlaceholderProps) {
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
          {t('itinerary.title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('common.comingSoon')}
        </Text>
      </View>
    </Screen>
  );
}
