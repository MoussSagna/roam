import { MotiView } from 'moti';
import { StyleSheet, View } from 'react-native';

import { cx } from '@/lib/cx';

type ProgressBarsProps = {
  count: number;
  /** 0-based index of the current step. */
  index: number;
  /**
   * Animates the change of current bar (it widens and fills in), for bars that stay on screen while the
   * index changes — the onboarding pager's footer. Off by default: elsewhere each screen has its own bars.
   */
  animated?: boolean;
};

const BAR_HEIGHT = 6;
const ACTIVE_WIDTH = 18;
const INACTIVE_WIDTH = 14;
const TRANSITION = { type: 'timing', duration: 250 } as const;

/** Segmented progress bars shown under the onboarding questions (mood → interests). */
export function ProgressBars({ count, index, animated = false }: ProgressBarsProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      className="flex-row items-center justify-center gap-[6px]"
    >
      {Array.from({ length: count }, (_, i) =>
        animated ? (
          <AnimatedBar key={i} index={i} active={i === index} />
        ) : (
          <View
            key={i}
            className={cx(
              'h-[6px] rounded-pill',
              i === index ? 'w-[18px] bg-primary' : 'w-[14px] bg-text/[0.17]',
            )}
          />
        ),
      )}
    </View>
  );
}

/** Same sizes and colors as the static bar; the width and the fill move with a short timing. */
function AnimatedBar({ index, active }: { index: number; active: boolean }) {
  return (
    <MotiView
      testID={`progress-bar-${index}`}
      animate={{ width: active ? ACTIVE_WIDTH : INACTIVE_WIDTH }}
      transition={TRANSITION}
      style={{ height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, overflow: 'hidden' }}
    >
      <View className="absolute inset-0 bg-text/[0.17]" />
      <MotiView
        animate={{ opacity: active ? 1 : 0 }}
        transition={TRANSITION}
        style={StyleSheet.absoluteFill}
      >
        <View className="flex-1 bg-primary" />
      </MotiView>
    </MotiView>
  );
}
