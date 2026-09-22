import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AuthEntryScreen } from './AuthEntryScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('AuthEntryScreen (authentication 1 — entry)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the brand name, tagline and every action in French', async () => {
    await renderWithProviders(<AuthEntryScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('ROAM');
    expect(screen.getByText('Des sorties qui te ressemblent.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Créer un compte' })).toBeOnTheScreen();
    expect(screen.getByText('ou')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuer avec Apple' })).toBeOnTheScreen();
    expect(screen.getByText(/Conditions d'utilisation/)).toBeOnTheScreen();
    expect(screen.getByText(/Politique de confidentialité/)).toBeOnTheScreen();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<AuthEntryScreen />);

    expect(screen.getByText('Outings that feel like you.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create an account' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeOnTheScreen();
  });

  it('goes to the login screen with "Se connecter"', async () => {
    await renderWithProviders(<AuthEntryScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('goes to the register screen with "Créer un compte"', async () => {
    await renderWithProviders(<AuthEntryScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Créer un compte' }));
    expect(mockPush).toHaveBeenCalledWith('/auth/register');
  });

  it('simulates a request when pressing "Continuer avec Google" (no navigation)', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<AuthEntryScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuer avec Google' }));
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeDisabled();

    await act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeEnabled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('simulates a request when pressing "Continuer avec Apple" (no navigation)', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<AuthEntryScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuer avec Apple' }));
    expect(screen.getByRole('button', { name: 'Continuer avec Apple' })).toBeDisabled();

    await act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: 'Continuer avec Apple' })).toBeEnabled();
    expect(mockPush).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});
