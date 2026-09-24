import { Image } from 'expo-image';
import Check from 'lucide-react-native/icons/check';
import MapPin from 'lucide-react-native/icons/map-pin';
import Plus from 'lucide-react-native/icons/plus';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

import { formatDistance, formatDuration } from '../lib/format';

type SuggestionCardProps = {
  experience: Experience;
  categoryLabel?: string | null;
  distanceM: number | null;
  /** Already-translated "why ROAM proposes it". */
  reason: string;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (experience: Experience) => void;
};

/**
 * A journey suggestion: immersive photo, name, category, distance / duration / price / hours, and the
 * reason ROAM proposes it. Selectable (add / remove) with a small scale + ring, like the onboarding
 * tiles; "Voir le détail" opens the experience.
 */
export function SuggestionCard({
  experience,
  categoryLabel,
  distanceM,
  reason,
  selected,
  onToggle,
  onOpen,
}: SuggestionCardProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();

  const meta = [
    distanceM !== null ? formatDistance(distanceM, i18n.language) : null,
    formatDuration(experience.estimatedDurationMin),
    experience.priceLabel,
  ].filter(Boolean);

  return (
    <MotiView
      animate={{ scale: selected && !reduceMotion ? 1.01 : 1 }}
      transition={{ type: 'timing', duration: 150 }}
      testID={`journey-suggestion-${experience.id}`}
    >
      <View
        className={cx(
          'overflow-hidden rounded-card border-2 bg-surface',
          selected ? 'border-primary' : 'border-border',
        )}
      >
        <View style={{ height: 150 }} className="bg-surfaceElevated">
          {experience.coverImage ? (
            <Image
              source={experience.coverImage}
              style={{ flex: 1 }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>

        <View className="gap-2 p-4">
          <View className="gap-0.5">
            <Text variant="h4" numberOfLines={2}>
              {experience.title}
            </Text>
            {categoryLabel ? (
              <Text variant="small" tone="secondary">
                {categoryLabel}
              </Text>
            ) : null}
          </View>

          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <View className="flex-row items-center gap-1">
              <MapPin size={13} strokeWidth={1.8} color={colors.textSecondary} />
              <Text variant="caption" tone="secondary">
                {meta.join(' · ')}
              </Text>
            </View>
            {experience.openingHoursLabel ? (
              <Text variant="caption" tone="secondary">
                {experience.openingHoursLabel}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-start gap-2 rounded-large bg-accent/25 px-3 py-2">
            <Sparkles size={15} strokeWidth={1.8} color={colors.primary} style={{ marginTop: 2 }} />
            <Text variant="small" className="flex-1">
              {reason}
            </Text>
          </View>

          <View className="flex-row items-center gap-3 pt-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                selected ? 'journey.suggestions.removeLabel' : 'journey.suggestions.addLabel',
                { title: experience.title },
              )}
              accessibilityState={{ selected }}
              onPress={() => onToggle(experience.id)}
              className={cx(
                'min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-pill border px-4 active:opacity-80',
                selected ? 'border-primary bg-primary' : 'border-primary bg-surface',
              )}
            >
              {selected ? (
                <Check size={16} strokeWidth={2.2} color={colors.primaryForeground} />
              ) : (
                <Plus size={16} strokeWidth={2.2} color={colors.primary} />
              )}
              <Text
                variant="small"
                tone={selected ? 'onPrimary' : 'primary'}
                className="font-bodySemibold"
              >
                {t(selected ? 'journey.suggestions.added' : 'journey.suggestions.add')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('journey.suggestions.details')} — ${experience.title}`}
              onPress={() => onOpen(experience)}
              hitSlop={8}
              className="min-h-11 justify-center px-2 active:opacity-60"
            >
              <Text variant="small" tone="primary" className="font-bodyMedium underline">
                {t('journey.suggestions.details')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </MotiView>
  );
}
