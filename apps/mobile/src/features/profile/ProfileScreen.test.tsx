import { act, fireEvent, screen } from '@testing-library/react-native';

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

  it('shows identity: header, avatar/name/bio and stats', async () => {
    await renderProfile();

    expect(screen.getByRole('header')).toHaveTextContent('Profil');
    expect(screen.getByText('Moussa')).toBeOnTheScreen();
    expect(screen.getByText('33 ans · Paris')).toBeOnTheScreen();
    expect(
      screen.getByText('Toujours partant pour découvrir de nouveaux lieux ✨'),
    ).toBeOnTheScreen();
    // "12" and "36" each appear twice: the top stats row and the yearly activity summary below.
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
    expect(screen.getAllByText('36').length).toBeGreaterThan(0);
    expect(screen.getByText('8')).toBeOnTheScreen();
  });

  it('the settings icon pushes to /profile/settings', async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Paramètres' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  });

  it('shows the active journey with progress and next step, and "Continuer" pushes to itinerary/create', async () => {
    await renderProfile();

    expect(await screen.findByText('Parcours en cours')).toBeOnTheScreen();
    expect(screen.getByText('Concert intimiste')).toBeOnTheScreen();
    expect(screen.getByText('2 / 5 étapes')).toBeOnTheScreen();
    expect(screen.getByText('Le Hasard Ludique')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Continuer mon parcours' }));
    expect(mockPush).toHaveBeenCalledWith('/itinerary/create');
  });

  it('shows "Ce que j\'aime" tags and "Modifier" pushes to Preferences', async () => {
    await renderProfile();

    expect(screen.getByText("Ce que j'aime")).toBeOnTheScreen();
    expect(screen.getByText('Bars & Soirées')).toBeOnTheScreen();
    expect(screen.getByText('Culture')).toBeOnTheScreen();
    expect(screen.getByText('Bien-être')).toBeOnTheScreen();
    expect(screen.getByText('Calme')).toBeOnTheScreen();
    expect(screen.getByText('Entre amis')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Modifier' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/preferences');
  });

  it('shows a favorites preview and "Voir tout" pushes to /profile/favorites', async () => {
    await renderProfile();

    expect(await screen.findByText('Dîners avec vue')).toBeOnTheScreen();
    expect(screen.getByText('Escapade nature')).toBeOnTheScreen();
    expect(screen.getByText('Soirée jazz')).toBeOnTheScreen();

    const favoritesHeading = screen.getByText('Mes favoris');
    const seeAllButtons = screen.getAllByRole('button', { name: 'Voir tout' });
    expect(favoritesHeading).toBeOnTheScreen();

    await fireEvent.press(seeAllButtons[0]);
    expect(mockPush).toHaveBeenCalledWith('/profile/favorites');
  });

  it('shows a history preview and "Voir tout" pushes to /profile/history', async () => {
    await renderProfile();

    expect(await screen.findByText('Après-midi lente')).toBeOnTheScreen();
    expect(screen.getByText('Balade panoramique')).toBeOnTheScreen();
    expect(screen.getByText('Rooftop Sunset')).toBeOnTheScreen();

    const seeAllButtons = screen.getAllByRole('button', { name: 'Voir tout' });
    await fireEvent.press(seeAllButtons[seeAllButtons.length - 1]);
    expect(mockPush).toHaveBeenCalledWith('/profile/history');
  });

  it('tapping a preview card navigates to the experience detail', async () => {
    await renderProfile();

    await fireEvent.press(await screen.findByRole('button', { name: 'Dîners avec vue' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-dinner-view' },
    });
  });

  it('shows the yearly activity summary and navigates to statistics on press', async () => {
    await renderProfile();

    const activityCard = screen.getByRole('button', { name: 'Mon activité cette année' });
    expect(activityCard).toBeOnTheScreen();
    expect(screen.getByText('sorties cette année')).toBeOnTheScreen();

    await fireEvent.press(activityCard);
    expect(mockPush).toHaveBeenCalledWith('/profile/statistics');
  });

  it('no longer shows the settings/session rows that moved to Settings', async () => {
    await renderProfile();

    expect(screen.queryByRole('button', { name: 'Se déconnecter' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Langue' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Thème' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aide & Support' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confidentialité' })).toBeNull();
  });
});
