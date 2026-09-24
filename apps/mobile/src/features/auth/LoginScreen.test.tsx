import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LoginScreen } from './LoginScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
}));

describe('LoginScreen (authentication 2 — login)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the localized copy and every field/action in French', async () => {
    await renderWithProviders(<LoginScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Bon retour !');
    expect(
      screen.getByText('Connecte-toi pour retrouver tes sorties et tes recommandations.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Mot de passe')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mot de passe oublié ?' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuer avec Apple' })).toBeOnTheScreen();
    expect(screen.getByText('Pas encore de compte ?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Créer un compte' })).toBeOnTheScreen();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<LoginScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Welcome back!');
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
  });

  it('the back button goes back', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors and does not submit when the fields are empty', async () => {
    await renderWithProviders(<LoginScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(screen.getAllByText('Ce champ est requis.')).toHaveLength(2);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows an error for a malformed email', async () => {
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'password123');
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(screen.getByText('Adresse e-mail invalide.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as the user edits it again', async () => {
    await renderWithProviders(<LoginScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
    expect(screen.getAllByText('Ce champ est requis.')).toHaveLength(2);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    expect(screen.getAllByText('Ce champ est requis.')).toHaveLength(1);
  });

  it('simulates a request then enters the app on valid credentials', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'password123');
    // The press and the timer advance that unblocks its handler's `await login()` must be a single
    // `act()` — awaiting the press on its own would deadlock (nothing could advance the timer until
    // it resolves), and a separate `act()` per step misses the state update in between (React warns
    // it happened outside `act()`).
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(mockReplace).toHaveBeenCalledWith('/home');
    jest.useRealTimers();
  });

  it('toggles the password visibility', async () => {
    await renderWithProviders(<LoginScreen />);

    const password = screen.getByLabelText('Mot de passe');
    expect(password.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(password.props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Masquer le mot de passe' }));
    expect(password.props.secureTextEntry).toBe(true);
  });

  it('"Mot de passe oublié ?" navigates to its own screen', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));
    expect(mockPush).toHaveBeenCalledWith('/auth/forgot-password');
  });

  it('"Créer un compte" navigates to the register screen', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Créer un compte' }));
    expect(mockPush).toHaveBeenCalledWith('/auth/register');
  });
});
