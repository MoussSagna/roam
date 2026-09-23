import { Image } from 'expo-image';
import Star from 'lucide-react-native/icons/star';
import X from 'lucide-react-native/icons/x';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

type ExperienceMapCardProps = {
  experience: Experience;
  onPressView: (experience: Experience) => void;
  onClose: () => void;
};

/**
 * Bottom card shown over a map once a pin is selected (image, rating, distance, "Voir" CTA). Shared by
 * `ExperienceMapView` (Search's illustrated map) and `MapScreen` (real map) so the selection UI
 * doesn't fork between the two while the illustrated map is still being phased out (D-70).
 */
export function ExperienceMapCard({ experience, onPressView, onClose }: ExperienceMapCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="experience-map-card"
      className="absolute left-3 right-3 flex-row items-center gap-3 rounded-large border border-border bg-surface p-3"
      style={{ bottom: insets.bottom + 12 }}
    >
      <View
        style={{ width: 56, height: 56 }}
        className="overflow-hidden rounded-medium bg-surfaceElevated"
      >
        {experience.coverImage ? (
          <Image
            source={experience.coverImage}
            style={{ flex: 1 }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>

      <View className="flex-1 gap-0.5">
        <Text variant="body" numberOfLines={1} className="font-bodyMedium">
          {experience.title}
        </Text>
        <View className="flex-row items-center gap-1">
          {experience.rating ? (
            <>
              <Star size={12} strokeWidth={1.5} color={colors.warning} fill={colors.warning} />
              <Text variant="caption" tone="secondary">
                {experience.rating.toFixed(1)}
              </Text>
            </>
          ) : null}
          {experience.distanceLabel ? (
            <Text variant="caption" tone="secondary">
              {experience.rating ? `· ${experience.distanceLabel}` : experience.distanceLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <Button
        label={t('map.viewPlace')}
        variant="primary"
        onPress={() => onPressView(experience)}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={onClose}
        hitSlop={8}
      >
        <X size={16} strokeWidth={1.8} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}
