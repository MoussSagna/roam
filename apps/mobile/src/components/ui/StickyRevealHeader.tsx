import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hexToRgbChannels } from '@/theme/color';
import { useTheme } from '@/theme';

import { Text } from './Text';

export const STICKY_REVEAL_HEADER_HEIGHT = 56;
/** Width (px) of the scroll range the background/title crossfade over, ending at `revealOffset` — a
 * soft transition, matching experience detail's own (`docs/DECISIONS.md` D-49). */
const DEFAULT_FADE_RANGE = 60;

export type StickyRevealHeaderProps = {
  /** Optional: rendered centered, crossfading in with the background. Omit for a header that only
   * reveals its background (no title to show). */
  title?: string;
  /** Left slot (typically a back button) — the header renders none itself; compose whatever the
   * screen needs (e.g. an existing `IconButton`), same "component owns chrome, screen owns content"
   * split as `StickyActionFooter`. */
  leftSlot?: ReactNode;
  /** Right slot (typically one or two action buttons). */
  rightSlot?: ReactNode;
  /** Raw scroll offset (px), mutated directly from the screen's `onScroll` — same shared-value shape
   * as experience detail's header and `HomeScreen`'s hero stretch (D-46/D-49). */
  scrollY: SharedValue<number>;
  /** Scroll offset at which the background/title should be fully revealed (e.g. where a hero image
   * ends and the title sits in the content below it). */
  revealOffset: number;
  fadeRange?: number;
};

/**
 * Sticky header whose background and (optional) title crossfade in once the screen has scrolled past
 * `revealOffset` — starts transparent, so it reads as part of the content (a hero photo, typically)
 * until the content's own title scrolls out of view. Generalizes experience detail's
 * `ExperienceDetailHeader` (`docs/DECISIONS.md` D-49) for future screens with the same shape; that
 * screen's header is untouched (D-55) — see the decision log for why.
 *
 * The reveal background is `BlurView` + a `surface`-tinted wash (the same glass recipe `RoamTabBar`
 * already uses, D-41), not just a blur: a blur alone only reads over a photo, and this header may sit
 * over plain content too.
 *
 * Not reduced-motion gated: the crossfade is a direct function of scroll position, not a timed
 * animation independent of user input, so there is nothing to suppress (same reasoning as D-49's own
 * header).
 */
export function StickyRevealHeader({
  title,
  leftSlot,
  rightSlot,
  scrollY,
  revealOffset,
  fadeRange = DEFAULT_FADE_RANGE,
}: StickyRevealHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const surfaceWash = `rgba(${hexToRgbChannels(colors.surface)}, ${isDark ? 0.75 : 0.85})`;

  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [revealOffset - fadeRange, revealOffset],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
    >
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, revealStyle]}>
        <BlurView
          intensity={22}
          tint={isDark ? 'dark' : 'light'}
          style={{ flex: 1, backgroundColor: surfaceWash }}
        />
      </Animated.View>

      <View
        style={{
          height: STICKY_REVEAL_HEADER_HEIGHT + insets.top,
          paddingTop: insets.top,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {leftSlot}

        {title ? (
          <Animated.View
            style={[{ flex: 1, marginHorizontal: 12 }, revealStyle]}
            pointerEvents="none"
          >
            <Text variant="h4" numberOfLines={1} className="text-center">
              {title}
            </Text>
          </Animated.View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>{rightSlot}</View>
      </View>
    </View>
  );
}
