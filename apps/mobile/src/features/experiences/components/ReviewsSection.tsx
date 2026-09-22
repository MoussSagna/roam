import Star from 'lucide-react-native/icons/star';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { useTheme } from '@/theme';
import type { ExperienceReview } from '@/types';

import { formatCompactCount } from '../lib/format';
import { ReviewCard } from './ReviewCard';

type ReviewsSectionProps = {
  rating?: number;
  reviewCount?: number;
  reviews: readonly ExperienceReview[];
};

/** "Avis des visiteurs" (sprint 5 §21): overall rating + a few mocked reviews. No real review system
 * yet, so "Voir tous les avis" is a visual affordance only (matches `SearchBar`'s own mocked scope). */
export function ReviewsSection({ rating, reviewCount, reviews }: ReviewsSectionProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  if (reviews.length === 0) {
    return null;
  }

  return (
    <View className="gap-3">
      <SectionHeader
        title={t('experience.reviews')}
        seeAllLabel={t('experience.seeAllReviews')}
        onSeeAll={() => {}}
      />
      {rating ? (
        <View className="flex-row items-center gap-2">
          <Star size={16} strokeWidth={1.5} color={colors.warning} fill={colors.warning} />
          <Text variant="h4">{rating.toFixed(1)}</Text>
          {reviewCount ? (
            <Text variant="body" tone="secondary">
              {t('home.reviewCount', { count: formatCompactCount(reviewCount, i18n.language) })}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View className="gap-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </View>
    </View>
  );
}
