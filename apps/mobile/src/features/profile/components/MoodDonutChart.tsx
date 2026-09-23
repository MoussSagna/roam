import { PieChart } from 'react-native-gifted-charts';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

const RADIUS = 84;
const INNER_RADIUS = 58;

type MoodDonutChartProps = {
  data: { value: number; color: string; label: string }[];
  centerValue: number;
  centerLabel: string;
};

/**
 * "Ton humeur lors des sorties" donut (mockup tile 05): `react-native-gifted-charts`' `PieChart`
 * (`donut`), the one section of this screen that is a genuine chart requiring real arc math — unlike
 * the proportion bars (`PercentBarRow`), which are plain styled `View`s (`docs/DECISIONS.md`). The
 * center shows the same "N sorties" figure as the stat card above it (same `UserStats.outings`
 * number). Legend rows (color dot, label, percentage) are custom, matching the mockup's own list
 * rather than the library's built-in legend.
 */
export function MoodDonutChart({ data, centerValue, centerLabel }: MoodDonutChartProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();

  return (
    <View className="items-center gap-6">
      <PieChart
        data={data.map((item) => ({ value: item.value, color: item.color }))}
        donut
        radius={RADIUS}
        innerRadius={INNER_RADIUS}
        innerCircleColor={colors.surface}
        strokeColor={colors.surface}
        strokeWidth={2}
        isAnimated={!reduceMotion}
        animationDuration={reduceMotion ? 0 : 700}
        centerLabelComponent={() => (
          <View className="items-center">
            <Text variant="h2">{centerValue}</Text>
            <Text variant="caption" tone="secondary">
              {centerLabel}
            </Text>
          </View>
        )}
      />

      <View className="w-full gap-3">
        {data.map((item) => (
          <View key={item.label} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View style={{ backgroundColor: item.color }} className="h-2.5 w-2.5 rounded-pill" />
              <Text variant="small">{item.label}</Text>
            </View>
            <Text variant="small" tone="secondary" className="font-bodyMedium">
              {item.value}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
