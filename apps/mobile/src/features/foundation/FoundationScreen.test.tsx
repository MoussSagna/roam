import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { FoundationScreen } from './FoundationScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

describe('FoundationScreen', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    await AsyncStorage.clear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the brand, tagline and typography sample in French', async () => {
    await renderWithProviders(<FoundationScreen />);

    expect(screen.getByText('ROAM')).toBeOnTheScreen();
    expect(screen.getByLabelText('Logo ROAM')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'ROAM te propose des sorties adaptées à ton humeur, ton temps et ton budget.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Un aperçu de la typographie ROAM')).toBeOnTheScreen();
    expect(screen.getByText('Animation Moti')).toBeOnTheScreen();
  });

  it('navigates to /welcome with the primary button', async () => {
    await renderWithProviders(<FoundationScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    expect(mockPush).toHaveBeenCalledWith('/welcome');
  });

  it('switches language on the fly', async () => {
    await renderWithProviders(<FoundationScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'English' }));

    expect(await screen.findByRole('button', { name: 'Continue' })).toBeOnTheScreen();
    expect(screen.getByLabelText('ROAM logo')).toBeOnTheScreen();
  });

  it('switches theme preference and persists it', async () => {
    await renderWithProviders(<FoundationScreen />);

    expect(screen.getByRole('button', { name: 'Clair', selected: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sombre' }));

    expect(screen.getByRole('button', { name: 'Sombre', selected: true })).toBeOnTheScreen();
    await waitFor(async () => expect(await AsyncStorage.getItem('roam.theme')).toBe('dark'));
  });
});
