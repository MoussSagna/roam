import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { TabBarCollapseProvider } from '@/features/navigation/TabBarCollapseContext';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HomeScreen } from './HomeScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

async function renderHome() {
  return renderWithProviders(
    <TabBarCollapseProvider>
      <HomeScreen />
    </TabBarCollapseProvider>,
  );
}

describe('HomeScreen (sprint 5 — discovery)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the hero carousel on the first experience, with dots for every slide', async () => {
    await renderHome();

    expect(screen.getByRole('header')).toHaveTextContent('Dîners avec vue');
    expect(
      screen.getByText('Les plus belles terrasses de Paris pour des soirées inoubliables.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: "Voir l'expérience" })).toBeOnTheScreen();
  });

  it('swiping the hero carousel moves to the next experience', async () => {
    await renderHome();

    const carousel = screen.getByTestId('hero-carousel-scroll');
    await fireEvent.scroll(carousel, {
      nativeEvent: { contentOffset: { x: 390, y: 0 }, layoutMeasurement: { width: 390 } },
    });

    expect(screen.getByRole('header')).toHaveTextContent('Balade panoramique');
  });

  it('shows the search bar and the filter button', async () => {
    await renderHome();

    // Two live instances (in-flow + `HomeHeader`'s docked `searchSlot`, sprint 6 "sticky search",
    // D-69) — both render the same placeholder.
    expect(screen.getAllByText('Explorer un lieu, une activité…').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Filtres' }).length).toBeGreaterThan(0);
  });

  it('opens Search (context: home) when the search bar is pressed', async () => {
    await renderHome();

    const [firstSearchBar] = screen.getAllByRole('search');
    await fireEvent.press(firstSearchBar);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search',
      params: { context: 'home' },
    });
  });

  it('opens Search with the filter sheet when the filter button is pressed', async () => {
    await renderHome();

    const [firstFilterButton] = screen.getAllByRole('button', { name: 'Filtres' });
    await fireEvent.press(firstFilterButton);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search',
      params: { context: 'home', openFilters: '1' },
    });
  });

  it('opens Search identically from the header-docked search bar once scrolled past the Hero (D-69)', async () => {
    await renderHome();

    const searchBars = screen.getAllByRole('search');
    expect(searchBars.length).toBe(2);

    const homeScroll = screen.getByTestId('home-scroll');
    // Past the Hero (docks the search row) then a small scroll up — same "sustained down hides,
    // any up reveals immediately" contract the notification-button tests above rely on
    // (`useScrollDirection`), so the header (bell + docked search) is visible again to press.
    await fireEvent.scroll(homeScroll, { nativeEvent: { contentOffset: { y: 900 } } });
    await fireEvent.scroll(homeScroll, { nativeEvent: { contentOffset: { y: 870 } } });

    await fireEvent.press(searchBars[1]);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search',
      params: { context: 'home' },
    });
  });

  it('shows all five mood chips and lets the user pick one', async () => {
    await renderHome();

    const moods = within(screen.getByTestId('home-section-moods'));
    expect(moods.getByRole('button', { name: 'Calme' })).toBeSelected();
    expect(moods.getByRole('button', { name: 'Food' })).toBeOnTheScreen();
    expect(moods.getByRole('button', { name: 'Culture' })).toBeOnTheScreen();
    expect(moods.getByRole('button', { name: 'Festif' })).toBeOnTheScreen();
    expect(moods.getByRole('button', { name: 'Romantique' })).toBeOnTheScreen();

    await fireEvent.press(moods.getByRole('button', { name: 'Festif' }));

    expect(moods.getByRole('button', { name: 'Festif' })).toBeSelected();
    expect(moods.getByRole('button', { name: 'Calme' })).not.toBeSelected();
  });

  it('lists the most popular experiences with their rating and the "very popular" badge', async () => {
    await renderHome();

    const popular = within(screen.getByTestId('home-section-popular'));
    expect(popular.getByText('Rooftop Sunset')).toBeOnTheScreen();
    expect(popular.getByText('Randonnée au lac bleu')).toBeOnTheScreen();
    expect(popular.getByText('Musée d’Art Moderne')).toBeOnTheScreen();
    expect(popular.getAllByText('Très populaire')).toHaveLength(3);
  });

  it('lists nearby place categories', async () => {
    await renderHome();

    const nearby = within(screen.getByTestId('home-section-nearby'));
    expect(nearby.getByRole('button', { name: 'Restaurants' })).toBeOnTheScreen();
    expect(nearby.getByRole('button', { name: 'Bars' })).toBeOnTheScreen();
    expect(nearby.getByRole('button', { name: 'Culture' })).toBeOnTheScreen();
    expect(nearby.getByRole('button', { name: 'Parcs' })).toBeOnTheScreen();
    expect(nearby.getByRole('button', { name: 'Expériences' })).toBeOnTheScreen();
  });

  it('picks four deterministic recommendations for "Des idées pour toi"', async () => {
    await renderHome();

    const forYou = within(screen.getByTestId('home-section-forYou'));
    // Default mood is "Calme": the first calm-tagged experience, a culture pick, the top-rated
    // popular one and the nearest one (see `lib/pickForYou.ts`).
    expect(forYou.getByText('Après-midi lente')).toBeOnTheScreen();
    expect(forYou.getByText('Musée nocturne')).toBeOnTheScreen();
    expect(forYou.getByText('Rooftop Sunset')).toBeOnTheScreen();
    expect(forYou.getByText('Balade panoramique')).toBeOnTheScreen();
  });

  it('toggles a card into favorites and back', async () => {
    await renderHome();

    const popular = within(screen.getByTestId('home-section-popular'));
    const [favoriteButton] = popular.getAllByRole('button', { name: 'Ajouter aux favoris' });

    await fireEvent.press(favoriteButton);
    expect(popular.getAllByRole('button', { name: 'Retirer des favoris' })).toHaveLength(1);
    expect(popular.getByRole('button', { name: 'Retirer des favoris' })).toBeSelected();

    await fireEvent.press(popular.getByRole('button', { name: 'Retirer des favoris' }));
    expect(popular.getAllByRole('button', { name: 'Ajouter aux favoris' })).toHaveLength(3);
  });

  it('navigates to the experience detail when "Voir l’expérience" is pressed', async () => {
    await renderHome();

    await fireEvent.press(screen.getByRole('button', { name: "Voir l'expérience" }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-dinner-view' },
    });
  });

  it('shows the notification button at the top, hides it on a sustained scroll down, and brings it back on scroll up', async () => {
    await renderHome();

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeOnTheScreen();

    const homeScroll = screen.getByTestId('home-scroll');
    await fireEvent.scroll(homeScroll, { nativeEvent: { contentOffset: { y: 200 } } });

    expect(screen.queryByRole('button', { name: 'Notifications' })).toBeNull();

    await fireEvent.scroll(homeScroll, { nativeEvent: { contentOffset: { y: 170 } } });

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeOnTheScreen();
  });

  it('keeps the notification button visible for a small scroll that never leaves the top zone', async () => {
    await renderHome();

    const homeScroll = screen.getByTestId('home-scroll');
    await fireEvent.scroll(homeScroll, { nativeEvent: { contentOffset: { y: 10 } } });

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeOnTheScreen();
  });

  it('brings the notification button back once the scroll returns to the top', async () => {
    await renderHome();

    const homeScroll = screen.getByTestId('home-scroll');
    await fireEvent.scroll(homeScroll, { nativeEvent: { contentOffset: { y: 200 } } });
    expect(screen.queryByRole('button', { name: 'Notifications' })).toBeNull();

    await fireEvent.scroll(homeScroll, { nativeEvent: { contentOffset: { y: 0 } } });

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeOnTheScreen();
  });
});
