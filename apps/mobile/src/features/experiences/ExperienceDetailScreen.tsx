import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Clock from 'lucide-react-native/icons/clock';
import Euro from 'lucide-react-native/icons/euro';
import MapPin from 'lucide-react-native/icons/map-pin';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Star from 'lucide-react-native/icons/star';
import TrainFront from 'lucide-react-native/icons/train-front';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, STICKY_FOOTER_CLEARANCE, StickyActionFooter, Text } from '@/components/ui';
import { useFavoriteExperienceIds } from '@/features/home/useFavoriteExperienceIds';
import { useCategories } from '@/hooks/useCategories';
import { useCtaVisibility } from '@/hooks/useCtaVisibility';
import type { Experience, GalleryOpenRect } from '@/types';
import { useTheme } from '@/theme';

import { Badge } from './components/Badge';
import { ExperienceDetailHeader, HEADER_HEIGHT } from './components/ExperienceDetailHeader';
import { ExperienceHero } from './components/ExperienceHero';
import { HighlightsSection } from './components/HighlightsSection';
import { InfoGrid, type InfoItemData } from './components/InfoGrid';
import { MapPreviewRow } from './components/MapPreviewRow';
import { ReviewsSection } from './components/ReviewsSection';
import { SimilarExperiencesSection } from './components/SimilarExperiencesSection';
import { WhyRoamSection } from './components/WhyRoamSection';
import { getCategoryLabel } from './lib/categoryLabel';
import { getHeroHeight } from './lib/heroHeight';
import { getWhyRecommended } from './lib/whyRecommended';
import { useExperienceDetail } from './useExperienceDetail';

type ExperienceDetailScreenProps = {
  experienceId?: string;
};

/** Real experience detail screen (sprint 5), replacing `ExperienceDetailPlaceholder`'s body — the
 * route (`app/experience/[id].tsx`) is unchanged. Built on `Experience` fields extended for this
 * sprint (`docs/DECISIONS.md` D-48), not a second, parallel data model. */
