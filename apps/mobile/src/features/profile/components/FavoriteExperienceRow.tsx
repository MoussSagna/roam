import { Image } from 'expo-image';
import Heart from 'lucide-react-native/icons/heart';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

const THUMBNAIL_SIZE = 72;

type FavoriteExperienceRowProps = {
  experience: Experience;
  categoryLabel: string | null;
  onPress: (experience: Experience) => void;
  onRemove: (id: string) => void;
};

/**
 * One row of "Mes favoris" (profile, écran 3): thumbnail, title, "category · location", and a heart
 * button that removes it from the list. The heart is a second, nested `Pressable` inside the row's
 * own — same pattern Home's `ExperienceCard` already uses so tapping it doesn't also trigger the
 * row's navigation (`docs/DECISIONS.md` D-45).
 */
export function FavoriteExperienceRow({
  experience,
  categoryLabel,
  onPress,
  onRemove,
}: FavoriteExperienceRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const subtitle = [categoryLabel, experience.location].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={experience.title}
      onPress={() => onPress(experience)}
      className="flex-row items-center gap-4 py-2 active:opacity-80"
    >
      <View
        style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
        className="overflow-hidden rounded-large bg-surfaceElevated"
      >
        {experience.coverImage ? (
          <Image
            source={experience.coverImage}
            style={{ flex: 1 }}
            contentFit="cover"
            accessible
            accessibilityIgnoresInvertColors
            accessibilityLabel={experience.title}
          />
        ) : null}
      </View>

      <View className="flex-1 gap-1">
        <Text variant="h4" numberOfLines={1}>
          {experience.title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.favoriteRemove')}
        hitSlop={8}
        onPress={() => onRemove(experience.id)}
        className="h-10 w-10 items-center justify-center active:opacity-60"
      >
        <Heart size={20} strokeWidth={1.8} color={colors.error} fill={colors.error} />
      </Pressable>
    </Pressable>
  );
}
