import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { FavoritesScreen } from './FavoritesScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
}));

describe('FavoritesScreen', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the header and the mocked favorited experiences', async () => {
    await renderWithProviders(<FavoritesScreen />);

    expect(await screen.findByText('Dîners avec vue')).toBeOnTheScreen();
    expect(screen.getByRole('header')).toHaveTextContent('Mes favoris');
    expect(screen.getByText('Escapade nature')).toBeOnTheScreen();
    expect(screen.getByText('Soirée jazz')).toBeOnTheScreen();
    expect(screen.getByText('Mama Shelter')).toBeOnTheScreen();
    expect(screen.getByText('La Bellevilloise')).toBeOnTheScreen();
    // Only favorited experiences show up.
    expect(screen.queryByText('Après-midi lente')).toBeNull();
  });

  it('shows a category · location subtitle resolved from the category repository', async () => {
    await renderWithProviders(<FavoritesScreen />);

    expect(await screen.findByText('Bars & Soirées · Saint-Germain, Paris')).toBeOnTheScreen();
  });

  it('removing a favorite instantly drops it from the list', async () => {
    await renderWithProviders(<FavoritesScreen />);

    await screen.findByText('Dîners avec vue');
    // List order follows the mock pool's own order; "Dîners avec vue" comes first among favorites.
    const removeButtons = screen.getAllByLabelText('Retirer des favoris');
    await fireEvent.press(removeButtons[0]);

    expect(screen.queryByText('Dîners avec vue')).toBeNull();
    expect(screen.getByText('Escapade nature')).toBeOnTheScreen();
    expect(screen.getByText('Soirée jazz')).toBeOnTheScreen();
  });

  it('tapping a row navigates to the experience detail', async () => {
    await renderWithProviders(<FavoritesScreen />);

    await screen.findByText('Dîners avec vue');
    await fireEvent.press(screen.getByRole('button', { name: 'Dîners avec vue' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-dinner-view' },
    });
  });

  it('shows the empty state once every favorite is removed', async () => {
    await renderWithProviders(<FavoritesScreen />);

    await screen.findByText('Dîners avec vue');
    for (const button of screen.getAllByLabelText('Retirer des favoris')) {
      await fireEvent.press(button);
    }

    expect(await screen.findByText("Tu n'as encore rien sauvegardé.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Découvrir' }));
    expect(mockPush).toHaveBeenCalledWith('/discover');
  });

  it('the back button calls router.back', async () => {
    await renderWithProviders(<FavoritesScreen />);

    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
