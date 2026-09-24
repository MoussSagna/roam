import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, HorizontalCarousel, Text } from '@/components/ui';
import { CARD_WIDTH, ExperienceCard } from '@/features/home/components/ExperienceCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import type { Experience } from '@/types';

const SPACING = 16;

type SearchEmptyStateProps = {
  onExpandArea: () => void;
  onClearFilters: () => void;
  onSeeTrending: () => void;
  fallbackExperiences: readonly Experience[];
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  onPressExperience: (experience: Experience) => void;
};

/**
 * "Aucun résultat" (Sprint 6 brief §11): never a dead end — the three relax-a-constraint actions
 * mirror `07_DATA_AND_RECOMMENDATION.md`'s "No perfect match" guidance (relax distance / relax a
 * filter / fall back to trending), then a "Peut-être que ça te plaira" carousel so the screen never
 * ends on empty space.
 */
export function SearchEmptyState({
  onExpandArea,
  onClearFilters,
  onSeeTrending,
  fallbackExperiences,
  favoriteIds,
  onToggleFavorite,
  onPressExperience,
}: SearchEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-6 pt-4" testID="search-empty-state">
      <View className="gap-2">
        <Text variant="h4">{t('search.empty.title')}</Text>
        <Text variant="body" tone="secondary">
          {t('search.empty.description')}
        </Text>
      </View>

      <View className="gap-3">
        <Button label={t('search.empty.expandArea')} variant="secondary" onPress={onExpandArea} />
        <Button label={t('search.empty.clearFilters')} variant="secondary" onPress={onClearFilters} />
        <Button label={t('search.empty.seeTrending')} variant="secondary" onPress={onSeeTrending} />
      </View>

      {fallbackExperiences.length > 0 ? (
        <View className="gap-3">
          <SectionHeader title={t('search.empty.fallbackTitle')} />
          <HorizontalCarousel
            data={fallbackExperiences}
            keyExtractor={(experience) => experience.id}
            itemWidth={CARD_WIDTH}
            spacing={SPACING}
            renderItem={({ item }) => (
              <ExperienceCard
                experience={item}
                isFavorite={favoriteIds.has(item.id)}
                onToggleFavorite={onToggleFavorite}
                onPress={onPressExperience}
              />
            )}
          />
        </View>
      ) : null}
    </View>
  );
}
