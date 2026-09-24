import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import i18n from '@/i18n';
import { pressBareMap } from '@/test/reactNativeMapsMock';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { SearchFilters, SearchSortOption } from '@/types';

import { SearchMapScreen } from './SearchMapScreen';
import { SearchSessionProvider, useSearchSession } from './SearchSessionContext';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockParams: { context?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => mockCanGoBack,
  }),
  useLocalSearchParams: () => mockParams,
}));

/** Puts the shared session in the state `SearchScreen` would have left it in, before the map opens. */
function Seed({
  query,
  filters,
  sort,
}: {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSortOption;
}) {
  const session = useSearchSession();
  const { runSearch, applyFilters, setSort } = session;
  useEffect(() => {
    runSearch(query);
    if (filters) applyFilters(filters);
    if (sort) setSort(sort);
    // Seeds once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

async function renderMap(seed: Parameters<typeof Seed>[0] = { query: 'rooftop' }) {
  const utils = await renderWithProviders(
    <SearchSessionProvider>
      <Seed {...seed} />
      <SearchMapScreen />
    </SearchSessionProvider>,
  );
  await screen.findByTestId('roam-map');
  return utils;
}

describe('SearchMapScreen (sprint 8 — full-screen search map)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
    mockParams = { context: 'discover' };
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the search field, a single "Filtres" chip and the map — nothing else', async () => {
    await renderMap();

    expect(screen.getByLabelText('Que veux-tu découvrir ?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retour' })).toBeOnTheScreen();
    expect(screen.getByTestId('roam-map')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Trier' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Carte' })).toBeNull();
    expect(screen.queryByTestId('experience-map-card')).toBeNull();
  });

  it('shows the query of the shared search state, not an empty one', async () => {
    await renderMap({ query: 'rooftop' });

    await waitFor(() => {
      expect(screen.getByLabelText('Que veux-tu découvrir ?').props.value).toBe('rooftop');
    });
  });

  it('has no fixed height: the map fills the screen (absolute fill), edge to edge', async () => {
    await renderMap();

    const style = screen.getByTestId('roam-map').props.style;
    const flat = Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
    expect(flat).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
    expect(flat.height).toBeUndefined();
    expect(screen.getByTestId('roam-map').props.className).not.toMatch(/rounded-large/);
  });

  it('pins exactly the current search results', async () => {
    await renderMap({ query: 'rooftop' });

    expect(await screen.findByRole('button', { name: 'Rooftop Sunset' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mama Shelter' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Soirée jazz' })).toBeNull();
  });

  it('selecting a marker opens the ExperienceMapCard; "Voir le lieu" opens the detail', async () => {
    await renderMap();

    await fireEvent.press(await screen.findByRole('button', { name: 'Rooftop Sunset' }));
    expect(screen.getByTestId('experience-map-card')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Voir le lieu' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-rooftop-sunset' },
    });
  });

  it('closes the card from its close button, a second tap on the pin and a tap on the map', async () => {
    await renderMap();
    const pin = await screen.findByRole('button', { name: 'Rooftop Sunset' });

    await fireEvent.press(pin);
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByTestId('experience-map-card')).toBeNull();

    await fireEvent.press(pin);
    await fireEvent.press(pin);
    expect(screen.queryByTestId('experience-map-card')).toBeNull();

    await fireEvent.press(pin);
    await pressBareMap(screen.getByTestId('mock-map-view'));
    expect(screen.queryByTestId('experience-map-card')).toBeNull();
  });

  describe('filters (the one shared sheet)', () => {
    it('opens from the map, applies, and the pins follow the filtered results', async () => {
      await renderMap();
      expect(await screen.findByRole('button', { name: 'Mama Shelter' })).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Filtres' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Bars & Soirées' }));
      await fireEvent.press(screen.getByRole('button', { name: /Voir \d+ résultats/ }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Mama Shelter' })).toBeNull();
      });
      expect(screen.getByRole('button', { name: 'Rooftop Sunset' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Filtres' })).toBeSelected();
    });

    it('"Réinitialiser" then apply brings every pin back', async () => {
      await renderMap({ query: 'rooftop', filters: { categoryId: 'cat-bar' } });
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Mama Shelter' })).toBeNull();
      });
      expect(screen.getByRole('button', { name: 'Filtres' })).toBeSelected();

      await fireEvent.press(screen.getByRole('button', { name: 'Filtres' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Réinitialiser' }));
      await fireEvent.press(screen.getByRole('button', { name: /Voir \d+ résultats/ }));

      expect(await screen.findByRole('button', { name: 'Mama Shelter' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Filtres' })).not.toBeSelected();
    });
  });

  it('keeps the sort of the list: the same pins whichever sort is active', async () => {
    await renderMap({ query: 'festive', sort: 'nearest' });

    for (const title of [
      'Soirée jazz',
      'Rooftop Sunset',
      'Concert intimiste',
      'La Bellevilloise',
    ]) {
      expect(await screen.findByRole('button', { name: title })).toBeOnTheScreen();
    }
  });

  it('shows a quiet "no result" hint (and no pin, no crash) when nothing matches', async () => {
    await renderMap({ query: 'zzznotfound' });

    expect(await screen.findByTestId('search-map-empty')).toBeOnTheScreen();
    expect(screen.getByText('Aucune sortie trouvée')).toBeOnTheScreen();
    expect(screen.getByTestId('roam-map')).toBeOnTheScreen();
  });

  describe('back to the list', () => {
    it('the back button goes back (the list keeps its state)', async () => {
      await renderMap();

      await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('falls back to /search when there is nothing to go back to (deep link)', async () => {
      mockCanGoBack = false;
      await renderMap();

      await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));

      expect(mockBack).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/search');
    });

    it('clearing the search field empties the search and returns to the list', async () => {
      await renderMap();

      await fireEvent.press(screen.getByRole('button', { name: 'Effacer la recherche' }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});
