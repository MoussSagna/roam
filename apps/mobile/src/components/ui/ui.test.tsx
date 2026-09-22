import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { Button, Chip, StickyActionFooter, Text } from './index';

describe('NativeWind UI components', () => {
  it('renders a NativeWind Button and handles presses', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Continuer" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire presses when disabled', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Continuer" disabled onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire presses and shows a busy state when loading', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Continuer" loading onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Continuer' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes the selected state of a Chip to assistive technologies', async () => {
    await renderWithProviders(<Chip label="Clair" selected />);
    expect(screen.getByRole('button', { name: 'Clair', selected: true })).toBeOnTheScreen();
  });

  it('renders Text with its variant', async () => {
    await renderWithProviders(<Text variant="h1">Titre</Text>);
    expect(screen.getByText('Titre')).toBeOnTheScreen();
  });

  it('StickyActionFooter fires its press and stays reachable when visible', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<StickyActionFooter visible label="Enregistrer" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('StickyActionFooter hides its button from assistive tech when not visible', async () => {
    await renderWithProviders(
      <StickyActionFooter visible={false} label="Enregistrer" onPress={jest.fn()} />,
    );

    expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull();
  });

  it('StickyActionFooter forwards disabled/loading to its Button', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <StickyActionFooter visible label="Enregistrer" loading onPress={onPress} />,
    );

    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
