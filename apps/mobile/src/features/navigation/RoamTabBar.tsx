import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hexToRgbChannels } from '@/theme/color';
import { useTheme } from '@/theme';

import { isTabName, TAB_CONFIG } from './tabBarConfig';
import { useTabTransition } from './TabTransitionContext';

const BAR_HEIGHT = 68;
const ITEM_WIDTH = 72;
const PILL_PADDING_H = 6;
const ICON_BADGE_SIZE = 36;
const ICON_SIZE = 21;
/** Keeps the pill clear of the screen edges on narrow devices (`06_DESIGN_SYSTEM.md` sprint 3 brief §6). */
const SIDE_CLEARANCE = 20;
/** Visible gap above the safe area so the bar reads as floating, not docked (brief §14). */
const BOTTOM_CLEARANCE = 14;

/**
 * Floating "glass pill" tab bar (docs/06_DESIGN_SYSTEM.md, sprint 3 §3-§12): a frosted, centered
 * capsule detached from the screen edges. Passed as `screenOptions.tabBar` to `expo-router`'s `Tabs`,
 * so it receives the same props as React Navigation's default bottom tab bar.
 *
 * The bar itself stays static (no collapse/bubble yet — see `TabBarCollapseContext`); on tab press it
 * records which way the switch goes in `TabTransitionContext` so the entering screen
 * (`TabScreenTransition`) can animate in from the right side.
 */
export function RoamTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { setDirection } = useTabTransition();
  const reduceMotion = useReduceMotion();

  const routes = state.routes.filter((route) => isTabName(route.name));
  const activeRoute = state.routes[state.index];
  const activeIndex = routes.findIndex((route) => route.key === activeRoute?.key);

  const pillWidth = ITEM_WIDTH * routes.length + PILL_PADDING_H * 2;
  /** Frosted surface wash on top of the blur: translucent `surface`, tinted per theme. */
  const surfaceWash = `rgba(${hexToRgbChannels(colors.surface)}, ${isDark ? 0.45 : 0.55})`;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: insets.left + SIDE_CLEARANCE,
        right: insets.right + SIDE_CLEARANCE,
        bottom: insets.bottom + BOTTOM_CLEARANCE,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: pillWidth,
          height: BAR_HEIGHT,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.42)',
          overflow: 'hidden',
          shadowColor: colors.overlay,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.16,
          shadowRadius: 24,
          elevation: 9,
        }}
      >
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: PILL_PADDING_H,
            backgroundColor: surfaceWash,
          }}
        >
          {routes.map((route, index) => {
            const isFocused = route.key === activeRoute?.key;
            const tab = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
            const label = t(tab.labelKey);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                setDirection(index >= activeIndex ? 1 : -1);
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isFocused }}
                onPress={onPress}
                hitSlop={4}
                style={{
                  width: ITEM_WIDTH,
                  height: BAR_HEIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                <View
                  style={{
                    width: ICON_BADGE_SIZE,
                    height: ICON_BADGE_SIZE,
                    borderRadius: ICON_BADGE_SIZE / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <MotiView
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: colors.primary,
                      borderRadius: ICON_BADGE_SIZE / 2,
                    }}
                    animate={{ opacity: isFocused ? 1 : 0 }}
                    transition={{
                      type: 'timing',
                      duration: reduceMotion ? 0 : 180,
                    }}
                  />
                  <MotiView
                    key={isFocused ? 'active' : 'inactive'}
                    from={reduceMotion || !isFocused ? undefined : { scale: 0.82 }}
                    animate={{ scale: 1 }}
                    transition={
                      reduceMotion
                        ? { type: 'timing', duration: 0 }
                        : { type: 'spring', damping: 11, stiffness: 220 }
                    }
                  >
                    <tab.icon
                      size={ICON_SIZE}
                      strokeWidth={1.8}
                      color={isFocused ? colors.primaryForeground : colors.textSecondary}
                    />
                  </MotiView>
                </View>
                <MotiView
                  key={isFocused ? 'label-active' : 'label-inactive'}
                  from={reduceMotion ? undefined : { opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'timing', duration: reduceMotion ? 0 : 160 }}
                >
                  <Text
                    variant="caption"
                    tone={isFocused ? 'default' : 'secondary'}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </MotiView>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}
