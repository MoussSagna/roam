import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, HorizontalCarousel, SearchBar, Text } from '@/components/ui';
import { useTabBarScrollHandler } from '@/features/navigation/TabBarCollapseContext';
import { TAB_BAR_CLEARANCE } from '@/features/navigation/tabBarConfig';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { errorMessageKey } from '@/services';
import { useTheme } from '@/theme';
import type { Experience, Mood } from '@/types';

import { CARD_WIDTH, ExperienceCard } from './components/ExperienceCard';
import { ExperienceCarouselLoading } from './components/ExperienceCarouselLoading';
import { HeroCarousel } from './components/HeroCarousel';
import { HeroSkeleton } from './components/HeroSkeleton';
import { HEADER_HEIGHT, HomeHeader } from './components/HomeHeader';
import { NEARBY_CARD_WIDTH, NearbyCard } from './components/NearbyCard';
import { SectionHeader } from './components/SectionHeader';
import { HOME_MOODS } from './data/moods';
import { NEARBY_CATEGORIES } from './data/nearbyCategories';
import { getHeroHeight } from './lib/heroHeight';
import { pickHeroExperiences, pickPopularExperiences } from './lib/pickFeatured';
import { useFavoriteExperienceIds } from './useFavoriteExperienceIds';
import { useForYouRecommendations } from './useForYouRecommendations';
import { useHomeExperiences } from './useHomeExperiences';

const DEFAULT_MOOD: Mood = 'calm';

/** Gaps of the horizontal lists (unchanged from the ScrollViews they replace); the card lists snap on
 * `CARD_WIDTH + CARD_SPACING`, the nearby tiles on `NEARBY_CARD_WIDTH + NEARBY_SPACING`. */
const MOOD_SPACING = 10;
const CARD_SPACING = 16;
const NEARBY_SPACING = 18;

/** How far (px) of overscroll counts as a "full" pull-to-stretch. */
const HERO_OVERSCROLL_RANGE = 120;
/** Peak scale of the Hero image at `HERO_OVERSCROLL_RANGE` — kept subtle on purpose. */
const HERO_MAX_SCALE = 1.15;

