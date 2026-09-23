import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

import type { SuggestionMood } from '../data/suggestionMoods';

type DiscoverMoodCardProps = {
  mood: SuggestionMood;
  selected: boolean;
  onPress: (mood: SuggestionMood) => void;
};

/** Exported so `SuggestionsSection`'s carousel can compute its own `snapToInterval` from the exact
 * same width — no separate hardcoded copy. */
export const TILE_SIZE = 96;

/** "Suggestions pour toi" tile (Discover, sprint 6 §"Section 2"): icon + label, purely presentational —
 * selecting one only highlights it, no downstream filtering (same "local state, nothing wired to it
 * yet" precedent as the onboarding mood/interests screens). */
export function DiscoverMoodCard({ mood, selected, onPress }: DiscoverMoodCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const label = t(mood.labelKey);
  const Icon = mood.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => onPress(mood)}
      style={{ width: TILE_SIZE }}
      className="items-center gap-2 active:opacity-80"
    >
      <View
        style={{ width: TILE_SIZE, height: TILE_SIZE }}
        className={cx(
          'items-center justify-center rounded-large',
          selected ? 'bg-primary' : 'bg-surfaceElevated',
        )}
      >
        <Icon
          size={26}
          strokeWidth={1.6}
          color={selected ? colors.primaryForeground : colors.text}
        />
      </View>
      <Text variant="small" numberOfLines={1} tone={selected ? 'primary' : 'default'}>
        {label}
      </Text>
    </Pressable>
  );
}
