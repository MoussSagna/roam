import { View } from 'react-native';

import { cx } from '@/lib/cx';

type ProgressBarsProps = {
  count: number;
  /** 0-based index of the current step. */
  index: number;
};

/** Segmented progress bars shown under the onboarding questions (mood → interests). */
export function ProgressBars({ count, index }: ProgressBarsProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      className="flex-row items-center justify-center gap-[6px]"
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          className={cx(
            'h-[6px] rounded-pill',
            i === index ? 'w-[18px] bg-primary' : 'w-[14px] bg-text/[0.17]',
          )}
        />
      ))}
    </View>
  );
}
