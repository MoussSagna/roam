import { MotiView } from 'moti';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type FadeInUpProps = {
  children: ReactNode;
  /** Milliseconds before the animation starts. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Subtle entry (fade + small translateY), ROAM's default appearance motion
 * (docs/06_DESIGN_SYSTEM.md → Motion). Also serves as the smoke test for Moti.
 */
export function FadeInUp({ children, delay = 0, style }: FadeInUpProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay }}
      style={style}
    >
      {children}
    </MotiView>
  );
}
