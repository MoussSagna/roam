import { useCallback, useRef, useState } from 'react';

/** Ignore jitter/bounce smaller than this before reacting to a sustained scroll. */
const DIRECTION_THRESHOLD = 12;
/** Always visible within this many px of the top, regardless of direction. */
const TOP_ZONE = 24;

/**
 * Generic show/hide-on-scroll-direction hook: visible near the top or after a sustained upward
 * scroll, hidden after a sustained downward scroll. Same threshold/accumulator shape as
 * `TabBarCollapseContext`'s `useTabBarScrollHandler` (`features/navigation/`), but standalone and
 * with its own up-scroll-shows branch — the tab bar itself intentionally dropped that branch
 * (`docs/DECISIONS.md` D-43) for a different UI (a floating pill, not a header), so this is a
 * separate, reusable hook rather than a shared one, to keep the two behaviors independent
 * (sprint 4 polish §13: "ne mélange pas leurs états").
 *
 * Also exposes `atTop` (true within `TOP_ZONE` of the top) separately from `visible`, so a consumer
 * can tell "shown because we're at the top" from "shown because the user scrolled back up" — used by
 * `HomeHeader` to fade its background out only in the former case.
 */
export function useScrollDirection() {
  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastOffsetRef = useRef(0);
  const downAccumRef = useRef(0);
  const upAccumRef = useRef(0);

  const handleScrollOffset = useCallback((offsetY: number) => {
    const y = Math.max(0, offsetY);
    const delta = y - lastOffsetRef.current;
    lastOffsetRef.current = y;

    if (y <= TOP_ZONE) {
      downAccumRef.current = 0;
      upAccumRef.current = 0;
      setVisible(true);
      setAtTop(true);
      return;
    }

    setAtTop(false);

    if (delta > 0) {
      upAccumRef.current = 0;
      downAccumRef.current += delta;
      if (downAccumRef.current > DIRECTION_THRESHOLD) {
        downAccumRef.current = 0;
        setVisible(false);
      }
    } else if (delta < 0) {
      downAccumRef.current = 0;
      upAccumRef.current += -delta;
      if (upAccumRef.current > DIRECTION_THRESHOLD) {
        upAccumRef.current = 0;
        setVisible(true);
      }
    }
  }, []);

  return { visible, atTop, handleScrollOffset };
}
