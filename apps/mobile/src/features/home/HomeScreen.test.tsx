import { act, screen } from '@testing-library/react-native';

import { TabBarCollapseProvider } from '@/features/navigation/TabBarCollapseContext';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HomeScreen } from './HomeScreen';

describe('HomeScreen (placeholder)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the home headline, a coming-soon note and scrollable placeholder content', async () => {
    await renderWithProviders(
      <TabBarCollapseProvider>
        <HomeScreen />
      </TabBarCollapseProvider>,
    );

    expect(screen.getByRole('header')).toHaveTextContent(
      "Qu'est-ce que tu veux faire aujourd'hui ?",
    );
    expect(screen.getByText('Cet écran arrive bientôt.')).toBeOnTheScreen();
    expect(screen.getByText('Bloc 1')).toBeOnTheScreen();
    expect(screen.getByText('Bloc 8')).toBeOnTheScreen();
  });
});
