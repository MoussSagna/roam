import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { hexToRgbChannels } from '@/theme/color';
import { useTheme } from '@/theme';

import { isTabName, TAB_CONFIG } from './tabBarConfig';

const BAR_HEIGHT = 64;
const ITEM_WIDTH = 68;
const PILL_PADDING_H = 6;
const ICON_BADGE_SIZE = 34;
/** Keeps the pill clear of the screen edges on narrow devices (`06_DESIGN_SYSTEM.md` sprint 3 brief §6). */
const SIDE_CLEARANCE = 20;
/** Visible gap above the safe area so the bar reads as floating, not docked (brief §14). */
const BOTTOM_CLEARANCE = 20;

/**
 * Floating "glass pill" tab bar (docs/06_DESIGN_SYSTEM.md, sprint 3 §3-§12): a frosted, centered
 * capsule detached from the screen edges. Passed as `screenOptions.tabBar` to `expo-router`'s `Tabs`,
 * so it receives the same props as React Navigation's default bottom tab bar.
 *
 * Static for now by design: the scroll-driven collapse into a bubble (`TabBarCollapseContext`) is
 * being redone as a separate pass once this visual is validated, so this component does not read it.
 */
export function RoamTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const routes = state.routes.filter((route) => isTabName(route.name));
  const activeRoute = state.routes[state.index];

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
          borderColor: 'rgba(255, 255, 255, 0.35)',
          overflow: 'hidden',
          shadowColor: colors.overlay,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
          elevation: 8,
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
          {routes.map((route) => {
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
                    backgroundColor: isFocused ? colors.primary : 'transparent',
                  }}
                >
                  <tab.icon
                    size={20}
                    strokeWidth={1.8}
                    color={isFocused ? colors.primaryForeground : colors.textSecondary}
                  />
                </View>
                <Text
                  variant="caption"
                  tone={isFocused ? 'default' : 'secondary'}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}
