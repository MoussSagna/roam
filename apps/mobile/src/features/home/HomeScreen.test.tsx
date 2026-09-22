import { act, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HomeScreen } from './HomeScreen';

describe('HomeScreen (placeholder)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the home headline and a coming-soon note', async () => {
    await renderWithProviders(<HomeScreen />);

    expect(screen.getByRole('header')).toHaveTextContent(
      "Qu'est-ce que tu veux faire aujourd'hui ?",
    );
    expect(screen.getByText('Cet écran arrive bientôt.')).toBeOnTheScreen();
  });
});
