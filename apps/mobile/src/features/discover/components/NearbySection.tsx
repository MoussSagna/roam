import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HorizontalCarousel } from '@/components/ui';
import { CARD_WIDTH, ExperienceCard } from '@/features/home/components/ExperienceCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import type { Experience } from '@/types';

type NearbySectionProps = {
  experiences: readonly Experience[];
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  onPress: (experience: Experience) => void;
  onSeeMap: () => void;
};

const SPACING = 16;

/** "Près de toi" (Discover, sprint 6 §"Section 4"): reuses Home's `ExperienceCard` — same shape the
 * brief asks for (image, category/type, distance, rating) and the same "one card, several sections"
 * precedent as `SimilarExperiencesSection`. "Voir la carte" leads to the (placeholder) Map screen.
 * Full-bleed + snap (`HorizontalCarousel`): reuses `ExperienceCard`'s own `CARD_WIDTH`. */
export function NearbySection({
  experiences,
  favoriteIds,
  onToggleFavorite,
  onPress,
  onSeeMap,
}: NearbySectionProps) {
  const { t } = useTranslation();

  if (experiences.length === 0) {
    return null;
  }

  return (
    <View className="gap-3" testID="discover-section-nearby">
      <SectionHeader
        title={t('discover.sections.nearby')}
        onSeeAll={onSeeMap}
        seeAllLabel={t('discover.sections.seeMap')}
      />
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
