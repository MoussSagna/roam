import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { StatisticsScreen } from './StatisticsScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

describe('StatisticsScreen', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the header, range chips and the three summary cards', async () => {
    await renderWithProviders(<StatisticsScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Mes statistiques');
    expect(screen.getByRole('button', { name: 'Tout' })).toBeSelected();
    expect(screen.getByRole('button', { name: '30 jours' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '6 mois' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '1 an' })).toBeOnTheScreen();

    // "Sorties" appears twice: the stat card and the donut chart's center label.
    expect(screen.getAllByText('Sorties').length).toBeGreaterThan(0);
    expect(screen.getByText('Lieux découverts')).toBeOnTheScreen();
    expect(screen.getAllByText('Favoris').length).toBeGreaterThan(0);
  });

  it('shows the genre, mood and city breakdown sections', async () => {
    await renderWithProviders(<StatisticsScreen />);

    expect(screen.getByText('Tes genres préférés')).toBeOnTheScreen();
    expect(screen.getByText('Culture')).toBeOnTheScreen();
    expect(screen.getByText('32%')).toBeOnTheScreen();

    expect(screen.getByText('Ton humeur lors des sorties')).toBeOnTheScreen();
    expect(screen.getByText('Détendu')).toBeOnTheScreen();
    expect(screen.getByText('42%')).toBeOnTheScreen();

    expect(screen.getByText('Villes visitées')).toBeOnTheScreen();
    expect(screen.getByText('Paris')).toBeOnTheScreen();
    expect(screen.getByText('85%')).toBeOnTheScreen();
  });

  it('shows the insight card', async () => {
    await renderWithProviders(<StatisticsScreen />);

    expect(
      screen.getByText(/Tu explores surtout des lieux culturels et des restaurants/),
    ).toBeOnTheScreen();
  });

  it('selecting a range chip updates its selection', async () => {
    await renderWithProviders(<StatisticsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: '6 mois' }));

    expect(screen.getByRole('button', { name: '6 mois' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Tout' })).not.toBeSelected();
  });

  it('the back button calls router.back', async () => {
    await renderWithProviders(<StatisticsScreen />);

    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
