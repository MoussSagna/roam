import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { TabBarCollapseProvider } from '@/features/navigation/TabBarCollapseContext';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { DiscoverScreen } from './DiscoverScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

async function renderDiscover() {
  return renderWithProviders(
    <TabBarCollapseProvider>
      <DiscoverScreen />
    </TabBarCollapseProvider>,
  );
}

describe('DiscoverScreen (sprint 6 — immersive discovery)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the title, subtitle and search bar', async () => {
    await renderDiscover();

    expect(screen.getByRole('header')).toHaveTextContent('Découvrir');
    expect(
      screen.getByText("Des lieux, des expériences, des idées pour aujourd'hui."),
    ).toBeOnTheScreen();
    expect(screen.getByText('Que veux-tu découvrir ?')).toBeOnTheScreen();
  });

  it('opens Search (context: discover) when the search bar is pressed', async () => {
    await renderDiscover();

    await fireEvent.press(screen.getByRole('search'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search',
      params: { context: 'discover' },
    });
  });

  it('opens Search with the filter sheet when the filter button is pressed', async () => {
    await renderDiscover();

    await fireEvent.press(screen.getByRole('button', { name: 'Filtres' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search',
      params: { context: 'discover', openFilters: '1' },
    });
  });

  it('shows the four secondary-nav tabs, "Pour toi" selected by default', async () => {
    await renderDiscover();

    expect(screen.getByRole('button', { name: 'Pour toi' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Tendances' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'À proximité' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Collections' })).toBeOnTheScreen();
  });

  it('shows the full editorial mix on "Pour toi": ROAM selection, suggestions, immersive card, nearby, trending and collections', async () => {
    await renderDiscover();

    expect(screen.getByText('Les plus beaux rooftops de Paris')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('discover-section-suggestions')).getByRole('button', {
        name: 'Ce soir',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Pour une soirée qui change')).toBeOnTheScreen();
    expect(screen.getByTestId('discover-section-nearby')).toBeOnTheScreen();
    expect(screen.getByTestId('discover-section-trending')).toBeOnTheScreen();
    expect(screen.getByTestId('discover-section-collections')).toBeOnTheScreen();
  });

  it('narrows the page down to "Près de toi" when "À proximité" is selected', async () => {
    await renderDiscover();

    await fireEvent.press(screen.getByRole('button', { name: 'À proximité' }));

    expect(screen.getByTestId('discover-section-nearby')).toBeOnTheScreen();
    expect(screen.queryByTestId('discover-section-trending')).toBeNull();
    expect(screen.queryByTestId('discover-section-collections')).toBeNull();
    expect(screen.queryByText('Les plus beaux rooftops de Paris')).toBeNull();
  });

  it('narrows the page down to "Tendances" when selected', async () => {
    await renderDiscover();

    await fireEvent.press(screen.getByRole('button', { name: 'Tendances' }));

    expect(screen.getByTestId('discover-section-trending')).toBeOnTheScreen();
    expect(screen.queryByTestId('discover-section-nearby')).toBeNull();
  });

  it('narrows the page down to "Collections" when selected', async () => {
    await renderDiscover();

    await fireEvent.press(screen.getByRole('button', { name: 'Collections' }));

    expect(screen.getByTestId('discover-section-collections')).toBeOnTheScreen();
    expect(screen.queryByTestId('discover-section-trending')).toBeNull();
  });

  it('lets a suggestion mood tile be selected and unselected', async () => {
    await renderDiscover();

    const tonight = screen.getByRole('button', { name: 'Ce soir' });
    expect(tonight).not.toBeSelected();

    await fireEvent.press(tonight);
    expect(tonight).toBeSelected();

    await fireEvent.press(tonight);
    expect(tonight).not.toBeSelected();
  });

  it('navigates to the experience detail when a nearby card is pressed', async () => {
    await renderDiscover();

    const nearby = within(screen.getByTestId('discover-section-nearby'));
    // Nearest experience by mock distance label — see `lib/pickNearby.ts`.
    await fireEvent.press(nearby.getByRole('button', { name: 'Balade panoramique' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-panoramic-walk' },
    });
  });

  it('navigates to the immersive experience when its CTA is pressed', async () => {
    await renderDiscover();

    await fireEvent.press(screen.getByRole('button', { name: 'Explorer' }));

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/experience/[id]' }),
    );
  });

  it('navigates to a collection when the ROAM selection card is pressed', async () => {
    await renderDiscover();

    await fireEvent.press(screen.getByRole('button', { name: 'Les plus beaux rooftops de Paris' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/collection/[id]',
      params: { id: 'col-rooftops' },
    });
  });

  it('navigates to the map when "Voir la carte" is pressed', async () => {
    await renderDiscover();

    await fireEvent.press(screen.getByRole('button', { name: 'Voir la carte' }));

    expect(mockPush).toHaveBeenCalledWith('/map');
  });
});
