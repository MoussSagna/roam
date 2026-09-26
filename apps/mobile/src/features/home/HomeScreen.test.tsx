import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { TabBarCollapseProvider } from '@/features/navigation/TabBarCollapseContext';
import i18n from '@/i18n';
import { ApiError, repositories } from '@/services';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CARD_WIDTH } from './components/ExperienceCard';
import { SKELETON_DELAY_MS } from './components/ExperienceCarouselLoading';
import { NEARBY_CARD_WIDTH } from './components/NearbyCard';
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

  it('a failed load (API mode) shows why and retries — never an endless loading state', async () => {
    const actualList = repositories.experiences.list;
    const list = jest
      .spyOn(repositories.experiences, 'list')
      .mockRejectedValueOnce(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: '' }))
      .mockImplementation(actualList);

    await renderHome();

    expect(screen.getByText('Vérifie ta connexion puis réessaie.')).toBeOnTheScreen();
    expect(screen.queryByText('Chargement…')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));

    expect(list).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('header')).toHaveTextContent('Dîners avec vue');
    list.mockRestore();
  });

  describe('progressive loading and horizontal lists (API-12)', () => {
    it('while the experiences load: no full-screen wait — hero skeleton, static sections at once, popular loading', async () => {
      const list = jest
        .spyOn(repositories.experiences, 'list')
        .mockReturnValue(new Promise(() => {}));

      await renderHome();

      expect(screen.getByTestId('hero-skeleton')).toBeOnTheScreen();
      expect(screen.queryByRole('header')).toBeNull();
      // What needs no experience is there already.
      const moods = within(screen.getByTestId('home-section-moods'));
      expect(moods.getByRole('button', { name: 'Calme' })).toBeOnTheScreen();
      const nearby = within(screen.getByTestId('home-section-nearby'));
      expect(nearby.getByRole('button', { name: 'Parcs' })).toBeOnTheScreen();
      expect(screen.getByTestId('home-popular-loading')).toBeOnTheScreen();
      list.mockRestore();
    });

    it('every horizontal section is a full-bleed FlatList; card lists snap on their real width + gap', async () => {
      await renderHome();
      await screen.findByTestId('home-forYou-list');

      const bleed = {
        style: [{ marginHorizontal: -24 }, undefined],
        horizontal: true,
      };
      for (const id of ['home-popular-list', 'home-forYou-list']) {
        expect(screen.getByTestId(id).props).toMatchObject({
          ...bleed,
          snapToInterval: CARD_WIDTH + 16,
          snapToAlignment: 'start',
          decelerationRate: 'fast',
          contentContainerStyle: { paddingHorizontal: 24, gap: 16 },
        });
      }
      expect(screen.getByTestId('home-nearby-list').props).toMatchObject({
        ...bleed,
        snapToInterval: NEARBY_CARD_WIDTH + 18,
        contentContainerStyle: { paddingHorizontal: 24, gap: 18 },
      });
      // Chips of varying widths: no snap.
      expect(screen.getByTestId('home-moods-list').props).toMatchObject({
        ...bleed,
        snapToInterval: undefined,
        decelerationRate: 'normal',
        contentContainerStyle: { paddingHorizontal: 24, gap: 10 },
      });
    });
  });

  describe('"Des idées pour toi" through RecommendationRepository (API-12)', () => {
    it('follows the selected mood (mock mode keeps its pool)', async () => {
      await renderHome();

      const moods = within(screen.getByTestId('home-section-moods'));
      await fireEvent.press(moods.getByRole('button', { name: 'Festif' }));

      const forYou = within(screen.getByTestId('home-section-forYou'));
      expect(await forYou.findByText('Soirée jazz')).toBeOnTheScreen();
    });

    it('loads on its own while the rest of Home is ready: a spinner, then skeleton cards laid out like the cards', async () => {
      const recommend = jest
        .spyOn(repositories.recommendations, 'recommend')
        .mockReturnValue(new Promise(() => {}));

      await renderHome();

      expect(screen.getByRole('header')).toHaveTextContent('Dîners avec vue');
      const forYou = within(screen.getByTestId('home-section-forYou'));
      // A short wait stays discreet.
      expect(forYou.getByLabelText('Chargement…')).toBeOnTheScreen();
      expect(
        forYou.queryAllByTestId('experience-card-skeleton', { includeHiddenElements: true }),
      ).toHaveLength(0);

      // A longer one shows skeletons, in the same carousel layout as the real list.
      await act(() => new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS + 50)));
      expect(
        forYou.getAllByTestId('experience-card-skeleton', { includeHiddenElements: true }),
      ).toHaveLength(3);
      const skeletonList = screen.getByTestId('home-forYou-loading-list');
      expect(skeletonList.props).toMatchObject({
        snapToInterval: CARD_WIDTH + 16,
        contentContainerStyle: { paddingHorizontal: 24, gap: 16 },
        style: [{ marginHorizontal: -24 }, undefined],
      });
      recommend.mockRestore();
    });

    it('an empty answer shows the empty message', async () => {
      const recommend = jest
        .spyOn(repositories.recommendations, 'recommend')
        .mockResolvedValue({ items: [], relaxed: [] });

      await renderHome();

      const forYou = within(screen.getByTestId('home-section-forYou'));
      expect(
        await forYou.findByText("Pas d'idée pour le moment. Reviens un peu plus tard."),
      ).toBeOnTheScreen();
      recommend.mockRestore();
    });

    it('a failure shows why inside the section and retries — never the mock pool', async () => {
      const actualRecommend = repositories.recommendations.recommend;
      const recommend = jest
        .spyOn(repositories.recommendations, 'recommend')
        .mockRejectedValueOnce(
          new ApiError({ status: 429, code: 'TOO_MANY_REQUESTS', message: '' }),
        )
        .mockImplementation(actualRecommend);

      await renderHome();

      const forYou = within(screen.getByTestId('home-section-forYou'));
      expect(
        await forYou.findByText('Trop de tentatives. Patiente un peu avant de réessayer.'),
      ).toBeOnTheScreen();
      expect(forYou.queryByText('Après-midi lente')).toBeNull();
      // The rest of Home stays usable.
      expect(screen.getByRole('header')).toHaveTextContent('Dîners avec vue');

      await fireEvent.press(forYou.getByRole('button', { name: 'Réessayer' }));

      expect(await forYou.findByText('Après-midi lente')).toBeOnTheScreen();
      expect(recommend).toHaveBeenCalledTimes(2);
      recommend.mockRestore();
    });
  });
});
