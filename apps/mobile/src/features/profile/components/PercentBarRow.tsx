import { MotiView } from 'moti';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type PercentBarRowProps = {
  label: string;
  percentage: number;
  color: string;
  delay?: number;
};

/**
 * One row of "Tes genres préférés" / "Villes visitées" (mockup tile 05): label, percentage, and a
 * horizontal proportional bar. Not built on `react-native-gifted-charts`: a labeled proportion bar is
 * a styled progress indicator, not a chart with axes, so a plain themed `View` gives full control over
 * spacing/radius/colors without fighting a charting library's own bar-chart shape (`docs/DECISIONS.md`
 * — statistics screen entry). The fill grows in from the left on mount (`transformOrigin: 'left'`,
 * RN's own style prop — no extra dependency), skipped when `useReduceMotion()` is true.
 */
export function PercentBarRow({ label, percentage, color, delay = 0 }: PercentBarRowProps) {
  const reduceMotion = useReduceMotion();

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text variant="small">{label}</Text>
        <Text variant="small" tone="secondary" className="font-bodyMedium">
          {percentage}%
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-pill bg-border">
        <MotiView
          from={{ scaleX: reduceMotion ? 1 : 0 }}
          animate={{ scaleX: 1 }}
          transition={{ type: 'timing', duration: 700, delay }}
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: color,
            transformOrigin: 'left',
          }}
        />
      </View>
    </View>
  );
}
