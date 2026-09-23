import { useRouter } from 'expo-router';
import Heart from 'lucide-react-native/icons/heart';
import Settings from 'lucide-react-native/icons/settings';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Chip,
  FadeInUp,
  IconButton,
  STICKY_REVEAL_HEADER_HEIGHT,
  ScrollScreen,
  StickyRevealHeader,
} from '@/components/ui';
import { getCategoryLabel } from '@/features/experiences/lib/categoryLabel';
import { TAB_BAR_CLEARANCE } from '@/features/navigation/tabBarConfig';
import { useTabBarScrollHandler } from '@/features/navigation/TabBarCollapseContext';
import { useCategories } from '@/hooks/useCategories';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

import { ActiveJourneyCard } from './components/ActiveJourneyCard';
import { ActivitySummaryCard } from './components/ActivitySummaryCard';
import { ExperiencePreviewCard } from './components/ExperiencePreviewCard';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileStats } from './components/ProfileStats';
import { SectionHeader } from '../home/components/SectionHeader';
import { AMBIANCE_OPTIONS, DEFAULT_AMBIANCE } from './data/ambianceOptions';
import { DEFAULT_EXPERIENCE_TYPES, EXPERIENCE_TYPES } from './data/experienceTypes';
import { useActiveJourney } from './useActiveJourney';
import { useCurrentUser } from './useCurrentUser';
import { useFavoriteExperiences } from './useFavoriteExperiences';
import { useHistoryExperiences } from './useHistoryExperiences';

const DEFAULT_STATS = { outings: 0, placesDiscovered: 0, favorites: 0 };
const PREVIEW_COUNT = 3;
const PREVIEW_GAP = 12;
/** `ScrollScreen`'s own horizontal padding (`px-6` = 24px each side). */
const SCREEN_HORIZONTAL_PADDING = 48;
/** Roughly the height of the in-content title below — same "proxy, not a pixel-exact measurement"
 * approach as every other profile sub-screen's own `revealOffset` (`docs/DECISIONS.md`). */
const HEADER_REVEAL_OFFSET = 70;

/**
 * Real profile screen (sprint 5, "Profile / Settings" refactor): identity, activity and taste —
 * "qui je suis, ce que j'aime et ce que je fais sur ROAM" — not a settings list. Everything that was
 * account/app configuration (préférences/langue/thème/aide/confidentialité/déconnexion) moved to
 * `SettingsScreen` (`/profile/settings`, reached from the gear icon); `docs/DECISIONS.md`. Header is a
 * `StickyRevealHeader` (same restructure as every other profile sub-screen, D-56/D-63): the in-content
 * `h2` stands in for the title until the floating header's own title crossfades in; the settings gear
 * moved into its `rightSlot`.
 */
