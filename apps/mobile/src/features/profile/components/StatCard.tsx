import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

type StatCardProps = {
  icon: LucideIcon;
  value: number;
  label: string;
};

/**
 * One of the three summary cards at the top of "Mes statistiques" (mockup tile 05): icon, number,
 * label, each in its own bordered card. Visually distinct from the main Profile screen's
 * `ProfileStats` (a single divided row, mockup tile 01) — same underlying `UserStats` numbers, a
 * different presentation for this screen, so a new small component instead of forcing `ProfileStats`'
 * shape to match a design it wasn't built for.
 */
export function StatCard({ icon: Icon, value, label }: StatCardProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center gap-2 rounded-card border border-border bg-surface px-2 py-4">
      <Icon size={20} strokeWidth={1.8} color={colors.primary} />
      <Text variant="h3">{value}</Text>
      <Text variant="caption" tone="secondary" className="text-center" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
