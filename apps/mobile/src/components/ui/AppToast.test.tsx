import { act, screen } from '@testing-library/react-native';

import { showToast } from '@/lib/toast';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AppToast } from './AppToast';

/**
 * Auto-dismiss itself isn't asserted here: the library keeps a shown toast's content permanently
 * mounted once shown (`ToastUI`/`AnimatedContainer` only animate an `Animated.Value`-driven style,
 * they never unmount `children`), so `queryByText(...).toBeNull()` after advancing timers can't
 * detect it — the same category of "not meaningfully testable under this test setup" this project
 * already documents for Reanimated-driven visibility (`docs/DECISIONS.md` D-49).
 */
describe('AppToast', () => {
  it('shows a success toast with its title and message', async () => {
    await renderWithProviders(<AppToast />);

    await act(async () => {
      showToast('success', {
        title: 'Préférences enregistrées',
        message: 'Tes préférences ont bien été mises à jour.',
      });
    });

    expect(screen.getByText('Préférences enregistrées')).toBeOnTheScreen();
    expect(screen.getByText('Tes préférences ont bien été mises à jour.')).toBeOnTheScreen();
  });

  it('shows an error toast without needing a second line', async () => {
    await renderWithProviders(<AppToast />);

    await act(async () => {
      showToast('error', { title: "Impossible d'enregistrer les préférences" });
    });

    expect(screen.getByText("Impossible d'enregistrer les préférences")).toBeOnTheScreen();
  });

  it('exposes the toast to assistive technology as an alert', async () => {
    await renderWithProviders(<AppToast />);

    await act(async () => {
      showToast('success', { title: 'Préférences enregistrées' });
    });

    expect(screen.getByRole('alert')).toBeOnTheScreen();
  });
});
