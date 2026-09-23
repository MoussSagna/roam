import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { SearchResultsHeader } from './SearchResultsHeader';

function renderHeader(overrides: Partial<Parameters<typeof SearchResultsHeader>[0]> = {}) {
  const props = {
    resultCount: 4,
    filters: {},
    onChangeFilters: jest.fn(),
    onOpenFilters: jest.fn(),
    view: 'list' as const,
    onChangeView: jest.fn(),
    ...overrides,
  };
  return { props, render: renderWithProviders(<SearchResultsHeader {...props} />) };
}

describe('SearchResultsHeader (sprint 6 — search results)', () => {
  it('shows the result count and "Tous" selected by default', async () => {
    const { render } = renderHeader({ resultCount: 4 });
    await render;

    expect(screen.getByText('4 expériences')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tous' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Ouvert maintenant' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: '< 2 km' })).not.toBeSelected();
  });

  it('selecting "Ouvert maintenant" sets openNow and selecting "Tous" clears it again', async () => {
    const { props, render } = renderHeader();
    await render;

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvert maintenant' }));
    expect(props.onChangeFilters).toHaveBeenCalledWith(
      expect.objectContaining({ openNow: true }),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tous' }));
    expect(props.onChangeFilters).toHaveBeenLastCalledWith(
      expect.objectContaining({ openNow: undefined, maxDistanceKm: undefined }),
    );
  });

  it('selecting "< 2 km" sets maxDistanceKm to 2', async () => {
    const { props, render } = renderHeader();
    await render;

    await fireEvent.press(screen.getByRole('button', { name: '< 2 km' }));

    expect(props.onChangeFilters).toHaveBeenCalledWith(
      expect.objectContaining({ maxDistanceKm: 2 }),
    );
  });

  it('reflects an already-active quick filter as selected', async () => {
    const { render } = renderHeader({ filters: { openNow: true } });
    await render;

    expect(screen.getByRole('button', { name: 'Ouvert maintenant' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Tous' })).not.toBeSelected();
  });

  it('calls onOpenFilters when "Filtres" is pressed', async () => {
    const { props, render } = renderHeader();
    await render;

    await fireEvent.press(screen.getByRole('button', { name: 'Filtres' }));

    expect(props.onOpenFilters).toHaveBeenCalled();
  });

  it('calls onChangeView for Liste/Carte and reflects the active one as selected', async () => {
    const { props, render } = renderHeader({ view: 'list' });
    await render;

    expect(screen.getByRole('button', { name: 'Liste' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Carte' })).not.toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'Carte' }));
    expect(props.onChangeView).toHaveBeenCalledWith('map');
  });
});
