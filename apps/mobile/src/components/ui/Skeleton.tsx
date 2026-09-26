import { MotiView } from 'moti';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

/** One pulse, down then back up (docs/06_DESIGN_SYSTEM.md → Motion: subtle, never flashy). */
export const SKELETON_PULSE_MS = 900;
/** The lowest opacity of the pulse. */
export const SKELETON_PULSE_MIN_OPACITY = 0.5;

/** The pulse, or none when the user asked the system to reduce motion. */
export function skeletonPulse(reduceMotion: boolean) {
  return reduceMotion
    ? { animate: { opacity: 1 }, transition: { type: 'timing', duration: 0 } as const }
    : {
        animate: { opacity: SKELETON_PULSE_MIN_OPACITY },
        transition: {
          type: 'timing',
          duration: SKELETON_PULSE_MS,
          loop: true,
          repeatReverse: true,
        } as const,
      };
}

export type SkeletonProps = {
  /** Size and position (`width`, `height`) — the real component's own dimensions. */
  style?: StyleProp<ViewStyle>;
  /** Shape (`rounded-card`, `rounded-pill`…). The color is always the theme's `border` token. */
  className?: string;
  testID?: string;
};

/**
 * A placeholder block standing for content still loading: the theme's `border` color (visible on `background` and
 * `surface`, light and dark), a slow opacity pulse — none when the user asked the system to reduce motion. Hidden
 * from screen readers: the loading state announces itself once, not block by block.
 *
 * The shape lives on a plain `View` (NativeWind classes); the pulse on the `MotiView` inside, which takes `style`
 * only.
 */
export function Skeleton({ style, className, testID }: SkeletonProps) {
  const pulse = skeletonPulse(useReduceMotion());
  const { colors } = useTheme();

  return (
    <View
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={cx('overflow-hidden', className)}
      style={style}
    >
      <MotiView
        testID={testID ? `${testID}-block` : undefined}
        style={{ flex: 1, backgroundColor: colors.border }}
        from={{ opacity: 1 }}
        animate={pulse.animate}
        transition={pulse.transition}
      />
    </View>
  );
}
