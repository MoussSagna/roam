import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HorizontalCarousel } from '@/components/ui';
import { CARD_WIDTH, ExperienceCard } from '@/features/home/components/ExperienceCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import type { Experience } from '@/types';

type TrendingSectionProps = {
  experiences: readonly Experience[];
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  onPress: (experience: Experience) => void;
};

const SPACING = 16;

/** "Ce qui fait envie en ce moment" (Discover, sprint 6 §"Section 5"): reuses Home's `ExperienceCard`,
 * ranked by `pickTrending` (highest rated first). Full-bleed + snap (`HorizontalCarousel`): reuses
 * `ExperienceCard`'s own `CARD_WIDTH`. */
export function TrendingSection({
  experiences,
  favoriteIds,
  onToggleFavorite,
  onPress,
}: TrendingSectionProps) {
  const { t } = useTranslation();

  if (experiences.length === 0) {
    return null;
  }

  return (
    <View className="gap-3" testID="discover-section-trending">
      <SectionHeader title={t('discover.sections.trending')} />
      <HorizontalCarousel
        data={experiences}
        keyExtractor={(experience) => experience.id}
        itemWidth={CARD_WIDTH}
        spacing={SPACING}
        renderItem={({ item }) => (
          <ExperienceCard
            experience={item}
            isFavorite={favoriteIds.has(item.id)}
            onToggleFavorite={onToggleFavorite}
            onPress={onPress}
          />
        )}
      />
    </View>
  );
}
