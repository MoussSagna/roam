import { act, screen } from '@testing-library/react-native';

import { TabBarCollapseProvider } from '@/features/navigation/TabBarCollapseContext';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProfileScreen } from './ProfileScreen';

describe('ProfileScreen (placeholder)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the profile headline and scrollable placeholder content', async () => {
    await renderWithProviders(
      <TabBarCollapseProvider>
        <ProfileScreen />
      </TabBarCollapseProvider>,
    );

    expect(screen.getByRole('header')).toHaveTextContent('Profil');
    expect(screen.getByText('Cet écran arrive bientôt.')).toBeOnTheScreen();
    expect(screen.getByText('Bloc 1')).toBeOnTheScreen();
    expect(screen.getByText('Bloc 8')).toBeOnTheScreen();
  });
});
