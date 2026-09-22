import { useCallback, useRef, useState } from 'react';

/** Ignore jitter/bounce smaller than this before hiding on a sustained downward scroll. */
const DIRECTION_THRESHOLD = 12;

/**
 * Sticky CTA footer visibility (experience detail polish): visible at rest, hidden while the user is
 * actively scrolling down, shown again the moment scrolling stops OR reverses — unlike
 * `useScrollDirection` (Home's header), which only reacts to sustained direction changes and has no
 * "scroll ended" signal. Kept as its own hook rather than reusing that one: the two screens'
 * bars have different rules on purpose (item 15 — "ne mélange pas leurs états").
 */
export function useCtaVisibility() {
  const [visible, setVisible] = useState(true);
  const lastOffsetRef = useRef(0);
  const downAccumRef = useRef(0);

  const handleScrollOffset = useCallback((offsetY: number) => {
    const y = Math.max(0, offsetY);
    const delta = y - lastOffsetRef.current;
    lastOffsetRef.current = y;

    if (delta > 0) {
      downAccumRef.current += delta;
      if (downAccumRef.current > DIRECTION_THRESHOLD) {
        downAccumRef.current = 0;
        setVisible(false);
      }
    } else if (delta < 0) {
      downAccumRef.current = 0;
      setVisible(true);
    }
  }, []);

  /** Call from `onScrollEndDrag`/`onMomentumScrollEnd`: whenever the scroll gesture actually ends,
   * the CTA comes back regardless of which direction the user last scrolled. */
  const handleScrollEnd = useCallback(() => {
    downAccumRef.current = 0;
    setVisible(true);
  }, []);

  return { visible, handleScrollOffset, handleScrollEnd };
}
