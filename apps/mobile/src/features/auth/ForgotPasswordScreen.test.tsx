import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ForgotPasswordScreen } from './ForgotPasswordScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

describe('ForgotPasswordScreen (authentication 4 — forgot password)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the localized copy in French', async () => {
    await renderWithProviders(<ForgotPasswordScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Mot de passe oublié ?');
    expect(
      screen.getByText(
        "Pas de panique ! Entre ton email et nous t'enverrons un code de réinitialisation.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Envoyer le code' })).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Tu vas recevoir un email avec un code de réinitialisation.\nPense à vérifier tes spams !',
      ),
    ).toBeOnTheScreen();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<ForgotPasswordScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Forgot password?');
    expect(screen.getByRole('button', { name: 'Send code' })).toBeOnTheScreen();
  });

  it('the back button goes back', async () => {
    await renderWithProviders(<ForgotPasswordScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('requires an email before submitting', async () => {
    await renderWithProviders(<ForgotPasswordScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Envoyer le code' }));

    expect(screen.getByText('Ce champ est requis.')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    await renderWithProviders(<ForgotPasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    await fireEvent.press(screen.getByRole('button', { name: 'Envoyer le code' }));

    expect(screen.getByText('Adresse e-mail invalide.')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('clears the error as soon as the user edits the field again', async () => {
    await renderWithProviders(<ForgotPasswordScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Envoyer le code' }));
    expect(screen.getByText('Ce champ est requis.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'm');
    expect(screen.queryByText('Ce champ est requis.')).toBeNull();
  });

  it('simulates a request then moves on to the reset-code screen', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<ForgotPasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Envoyer le code' }));

    expect(screen.getByRole('button', { name: 'Envoyer le code' })).toBeDisabled();
    await act(() => jest.advanceTimersByTime(1000));

    expect(mockPush).toHaveBeenCalledWith('/auth/reset-code');
    jest.useRealTimers();
  });
});
