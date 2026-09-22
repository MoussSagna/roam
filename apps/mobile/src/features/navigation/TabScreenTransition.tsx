import { useIsFocused } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';

import { useTabTransition } from './TabTransitionContext';

/** Horizontal offset (px) the entering screen starts from. */
const DISTANCE = 16;
const DURATION = 220;
const REDUCED_DURATION = 120;

type Props = { children: ReactNode };

/**
 * Wraps a tab route so its screen fades/slides in, from the direction of the tab switch, each time
 * it gains focus (sprint 3 §3-§5). Uses shared values directly (not a declarative Moti `animate`)
 * because the entering screen must snap to a *fresh* offset computed from the current
 * `TabTransitionContext` direction every time it focuses, not interpolate from whatever position it
 * was left at — the screen stays mounted across tab switches (unlike a remount-on-focus approach)
 * so scroll position and other screen state survive switching tabs, matching pre-existing behavior.
 */
export function TabScreenTransition({ children }: Props) {
  const isFocused = useIsFocused();
  const { direction } = useTabTransition();
  const reduceMotion = useReduceMotion();

  // Kept in refs (synced every render, read only inside the effect below) so the entrance effect —
  // which must fire on `isFocused` alone, not replay whenever direction/reduceMotion merely change —
  // always reads their latest value instead of a stale one closed over at the last time it ran.
  const directionRef = useRef(direction);
  const reduceMotionRef = useRef(reduceMotion);
  useEffect(() => {
    directionRef.current = direction;
    reduceMotionRef.current = reduceMotion;
  });

  const opacity = useSharedValue(isFocused ? 0 : 1);
  const translateX = useSharedValue(isFocused && !reduceMotion ? direction * DISTANCE : 0);

  useEffect(() => {
    if (!isFocused) return;
    const reduced = reduceMotionRef.current;
    const duration = reduced ? REDUCED_DURATION : DURATION;
    opacity.value = 0;
    translateX.value = reduced ? 0 : directionRef.current * DISTANCE;
    opacity.value = withTiming(1, { duration });
    translateX.value = withTiming(0, { duration });
  }, [isFocused, opacity, translateX]);

  const style = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
