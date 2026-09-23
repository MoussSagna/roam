import LogOut from 'lucide-react-native/icons/log-out';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ConfirmationModal } from './ConfirmationModal';

describe('ConfirmationModal', () => {
  it('renders nothing when not visible', async () => {
    await renderWithProviders(
      <ConfirmationModal
        visible={false}
        title="Se déconnecter ?"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByText('Se déconnecter ?')).toBeNull();
  });

  it('shows the title, description and both buttons when visible', async () => {
    await renderWithProviders(
      <ConfirmationModal
        visible
        title="Se déconnecter ?"
        description="Tu seras déconnecté de ton compte, mais tes données resteront en sécurité."
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        icon={LogOut}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('header')).toHaveTextContent('Se déconnecter ?');
    expect(
      screen.getByText(
        'Tu seras déconnecté de ton compte, mais tes données resteront en sécurité.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeOnTheScreen();
  });

  it('calls onCancel when Annuler is pressed', async () => {
    const onCancel = jest.fn();
    await renderWithProviders(
      <ConfirmationModal
        visible
        title="Se déconnecter ?"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when the confirm button is pressed', async () => {
    const onConfirm = jest.fn();
    await renderWithProviders(
      <ConfirmationModal
        visible
        title="Se déconnecter ?"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons while loading', async () => {
    await renderWithProviders(
      <ConfirmationModal
        visible
        loading
        title="Se déconnecter ?"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeDisabled();
  });

  it('works in dark mode', async () => {
    await renderWithProviders(
      <ConfirmationModal
        visible
        title="Se déconnecter ?"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
      { themePreference: 'dark' },
    );

    expect(screen.getByRole('header')).toHaveTextContent('Se déconnecter ?');
  });
});
