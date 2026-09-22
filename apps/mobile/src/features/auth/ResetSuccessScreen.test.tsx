import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ResetSuccessScreen } from './ResetSuccessScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

describe('ResetSuccessScreen (authentication 7 — reset success)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the localized copy in French', async () => {
    await renderWithProviders(<ResetSuccessScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Mot de passe mis à jour !');
    expect(
      screen.getByText(
        'Ton mot de passe a bien été réinitialisé.\nTu peux maintenant te connecter.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeOnTheScreen();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<ResetSuccessScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Password updated!');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
  });

  it('has no back button — this is the end of the sub-flow', async () => {
    await renderWithProviders(<ResetSuccessScreen />);
    expect(screen.queryByRole('button', { name: 'Retour' })).toBeNull();
  });

  it('"Se connecter" replaces the route with the login screen', async () => {
    await renderWithProviders(<ResetSuccessScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
    expect(mockReplace).toHaveBeenCalledWith('/auth/login');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
