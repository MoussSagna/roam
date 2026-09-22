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
import { ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { useFavoriteExperienceIds } from '@/features/home/useFavoriteExperienceIds';
import { useCategories } from '@/hooks/useCategories';
import { useTheme } from '@/theme';
import type { Experience, GalleryOpenRect } from '@/types';

import { Badge } from './components/Badge';
import { ExperienceHero } from './components/ExperienceHero';
import { HighlightsSection } from './components/HighlightsSection';
import { InfoGrid, type InfoItemData } from './components/InfoGrid';
import { MapPreviewRow } from './components/MapPreviewRow';
import { ReviewsSection } from './components/ReviewsSection';
import { SimilarExperiencesSection } from './components/SimilarExperiencesSection';
import { WantMoreCta } from './components/WantMoreCta';
import { WhyRoamSection } from './components/WhyRoamSection';
import { getCategoryLabel } from './lib/categoryLabel';
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
  const categories = useCategories();

  const { experience, similarExperiences, isLoading } = useExperienceDetail(experienceId);
  const { favoriteIds, toggleFavorite } = useFavoriteExperienceIds(experience ? [experience] : []);
  const { favoriteIds: similarFavoriteIds, toggleFavorite: toggleSimilarFavorite } =
    useFavoriteExperienceIds(similarExperiences);

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
    if (experience.address) {
      items.push({
        key: 'address',
        icon: MapPin,
        label: t('experience.info.address'),
        value: experience.address,
      });
    }
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <ExperienceHero
          images={images}
          title={experience.title}
          isFavorite={favoriteIds.has(experience.id)}
          onToggleFavorite={() => toggleFavorite(experience.id)}
          onShare={handleShare}
          onBack={() => router.back()}
          onOpenGallery={handleOpenGallery}
          topInset={insets.top}
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

          <MapPreviewRow
            location={experience.location ?? experience.title}
            address={experience.address}
          />

          <WhyRoamSection experience={experience} />

          <Button
            label={t('experience.createItinerary')}
            trailingIcon={Sparkles}
            onPress={goToCreateJourney}
          />

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

          <WantMoreCta onPress={goToCreateJourney} />
        </View>
      </ScrollView>
    </View>
  );
}
