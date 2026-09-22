import { act, renderHook } from '@testing-library/react-native';

import { useScrollDirection } from './useScrollDirection';

describe('useScrollDirection', () => {
  it('starts visible', async () => {
    const { result } = await renderHook(() => useScrollDirection());
    expect(result.current.visible).toBe(true);
  });

  it('hides once a downward scroll passes the threshold', async () => {
    const { result } = await renderHook(() => useScrollDirection());

    await act(() => result.current.handleScrollOffset(100));

    expect(result.current.visible).toBe(false);
  });

  it('does not hide on small scrolls that stay below the threshold', async () => {
    const { result } = await renderHook(() => useScrollDirection());

    await act(() => result.current.handleScrollOffset(24)); // top zone boundary, resets the baseline
    await act(() => result.current.handleScrollOffset(30)); // +6
    await act(() => result.current.handleScrollOffset(34)); // +4 (10 total, still under 12)

    expect(result.current.visible).toBe(true);
  });

  it('shows again once a sustained upward scroll passes the threshold', async () => {
    const { result } = await renderHook(() => useScrollDirection());

    await act(() => result.current.handleScrollOffset(200));
    expect(result.current.visible).toBe(false);

    await act(() => result.current.handleScrollOffset(170));

    expect(result.current.visible).toBe(true);
  });

  it('is always visible once the scroll reaches the top zone', async () => {
    const { result } = await renderHook(() => useScrollDirection());

    await act(() => result.current.handleScrollOffset(200));
    expect(result.current.visible).toBe(false);

    await act(() => result.current.handleScrollOffset(0));

    expect(result.current.visible).toBe(true);
  });

  it('resets the downward accumulator on a direction change, instead of carrying it over', async () => {
    const { result } = await renderHook(() => useScrollDirection());

    await act(() => result.current.handleScrollOffset(24)); // baseline, top zone
    await act(() => result.current.handleScrollOffset(30)); // down +6
    await act(() => result.current.handleScrollOffset(26)); // up -4: resets the down accumulator
    await act(() => result.current.handleScrollOffset(32)); // down +6 (fresh, not 6+6=12)
    await act(() => result.current.handleScrollOffset(37)); // down +5 (11 total, still under 12)

    expect(result.current.visible).toBe(true);
  });
});
