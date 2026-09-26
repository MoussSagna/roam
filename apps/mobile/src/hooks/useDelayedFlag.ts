import { useEffect, useState } from 'react';

/**
 * True once `active` has stayed true for `delayMs`; false again as soon as it turns false. Lets a loading state start
 * discreet (a short wait never flashes a skeleton) and grow into skeletons when the wait lasts.
 */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [reached, setReached] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setReached(true), delayMs);
    return () => {
      clearTimeout(timer);
      // The next activation waits the full delay again.
      setReached(false);
    };
  }, [active, delayMs]);

  return active && reached;
}
