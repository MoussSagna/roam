import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { TabBarCollapseProvider } from '@/features/navigation/TabBarCollapseContext';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProfileScreen } from './ProfileScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

async function renderProfile() {
  return renderWithProviders(
    <TabBarCollapseProvider>
      <ProfileScreen />
    </TabBarCollapseProvider>,
    { initialIsLoggedIn: true, themePreference: 'system' },
  );
}

describe('ProfileScreen', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the user profile, stats and menu', async () => {
    await renderProfile();

    expect(screen.getByRole('header')).toHaveTextContent('Profil');
    expect(screen.getByText('Moussa')).toBeOnTheScreen();
    expect(screen.getByText('33 ans · Paris')).toBeOnTheScreen();
    expect(
      screen.getByText('Toujours partant pour découvrir de nouveaux lieux ✨'),
    ).toBeOnTheScreen();

    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('36')).toBeOnTheScreen();
    expect(screen.getByText('8')).toBeOnTheScreen();

    expect(screen.getByRole('button', { name: 'Mes préférences' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mes favoris' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mon historique' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mes statistiques' })).toBeOnTheScreen();
    expect(screen.getByText('Français')).toBeOnTheScreen();
    expect(screen.getByText('Système')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Aide & Support' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Confidentialité' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeOnTheScreen();
  });

  it('pressing "Éditer mon profil" pushes to the edit route', async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Éditer mon profil' }));

    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('pressing a menu row pushes to its route', async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Mes préférences' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/preferences');

    await fireEvent.press(screen.getByRole('button', { name: 'Mes favoris' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/favorites');

    await fireEvent.press(screen.getByRole('button', { name: 'Mon historique' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/history');

    await fireEvent.press(screen.getByRole('button', { name: 'Mes statistiques' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/statistics');

    await fireEvent.press(screen.getByRole('button', { name: 'Langue' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/language');

    await fireEvent.press(screen.getByRole('button', { name: 'Thème' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/theme');

    await fireEvent.press(screen.getByRole('button', { name: 'Aide & Support' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/help');

    await fireEvent.press(screen.getByRole('button', { name: 'Confidentialité' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/privacy');
  });

  it('pressing the settings icon pushes to the settings placeholder', async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Paramètres' }));

    expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  });

  it('pressing "Se déconnecter" opens a confirmation modal without logging out yet', async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(screen.getByText('Se déconnecter ?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Tu seras déconnecté de ton compte, mais tes données resteront en sécurité.',
      ),
    ).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('confirming the logout modal logs out and replaces with the login route', async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
    const confirmButtons = screen.getAllByRole('button', { name: 'Se déconnecter' });
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    expect(mockReplace).toHaveBeenCalledWith('/auth/login');
  });

  it('cancelling the logout modal keeps the user on Profile', async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(screen.queryByText('Se déconnecter ?')).toBeNull());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
