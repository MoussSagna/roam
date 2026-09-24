import { Image } from 'expo-image';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Clock from 'lucide-react-native/icons/clock';
import X from 'lucide-react-native/icons/x';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';
import type { Experience, JourneyStep } from '@/types';

import { formatDuration } from '../lib/format';

export type JourneyStepState = 'upcoming' | 'current' | 'done';

type JourneyStepCardProps = {
  step: JourneyStep;
  experience: Experience;
  categoryLabel?: string | null;
  state?: JourneyStepState;
  onPress: (experience: Experience) => void;
  /** Editing controls (builder): omitted handlers hide their button. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
};

/**
 * One step of a journey timeline (`06_DESIGN_SYSTEM.md` → ItineraryStep): arrival time on the rail,
 * then a card with the experience's photo, name, category, duration and price. Tapping the card opens
 * the experience; the builder adds move up / move down / remove.
 */
export function JourneyStepCard({
  step,
  experience,
  categoryLabel,
  state = 'upcoming',
  onPress,
  onMoveUp,
  onMoveDown,
  onRemove,
}: JourneyStepCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const editable = onMoveUp || onMoveDown || onRemove;

  return (
    <View testID={`journey-step-${experience.id}`} className="flex-row gap-3">
      <View className="w-14 items-center gap-2 pt-3">
        <Text variant="small" className="font-bodySemibold">
          {step.estimatedArrival}
        </Text>
        <View
          className={cx(
            'h-5 w-5 items-center justify-center rounded-pill border-2',
            state === 'done' && 'border-primary bg-primary',
            state === 'current' && 'border-primary bg-surface',
            state === 'upcoming' && 'border-border bg-surface',
          )}
        >
          {state === 'done' ? (
            <Check size={12} strokeWidth={3} color={colors.primaryForeground} />
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('journey.step.open', { title: experience.title })}
        onPress={() => onPress(experience)}
        className={cx(
          'flex-1 flex-row gap-3 rounded-card border bg-surface p-3 active:opacity-90',
          state === 'current' ? 'border-primary' : 'border-border',
        )}
      >
        <View className="h-20 w-20 overflow-hidden rounded-large bg-surfaceElevated">
          {experience.coverImage ? (
            <Image
              source={experience.coverImage}
              style={{ flex: 1 }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>

        <View className="flex-1 gap-1">
          <Text variant="label" numberOfLines={2}>
            {step.order + 1}. {experience.title}
          </Text>
          {categoryLabel ? (
            <Text variant="small" tone="secondary" numberOfLines={1}>
              {categoryLabel}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <View className="flex-row items-center gap-1">
              <Clock size={13} strokeWidth={1.8} color={colors.textSecondary} />
              <Text variant="caption" tone="secondary">
                {formatDuration(step.estimatedDurationMin)}
              </Text>
            </View>
            {experience.priceLabel ? (
              <Text variant="caption" tone="secondary">
                {experience.priceLabel}
              </Text>
            ) : null}
          </View>

          {editable ? (
            <View className="mt-1 flex-row gap-2">
              {onMoveUp ? (
                <IconButton
                  icon={ChevronUp}
                  accessibilityLabel={t('journey.step.moveUp', { title: experience.title })}
                  onPress={onMoveUp}
                  size={32}
                />
              ) : null}
              {onMoveDown ? (
                <IconButton
                  icon={ChevronDown}
                  accessibilityLabel={t('journey.step.moveDown', { title: experience.title })}
                  onPress={onMoveDown}
                  size={32}
                />
              ) : null}
              {onRemove ? (
                <IconButton
                  icon={X}
                  accessibilityLabel={t('journey.step.remove', { title: experience.title })}
                  onPress={onRemove}
                  size={32}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}
