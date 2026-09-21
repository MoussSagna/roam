import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { Button, Chip, Text } from './index';

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

  it('exposes the selected state of a Chip to assistive technologies', async () => {
    await renderWithProviders(<Chip label="Clair" selected />);
    expect(screen.getByRole('button', { name: 'Clair', selected: true })).toBeOnTheScreen();
  });

  it('renders Text with its variant', async () => {
    await renderWithProviders(<Text variant="h1">Titre</Text>);
    expect(screen.getByText('Titre')).toBeOnTheScreen();
  });
});
