import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type TabBarCollapseContextValue = {
  /** `true` when the pill has retracted into a bubble. */
  collapsed: boolean;
  expand: () => void;
  collapse: () => void;
};

const TabBarCollapseContext = createContext<TabBarCollapseContextValue | null>(null);

/** Shared collapse state for the floating tab bar, read by `RoamTabBar` and driven by the active screen's scroll. */
export function TabBarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const expand = useCallback(() => setCollapsed(false), []);
  const collapse = useCallback(() => setCollapsed(true), []);

  const value = useMemo<TabBarCollapseContextValue>(
    () => ({ collapsed, expand, collapse }),
    [collapsed, expand, collapse],
  );

  return <TabBarCollapseContext.Provider value={value}>{children}</TabBarCollapseContext.Provider>;
}

export function useTabBarCollapse(): TabBarCollapseContextValue {
  const context = useContext(TabBarCollapseContext);
  if (!context) {
    throw new Error('useTabBarCollapse must be used within a TabBarCollapseProvider');
  }
  return context;
}

/** Ignore jitter/bounce smaller than this before reacting to a scroll direction. */
const DIRECTION_THRESHOLD = 12;
/** Always expanded near the top, regardless of direction (avoids collapsing right at the start). */
const TOP_ZONE = 24;

/**
 * `onScroll` handler a tab screen attaches to its `ScrollView`: scrolling down past the threshold
 * collapses the tab bar into a bubble, scrolling up (or being near the top) expands it again.
 */
export function useTabBarScrollHandler() {
  const { collapse, expand } = useTabBarCollapse();
  const lastOffsetRef = useRef(0);
  const accumulatedRef = useRef(0);

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
      const delta = offsetY - lastOffsetRef.current;
      lastOffsetRef.current = offsetY;

      if (offsetY <= TOP_ZONE) {
        accumulatedRef.current = 0;
        expand();
        return;
      }

      // A change of direction resets the accumulator so a small wobble doesn't trigger a flip.
      if (Math.sign(delta) !== Math.sign(accumulatedRef.current)) {
        accumulatedRef.current = 0;
      }
      accumulatedRef.current += delta;

      if (accumulatedRef.current > DIRECTION_THRESHOLD) {
        collapse();
        accumulatedRef.current = 0;
      } else if (accumulatedRef.current < -DIRECTION_THRESHOLD) {
        expand();
        accumulatedRef.current = 0;
      }
    },
    [collapse, expand],
  );
}