/**
 * Home / Accueil (sprint 5): an immersive discovery page — hero carousel, mood chips, and three
 * horizontally-scrolling sections — built on the mock experience pool (`useHomeExperiences`), not the
 * sprint 3 placeholder it replaces. See `docs/DECISIONS.md` D-45.
 *
 * Sticky search (sprint 6, D-69): the in-flow `SearchBar` below the Hero is untouched; `HomeHeader`
 * also renders the *same* `SearchBar` in its own `searchSlot`, revealed (`showSearch`) once scrolled
 * past the Hero — merged into the header's existing bell zone rather than a second, separate sticky
 * element, and riding along with its existing scroll-direction hide/show (`useScrollDirection`),
 * unchanged from before.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const tabBarOnScroll = useTabBarScrollHandler();
  const {
    visible: headerVisible,
    atTop: headerAtTop,
    handleScrollOffset: onHeaderScrollOffset,
  } = useScrollDirection();

  // Sticky search (sprint 6, D-69): the header's search row reveals once scrolled roughly past the
  // Hero — same "hero height minus header height" shape as Experience Detail's own `revealOffset`
  // (`features/experiences/lib/heroHeight.ts`), computed from Home's own Hero formula instead.
  const searchRevealOffset = Math.max(0, getHeroHeight(windowHeight) - HEADER_HEIGHT);
  const [searchDocked, setSearchDocked] = useState(false);

  // UI-thread value driving the Hero's pull-to-stretch (below); mutated directly from the plain JS
  // `onScroll` handler, like `ProfileOrbit`'s loader progress — this does not re-render `HomeScreen`
  // on every scroll tick, only the `useAnimatedStyle` consumer below (sprint 4 polish §5).
  const scrollY = useSharedValue(0);

  // Not `useCallback`: mutating a shared value's `.value` inside a memoized callback trips the
  // `react-hooks/immutability` rule (it can't know Reanimated's shared values are meant to be
  // mutated this way, the same pattern `ProfileOrbit` uses from a plain `useEffect`). A fresh
  // function per render is harmless here — `ScrollView.onScroll` isn't a memoization-sensitive prop.
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.value = offsetY;
    tabBarOnScroll(event);
    onHeaderScrollOffset(offsetY);
    setSearchDocked((current) => {
      const next = offsetY > searchRevealOffset;
      return current === next ? current : next;
    });
  };

  const heroAnimatedStyle = useAnimatedStyle(() => {
    const pull = Math.min(scrollY.value, 0);
    return {
      transform: [
        {
          translateY: interpolate(
            pull,
            [-HERO_OVERSCROLL_RANGE, 0],
            [-HERO_OVERSCROLL_RANGE / 2, 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            pull,
            [-HERO_OVERSCROLL_RANGE, 0],
            [HERO_MAX_SCALE, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const { experiences, isLoading, error, retry } = useHomeExperiences();
  const { favoriteIds, toggleFavorite } = useFavoriteExperienceIds(experiences);
  const [selectedMood, setSelectedMood] = useState<Mood>(DEFAULT_MOOD);

  const heroExperiences = useMemo(() => pickHeroExperiences(experiences), [experiences]);
  const popularExperiences = useMemo(() => pickPopularExperiences(experiences), [experiences]);
  const forYou = useForYouRecommendations(selectedMood);

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

  const goToSearch = useCallback(() => {
    router.push({ pathname: '/search', params: { context: 'home' } });
  }, [router]);

  const goToSearchFilters = useCallback(() => {
    router.push({ pathname: '/search', params: { context: 'home', openFilters: '1' } });
  }, [router]);

  // The page shows progressively: what does not need the experiences (mood chips, nearby tiles) at once,
  // skeletons where the experiences will be. Only a failed load of the experiences replaces the page.
  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text variant="body" tone="secondary" className="text-center">
          {t(errorMessageKey(error))}
        </Text>
        <Button label={t('common.retry')} onPress={retry} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <ScrollView
        testID="home-scroll"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      >
        <Animated.View style={heroAnimatedStyle}>
          {isLoading ? (
            <HeroSkeleton />
          ) : (
            <HeroCarousel
              experiences={heroExperiences}
              onPressExperience={goToExperience}
              topInset={insets.top}
            />
          )}
        </Animated.View>

        <View className="gap-8 px-6 pt-6">
          <SearchBar
            placeholder={t('home.search.placeholder')}
            filterLabel={t('home.search.filters')}
            onPress={goToSearch}
            onPressFilter={goToSearchFilters}
          />

          <View className="gap-3" testID="home-section-moods">
            <SectionHeader title={t('home.sections.moods')} onSeeAll={goToDiscover} />
            {/* Chips of varying widths: a full-bleed list without snap. */}
            <HorizontalCarousel
              testID="home-moods-list"
              data={HOME_MOODS}
              keyExtractor={(mood) => mood.id}
              extraData={selectedMood}
              spacing={MOOD_SPACING}
              snapEnabled={false}
              renderItem={({ item: mood }) => {
                const isSelected = mood.id === selectedMood;
                return (
                  <Chip
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
              }}
            />
          </View>

          <View className="gap-3" testID="home-section-popular">
            <SectionHeader title={t('home.sections.popular')} onSeeAll={goToDiscover} />
            {isLoading ? (
              <ExperienceCarouselLoading spacing={CARD_SPACING} testID="home-popular-loading" />
            ) : (
              <HorizontalCarousel
                testID="home-popular-list"
                data={popularExperiences}
                keyExtractor={(experience) => experience.id}
                extraData={favoriteIds}
                itemWidth={CARD_WIDTH}
                spacing={CARD_SPACING}
                renderItem={({ item: experience }) => (
                  <ExperienceCard
                    experience={experience}
                    isFavorite={favoriteIds.has(experience.id)}
                    onToggleFavorite={toggleFavorite}
                    onPress={goToExperience}
                  />
                )}
              />
            )}
          </View>

          <View className="gap-3" testID="home-section-nearby">
            <SectionHeader title={t('home.sections.nearby')} onSeeAll={goToDiscover} />
            <HorizontalCarousel
              testID="home-nearby-list"
              data={NEARBY_CATEGORIES}
              keyExtractor={(category) => category.id}
              itemWidth={NEARBY_CARD_WIDTH}
              spacing={NEARBY_SPACING}
              renderItem={({ item: category }) => (
                <NearbyCard category={category} onPress={goToNearbyCategory} />
              )}
            />
          </View>

          <View className="gap-3" testID="home-section-forYou">
            <SectionHeader title={t('home.sections.forYou')} onSeeAll={goToDiscover} />
            {forYou.error ? (
              <View className="items-start gap-3">
                <Text variant="body" tone="secondary">
                  {t(errorMessageKey(forYou.error))}
                </Text>
                <Button label={t('common.retry')} onPress={forYou.retry} />
              </View>
            ) : forYou.isLoading ? (
              <ExperienceCarouselLoading spacing={CARD_SPACING} testID="home-forYou-loading" />
            ) : forYou.experiences.length === 0 ? (
              <Text variant="body" tone="secondary">
                {t('home.forYouEmpty')}
              </Text>
            ) : (
              <HorizontalCarousel
                testID="home-forYou-list"
                data={forYou.experiences}
                keyExtractor={(experience) => experience.id}
                extraData={favoriteIds}
                itemWidth={CARD_WIDTH}
                spacing={CARD_SPACING}
                renderItem={({ item: experience }) => (
                  <ExperienceCard
                    experience={experience}
                    isFavorite={favoriteIds.has(experience.id)}
                    onToggleFavorite={toggleFavorite}
                    onPress={goToExperience}
                  />
                )}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <HomeHeader
        visible={headerVisible}
        atTop={headerAtTop}
        topInset={insets.top}
        onPressNotifications={() => {}}
        showSearch={searchDocked}
        searchSlot={
          <SearchBar
            placeholder={t('home.search.placeholder')}
            filterLabel={t('home.search.filters')}
            onPress={goToSearch}
            onPressFilter={goToSearchFilters}
          />
        }
      />
    </View>
  );
}
