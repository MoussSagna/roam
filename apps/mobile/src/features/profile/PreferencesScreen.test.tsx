import { act, fireEvent, screen } from '@testing-library/react-native';

import { AppToast } from '@/components/ui';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { PreferencesScreen } from './PreferencesScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

describe('PreferencesScreen', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the header, intro and default selection', async () => {
    await renderWithProviders(<PreferencesScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Mes préférences');
    expect(
      screen.getByText(
        'Ces préférences nous aident à te proposer des sorties qui te correspondent.',
      ),
    ).toBeOnTheScreen();

    expect(screen.getByRole('checkbox', { name: 'Bars & Soirées' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Culture' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Bien-être' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Restaurants' })).not.toBeChecked();

    expect(screen.getByRole('checkbox', { name: 'Calme' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Entre amis' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Solo' })).not.toBeChecked();

    expect(screen.getByText('25 €')).toBeOnTheScreen();
    expect(screen.getByText('10 km')).toBeOnTheScreen();
  });

  it('toggles a tile on press', async () => {
    await renderWithProviders(<PreferencesScreen />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Restaurants' }));
    expect(screen.getByRole('checkbox', { name: 'Restaurants' })).toBeChecked();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Culture' }));
    expect(screen.getByRole('checkbox', { name: 'Culture' })).not.toBeChecked();
  });

  it('the sliders expose their min/max/value for assistive tech and respond to increment/decrement', async () => {
    await renderWithProviders(<PreferencesScreen />);

    const budgetSlider = screen.getByRole('adjustable', { name: 'Budget' });
    expect(budgetSlider.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 25 });

    await fireEvent(budgetSlider, 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(screen.getByText('30 €')).toBeOnTheScreen();

    const distanceSlider = screen.getByRole('adjustable', { name: 'Distance maximale' });
    expect(distanceSlider.props.accessibilityValue).toEqual({ min: 1, max: 50, now: 10 });

    await fireEvent(distanceSlider, 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(screen.getByText('9 km')).toBeOnTheScreen();
  });

  it('"Réinitialiser" restores every default', async () => {
    await renderWithProviders(<PreferencesScreen />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Culture' }));
    await fireEvent(screen.getByRole('adjustable', { name: 'Budget' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Réinitialiser' }));

    expect(screen.getByRole('checkbox', { name: 'Culture' })).toBeChecked();
    expect(screen.getByText('25 €')).toBeOnTheScreen();
  });

  it('the back button returns to the previous screen', async () => {
    await renderWithProviders(<PreferencesScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('"Enregistrer mes préférences" simulates a save then returns to Profile', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<PreferencesScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer mes préférences' }));
    expect(screen.getByRole('button', { name: 'Enregistrer mes préférences' })).toBeDisabled();

    await act(() => jest.advanceTimersByTime(1000));

    expect(mockBack).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('shows a success toast once the save resolves (AppToast mounted app-wide, like in the real app)', async () => {
    jest.useFakeTimers();
    await renderWithProviders(
      <>
        <PreferencesScreen />
        <AppToast />
      </>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer mes préférences' }));
    expect(screen.queryByText('Préférences enregistrées')).toBeNull();

    await act(() => jest.advanceTimersByTime(1000));

    expect(screen.getByText('Préférences enregistrées')).toBeOnTheScreen();
    expect(screen.getByText('Tes préférences ont bien été mises à jour.')).toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('the sticky footer CTA hides on a sustained downward scroll and comes back once the scroll ends', async () => {
    await renderWithProviders(<PreferencesScreen />);
    const scrollView = screen.getByTestId('preferences-scroll');

    expect(screen.getByRole('button', { name: 'Enregistrer mes préférences' })).toBeOnTheScreen();

    await fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 200 } } });
    expect(screen.queryByRole('button', { name: 'Enregistrer mes préférences' })).toBeNull();

    await fireEvent(scrollView, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 200 } },
    });
    expect(screen.getByRole('button', { name: 'Enregistrer mes préférences' })).toBeOnTheScreen();
  });

  it('brings the sticky footer CTA back on an upward scroll, without waiting for the scroll to end', async () => {
    await renderWithProviders(<PreferencesScreen />);
    const scrollView = screen.getByTestId('preferences-scroll');

    await fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 200 } } });
    expect(screen.queryByRole('button', { name: 'Enregistrer mes préférences' })).toBeNull();

    await fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 170 } } });
    expect(screen.getByRole('button', { name: 'Enregistrer mes préférences' })).toBeOnTheScreen();
  });
});
