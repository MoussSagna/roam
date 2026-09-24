import { Image } from 'expo-image';
import Clock from 'lucide-react-native/icons/clock';
import Heart from 'lucide-react-native/icons/heart';
import MapPin from 'lucide-react-native/icons/map-pin';
import Star from 'lucide-react-native/icons/star';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

/** Exported so a carousel rendering this card (Home, and Discover's `NearbySection`/`TrendingSection`)
 * can compute its own `snapToInterval` from the exact same width — no separate hardcoded copy. */
export const CARD_WIDTH = 260;

type ExperienceCardProps = {
  experience: Experience;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onPress: (experience: Experience) => void;
};

/**
 * Reusable discovery card (Home "Les expériences les plus populaires" and "Des idées pour toi") —
 * one component for both sections rather than near-duplicates (sprint 5 brief §19).
 */
export function ExperienceCard({
  experience,
  isFavorite,
  onToggleFavorite,
  onPress,
}: ExperienceCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={experience.title}
      onPress={() => onPress(experience)}
      style={{ width: CARD_WIDTH }}
      className="overflow-hidden rounded-card border border-border bg-surface active:opacity-90"
    >
      <View style={{ height: 160 }} className="bg-surfaceElevated">
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

        {experience.isPopular ? (
          <View className="absolute left-3 top-3 flex-row items-center gap-1 rounded-pill bg-primary/90 px-2.5 py-1">
            <TrendingUp size={12} strokeWidth={2} color={colors.primaryForeground} />
            <Text variant="caption" tone="onPrimary">
              {t('home.badges.popular')}
            </Text>
          </View>
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
          {experience.durationLabel ? (
            <View className="flex-row items-center gap-1">
              <Clock size={13} strokeWidth={1.8} color={colors.textSecondary} />
              <Text variant="caption" tone="secondary">
                {experience.durationLabel}
              </Text>
            </View>
          ) : null}
          {experience.priceLabel ? (
            <Text variant="caption" tone="secondary">
              {experience.priceLabel}
            </Text>
          ) : null}
          {experience.location ? (
            <View className="flex-row items-center gap-1">
              <MapPin size={13} strokeWidth={1.8} color={colors.textSecondary} />
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {experience.location}
              </Text>
            </View>
          ) : null}
        </View>

        {experience.rating ? (
          <View className="flex-row items-center gap-1 pt-1">
            <Star size={13} strokeWidth={1.5} color={colors.warning} fill={colors.warning} />
            <Text variant="caption" className="font-bodyMedium">
              {experience.rating.toFixed(1)}
            </Text>
            {experience.reviewCount ? (
              <Text variant="caption" tone="secondary">
                {t('home.reviewCount', { count: experience.reviewCount })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
