import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { NewPasswordScreen } from './NewPasswordScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

describe('NewPasswordScreen (authentication 6 — new password)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the localized copy and every field/action in French', async () => {
    await renderWithProviders(<NewPasswordScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Nouveau mot de passe');
    expect(screen.getByText('Choisis un nouveau mot de passe pour ton compte.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nouveau mot de passe')).toBeOnTheScreen();
    expect(screen.getByLabelText('Confirmer le mot de passe')).toBeOnTheScreen();
    expect(screen.getByText('Au moins 8 caractères')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mettre à jour' })).toBeOnTheScreen();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<NewPasswordScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('New password');
    expect(screen.getByRole('button', { name: 'Update' })).toBeOnTheScreen();
  });

  it('the back button goes back', async () => {
    await renderWithProviders(<NewPasswordScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors and does not submit when the fields are empty', async () => {
    await renderWithProviders(<NewPasswordScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Mettre à jour' }));

    expect(screen.getAllByText('Ce champ est requis.')).toHaveLength(2);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rejects a password that is too weak', async () => {
    await renderWithProviders(<NewPasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nouveau mot de passe'), 'short');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'short');
    await fireEvent.press(screen.getByRole('button', { name: 'Mettre à jour' }));

    expect(screen.getByText('Vérifie les critères ci-dessous.')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rejects a confirmation that does not match the password', async () => {
    await renderWithProviders(<NewPasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nouveau mot de passe'), 'password123');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'password456');
    await fireEvent.press(screen.getByRole('button', { name: 'Mettre à jour' }));

    expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('simulates a request then moves on to the success screen on a valid submission', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<NewPasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nouveau mot de passe'), 'password123');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'password123');
    await fireEvent.press(screen.getByRole('button', { name: 'Mettre à jour' }));

    expect(screen.getByRole('button', { name: 'Mettre à jour' })).toBeDisabled();
    await act(() => jest.advanceTimersByTime(1000));

    expect(mockPush).toHaveBeenCalledWith('/auth/reset-success');
    jest.useRealTimers();
  });
});
