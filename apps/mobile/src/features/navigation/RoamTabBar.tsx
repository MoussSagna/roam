import type { BottomTabBarProps } from 'expo-router/tabs';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

import { useTabBarCollapse } from './TabBarCollapseContext';
import { isTabName, TAB_CONFIG } from './tabBarConfig';

/** Constant height for both states: the pill and the bubble share it, so the bubble is a perfect circle. */
const BAR_HEIGHT = 64;
const ITEM_WIDTH = 68;
const PILL_PADDING_H = 6;
const ICON_BADGE_SIZE = 34;

/**
 * Floating "pill" tab bar (docs/06_DESIGN_SYSTEM.md) that morphs into a small bubble showing only the
 * active tab's icon when the active screen scrolls down, and morphs back on scroll up or on tap
 * (`03_UX_SCREENS_AND_FLOWS.md` sprint 3 brief). Passed as the `tabBar` prop of `expo-router`'s `Tabs`,
 * so it receives the same props as React Navigation's default bottom tab bar.
 */
export function RoamTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { collapsed, expand } = useTabBarCollapse();
  const reduceMotion = useReduceMotion();

  const routes = state.routes.filter((route) => isTabName(route.name));
  const activeRoute = state.routes[state.index];
  const activeTab =
    activeRoute && isTabName(activeRoute.name) ? TAB_CONFIG[activeRoute.name] : undefined;

  const expandedWidth = ITEM_WIDTH * routes.length + PILL_PADDING_H * 2;
  const transition = reduceMotion
    ? ({ type: 'timing', duration: 0 } as const)
    : ({ type: 'timing', duration: 320 } as const);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: insets.left + 20,
        bottom: insets.bottom + 12,
      }}
    >
      <MotiView
        animate={{ width: collapsed ? BAR_HEIGHT : expandedWidth }}
        transition={transition}
        style={{
          height: BAR_HEIGHT,
          borderRadius: 999,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: collapsed ? 0 : PILL_PADDING_H,
          justifyContent: collapsed ? 'center' : 'flex-start',
          overflow: 'hidden',
          shadowColor: colors.overlay,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.14,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        {collapsed
          ? activeTab && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('navigation.expand')}
                onPress={expand}
                hitSlop={8}
                style={{
                  width: BAR_HEIGHT,
                  height: BAR_HEIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: ICON_BADGE_SIZE,
                    height: ICON_BADGE_SIZE,
                    borderRadius: ICON_BADGE_SIZE / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.primary,
                  }}
                >
                  <activeTab.icon size={20} strokeWidth={1.8} color={colors.primaryForeground} />
                </View>
              </Pressable>
            )
          : routes.map((route) => {
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
      </MotiView>
    </View>
  );
}
