import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { SearchScreen } from './SearchScreen';
import { SearchSessionProvider } from './SearchSessionContext';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: { context?: string; openFilters?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

async function renderSearch() {
  return renderWithProviders(
    <SearchSessionProvider>
      <SearchScreen />
    </SearchSessionProvider>,
  );
}

async function submitQuery(text: string) {
  await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), text);
  await fireEvent(screen.getByLabelText('Que veux-tu découvrir ?'), 'submitEditing');
  await screen.findByTestId('search-results-list');
}

function listIds(): string[] {
  return screen
    .getByTestId('search-results-list')
    .props.data.map((experience: { id: string }) => experience.id);
}

async function typeAndWaitForSuggestions(text: string) {
  await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), text);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
}

describe('SearchScreen (sprint 6 — global search)', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    mockPush.mockClear();
    mockBack.mockClear();
    mockParams = { context: 'discover' };
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the initial state: trending chips and explore-by-mood, no recent searches yet', async () => {
    await renderSearch();

    expect(screen.getByText('Tendances')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Rooftops' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Restaurants' })).toBeOnTheScreen();
    expect(screen.getByText('Explorer par envie')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ce soir' })).toBeOnTheScreen();
    expect(screen.queryByText('Recherches récentes')).toBeNull();
  });

  it('uses the Discover placeholder when opened with context=discover', async () => {
    mockParams = { context: 'discover' };
    await renderSearch();
    expect(screen.getByLabelText('Que veux-tu découvrir ?')).toBeOnTheScreen();
  });

  it('uses the Home placeholder when opened with context=home', async () => {
    mockParams = { context: 'home' };
    await renderSearch();
    expect(screen.getByLabelText('Explorer un lieu, une activité…')).toBeOnTheScreen();
  });

  it('shows live suggestions while typing', async () => {
    await renderSearch();

    await typeAndWaitForSuggestions('rooftop');

    expect(screen.getByText('Expériences')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Rooftop Sunset' })).toBeOnTheScreen();
  });

  it('tapping an experience suggestion navigates straight to Experience Detail', async () => {
    await renderSearch();

    await typeAndWaitForSuggestions('rooftop');
    await fireEvent.press(screen.getByRole('button', { name: 'Rooftop Sunset' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-rooftop-sunset' },
    });
  });

  it('submitting a query shows the results header and a matching result card', async () => {
    await renderSearch();

    await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), 'rooftop');
    await fireEvent(screen.getByLabelText('Que veux-tu découvrir ?'), 'submitEditing');

    expect(await screen.findByText('2 expériences')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Rooftop Sunset' })).toBeOnTheScreen();
  });

  it('tapping a result navigates to Experience Detail and favoriting works', async () => {
    await renderSearch();

    await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), 'rooftop');
    await fireEvent(screen.getByLabelText('Que veux-tu découvrir ?'), 'submitEditing');
    await screen.findByText('2 expériences');

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter aux favoris' }));
    expect(screen.queryByRole('button', { name: 'Ajouter aux favoris' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Retirer des favoris' })).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Rooftop Sunset' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-rooftop-sunset' },
    });
  });

  it('clearing the query returns to the initial state', async () => {
    await renderSearch();

    await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), 'rooftop');
    await fireEvent(screen.getByLabelText('Que veux-tu découvrir ?'), 'submitEditing');
    await screen.findByText('2 expériences');

    await fireEvent.press(screen.getByRole('button', { name: 'Effacer la recherche' }));

    expect(screen.getByText('Tendances')).toBeOnTheScreen();
    expect(screen.queryByText('2 expériences')).toBeNull();
  });

  it('a submitted search is saved to recent searches and can be relaunched or removed', async () => {
    await renderSearch();

    await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), 'rooftop');
    await fireEvent(screen.getByLabelText('Que veux-tu découvrir ?'), 'submitEditing');
    await screen.findByText('2 expériences');

    await fireEvent.press(screen.getByRole('button', { name: 'Effacer la recherche' }));

    await waitFor(() => {
      expect(screen.getByText('Recherches récentes')).toBeOnTheScreen();
    });
    const recentSection = within(screen.getByTestId('search-section-recent'));
    expect(recentSection.getByText('rooftop')).toBeOnTheScreen();

    await fireEvent.press(recentSection.getByRole('button', { name: 'rooftop' }));
    expect(await screen.findByText('2 expériences')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Effacer la recherche' }));
    await waitFor(() => {
      expect(screen.getByText('Recherches récentes')).toBeOnTheScreen();
    });
    const recentSectionAgain = within(screen.getByTestId('search-section-recent'));
    await fireEvent.press(
      recentSectionAgain.getByRole('button', {
        name: 'Supprimer « rooftop » des recherches récentes',
      }),
    );

    await waitFor(() => {
      expect(screen.queryByText('Recherches récentes')).toBeNull();
    });
  });

  it('tapping a trending chip submits it as the query', async () => {
    await renderSearch();

    await fireEvent.press(screen.getByRole('button', { name: 'Bars' }));

    await waitFor(() => {
      expect(screen.getByTestId('search-action-bar')).toBeOnTheScreen();
    });
  });

  it('shows the empty state for a query with no matches, with a fallback carousel', async () => {
    await renderSearch();

    await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), 'zzznotfound');
    await fireEvent(screen.getByLabelText('Que veux-tu découvrir ?'), 'submitEditing');

    expect(await screen.findByText('Aucune sortie trouvée')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voir les tendances' })).toBeOnTheScreen();
    expect(screen.getByText('Peut-être que ça te plaira')).toBeOnTheScreen();
  });

  it('list mode: Trier / Filtres / Carte sit under the search bar, above the results', async () => {
    await renderSearch();
    await submitQuery('rooftop');

    expect(screen.getByRole('button', { name: 'Trier' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Carte' })).toBeOnTheScreen();
    expect(screen.getByTestId('search-results-list')).toBeOnTheScreen();
    expect(screen.queryByTestId('roam-map')).toBeNull();
  });

  it('opens and applies the filter sheet from the results header, narrowing the results', async () => {
    await renderSearch();

    await fireEvent.changeText(screen.getByLabelText('Que veux-tu découvrir ?'), 'rooftop');
    await fireEvent(screen.getByLabelText('Que veux-tu découvrir ?'), 'submitEditing');
    await screen.findByText('2 expériences');

    await fireEvent.press(screen.getByRole('button', { name: 'Filtres' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bars & Soirées' })).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Bars & Soirées' }));
    await fireEvent.press(screen.getByRole('button', { name: /Voir \d+ résultats/ }));

    expect(await screen.findByText('1 expériences')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Rooftop Sunset' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Mama Shelter' })).toBeNull();
  });

  it('opening Search with openFilters=1 shows the filter sheet immediately, even before any query', async () => {
    mockParams = { context: 'discover', openFilters: '1' };
    await renderSearch();

    await waitFor(() => {
      expect(screen.getByText('Filtres')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Réinitialiser' })).toBeOnTheScreen();
    });
  });

  describe('sort (sprint 8)', () => {
    const DEFAULT_ORDER = [
      'exp-jazz-night',
      'exp-rooftop-sunset',
      'exp-live-concert',
      'exp-hasard-ludique',
      'exp-mama-shelter',
      'exp-bellevilloise',
    ];
    const NEAREST_ORDER = [
      'exp-rooftop-sunset',
      'exp-bellevilloise',
      'exp-jazz-night',
      'exp-hasard-ludique',
      'exp-mama-shelter',
      'exp-live-concert',
    ];

    it('opens the sort sheet from "Trier" and closes it without changing anything', async () => {
      await renderSearch();
      await submitQuery('festive');

      await fireEvent.press(screen.getByRole('button', { name: 'Trier' }));
      expect(await screen.findByRole('radio', { name: 'Plus proche' })).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
      expect(listIds()).toEqual(DEFAULT_ORDER);
    });

    it('selecting "Plus proche" reorders the results, shows the sort and marks Trier active', async () => {
      await renderSearch();
      await submitQuery('festive');
      expect(listIds()).toEqual(DEFAULT_ORDER);
      expect(screen.getByRole('button', { name: 'Trier' })).not.toBeSelected();

      await fireEvent.press(screen.getByRole('button', { name: 'Trier' }));
      await fireEvent.press(await screen.findByRole('radio', { name: 'Plus proche' }));

      expect(listIds()).toEqual(NEAREST_ORDER);
      expect(screen.getByRole('button', { name: 'Trier' })).toBeSelected();
      expect(
        within(screen.getByTestId('search-action-bar')).getByText('Plus proche'),
      ).toBeOnTheScreen();
      // Sorting reorders, it doesn't change what matches.
      expect(screen.getByText('6 expériences')).toBeOnTheScreen();
    });

    it('going back to "Recommandé" restores the original order', async () => {
      await renderSearch();
      await submitQuery('festive');

      await fireEvent.press(screen.getByRole('button', { name: 'Trier' }));
      await fireEvent.press(await screen.findByRole('radio', { name: 'Plus proche' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Trier' }));
      await fireEvent.press(await screen.findByRole('radio', { name: 'Recommandé' }));

      expect(listIds()).toEqual(DEFAULT_ORDER);
      expect(screen.getByRole('button', { name: 'Trier' })).not.toBeSelected();
    });
  });

  describe('"Carte" (sprint 8 — opens SearchMapScreen)', () => {
    it('pushes the dedicated /search/map route instead of drawing a map in the list', async () => {
      await renderSearch();
      await submitQuery('rooftop');

      await fireEvent.press(screen.getByRole('button', { name: 'Carte' }));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/search/map',
        params: { context: 'discover' },
      });
      expect(screen.queryByTestId('roam-map')).toBeNull();
      expect(screen.getByTestId('search-results-list')).toBeOnTheScreen();
    });
  });

  it('back button navigates back', async () => {
    await renderSearch();

    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockBack).toHaveBeenCalled();
  });
});
