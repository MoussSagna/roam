import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { SearchActionBar } from './SearchActionBar';

function renderBar(overrides: Partial<Parameters<typeof SearchActionBar>[0]> = {}) {
  const props = {
    view: 'list' as const,
    resultCount: 4,
    sortLabel: 'Recommandé',
    isSortActive: false,
    isFiltersActive: false,
    onOpenSort: jest.fn(),
    onOpenFilters: jest.fn(),
    onPressMap: jest.fn(),
    ...overrides,
  };
  return { props, render: renderWithProviders(<SearchActionBar {...props} />) };
}

describe('SearchActionBar (sprint 8 — search redesign)', () => {
  it('list mode: shows Trier/Filtrer/Carte, the result count and the active sort label', async () => {
    const { render } = renderBar({ resultCount: 4, sortLabel: 'Recommandé' });
    await render;

    expect(screen.getByRole('button', { name: 'Trier' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Carte' })).toBeOnTheScreen();
    expect(screen.getByText('4 expériences')).toBeOnTheScreen();
    expect(screen.getByText('Recommandé')).toBeOnTheScreen();
  });

  it('list mode: neither Trier nor Filtres is selected when nothing is active', async () => {
    const { render } = renderBar();
    await render;

    expect(screen.getByRole('button', { name: 'Trier' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Filtres' })).not.toBeSelected();
  });

  it('list mode: reflects an active sort and active filters as selected', async () => {
    const { render } = renderBar({ isSortActive: true, isFiltersActive: true });
    await render;

    expect(screen.getByRole('button', { name: 'Trier' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeSelected();
  });

  it('calls onOpenSort, onOpenFilters and onPressMap', async () => {
    const { props, render } = renderBar();
    await render;

    await fireEvent.press(screen.getByRole('button', { name: 'Trier' }));
    expect(props.onOpenSort).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Filtres' }));
    expect(props.onOpenFilters).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Carte' }));
    expect(props.onPressMap).toHaveBeenCalledTimes(1);
  });

  it('map mode: shows only Filtrer, no Trier/Carte chip and no count row', async () => {
    const { render } = renderBar({ view: 'map', isFiltersActive: true });
    await render;

    expect(screen.getByRole('button', { name: 'Filtres' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filtres' })).toBeSelected();
    expect(screen.queryByRole('button', { name: 'Trier' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Carte' })).toBeNull();
    expect(screen.queryByText('4 expériences')).toBeNull();
  });
});
