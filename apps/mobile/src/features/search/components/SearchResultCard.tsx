import { Image } from 'expo-image';
import Heart from 'lucide-react-native/icons/heart';
import MapPin from 'lucide-react-native/icons/map-pin';
import Star from 'lucide-react-native/icons/star';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

type SearchResultCardProps = {
  experience: Experience;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onPress: (experience: Experience) => void;
};

/**
 * Full-width result card for Search's vertical list (Sprint 6 brief §7): same content/iconography as
 * Home's `ExperienceCard` (image, rating, distance, price, location, favorite), but stretched to the
 * list's own width instead of `ExperienceCard`'s fixed `CARD_WIDTH` — that width is tuned for a
 * horizontal carousel, not a single-column `FlatList`, so a full new card was needed here rather than
 * reusing it directly.
 */
export function SearchResultCard({
  experience,
  isFavorite,
  onToggleFavorite,
  onPress,
}: SearchResultCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={experience.title}
      onPress={() => onPress(experience)}
      className="overflow-hidden rounded-card border border-border bg-surface active:opacity-90"
    >
      <View style={{ height: 180 }} className="bg-surfaceElevated">
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

        <View className="absolute right-2 top-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? t('home.favoriteRemove') : t('home.favoriteAdd')}
            accessibilityState={{ selected: isFavorite }}
            hitSlop={6}
            onPress={() => onToggleFavorite(experience.id)}
            className="h-9 w-9 items-center justify-center rounded-pill bg-surface/90 active:opacity-80"
          >
            <Heart
              size={16}
              strokeWidth={1.8}
              color={isFavorite ? colors.error : colors.text}
              fill={isFavorite ? colors.error : 'transparent'}
            />
          </Pressable>
        </View>
      </View>

      <View className="gap-2 p-4">
        <Text variant="h4" numberOfLines={1}>
          {experience.title}
        </Text>
        <Text variant="small" tone="secondary" numberOfLines={2}>
          {experience.description}
        </Text>

        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          {experience.rating ? (
            <View className="flex-row items-center gap-1">
              <Star size={13} strokeWidth={1.5} color={colors.warning} fill={colors.warning} />
              <Text variant="caption" className="font-bodyMedium">
                {experience.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
          {experience.distanceLabel ? (
            <View className="flex-row items-center gap-1">
              <MapPin size={13} strokeWidth={1.8} color={colors.textSecondary} />
              <Text variant="caption" tone="secondary">
                {experience.distanceLabel}
              </Text>
            </View>
          ) : null}
          {experience.priceLabel ? (
            <Text variant="caption" tone="secondary">
              {experience.priceLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
