import { MotiView } from 'moti';
import { useMemo, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 24;
const CONTAINER_HEIGHT = 44;

export type SliderProps = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  /** Required: an icon-less, draggable control must still announce what it does and its value. */
  accessibilityLabel: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Horizontal slider (documented in `06_DESIGN_SYSTEM.md` as a Core component, not yet built before
 * sprint 5). Built on `PanResponder` (React Native core) instead of adding a slider dependency — no
 * gesture library is installed, and dragging a thumb doesn't need one (`docs/DECISIONS.md`).
 */
export function Slider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  accessibilityLabel,
}: SliderProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const [pressed, setPressed] = useState(false);

  const percent = max === min ? 0 : clamp((value - min) / (max - min), 0, 1);

  // `useMemo`, not `useRef(...).current`: reading a ref during render (even a one-time lazy-init
  // like this) is flagged by this project's `react-hooks/refs` lint rule — `trackWidth` is plain
  // render state instead, so nothing here reads a ref at all.
  const panResponder = useMemo(() => {
    const applyTouch = (locationX: number) => {
      if (trackWidth <= 0) return;
      const touchPercent = clamp(locationX / trackWidth, 0, 1);
      const raw = min + touchPercent * (max - min);
      onValueChange(clamp(Math.round(raw / step) * step, min, max));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        setPressed(true);
        applyTouch(event.nativeEvent.locationX);
      },
      onPanResponderMove: (event) => applyTouch(event.nativeEvent.locationX),
      onPanResponderRelease: () => setPressed(false),
      onPanResponderTerminate: () => setPressed(false),
    });
  }, [min, max, step, onValueChange, trackWidth]);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') {
          onValueChange(clamp(value + step, min, max));
        } else if (event.nativeEvent.actionName === 'decrement') {
          onValueChange(clamp(value - step, min, max));
        }
      }}
      style={{ height: CONTAINER_HEIGHT, justifyContent: 'center' }}
      onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <View
        className="bg-border"
        style={{ height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, overflow: 'hidden' }}
      >
        <View
          style={{
            width: `${percent * 100}%`,
            height: TRACK_HEIGHT,
            backgroundColor: colors.primary,
          }}
        />
      </View>

      <MotiView
        animate={{ scale: pressed && !reduceMotion ? 1.15 : 1 }}
        transition={{ type: 'timing', duration: 120 }}
        style={{
          position: 'absolute',
          left: percent * trackWidth - THUMB_SIZE / 2,
          top: (CONTAINER_HEIGHT - THUMB_SIZE) / 2,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: colors.primary,
          borderWidth: 3,
          borderColor: colors.surface,
        }}
      />
    </View>
  );
}
