import { Tabs } from 'expo-router/tabs';

import { RoamTabBar } from '@/features/navigation/RoamTabBar';
import { TabBarCollapseProvider } from '@/features/navigation/TabBarCollapseContext';
import { TabTransitionProvider } from '@/features/navigation/TabTransitionContext';

/**
 * Main navigation (sprint 3): four tabs sharing one floating pill / bubble tab bar
 * (`RoamTabBar`). `expo-router`'s `Tabs` (React Navigation's bottom tabs under the hood) is used
 * instead of `NativeTabs`/the headless `expo-router/ui` primitives so the tab bar can fully morph
 * on scroll — see `docs/DECISIONS.md`.
 *
 * Sprint 11: "Parcours" (`journey`) took Favoris' place in the bar. The `favorites` route is kept
 * (still reachable at `/favorites`) but is not a tab any more: `RoamTabBar` only draws `TAB_NAMES`.
 */
export default function TabsLayout() {
  return (
    <TabBarCollapseProvider>
      <TabTransitionProvider>
        <Tabs tabBar={(props) => <RoamTabBar {...props} />} screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="home" />
          <Tabs.Screen name="discover" />
          <Tabs.Screen name="journey" />
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="favorites" />
        </Tabs>
      </TabTransitionProvider>
    </TabBarCollapseProvider>
  );
}
