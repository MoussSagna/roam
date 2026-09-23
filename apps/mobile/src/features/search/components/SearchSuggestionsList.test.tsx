import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Experience, SearchSuggestion } from '@/types';

import { SearchSuggestionsList } from './SearchSuggestionsList';

const EXPERIENCE: Experience = {
  id: 'exp-a',
  title: 'Après-midi lente',
  description: 'Un café, puis une promenade au parc.',
  moods: ['calm'],
  categoryIds: ['cat-cafe'],
  placeIds: [],
  estimatedDurationMin: 90,
  estimatedBudget: 'under10',
  rating: 4.3,
  distanceLabel: '800 m',
};

const SUGGESTIONS: SearchSuggestion[] = [
  { id: 'query-calm', label: 'calme', type: 'query' },
  { id: 'experience-exp-a', label: 'Après-midi lente', type: 'experience', experienceId: 'exp-a' },
];

describe('SearchSuggestionsList (sprint 6 — search suggestions)', () => {
  it('renders nothing when there are no suggestions', async () => {
    await renderWithProviders(
      <SearchSuggestionsList
        suggestions={[]}
        experiences={[EXPERIENCE]}
        onSelectQuery={jest.fn()}
        onSelectExperience={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('search-section-suggestions')).toBeNull();
  });

  it('shows query suggestions and experience suggestions in separate sections', async () => {
    await renderWithProviders(
      <SearchSuggestionsList
        suggestions={SUGGESTIONS}
        experiences={[EXPERIENCE]}
        onSelectQuery={jest.fn()}
        onSelectExperience={jest.fn()}
      />,
    );

    expect(screen.getByTestId('search-suggestions-queries')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'calme' })).toBeOnTheScreen();
    expect(screen.getByTestId('search-suggestions-experiences')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Après-midi lente' })).toBeOnTheScreen();
    expect(screen.getByText('4.3')).toBeOnTheScreen();
    expect(screen.getByText('· 800 m')).toBeOnTheScreen();
  });

  it('calls onSelectQuery when a query suggestion is pressed', async () => {
    const onSelectQuery = jest.fn();
    await renderWithProviders(
      <SearchSuggestionsList
        suggestions={SUGGESTIONS}
        experiences={[EXPERIENCE]}
        onSelectQuery={onSelectQuery}
        onSelectExperience={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'calme' }));

    expect(onSelectQuery).toHaveBeenCalledWith('calme');
  });

  it('calls onSelectExperience with the resolved experience when an experience suggestion is pressed', async () => {
    const onSelectExperience = jest.fn();
    await renderWithProviders(
      <SearchSuggestionsList
        suggestions={SUGGESTIONS}
        experiences={[EXPERIENCE]}
        onSelectQuery={jest.fn()}
        onSelectExperience={onSelectExperience}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Après-midi lente' }));

    expect(onSelectExperience).toHaveBeenCalledWith(EXPERIENCE);
  });

  it('drops an experience suggestion whose id is not in the loaded pool', async () => {
    await renderWithProviders(
      <SearchSuggestionsList
        suggestions={[{ id: 'experience-missing', label: 'Ghost', type: 'experience', experienceId: 'missing' }]}
        experiences={[EXPERIENCE]}
        onSelectQuery={jest.fn()}
        onSelectExperience={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('search-section-suggestions')).toBeNull();
  });
});
