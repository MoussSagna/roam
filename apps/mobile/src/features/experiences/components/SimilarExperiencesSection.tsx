import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ExperienceCard } from '@/features/home/components/ExperienceCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import type { Experience } from '@/types';

type SimilarExperiencesSectionProps = {
  experiences: readonly Experience[];
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  onPress: (experience: Experience) => void;
};

/** "Suggestions similaires" (sprint 5 §23): reuses Home's `ExperienceCard` rather than a near-duplicate
 * card, same shape as `07_DATA_AND_RECOMMENDATION.md`'s "structured alternatives" idea. */
export function SimilarExperiencesSection({
  experiences,
  favoriteIds,
  onToggleFavorite,
  onPress,
}: SimilarExperiencesSectionProps) {
  const { t } = useTranslation();

  if (experiences.length === 0) {
    return null;
  }

  return (
    <View className="gap-3">
      <SectionHeader title={t('experience.similar')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingRight: 24 }}
      >
        {experiences.map((experience) => (
          <ExperienceCard
            key={experience.id}
            experience={experience}
            isFavorite={favoriteIds.has(experience.id)}
            onToggleFavorite={onToggleFavorite}
            onPress={onPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}
