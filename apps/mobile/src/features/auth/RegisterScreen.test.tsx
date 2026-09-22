import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RegisterScreen } from './RegisterScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

describe('RegisterScreen (authentication 3 — register)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the localized copy and every field/action in French', async () => {
    await renderWithProviders(<RegisterScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Créer un compte');
    expect(
      screen.getByText('Rejoins ROAM et commence à explorer des sorties qui te ressemblent.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Prénom')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Mot de passe')).toBeOnTheScreen();
    expect(screen.getByLabelText('Confirmer le mot de passe')).toBeOnTheScreen();
    expect(screen.getByText('Au moins 8 caractères')).toBeOnTheScreen();
    expect(screen.getByText('Une lettre et un chiffre')).toBeOnTheScreen();
    expect(screen.getByText('Un caractère spécial (optionnel)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeOnTheScreen();
    expect(screen.getByText('Déjà un compte ?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeOnTheScreen();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<RegisterScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Create an account');
    expect(screen.getByLabelText('First name')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create my account' })).toBeOnTheScreen();
  });

  it('the back button goes back', async () => {
    await renderWithProviders(<RegisterScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors and does not submit when the fields are empty', async () => {
    await renderWithProviders(<RegisterScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(screen.getAllByText('Ce champ est requis.')).toHaveLength(4);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('rejects a password that is too weak', async () => {
    await renderWithProviders(<RegisterScreen />);

    await fireEvent.changeText(screen.getByLabelText('Prénom'), 'Moussa');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'short');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'short');
    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(screen.getByText('Vérifie les critères ci-dessous.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('rejects a confirmation that does not match the password', async () => {
    await renderWithProviders(<RegisterScreen />);

    await fireEvent.changeText(screen.getByLabelText('Prénom'), 'Moussa');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'password123');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'password456');
    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('clears the mismatch error once the confirmation is fixed', async () => {
    await renderWithProviders(<RegisterScreen />);

    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'password123');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'wrong');
    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'password123');
    expect(screen.queryByText('Les mots de passe ne correspondent pas.')).toBeNull();
  });

  it('updates the password requirement checklist as the user types', async () => {
    await renderWithProviders(<RegisterScreen />);
    const password = screen.getByLabelText('Mot de passe');

    await fireEvent.changeText(password, 'short');
    // Not yet 8 characters and no digit: still unmet, no crash, no false positive text change.
    expect(screen.getByText('Au moins 8 caractères')).toBeOnTheScreen();

    await fireEvent.changeText(password, 'longenough1');
    expect(screen.getByText('Au moins 8 caractères')).toBeOnTheScreen();
    expect(screen.getByText('Une lettre et un chiffre')).toBeOnTheScreen();
  });

  it('simulates a request then enters the app on a valid submission', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<RegisterScreen />);

    await fireEvent.changeText(screen.getByLabelText('Prénom'), 'Moussa');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'password123');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'password123');

    // The press and the timer advance that unblocks its handler's `await login()` must be a single
    // `act()` — awaiting the press on its own would deadlock (nothing could advance the timer until
    // it resolves), and a separate `act()` per step misses the state update in between.
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(mockReplace).toHaveBeenCalledWith('/home');
    jest.useRealTimers();
  });

  it('"Se connecter" navigates to the login screen', async () => {
    await renderWithProviders(<RegisterScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });
});
