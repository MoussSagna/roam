import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ThemeScreen } from './ThemeScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

describe('ThemeScreen', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    await AsyncStorage.clear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the header and all three preferences, Light selected by default', async () => {
    await renderWithProviders(<ThemeScreen />, { themePreference: 'light' });

    expect(screen.getByRole('header')).toHaveTextContent('Thème');

    const light = screen.getByRole('radio', { name: 'Clair' });
    const dark = screen.getByRole('radio', { name: 'Sombre' });
    const system = screen.getByRole('radio', { name: 'Système' });
    expect(light).toBeOnTheScreen();
    expect(dark).toBeOnTheScreen();
    expect(system).toBeOnTheScreen();
    expect(light).toBeChecked();
    expect(dark).not.toBeChecked();
    expect(system).not.toBeChecked();
  });

  it('selecting Dark updates the selection and persists it under roam.theme', async () => {
    await renderWithProviders(<ThemeScreen />, { themePreference: 'light' });

    await fireEvent.press(screen.getByRole('radio', { name: 'Sombre' }));

    expect(screen.getByRole('radio', { name: 'Sombre' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Clair' })).not.toBeChecked();
    expect(await AsyncStorage.getItem('roam.theme')).toBe('dark');
  });

  it('selecting System is also selectable', async () => {
    await renderWithProviders(<ThemeScreen />, { themePreference: 'light' });

    await fireEvent.press(screen.getByRole('radio', { name: 'Système' }));

    expect(screen.getByRole('radio', { name: 'Système' })).toBeChecked();
    expect(await AsyncStorage.getItem('roam.theme')).toBe('system');
  });

  it('the back button calls router.back', async () => {
    await renderWithProviders(<ThemeScreen />);

    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
