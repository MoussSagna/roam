import { View } from 'react-native';

import { Text } from '@/components/ui';

type BadgeProps = {
  label: string;
};

/**
 * Decorative label pill (category / "À proximité" / "Coup de cœur" under the hero, mockup tile 10).
 * Not `Chip`: these badges are not actionable, so they render as plain text, not a `Pressable` with
 * `accessibilityRole="button"` (item 30 — a button that does nothing is an accessibility bug, not a
 * shortcut).
 */
export function Badge({ label }: BadgeProps) {
  return (
    <View className="min-h-8 flex-row items-center justify-center rounded-pill border border-border bg-surface px-3">
      <Text variant="small" className="font-bodyMedium">
        {label}
      </Text>
    </View>
  );
}
