import LogOut from 'lucide-react-native/icons/log-out';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';

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

  describe('onExited (D-78)', () => {
    function Harness({ onExited }: { onExited: () => void }) {
      const [visible, setVisible] = useState(false);
      return (
        <>
          <Pressable testID="open" onPress={() => setVisible(true)} />
          <ConfirmationModal
            visible={visible}
            title="Se déconnecter ?"
            confirmLabel="Se déconnecter"
            cancelLabel="Annuler"
            onConfirm={() => setVisible(false)}
            onCancel={() => setVisible(false)}
            onExited={onExited}
          />
        </>
      );
    }

    it('stays open when reopened while the previous exit timer is still pending (D-79)', async () => {
      const onExited = jest.fn();
      await renderWithProviders(<Harness onExited={onExited} />);
      await fireEvent.press(screen.getByTestId('open'));
      await fireEvent.press(screen.getByRole('button', { name: 'Annuler' }));

      // Reopened within the 180 ms exit window, then well past it.
      await fireEvent.press(screen.getByTestId('open'));
      await new Promise((resolve) => setTimeout(resolve, 400));

      expect(screen.getByText('Se déconnecter ?')).toBeOnTheScreen();
    });

    it('is not called while hidden from the start, nor on opening', async () => {
      const onExited = jest.fn();
      await renderWithProviders(<Harness onExited={onExited} />);

      await fireEvent.press(screen.getByTestId('open'));
      expect(screen.getByText('Se déconnecter ?')).toBeOnTheScreen();
      expect(onExited).not.toHaveBeenCalled();
    });

    it('is called once, only after the dialog is fully gone', async () => {
      const onExited = jest.fn();
      await renderWithProviders(<Harness onExited={onExited} />);
      await fireEvent.press(screen.getByTestId('open'));

      await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
      // Still mounted during the exit animation: not yet.
      expect(onExited).not.toHaveBeenCalled();

      await waitFor(() => expect(onExited).toHaveBeenCalledTimes(1));
      expect(screen.queryByText('Se déconnecter ?')).toBeNull();
    });
  });
});
