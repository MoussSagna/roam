import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type TabDirection = 1 | -1;

type TabTransitionContextValue = {
  /** `1` = the newly active tab is to the right of the previous one, `-1` = to the left. */
  direction: TabDirection;
  setDirection: (direction: TabDirection) => void;
};

const TabTransitionContext = createContext<TabTransitionContextValue | null>(null);

/**
 * Shares the horizontal direction of the last tab switch: `RoamTabBar` sets it (from the tapped
 * tab's position relative to the active one) right before navigating, `TabScreenTransition` reads it
 * to decide which side the entering screen animates in from.
 */
export function TabTransitionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState<TabDirection>(1);

  const value = useMemo<TabTransitionContextValue>(
    () => ({ direction, setDirection }),
    [direction],
  );

  return <TabTransitionContext.Provider value={value}>{children}</TabTransitionContext.Provider>;
}

export function useTabTransition(): TabTransitionContextValue {
  const context = useContext(TabTransitionContext);
  if (!context) {
    throw new Error('useTabTransition must be used within a TabTransitionProvider');
  }
  return context;
}
