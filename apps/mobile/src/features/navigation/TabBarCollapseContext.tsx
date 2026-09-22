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

/** Ignore jitter/bounce smaller than this before reacting to a sustained downward scroll. */
const DIRECTION_THRESHOLD = 12;
/** Only zone the bar auto-expands in — reaching the top, not merely scrolling up (sprint 3 §5-§6). */
const TOP_ZONE = 24;

/**
 * `onScroll` handler a tab screen attaches to its `ScrollView`: a sustained downward scroll past the
 * threshold collapses the tab bar into a bubble. It only expands again once the scroll actually
 * reaches the top — scrolling up while still mid-page keeps it collapsed (it may pass through this
 * screen while the user is scrolling back up to find something), it just resets the downward
 * accumulator so the next collapse needs a fresh sustained pull, not whatever was left over.
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

      if (delta < 0) {
        accumulatedRef.current = 0;
        return;
      }

      accumulatedRef.current += delta;
      if (accumulatedRef.current > DIRECTION_THRESHOLD) {
        collapse();
        accumulatedRef.current = 0;
      }
    },
    [collapse, expand],
  );
}
