import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { ThemeProvider, useTheme } from './ThemeProvider';
import { getStoredThemePreference } from './preferences';
import { darkColors, lightColors, type ThemePreference } from './tokens';

// Controls what the OS reports, independently of the native Appearance module.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));
const mockedSystemScheme = jest.mocked(useColorScheme);

function wrapperFor(initialPreference: ThemePreference) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider initialPreference={initialPreference}>{children}</ThemeProvider>;
  };
}

describe('ThemeProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockedSystemScheme.mockReturnValue('light');
  });

  it('applies an explicit light preference', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapperFor('light') });
    expect(result.current.scheme).toBe('light');
    expect(result.current.colors).toBe(lightColors);
  });

  it('applies an explicit dark preference', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapperFor('dark') });
    expect(result.current.scheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors).toBe(darkColors);
  });

  it('follows the OS scheme with the system preference', async () => {
    mockedSystemScheme.mockReturnValue('dark');
    const dark = await renderHook(() => useTheme(), { wrapper: wrapperFor('system') });
    expect(dark.result.current.preference).toBe('system');
    expect(dark.result.current.scheme).toBe('dark');

    mockedSystemScheme.mockReturnValue('light');
    const light = await renderHook(() => useTheme(), { wrapper: wrapperFor('system') });
    expect(light.result.current.scheme).toBe('light');
  });

  it('ignores the OS scheme when the user picked a theme explicitly', async () => {
    mockedSystemScheme.mockReturnValue('dark');
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapperFor('light') });
    expect(result.current.scheme).toBe('light');
  });

  it('switches theme immediately and persists the choice under roam.theme', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapperFor('light') });

    await act(async () => result.current.setPreference('dark'));

    expect(result.current.scheme).toBe('dark');
    await waitFor(async () => expect(await AsyncStorage.getItem('roam.theme')).toBe('dark'));
    expect(await getStoredThemePreference()).toBe('dark');
  });

  it('ignores invalid stored values', async () => {
    await AsyncStorage.setItem('roam.theme', 'sepia');
    expect(await getStoredThemePreference()).toBeNull();
  });

  it('throws when useTheme is used outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useTheme())).rejects.toThrow(/ThemeProvider/);
    jest.restoreAllMocks();
  });
});
