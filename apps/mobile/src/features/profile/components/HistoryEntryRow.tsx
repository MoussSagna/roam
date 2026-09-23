import { Image } from 'expo-image';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

const THUMBNAIL_SIZE = 72;

type HistoryEntryRowProps = {
  experience: Experience;
  categoryLabel: string | null;
  onPress: (experience: Experience) => void;
};

/**
 * One row of "Mon historique": thumbnail, title, "category · location", the visit date, and a
 * trailing chevron — same shape as `FavoriteExperienceRow` minus the heart (history has no removal
 * interaction, `03_UX_SCREENS_AND_FLOWS.md` §17 only asks to "show completed experiences").
 */
export function HistoryEntryRow({ experience, categoryLabel, onPress }: HistoryEntryRowProps) {
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
        {experience.visitedAt ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {experience.visitedAt}
          </Text>
        ) : null}
      </View>

      <ChevronRight size={20} strokeWidth={1.8} color={colors.textSecondary} />
    </Pressable>
  );
}
