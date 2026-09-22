import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import {
  TabBarCollapseProvider,
  useTabBarCollapse,
  useTabBarScrollHandler,
} from './TabBarCollapseContext';

function wrapper({ children }: { children: ReactNode }) {
  return <TabBarCollapseProvider>{children}</TabBarCollapseProvider>;
}

function scrollEvent(y: number): NativeSyntheticEvent<NativeScrollEvent> {
  return { nativeEvent: { contentOffset: { y } } } as NativeSyntheticEvent<NativeScrollEvent>;
}

function renderCollapse() {
  return renderHook(() => ({ collapse: useTabBarCollapse(), onScroll: useTabBarScrollHandler() }), {
    wrapper,
  });
}

describe('TabBarCollapseContext', () => {
  it('starts expanded', async () => {
    const { result } = await renderHook(() => useTabBarCollapse(), { wrapper });

    expect(result.current.collapsed).toBe(false);
  });

  it('collapses once a downward scroll passes the threshold', async () => {
    const { result } = await renderCollapse();

    await act(() => result.current.onScroll(scrollEvent(100)));

    expect(result.current.collapse.collapsed).toBe(true);
  });

  it('accumulates several small same-direction moves before collapsing, instead of flipping on every pixel', async () => {
    const { result } = await renderCollapse();

    // Below the top zone, each step small enough on its own not to trigger a flip.
    await act(() => result.current.onScroll(scrollEvent(5)));
    await act(() => result.current.onScroll(scrollEvent(15)));
    expect(result.current.collapse.collapsed).toBe(false);

    await act(() => result.current.onScroll(scrollEvent(26)));
    expect(result.current.collapse.collapsed).toBe(false);

    await act(() => result.current.onScroll(scrollEvent(36)));
    expect(result.current.collapse.collapsed).toBe(true);
  });

  it('does not expand on an upward scroll alone, only once it actually reaches the top', async () => {
    const { result } = await renderCollapse();
    await act(() => result.current.onScroll(scrollEvent(100)));
    expect(result.current.collapse.collapsed).toBe(true);

    await act(() => result.current.onScroll(scrollEvent(60)));
    expect(result.current.collapse.collapsed).toBe(true);

    await act(() => result.current.onScroll(scrollEvent(10)));
    expect(result.current.collapse.collapsed).toBe(false);
  });

  it('an upward scroll resets the downward accumulator instead of collapsing on the next small dip', async () => {
    const { result } = await renderCollapse();
    // Get past the top zone gradually so the very first move alone doesn't cross the threshold.
    await act(() => result.current.onScroll(scrollEvent(20)));
    await act(() => result.current.onScroll(scrollEvent(30)));
    expect(result.current.collapse.collapsed).toBe(false);

    await act(() => result.current.onScroll(scrollEvent(20)));
    expect(result.current.collapse.collapsed).toBe(false);

    // Without the reset above, this +10 would add to the earlier +10 and cross the threshold.
    await act(() => result.current.onScroll(scrollEvent(30)));
    expect(result.current.collapse.collapsed).toBe(false);
  });

  it('stays expanded near the top regardless of direction', async () => {
    const { result } = await renderCollapse();
    await act(() => result.current.onScroll(scrollEvent(100)));
    expect(result.current.collapse.collapsed).toBe(true);

    await act(() => result.current.onScroll(scrollEvent(10)));

    expect(result.current.collapse.collapsed).toBe(false);
  });

  it('ignores jitter smaller than the threshold', async () => {
    const { result } = await renderCollapse();
    await act(() => result.current.onScroll(scrollEvent(200)));
    const afterBaseline = result.current.collapse.collapsed;

    await act(() => result.current.onScroll(scrollEvent(203)));

    expect(result.current.collapse.collapsed).toBe(afterBaseline);
  });
});
