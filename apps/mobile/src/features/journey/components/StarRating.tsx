import Star from 'lucide-react-native/icons/star';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';
import type { JourneyRating } from '@/types';

const RATINGS: readonly JourneyRating[] = [1, 2, 3, 4, 5];

type StarRatingProps = {
  value: JourneyRating | null;
  /** Omit for a read-only display (e.g. the feedback recap). */
  onChange?: (rating: JourneyRating) => void;
  size?: number;
};

/**
 * Five stars (sprint 12, the journey feedback): tapping one fills every star up to it; tapping
 * another changes the rating. Filled stars use the app's rating color (`warning`, like every star in
 * ROAM) and pop in with a small spring, one after the other — a fade only under reduced motion.
 */
export function StarRating({ value, onChange, size = 44 }: StarRatingProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const readOnly = !onChange;

  return (
    <View
      className="flex-row items-center justify-center"
      style={{ gap: size * 0.2 }}
      accessibilityRole={readOnly ? 'image' : 'radiogroup'}
      accessibilityLabel={
        readOnly && value
          ? value === 1
            ? t('journey.feedback.starOne')
            : t('journey.feedback.stars', { count: value })
          : undefined
      }
    >
      {RATINGS.map((rating) => {
        const filled = value !== null && rating <= value;
        const star = (
          <MotiView
            key={filled ? 'filled' : 'empty'}
            from={
              filled && !readOnly
                ? reduceMotion
                  ? { opacity: 0.4 }
                  : { scale: 0.6, opacity: 0.4 }
                : undefined
            }
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reduceMotion
                ? { type: 'timing', duration: 120 }
                : { type: 'spring', damping: 9, stiffness: 240, delay: (rating - 1) * 45 }
            }
          >
            <Star
              size={size}
              strokeWidth={1.4}
              color={filled ? colors.warning : colors.textSecondary}
              fill={filled ? colors.warning : 'transparent'}
            />
          </MotiView>
        );

        if (readOnly) return <View key={rating}>{star}</View>;
        return (
          <Pressable
            key={rating}
            testID={`star-${rating}`}
            accessibilityRole="radio"
            accessibilityLabel={
              rating === 1
                ? t('journey.feedback.starOne')
                : t('journey.feedback.stars', { count: rating })
            }
            accessibilityState={{ checked: value === rating }}
            onPress={() => onChange(rating)}
            hitSlop={4}
            className="active:opacity-70"
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}