export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarOnScroll = useTabBarScrollHandler();
  const scrollY = useSharedValue(0);
  const { user } = useCurrentUser();
  const { journey, isLoading: journeyLoading } = useActiveJourney();
  const { favorites } = useFavoriteExperiences();
  const { history } = useHistoryExperiences();
  const categories = useCategories();

  const { width: windowWidth } = useWindowDimensions();
  const previewWidth =
    (windowWidth - SCREEN_HORIZONTAL_PADDING - PREVIEW_GAP * (PREVIEW_COUNT - 1)) / PREVIEW_COUNT;

  const categoryLabelFor = useCallback(
    (experience: Experience) => {
      const category = categories.find((item) => experience.categoryIds.includes(item.id));
      return category ? getCategoryLabel(t, category.slug) : null;
    },
    [categories, t],
  );

  const goToExperience = useCallback(
    (experience: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
    },
    [router],
  );

  // Not `useCallback`, same reason as every other screen's own `handleScroll`: mutating a shared
  // value from inside a memoized callback trips this project's ref-immutability lint rule.
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.value = event.nativeEvent.contentOffset.y;
    tabBarOnScroll(event);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollScreen
        testID="profile-scroll"
        onScroll={handleScroll}
        contentContainerStyle={{
          // `ScrollScreen`'s own `SafeAreaView` already offsets content by `insets.top`; only the
          // floating header's own height needs adding on top of that.
          paddingTop: STICKY_REVEAL_HEADER_HEIGHT + 16,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          gap: 28,
        }}
      >
        {user ? (
          <>
            <FadeInUp>
              <View className="gap-6">
                <ProfileHeader user={user} onEditProfile={() => router.push('/profile/edit')} />
                <ProfileStats stats={user.stats ?? DEFAULT_STATS} />
              </View>
            </FadeInUp>

            {!journeyLoading ? (
              <ActiveJourneyCard
                journey={journey}
                onContinue={() => router.push('/itinerary/create')}
                onDiscover={() => router.push('/discover')}
              />
            ) : null}

            <View className="gap-3">
              <SectionHeader
                title={t('profile.likes.title')}
                onSeeAll={() => router.push('/profile/preferences')}
                seeAllLabel={t('profile.likes.edit')}
              />
              <View className="flex-row flex-wrap gap-2">
                {EXPERIENCE_TYPES.filter((item) => DEFAULT_EXPERIENCE_TYPES.includes(item.id)).map(
                  (item) => (
                    <Chip
                      key={item.id}
                      label={t(item.key)}
                      icon={<item.icon size={14} strokeWidth={1.8} color={colors.text} />}
                    />
                  ),
                )}
                {AMBIANCE_OPTIONS.filter((item) => DEFAULT_AMBIANCE.includes(item.id)).map(
                  (item) => (
                    <Chip
                      key={item.id}
                      label={t(item.key)}
                      icon={<item.icon size={14} strokeWidth={1.8} color={colors.text} />}
                    />
                  ),
                )}
              </View>
            </View>

            {favorites.length > 0 ? (
              <View className="gap-3">
                <SectionHeader
                  title={t('profile.favorites')}
                  onSeeAll={() => router.push('/profile/favorites')}
                />
                <View className="flex-row" style={{ gap: PREVIEW_GAP }}>
                  {favorites.slice(0, PREVIEW_COUNT).map((experience) => (
                    <ExperiencePreviewCard
                      key={experience.id}
                      experience={experience}
                      subtitle={[categoryLabelFor(experience), experience.location]
                        .filter(Boolean)
                        .join(' · ')}
                      width={previewWidth}
                      onPress={goToExperience}
                      badge={
                        <View className="h-6 w-6 items-center justify-center rounded-pill bg-surface/90">
                          <Heart
                            size={12}
                            strokeWidth={1.8}
                            color={colors.error}
                            fill={colors.error}
                          />
                        </View>
                      }
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {history.length > 0 ? (
              <View className="gap-3">
                <SectionHeader
                  title={t('profile.history')}
                  onSeeAll={() => router.push('/profile/history')}
                />
                <View className="flex-row" style={{ gap: PREVIEW_GAP }}>
                  {history.slice(0, PREVIEW_COUNT).map((experience) => (
                    <ExperiencePreviewCard
                      key={experience.id}
                      experience={experience}
                      subtitle={[experience.visitedAt, experience.location]
                        .filter(Boolean)
                        .join(' · ')}
                      width={previewWidth}
                      onPress={goToExperience}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <ActivitySummaryCard
              outings={user.stats?.outings ?? DEFAULT_STATS.outings}
              placesDiscovered={user.stats?.placesDiscovered ?? DEFAULT_STATS.placesDiscovered}
              onPress={() => router.push('/profile/statistics')}
            />
          </>
        ) : null}
      </ScrollScreen>

      <StickyRevealHeader
        title={t('profile.title')}
        scrollY={scrollY}
        revealOffset={HEADER_REVEAL_OFFSET}
        rightSlot={
          <IconButton
            icon={Settings}
            accessibilityLabel={t('profile.settings')}
            onPress={() => router.push('/profile/settings')}
          />
        }
      />
    </View>
  );
}
