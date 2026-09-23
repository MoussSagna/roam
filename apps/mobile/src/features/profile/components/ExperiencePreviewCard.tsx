import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import type { Experience } from '@/types';

const IMAGE_HEIGHT = 96;

type ExperiencePreviewCardProps = {
  experience: Experience;
  subtitle: string;
  /** Decorative overlay in the top-right corner — the favorites preview's heart badge; omitted for
   * the history preview, which has nothing to show there. */
  badge?: ReactNode;
  width: number;
  onPress: (experience: Experience) => void;
};

/**
 * Compact preview card for Profile's "Mes favoris"/"Mes dernières sorties" 3-up rows — smaller and
 * denser than Home's `ExperienceCard` (a fixed 260px horizontal-scroll card, the wrong shape for a
 * fixed 3-column grid), so a new small component instead of forcing that one's proportions.
 */
export function ExperiencePreviewCard({
  experience,
  subtitle,
  badge,
  width,
  onPress,
}: ExperiencePreviewCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={experience.title}
      onPress={() => onPress(experience)}
      style={{ width }}
      className="gap-1.5 active:opacity-80"
    >
      <View
        style={{ height: IMAGE_HEIGHT }}
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
        {badge ? <View className="absolute right-1.5 top-1.5">{badge}</View> : null}
      </View>

      <Text variant="small" className="font-bodyMedium" numberOfLines={1}>
        {experience.title}
      </Text>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {subtitle}
      </Text>
    </Pressable>
  );
}
