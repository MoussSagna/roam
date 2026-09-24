import { Image } from 'expo-image';
import Search from 'lucide-react-native/icons/search';
import Star from 'lucide-react-native/icons/star';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { useTheme } from '@/theme';
import type { Experience, SearchSuggestion } from '@/types';

type SearchSuggestionsListProps = {
  suggestions: readonly SearchSuggestion[];
  experiences: readonly Experience[];
  onSelectQuery: (query: string) => void;
  onSelectExperience: (experience: Experience) => void;
};

/**
 * Live suggestions while typing (Sprint 6 brief §5): plain-text query suggestions first, then up to a
 * few matching experiences — capped by the repository itself (`services/mock/search.ts`), so this
 * never has to trim the list down further. Experience rows resolve `SearchSuggestion.experienceId`
 * against the already-loaded pool (`useHomeExperiences`, shared with Home/Discover) rather than
 * fetching each one individually.
 */
export function SearchSuggestionsList({
  suggestions,
  experiences,
  onSelectQuery,
  onSelectExperience,
}: SearchSuggestionsListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const querySuggestions = suggestions.filter((suggestion) => suggestion.type === 'query');
  const experienceSuggestions = suggestions
    .filter((suggestion) => suggestion.type === 'experience')
    .map((suggestion) => experiences.find((experience) => experience.id === suggestion.experienceId))
    .filter((experience): experience is Experience => !!experience);

  if (querySuggestions.length === 0 && experienceSuggestions.length === 0) {
    return null;
  }

  return (
    <View className="gap-5" testID="search-section-suggestions">
      {querySuggestions.length > 0 ? (
        <View className="gap-1" testID="search-suggestions-queries">
          <SectionHeader title={t('search.suggestions.title')} />
          {querySuggestions.map((suggestion) => (
            <Pressable
              key={suggestion.id}
              accessibilityRole="button"
              accessibilityLabel={suggestion.label}
              onPress={() => onSelectQuery(suggestion.label)}
              className="flex-row items-center gap-3 py-2"
            >
              <Search size={16} strokeWidth={1.8} color={colors.textSecondary} />
              <Text variant="body">{suggestion.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {experienceSuggestions.length > 0 ? (
        <View className="gap-1" testID="search-suggestions-experiences">
          <SectionHeader title={t('search.suggestions.experiencesTitle')} />
          {experienceSuggestions.map((experience) => (
            <Pressable
              key={experience.id}
              accessibilityRole="button"
              accessibilityLabel={experience.title}
              onPress={() => onSelectExperience(experience)}
              className="flex-row items-center gap-3 py-2"
            >
              <View
                style={{ width: 48, height: 48 }}
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
                <Text variant="body" numberOfLines={1}>
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
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
