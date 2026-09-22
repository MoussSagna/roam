import { act, screen } from '@testing-library/react-native';

import { TabBarCollapseProvider } from '@/features/navigation/TabBarCollapseContext';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { DiscoverScreen } from './DiscoverScreen';

describe('DiscoverScreen (placeholder)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the discover headline and scrollable placeholder content', async () => {
    await renderWithProviders(
      <TabBarCollapseProvider>
        <DiscoverScreen />
      </TabBarCollapseProvider>,
    );

    expect(screen.getByRole('header')).toHaveTextContent('Découvrir');
    expect(screen.getByText('Cet écran arrive bientôt.')).toBeOnTheScreen();
    expect(screen.getByText('Bloc 1')).toBeOnTheScreen();
    expect(screen.getByText('Bloc 8')).toBeOnTheScreen();
  });
});
