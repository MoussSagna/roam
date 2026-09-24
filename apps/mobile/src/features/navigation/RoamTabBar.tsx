import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { LucideIcon } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/ui';
import { useJourney } from '@/features/journey/journeyStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hexToRgbChannels } from '@/theme/color';
import { useTheme } from '@/theme';
import type { ThemeColors } from '@/theme';

import { useTabBarCollapse } from './TabBarCollapseContext';
import { isTabName, TAB_CONFIG } from './tabBarConfig';
import { useTabTransition } from './TabTransitionContext';

/** Shared by the pill and the bubble so the bubble (`width === height`) is a perfect circle. */
const BAR_HEIGHT = 68;
const ITEM_WIDTH = 72;
const PILL_PADDING_H = 6;
const ICON_BADGE_SIZE = 36;
const ICON_SIZE = 21;
const INDICATOR_SIZE = 10;
/** Keeps the pill/bubble clear of the screen edges on narrow devices (brief §6, §11). */
const SIDE_CLEARANCE = 20;
/** Visible gap above the safe area so the bar reads as floating, not docked (brief §14). */
const BOTTOM_CLEARANCE = 14;

type TabIconBadgeProps = {
  icon: LucideIcon;
  focused: boolean;
  reduceMotion: boolean;
  colors: ThemeColors;
  /** Small `accent` dot on the icon (sprint 11: a journey is in progress, on the Parcours tab). */
  indicator?: boolean;
};

/** Icon + its active fill/spring-pop, shared by the expanded row and the collapsed bubble (brief §1, §12). */
function TabIconBadge({ icon: Icon, focused, reduceMotion, colors, indicator }: TabIconBadgeProps) {
  return (
    <View>
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
          animate={{ opacity: focused ? 1 : 0 }}
          transition={{ type: 'timing', duration: reduceMotion ? 0 : 180 }}
        />
        <MotiView
          key={focused ? 'active' : 'inactive'}
          from={reduceMotion || !focused ? undefined : { scale: 0.82 }}
          animate={{ scale: 1 }}
          transition={
            reduceMotion
              ? { type: 'timing', duration: 0 }
              : { type: 'spring', damping: 11, stiffness: 220 }
          }
        >
          <Icon
            size={ICON_SIZE}
            strokeWidth={1.8}
            color={focused ? colors.primaryForeground : colors.textSecondary}
          />
        </MotiView>
      </View>
      {indicator ? (
        <View
          testID="tab-journey-indicator"
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: INDICATOR_SIZE,
            height: INDICATOR_SIZE,
            borderRadius: INDICATOR_SIZE / 2,
            backgroundColor: colors.accent,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * Floating "glass pill" tab bar (docs/06_DESIGN_SYSTEM.md, sprint 3 §3-§12) that collapses into a
 * small circular bubble — showing only the active tab's icon — while the active screen scrolls down,
 * and expands back on scroll up-to-top or on tap (`TabBarCollapseContext`, driven by each screen's
 * `onScroll`). On tab press it also records which way the switch goes in `TabTransitionContext` so
 * the entering screen (`TabScreenTransition`) can animate in from the right side.
 */
export function RoamTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { setDirection } = useTabTransition();
  const { collapsed, expand } = useTabBarCollapse();
  const reduceMotion = useReduceMotion();
  const { width: windowWidth } = useWindowDimensions();
  const { state: journeyState } = useJourney();
  const journeyInProgress = journeyState === 'active';

  const routes = state.routes.filter((route) => isTabName(route.name));
  const activeRoute = state.routes[state.index];
  const activeIndex = routes.findIndex((route) => route.key === activeRoute?.key);
  const activeTab =
    activeRoute && isTabName(activeRoute.name) ? TAB_CONFIG[activeRoute.name] : undefined;

  const pillWidth = ITEM_WIDTH * routes.length + PILL_PADDING_H * 2;
  /**
   * The pill is centered (expanded) by animating its `marginLeft` down to `0` (bubble, left-anchored)
   * rather than by flexbox `alignItems: 'center'`, so the same coordinate animates the pill sliding
   * and shrinking toward the left edge as it collapses (brief §11) without disturbing the expanded
   * layout (brief §19).
   */
  const availableWidth =
    windowWidth - (insets.left + SIDE_CLEARANCE) - (insets.right + SIDE_CLEARANCE);
  const centeredOffset = Math.max(0, (availableWidth - pillWidth) / 2);

  /** Frosted surface wash on top of the blur: translucent `surface`, tinted per theme. */
  const surfaceWash = `rgba(${hexToRgbChannels(colors.surface)}, ${isDark ? 0.45 : 0.55})`;

  const shapeTransition = reduceMotion
    ? ({ type: 'timing', duration: 0 } as const)
    : ({ type: 'spring', damping: 26, stiffness: 260, mass: 0.9 } as const);
  const contentTransition = { type: 'timing', duration: reduceMotion ? 0 : 200 } as const;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: insets.left + SIDE_CLEARANCE,
        right: insets.right + SIDE_CLEARANCE,
        bottom: insets.bottom + BOTTOM_CLEARANCE,
      }}
    >
      <MotiView
        animate={{
          width: collapsed ? BAR_HEIGHT : pillWidth,
          marginLeft: collapsed ? 0 : centeredOffset,
        }}
        transition={shapeTransition}
        style={{
          height: BAR_HEIGHT,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
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
          style={{ flex: 1, backgroundColor: surfaceWash }}
        >
          <MotiView
            pointerEvents={collapsed ? 'none' : 'auto'}
            accessibilityElementsHidden={collapsed}
            importantForAccessibility={collapsed ? 'no-hide-descendants' : 'auto'}
            animate={{ opacity: collapsed ? 0 : 1 }}
            transition={contentTransition}
            style={{
              position: 'absolute',
              inset: 0,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: PILL_PADDING_H,
            }}
          >
            {routes.map((route, index) => {
              const isFocused = route.key === activeRoute?.key;
              const tab = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
              const label = t(tab.labelKey);
              const indicator = route.name === 'journey' && journeyInProgress;

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
                  accessibilityHint={indicator ? t('navigation.journeyInProgress') : undefined}
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
                  <TabIconBadge
                    icon={tab.icon}
                    focused={isFocused}
                    reduceMotion={reduceMotion}
                    colors={colors}
                    indicator={indicator}
                  />
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
          </MotiView>

          <MotiView
            pointerEvents={collapsed ? 'auto' : 'none'}
            accessibilityElementsHidden={!collapsed}
            importantForAccessibility={!collapsed ? 'no-hide-descendants' : 'auto'}
            animate={{ opacity: collapsed ? 1 : 0 }}
            transition={contentTransition}
            style={{
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activeTab && (
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
                <TabIconBadge
                  icon={activeTab.icon}
                  focused
                  reduceMotion={reduceMotion}
                  colors={colors}
                  indicator={activeRoute?.name === 'journey' && journeyInProgress}
                />
              </Pressable>
            )}
          </MotiView>
        </BlurView>
      </MotiView>
    </View>
  );
}
