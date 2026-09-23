import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { repositories } from '@/services';
import { renderWithProviders } from '@/test/renderWithProviders';

import { MapScreen } from './MapScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
}));

describe('MapScreen (sprint 7 — first real map)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders a real map (RoamMap) with the title and a back button', async () => {
    await renderWithProviders(<MapScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Ton parcours');
    expect(await screen.findByTestId('roam-map')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-map-view')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('pins the nearby mock experiences (nearest first pool, with coordinates)', async () => {
    await renderWithProviders(<MapScreen />);

    expect(await screen.findByRole('button', { name: 'Balade panoramique' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pique-nique au parc' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Dîners avec vue' })).toBeOnTheScreen();
    // "Escapade nature" is 18 km away: outside the "Près de toi" pool, so not pinned.
    expect(screen.queryByRole('button', { name: /Escapade/ })).toBeNull();
  });

  it('selecting a pin opens the card; its CTA opens the experience detail', async () => {
    await renderWithProviders(<MapScreen />);

    expect(screen.queryByTestId('experience-map-card')).toBeNull();
    await fireEvent.press(await screen.findByRole('button', { name: 'Balade panoramique' }));

    expect(screen.getByTestId('experience-map-card')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voir le lieu' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-panoramic-walk' },
    });
  });

  it('closes the card from its close button, from a second tap on the pin and from a tap on the map', async () => {
    await renderWithProviders(<MapScreen />);
    const pin = await screen.findByRole('button', { name: 'Balade panoramique' });

    await fireEvent.press(pin);
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByTestId('experience-map-card')).toBeNull();

    await fireEvent.press(pin);
    await fireEvent.press(pin);
    expect(screen.queryByTestId('experience-map-card')).toBeNull();

    await fireEvent.press(pin);
    await fireEvent.press(screen.getByTestId('mock-map-view'));
    expect(screen.queryByTestId('experience-map-card')).toBeNull();
  });

  it('shows the map without pins (and does not crash) when there is no data', async () => {
    const list = jest.spyOn(repositories.experiences, 'list').mockResolvedValueOnce([]);

    await renderWithProviders(<MapScreen />);

    expect(await screen.findByTestId('roam-map')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Balade panoramique' })).toBeNull();
    list.mockRestore();
  });
});
