import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { showToast } from '@/lib/toast';
import { ApiError, repositories } from '@/services';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('@/lib/toast', () => ({ showToast: jest.fn() }));

const apiFailure = (status: number, code: string, retryAfterSeconds?: number) =>
  new ApiError({ status, code, message: 'API message', retryAfterSeconds });

/**
 * DATA-8: how Login and Register show the API's answers — the repository is stubbed to fail the way the
 * API does (`services/api` has its own tests for producing these errors).
 */
describe('auth screens with API errors', () => {
  beforeEach(async () => {
    mockReplace.mockClear();
    jest.mocked(showToast).mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function submitLogin() {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'lea@example.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'wrong-password1');
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
  }

  it('Login sends the typed credentials to the repository', async () => {
    const login = jest.spyOn(repositories.auth, 'login').mockResolvedValue();

    await submitLogin();

    expect(login).toHaveBeenCalledWith({ email: 'lea@example.com', password: 'wrong-password1' });
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  it('Login: wrong credentials are a field error, and the user stays on Login', async () => {
    jest
      .spyOn(repositories.auth, 'login')
      .mockRejectedValue(apiFailure(401, 'AUTH_INVALID_CREDENTIALS'));

    await submitLogin();

    expect(screen.getByText('Email ou mot de passe incorrect.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
  });

  it('Login: too many attempts (429) shows the rate-limit message', async () => {
    jest
      .spyOn(repositories.auth, 'login')
      .mockRejectedValue(apiFailure(429, 'TOO_MANY_REQUESTS', 900));

    await submitLogin();

    expect(showToast).toHaveBeenCalledWith('error', {
      title: 'Trop de tentatives. Patiente un peu avant de réessayer.',
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('Login: offline shows the network message', async () => {
    jest.spyOn(repositories.auth, 'login').mockRejectedValue(apiFailure(0, 'NETWORK_ERROR'));

    await submitLogin();

    expect(showToast).toHaveBeenCalledWith('error', {
      title: 'Vérifie ta connexion puis réessaie.',
    });
  });

  it('Register: an email already used is a field error', async () => {
    const register = jest
      .spyOn(repositories.auth, 'register')
      .mockRejectedValue(apiFailure(409, 'AUTH_EMAIL_ALREADY_EXISTS'));

    await renderWithProviders(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Prénom'), 'Léa');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'lea@example.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'secret123');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(register).toHaveBeenCalledWith({
      displayName: 'Léa',
      email: 'lea@example.com',
      password: 'secret123',
    });
    expect(screen.getByText('Un compte existe déjà avec cet email.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
