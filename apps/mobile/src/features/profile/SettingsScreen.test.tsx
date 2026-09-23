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

      // Logout waits for the dialog to be fully gone (D-78), then replaces with Login.
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/login'));
    });

    it('confirming closes the dialog first and logs out only once it is gone (no frozen dialog, D-78)', async () => {
      await renderSettings();

      await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
      const confirmButtons = screen.getAllByRole('button', { name: 'Se déconnecter' });
      await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

      // Logging out tears this screen down: it must not happen while the dialog is still up.
      expect(mockReplace).not.toHaveBeenCalled();
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/login'));
      expect(screen.queryByText('Se déconnecter ?')).toBeNull();
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
  });
});
