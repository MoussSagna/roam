import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type JourneyStat = { icon: LucideIcon; value: string; label: string };

/** Row of small stat tiles ("4 h · Durée totale", "3,2 km · Distance", "≈ 45 € · Budget estimé"). */
export function JourneyStats({ stats }: { stats: readonly JourneyStat[] }) {
  const { colors } = useTheme();

  return (
    <View className="flex-row flex-wrap gap-2">
      {stats.map(({ icon: Icon, value, label }) => (
        <View
          key={label}
          accessible
          accessibilityLabel={`${label} : ${value}`}
          className="min-w-[30%] flex-1 flex-row items-center gap-2 rounded-large bg-primary/10 px-3 py-3"
        >
          <Icon size={18} strokeWidth={1.8} color={colors.primary} />
          <View className="flex-1">
            <Text variant="label" numberOfLines={1}>
              {value}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
