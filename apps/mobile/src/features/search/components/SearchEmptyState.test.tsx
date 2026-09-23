import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Experience } from '@/types';

import { SearchEmptyState } from './SearchEmptyState';

const FALLBACK: Experience[] = [
  {
    id: 'exp-fallback',
    title: 'Balade au parc',
    description: 'Une parenthèse verte.',
    moods: ['calm'],
    categoryIds: ['cat-park'],
    placeIds: [],
    estimatedDurationMin: 60,
    estimatedBudget: 'free',
  },
];

function renderEmptyState(overrides: Partial<Parameters<typeof SearchEmptyState>[0]> = {}) {
  const props = {
    onExpandArea: jest.fn(),
    onClearFilters: jest.fn(),
    onSeeTrending: jest.fn(),
    fallbackExperiences: FALLBACK,
    favoriteIds: new Set<string>(),
    onToggleFavorite: jest.fn(),
    onPressExperience: jest.fn(),
    ...overrides,
  };
  return { props, utils: renderWithProviders(<SearchEmptyState {...props} />) };
}

describe('SearchEmptyState (sprint 6 — no results)', () => {
  it('shows the no-results copy and the three relax-a-constraint actions', async () => {
    const { utils } = renderEmptyState();
    await utils;

    expect(screen.getByText('Aucune sortie trouvée')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Élargir la zone' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retirer un filtre' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voir les tendances' })).toBeOnTheScreen();
  });

  it('shows the fallback "Peut-être que ça te plaira" carousel', async () => {
    const { utils } = renderEmptyState();
    await utils;

    expect(screen.getByText('Peut-être que ça te plaira')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Balade au parc' })).toBeOnTheScreen();
  });

  it('calls each action handler', async () => {
    const { props, utils } = renderEmptyState();
    await utils;

    await fireEvent.press(screen.getByRole('button', { name: 'Élargir la zone' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Retirer un filtre' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voir les tendances' }));

    expect(props.onExpandArea).toHaveBeenCalled();
    expect(props.onClearFilters).toHaveBeenCalled();
    expect(props.onSeeTrending).toHaveBeenCalled();
  });
});
