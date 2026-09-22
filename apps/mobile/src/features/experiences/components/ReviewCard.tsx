import Star from 'lucide-react-native/icons/star';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { ExperienceReview } from '@/types';

type ReviewCardProps = {
  review: ExperienceReview;
};

/** One review row: initial-letter avatar (no review photos in the mock content), author, stars, date,
 * comment. */
export function ReviewCard({ review }: ReviewCardProps) {
  const { colors } = useTheme();

  return (
    <View className="gap-2 rounded-card border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-pill bg-accent">
          <Text variant="body" className="font-bodySemibold" style={{ color: colors.text }}>
            {review.author.charAt(0)}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="body" className="font-bodyMedium">
            {review.author}
          </Text>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-0.5">
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={12}
                  strokeWidth={1.5}
                  color={colors.warning}
                  fill={index < Math.round(review.rating) ? colors.warning : 'transparent'}
                />
              ))}
            </View>
            <Text variant="caption" tone="secondary">
              {review.date}
            </Text>
          </View>
        </View>
      </View>
      <Text variant="body" tone="secondary">
        {review.comment}
      </Text>
    </View>
  );
}
