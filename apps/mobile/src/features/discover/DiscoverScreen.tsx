import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScrollScreen, SearchBar, StickyRevealHeader, Text } from '@/components/ui';
import { useFavoriteExperienceIds } from '@/features/home/useFavoriteExperienceIds';
import { TAB_BAR_CLEARANCE } from '@/features/navigation/tabBarConfig';
import { useTabBarScrollHandler } from '@/features/navigation/TabBarCollapseContext';
import type { Collection, Experience } from '@/types';

import { CollectionsSection } from './components/CollectionsSection';
import { DiscoverTabs } from './components/DiscoverTabs';
import { ImmersiveExperienceCard } from './components/ImmersiveExperienceCard';
import { NearbySection } from './components/NearbySection';
import { RoamSelectionSection } from './components/RoamSelectionSection';
import { SuggestionsSection } from './components/SuggestionsSection';
import { TrendingSection } from './components/TrendingSection';
import type { DiscoverTabId } from './data/discoverTabs';
import type { SuggestionMood, SuggestionMoodId } from './data/suggestionMoods';
import { pickImmersiveExperience } from './lib/pickImmersiveExperience';
import { pickNearby } from './lib/pickNearby';
import { pickTrending } from './lib/pickTrending';
import { useDiscoverData } from './useDiscoverData';

type SectionId =
  'roamSelection' | 'suggestions' | 'immersive' | 'nearby' | 'trending' | 'collections';

/** Scroll offset (px) past which the sticky search bar is fully revealed — a round proxy value, same
 * "not measured, just a reasonable constant" convention as the profile sub-screens' own
 * `HEADER_REVEAL_OFFSET` (`docs/DECISIONS.md` D-49 lineage), sized a bit larger than their `70` for
 * Discover's taller two-line title block above the bar. */
const SEARCH_REVEAL_OFFSET = 120;

/**
 * Which sections a secondary-nav tab shows. "Pour toi" is the full editorial mix (the default, and
 * the only tab the sprint 6 mockup actually shows); the other three narrow the page down to the one
 * section they name, so the tabs do something rather than being purely cosmetic.
 */
const TAB_SECTIONS: Record<DiscoverTabId, readonly SectionId[]> = {
  forYou: ['roamSelection', 'suggestions', 'immersive', 'nearby', 'trending', 'collections'],
  trends: ['trending'],
  nearby: ['nearby'],
  collections: ['collections'],
};

/**
 * Discover / Découvrir (sprint 6): an immersive, editorial discovery page — not a social feed
 * (`03_UX_SCREENS_AND_FLOWS.md` sprint 6 brief: no profiles, followers, stories, comments or like
 * counts). Built on the mock experience/collection pools (`useDiscoverData`), replacing the sprint 3
 * placeholder. See `docs/DECISIONS.md` for this sprint's entry.
 *
 * The page title stays a plain in-flow heading (no floating title reveal, unlike Experience Detail or
 * Profile): Discover's own hero ("Sélection ROAM") is an inset card further down the page, not a
 * full-bleed photo at the very top. The search bar is different — it does get a floating sticky
 * instance (`StickyRevealHeader`'s `centerSlot`, sprint 6 "sticky search", D-69): the in-flow
 * `SearchBar` below is untouched, and a second one fades in past `SEARCH_REVEAL_OFFSET` once it has
 * scrolled out of the sticky zone.
 */
