import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/lib/storage';

import { useRecentSearches } from './useRecentSearches';

describe('useRecentSearches (sprint 6 — recent searches persistence)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts empty when nothing is persisted', async () => {
    const { result } = await renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('loads a previously persisted list on mount', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.recentSearches,
      JSON.stringify([{ id: 'rooftop', query: 'rooftop', searchedAt: '2024-01-01T00:00:00.000Z' }]),
    );

    const { result } = await renderHook(() => useRecentSearches());

    await waitFor(() => {
      expect(result.current.recentSearches).toHaveLength(1);
    });
    expect(result.current.recentSearches[0].query).toBe('rooftop');
  });

  it('ignores a corrupted persisted value instead of crashing', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.recentSearches, 'not valid json{');

    const { result } = await renderHook(() => useRecentSearches());

    expect(result.current.recentSearches).toEqual([]);
  });

  it('adds a search, moves a repeat to the front instead of duplicating it, and ignores blanks', async () => {
    const { result } = await renderHook(() => useRecentSearches());

    await act(() => result.current.addRecentSearch('rooftop'));
    await act(() => result.current.addRecentSearch('bars'));
    await act(() => result.current.addRecentSearch('   '));

    expect(result.current.recentSearches.map((entry) => entry.query)).toEqual(['bars', 'rooftop']);

    await act(() => result.current.addRecentSearch('rooftop'));
    expect(result.current.recentSearches.map((entry) => entry.query)).toEqual(['rooftop', 'bars']);
  });

  it('removes a search by id', async () => {
    const { result } = await renderHook(() => useRecentSearches());

    await act(() => result.current.addRecentSearch('rooftop'));
    const [{ id }] = result.current.recentSearches;

    await act(() => result.current.removeRecentSearch(id));

    expect(result.current.recentSearches).toEqual([]);
  });

  it('persists additions and removals to AsyncStorage', async () => {
    const { result } = await renderHook(() => useRecentSearches());

    await act(() => result.current.addRecentSearch('rooftop'));
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.recentSearches);
      expect(JSON.parse(raw!)).toHaveLength(1);
    });

    const [{ id }] = result.current.recentSearches;
    await act(() => result.current.removeRecentSearch(id));
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.recentSearches);
      expect(JSON.parse(raw!)).toHaveLength(0);
    });
  });
});
