import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, SearchBar, Text } from '@/components/ui';
import { useTabBarScrollHandler } from '@/features/navigation/TabBarCollapseContext';
import { TAB_BAR_CLEARANCE } from '@/features/navigation/tabBarConfig';
import { useTheme } from '@/theme';
import type { Experience, Mood } from '@/types';

import { ExperienceCard } from './components/ExperienceCard';
import { HeroCarousel } from './components/HeroCarousel';
import { NearbyCard } from './components/NearbyCard';
import { SectionHeader } from './components/SectionHeader';
import { HOME_MOODS } from './data/moods';
import { NEARBY_CATEGORIES } from './data/nearbyCategories';
import { pickForYou } from './lib/pickForYou';
import { useFavoriteExperienceIds } from './useFavoriteExperienceIds';
import { useHomeExperiences } from './useHomeExperiences';

const DEFAULT_MOOD: Mood = 'calm';

/**
 * Home / Accueil (sprint 5): an immersive discovery page — hero carousel, mood chips, and three
 * horizontally-scrolling sections — built on the mock experience pool (`useHomeExperiences`), not the
 * sprint 3 placeholder it replaces. See `docs/DECISIONS.md` D-45.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const onScroll = useTabBarScrollHandler();

  const { experiences, isLoading } = useHomeExperiences();
  const { favoriteIds, toggleFavorite } = useFavoriteExperienceIds(experiences);
  const [selectedMood, setSelectedMood] = useState<Mood>(DEFAULT_MOOD);

  const heroExperiences = useMemo(
    () => experiences.filter((experience) => experience.isHero),
    [experiences],
  );
  const popularExperiences = useMemo(
    () => experiences.filter((experience) => experience.isPopular),
    [experiences],
  );
  const forYouExperiences = useMemo(
    () => pickForYou(experiences, selectedMood),
    [experiences, selectedMood],
  );

  const goToExperience = useCallback(
    (experience: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
    },
    [router],
  );

  const goToDiscover = useCallback(() => {
    router.push('/discover');
  }, [router]);

  const goToNearbyCategory = useCallback(() => {
    router.push('/discover');
  }, [router]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text variant="body" tone="secondary">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <ScrollView
        testID="home-scroll"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      >
        <HeroCarousel
          experiences={heroExperiences}
          onPressExperience={goToExperience}
          onPressNotifications={() => {}}
          topInset={insets.top}
        />

        <View className="gap-8 px-6 pt-6">
          <SearchBar
            placeholder={t('home.search.placeholder')}
            filterLabel={t('home.search.filters')}
          />

          <View className="gap-3" testID="home-section-moods">
            <SectionHeader title={t('home.sections.moods')} onSeeAll={goToDiscover} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 24 }}
            >
              {HOME_MOODS.map((mood) => {
                const isSelected = mood.id === selectedMood;
                return (
                  <Chip
                    key={mood.id}
                    label={t(mood.labelKey)}
                    selected={isSelected}
                    onPress={() => setSelectedMood(mood.id)}
                    icon={
                      <mood.icon
                        size={14}
                        strokeWidth={1.8}
                        color={isSelected ? colors.primaryForeground : colors.text}
                      />
                    }
                  />
                );
              })}
            </ScrollView>
          </View>

          <View className="gap-3" testID="home-section-popular">
            <SectionHeader title={t('home.sections.popular')} onSeeAll={goToDiscover} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingRight: 24 }}
            >
              {popularExperiences.map((experience) => (
                <ExperienceCard
                  key={experience.id}
                  experience={experience}
                  isFavorite={favoriteIds.has(experience.id)}
                  onToggleFavorite={toggleFavorite}
                  onPress={goToExperience}
                />
              ))}
            </ScrollView>
          </View>

          <View className="gap-3" testID="home-section-nearby">
            <SectionHeader title={t('home.sections.nearby')} onSeeAll={goToDiscover} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 18, paddingRight: 24 }}
            >
              {NEARBY_CATEGORIES.map((category) => (
                <NearbyCard key={category.id} category={category} onPress={goToNearbyCategory} />
              ))}
            </ScrollView>
          </View>

          <View className="gap-3" testID="home-section-forYou">
            <SectionHeader title={t('home.sections.forYou')} onSeeAll={goToDiscover} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingRight: 24 }}
            >
              {forYouExperiences.map((experience) => (
                <ExperienceCard
                  key={experience.id}
                  experience={experience}
                  isFavorite={favoriteIds.has(experience.id)}
                  onToggleFavorite={toggleFavorite}
                  onPress={goToExperience}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
