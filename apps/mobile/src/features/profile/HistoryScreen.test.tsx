import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HistoryScreen } from './HistoryScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
}));

describe('HistoryScreen', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the header and the mocked history grouped by section', async () => {
    await renderWithProviders(<HistoryScreen />);

    expect(await screen.findByText('Rooftop Sunset')).toBeOnTheScreen();
    expect(screen.getByRole('header')).toHaveTextContent('Mon historique');
    expect(screen.getByText('Cette semaine')).toBeOnTheScreen();
    expect(screen.getByText('Ce mois-ci')).toBeOnTheScreen();
    expect(screen.getByText('Plus tôt')).toBeOnTheScreen();
    expect(screen.getByText('Musée d’Art Moderne')).toBeOnTheScreen();
    expect(screen.getByText('Après-midi lente')).toBeOnTheScreen();
    expect(screen.getByText('Balade panoramique')).toBeOnTheScreen();
    expect(screen.getByText('Pique-nique au parc')).toBeOnTheScreen();
    expect(screen.getByText('Le Hasard Ludique')).toBeOnTheScreen();
    // Only completed experiences show up.
    expect(screen.queryByText('Dîners avec vue')).toBeNull();
  });

  it('shows the visit date and a category · location subtitle', async () => {
    await renderWithProviders(<HistoryScreen />);

    expect(await screen.findByText('Sam. 16 mars 2024')).toBeOnTheScreen();
    expect(screen.getByText('Nature · Montmartre, Paris')).toBeOnTheScreen();
  });

  it('filters the list by category, hiding rows and emptying sections', async () => {
    await renderWithProviders(<HistoryScreen />);

    await screen.findByText('Rooftop Sunset');
    expect(screen.getByRole('button', { name: 'Tout' })).toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'Culture' }));

    expect(screen.getByRole('button', { name: 'Culture' })).toBeSelected();
    expect(screen.getByText('Musée d’Art Moderne')).toBeOnTheScreen();
    expect(screen.queryByText('Rooftop Sunset')).toBeNull();
    // "Ce mois-ci" and "Plus tôt" have no culture entries once filtered.
    expect(screen.queryByText('Ce mois-ci')).toBeNull();
    expect(screen.queryByText('Plus tôt')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Tout' }));
    expect(screen.getByText('Rooftop Sunset')).toBeOnTheScreen();
  });

  it('tapping a row navigates to the experience detail', async () => {
    await renderWithProviders(<HistoryScreen />);

    await screen.findByText('Rooftop Sunset');
    await fireEvent.press(screen.getByRole('button', { name: 'Rooftop Sunset' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-rooftop-sunset' },
    });
  });

  it('the back button calls router.back', async () => {
    await renderWithProviders(<HistoryScreen />);

    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