export function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onScroll = useTabBarScrollHandler();
  const scrollY = useSharedValue(0);

  const { experiences, collections, isLoading, isError } = useDiscoverData();
  const { favoriteIds, toggleFavorite } = useFavoriteExperienceIds(experiences);

  const [selectedTab, setSelectedTab] = useState<DiscoverTabId>('forYou');
  const [selectedMood, setSelectedMood] = useState<SuggestionMoodId | null>(null);

  const featuredCollections = useMemo(
    () => collections.filter((collection) => collection.isFeatured),
    [collections],
  );
  const exploreCollections = useMemo(
    () => collections.filter((collection) => !collection.isFeatured),
    [collections],
  );
  const nearbyExperiences = useMemo(() => pickNearby(experiences), [experiences]);
  const trendingExperiences = useMemo(() => pickTrending(experiences), [experiences]);
  const immersiveExperience = useMemo(() => pickImmersiveExperience(experiences), [experiences]);

  const goToExperience = useCallback(
    (experience: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
    },
    [router],
  );

  const goToCollection = useCallback(
    (collection: Collection) => {
      router.push({ pathname: '/collection/[id]', params: { id: collection.id } });
    },
    [router],
  );

  const goToMap = useCallback(() => {
    router.push('/map');
  }, [router]);

  const goToSearch = useCallback(() => {
    router.push({ pathname: '/search', params: { context: 'discover' } });
  }, [router]);

  const goToSearchFilters = useCallback(() => {
    router.push({ pathname: '/search', params: { context: 'discover', openFilters: '1' } });
  }, [router]);

  // Not `useCallback`: mutating a shared value's `.value` inside a memoized callback trips the
  // `react-hooks/immutability` rule (same reasoning as `HomeScreen`'s own `handleScroll`). A fresh
  // function per render is harmless here — `ScrollScreen.onScroll` isn't a memoization-sensitive prop.
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
    onScroll(event);
  };

  const handleSelectMood = useCallback((mood: SuggestionMood) => {
    setSelectedMood((current) => (current === mood.id ? null : mood.id));
  }, []);

  const visibleSections = useMemo(() => new Set(TAB_SECTIONS[selectedTab]), [selectedTab]);
  const isEmpty = !isLoading && !isError && experiences.length === 0 && collections.length === 0;

  return (
    <>
      <StickyRevealHeader
        centerSlot={
          <SearchBar
            placeholder={t('discover.search.placeholder')}
            filterLabel={t('discover.search.filters')}
            onPress={goToSearch}
            onPressFilter={goToSearchFilters}
          />
        }
        scrollY={scrollY}
        revealOffset={SEARCH_REVEAL_OFFSET}
      />

      <ScrollScreen
        testID="discover-scroll"
        onScroll={handleScroll}
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          gap: 24,
        }}
      >
        <View className="gap-1">
          <Text variant="h2" accessibilityRole="header">
            {t('discover.title')}
          </Text>
          <Text variant="body" tone="secondary">
            {t('discover.subtitle')}
          </Text>
        </View>

        <SearchBar
          placeholder={t('discover.search.placeholder')}
          filterLabel={t('discover.search.filters')}
          onPress={goToSearch}
          onPressFilter={goToSearchFilters}
        />

        <DiscoverTabs selected={selectedTab} onSelect={setSelectedTab} />

        {isLoading ? (
          <Text variant="body" tone="secondary">
            {t('common.loading')}
          </Text>
        ) : isError ? (
          <View className="gap-2">
            <Text variant="h4">{t('discover.error.title')}</Text>
            <Text variant="body" tone="secondary">
              {t('discover.error.description')}
            </Text>
          </View>
        ) : isEmpty ? (
          <View className="gap-2">
            <Text variant="h4">{t('discover.empty.title')}</Text>
            <Text variant="body" tone="secondary">
              {t('discover.empty.description')}
            </Text>
          </View>
        ) : (
          <>
            {visibleSections.has('roamSelection') ? (
              <RoamSelectionSection collections={featuredCollections} onPress={goToCollection} />
            ) : null}

            {visibleSections.has('suggestions') ? (
              <SuggestionsSection selected={selectedMood} onSelect={handleSelectMood} />
            ) : null}

            {visibleSections.has('immersive') && immersiveExperience ? (
              <ImmersiveExperienceCard experience={immersiveExperience} onPress={goToExperience} />
            ) : null}

            {visibleSections.has('nearby') ? (
              <NearbySection
                experiences={nearbyExperiences}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onPress={goToExperience}
                onSeeMap={goToMap}
              />
            ) : null}

            {visibleSections.has('trending') ? (
              <TrendingSection
                experiences={trendingExperiences}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onPress={goToExperience}
              />
            ) : null}

            {visibleSections.has('collections') ? (
              <CollectionsSection collections={exploreCollections} onPress={goToCollection} />
            ) : null}
          </>
        )}
      </ScrollScreen>
    </>
  );
}
