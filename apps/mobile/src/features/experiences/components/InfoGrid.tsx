import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type InfoItemData = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  /** Second, lighter line (e.g. the transport item's walking time). */
  helper?: string;
};

type InfoGridProps = {
  items: readonly InfoItemData[];
};

/** "Informations essentielles" 2-column grid — Adresse / Aujourd'hui / Prix / Transport (sprint 5 §17).
 * Only the items the experience actually has data for are passed in; each cell degrades gracefully. */
export function InfoGrid({ items }: InfoGridProps) {
  const { colors } = useTheme();

  if (items.length === 0) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap gap-4 rounded-card border border-border bg-surface p-4">
      {items.map((item) => (
        <View key={item.key} className="gap-1.5" style={{ width: '44%' }}>
          <View className="flex-row items-center gap-1.5">
            <item.icon size={15} strokeWidth={1.8} color={colors.textSecondary} />
            <Text variant="caption" tone="secondary">
              {item.label}
            </Text>
          </View>
          <Text variant="body" className="font-bodyMedium" numberOfLines={2}>
            {item.value}
          </Text>
          {item.helper ? (
            <Text variant="caption" tone="secondary">
              {item.helper}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