export function ExperienceDetailScreen({ experienceId }: ExperienceDetailScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const categories = useCategories();

  const { experience, similarExperiences, isLoading } = useExperienceDetail(experienceId);
  const { favoriteIds, toggleFavorite } = useFavoriteExperienceIds(experience ? [experience] : []);
  const { favoriteIds: similarFavoriteIds, toggleFavorite: toggleSimilarFavorite } =
    useFavoriteExperienceIds(similarExperiences);

  // UI-thread value driving the header's title/background crossfade (below); mutated directly from a
  // plain `onScroll` handler, the same "shared value read by `useAnimatedStyle`, not `useCallback`"
  // shape as `HomeScreen`'s hero stretch (D-46) — avoids an `eslint-plugin-react-hooks` immutability
  // error and a re-render of this whole screen on every scroll tick.
  const scrollY = useSharedValue(0);
  const {
    visible: ctaVisible,
    handleScrollOffset: ctaOnScroll,
    handleScrollEnd: ctaOnScrollEnd,
  } = useCtaVisibility();

  // Not `useCallback`, same reason as above.
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.value = event.nativeEvent.contentOffset.y;
    ctaOnScroll(event.nativeEvent.contentOffset.y);
  }

  const heroHeight = getHeroHeight(windowHeight);
  // Roughly where the hero ends and the title sits in the content below it (D-49): a pragmatic proxy
  // for "the main title has scrolled out of view" rather than measuring the title's exact position.
  const revealOffset = Math.max(0, heroHeight - HEADER_HEIGHT - insets.top);

  const goToExperience = useCallback(
    (target: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: target.id } });
    },
    [router],
  );

  const goToCreateJourney = useCallback(() => {
    if (!experience) return;
    router.push({ pathname: '/itinerary/create', params: { experienceId: experience.id } });
  }, [experience, router]);

  const goToMap = useCallback(() => {
    if (!experience) return;
    router.push({ pathname: '/experience-map/[id]', params: { id: experience.id } });
  }, [experience, router]);

  const handleShare = useCallback(() => {
    if (!experience) return;
    void Share.share({ message: experience.title, title: experience.title }).catch(() => {});
  }, [experience]);

  const handleOpenGallery = useCallback(
    (index: number, rect: GalleryOpenRect) => {
      if (!experience) return;
      router.push({
        pathname: '/gallery/[id]',
        params: {
          id: experience.id,
          index: String(index),
          heroX: String(rect.x),
          heroY: String(rect.y),
          heroW: String(rect.width),
          heroH: String(rect.height),
        },
      });
    },
    [experience, router],
  );

  const categoryLabel = useMemo(() => {
    if (!experience) return null;
    const category = categories.find((item) => experience.categoryIds.includes(item.id));
    return category ? getCategoryLabel(t, category.slug) : null;
  }, [categories, experience, t]);

  const isNearby = experience ? getWhyRecommended(experience).includes('nearby') : false;

  const infoItems: InfoItemData[] = useMemo(() => {
    if (!experience) return [];
    const items: InfoItemData[] = [];
    // The address lives under the map block now (`MapPreviewRow`, D-73), not in this grid.
    if (experience.openingHoursLabel) {
      items.push({
        key: 'today',
        icon: Clock,
        label: t('experience.info.today'),
        value: experience.openingHoursLabel,
      });
    }
    if (experience.priceLabel) {
      items.push({
        key: 'price',
        icon: Euro,
        label: t('experience.info.price'),
        value: experience.priceLabel,
      });
    }
    if (experience.transport) {
      items.push({
        key: 'transport',
        icon: TrainFront,
        label: t('experience.info.transport'),
        value: experience.transport.line,
        helper: experience.transport.walkLabel,
      });
    }
    return items;
  }, [experience, t]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text variant="body" tone="secondary">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (!experience) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text variant="h3" accessibilityRole="header">
          {t('common.comingSoon')}
        </Text>
        <Button label={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  const images = experience.images ?? (experience.coverImage ? [experience.coverImage] : []);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <ScrollView
        testID="experience-detail-scroll"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollEndDrag={ctaOnScrollEnd}
        onMomentumScrollEnd={ctaOnScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + STICKY_FOOTER_CLEARANCE }}
      >
        <ExperienceHero
          images={images}
          title={experience.title}
          onOpenGallery={handleOpenGallery}
        />

        <View className="-mt-6 gap-6 rounded-t-hero bg-background px-6 pt-6">
          <View className="gap-4">
            {(categoryLabel || isNearby || experience.isPopular) && (
              <View className="flex-row flex-wrap gap-2">
                {categoryLabel ? <Badge label={categoryLabel} /> : null}
                {isNearby ? <Badge label={t('experience.badges.nearby')} /> : null}
                {experience.isPopular ? <Badge label={t('experience.badges.loved')} /> : null}
              </View>
            )}

            <Text variant="h1" accessibilityRole="header">
              {experience.title}
            </Text>

            <View className="flex-row flex-wrap items-center gap-3">
              {experience.rating ? (
                <View className="flex-row items-center gap-1">
                  <Star size={16} strokeWidth={1.5} color={colors.warning} fill={colors.warning} />
                  <Text variant="body" className="font-bodyMedium">
                    {experience.rating.toFixed(1)}
                  </Text>
                  {experience.reviewCount ? (
                    <Text variant="body" tone="secondary">
                      {t('home.reviewCount', { count: experience.reviewCount })}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {experience.distanceLabel ? (
                <View className="flex-row items-center gap-1">
                  <MapPin size={15} strokeWidth={1.8} color={colors.textSecondary} />
                  <Text variant="body" tone="secondary">
                    {experience.distanceLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text variant="body" tone="secondary">
              {experience.description}
            </Text>
          </View>

          <InfoGrid items={infoItems} />

          <MapPreviewRow experience={experience} onPress={goToMap} />

          <WhyRoamSection experience={experience} />

          <ReviewsSection
            rating={experience.rating}
            reviewCount={experience.reviewCount}
            reviews={experience.reviews ?? []}
          />

          <HighlightsSection highlights={experience.highlights ?? []} />

          <SimilarExperiencesSection
            experiences={similarExperiences}
            favoriteIds={similarFavoriteIds}
            onToggleFavorite={toggleSimilarFavorite}
            onPress={goToExperience}
          />
        </View>
      </ScrollView>

      <ExperienceDetailHeader
        title={experience.title}
        isFavorite={favoriteIds.has(experience.id)}
        onToggleFavorite={() => toggleFavorite(experience.id)}
        onShare={handleShare}
        onBack={() => router.back()}
        topInset={insets.top}
        scrollY={scrollY}
        revealOffset={revealOffset}
      />

      <StickyActionFooter
        visible={ctaVisible}
        label={t('experience.createItinerary')}
        onPress={goToCreateJourney}
        icon={Sparkles}
      />
    </View>
  );
}
