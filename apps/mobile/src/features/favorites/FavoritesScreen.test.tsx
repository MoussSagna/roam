import { act, screen } from '@testing-library/react-native';

import { TabBarCollapseProvider } from '@/features/navigation/TabBarCollapseContext';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { FavoritesScreen } from './FavoritesScreen';

describe('FavoritesScreen (placeholder)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the favorites headline and scrollable placeholder content', async () => {
    await renderWithProviders(
      <TabBarCollapseProvider>
        <FavoritesScreen />
      </TabBarCollapseProvider>,
    );

    expect(screen.getByRole('header')).toHaveTextContent('Mes favoris');
    expect(screen.getByText('Cet écran arrive bientôt.')).toBeOnTheScreen();
    expect(screen.getByText('Bloc 1')).toBeOnTheScreen();
    expect(screen.getByText('Bloc 8')).toBeOnTheScreen();
  });
});
