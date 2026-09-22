import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { repositories } from '@/services';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

type ExperienceDetailPlaceholderProps = {
  experienceId?: string;
};

/**
 * Stand-in for the experience detail screen (`02_MVP_SCOPE.md` §7), not built this sprint
 * (sprint 5 §21): "Voir l'expérience" needs somewhere to land, same role `AuthPlaceholder` and
 * `OnboardingPlaceholder` played before their real screens existed (`docs/DECISIONS.md` D-20/D-29,
 * both deleted once unused). Replace this body, not the route, when the real screen is built.
 */
export function ExperienceDetailPlaceholder({ experienceId }: ExperienceDetailPlaceholderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [experience, setExperience] = useState<Experience | null>(null);

  useEffect(() => {
    let active = true;
    if (experienceId) {
      void repositories.experiences.getById(experienceId).then((result) => {
        if (active) setExperience(result);
      });
    }
    return () => {
      active = false;
    };
  }, [experienceId]);

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
          {experience?.title ?? t('common.comingSoon')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('common.comingSoon')}
        </Text>
      </View>
    </Screen>
  );
}
