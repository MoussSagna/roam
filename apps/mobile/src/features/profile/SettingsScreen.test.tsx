import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { SettingsScreen } from './SettingsScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

async function renderSettings() {
  return renderWithProviders(<SettingsScreen />, {
    initialIsLoggedIn: true,
    themePreference: 'light',
  });
}

describe('SettingsScreen', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the header and every section', async () => {
    await renderSettings();

    expect(screen.getByRole('header')).toHaveTextContent('Paramètres');
    expect(screen.getByText('Compte')).toBeOnTheScreen();
    expect(screen.getByText('Préférences ROAM')).toBeOnTheScreen();
    expect(screen.getByText('Apparence')).toBeOnTheScreen();
    expect(screen.getByText('Support')).toBeOnTheScreen();
    expect(screen.getByText('Confidentialité & données')).toBeOnTheScreen();
    expect(screen.getByText('Session')).toBeOnTheScreen();
  });

  it("shows the current language and theme as each row's value", async () => {
    await renderSettings();

    expect(screen.getByText('Français')).toBeOnTheScreen();
    expect(screen.getByText('Clair')).toBeOnTheScreen();
  });

  it('navigates to each destination', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: 'Éditer mon profil' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');

    await fireEvent.press(screen.getByRole('button', { name: 'Mes préférences' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/preferences');

    await fireEvent.press(screen.getByRole('button', { name: 'Langue' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/language');

    await fireEvent.press(screen.getByRole('button', { name: 'Thème' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/theme');

    await fireEvent.press(screen.getByRole('button', { name: 'Aide & Support' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/help');

    await fireEvent.press(screen.getByRole('button', { name: 'Confidentialité' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/privacy');
  });

  it('the back button calls router.back', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  describe('logout', () => {
    it('opens a confirmation modal without logging out yet', async () => {
      await renderSettings();

      await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));

      expect(screen.getByText('Se déconnecter ?')).toBeOnTheScreen();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('cancelling keeps the session active', async () => {
      await renderSettings();

      await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Annuler' }));

      await waitFor(() => expect(screen.queryByText('Se déconnecter ?')).toBeNull());
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('confirming logs out and replaces with the login route', async () => {
      await renderSettings();

      await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
      const confirmButtons = screen.getAllByRole('button', { name: 'Se déconnecter' });
      await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

      expect(mockReplace).toHaveBeenCalledWith('/auth/login');
    });
  });
});
