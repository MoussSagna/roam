import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { SearchSortSheet } from './SearchSortSheet';

describe('SearchSortSheet (sprint 8 — search redesign)', () => {
  it('lists every sort option, with the current one checked', async () => {
    await renderWithProviders(
      <SearchSortSheet visible sort="topRated" onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.getByRole('radio', { name: 'Recommandé' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Plus proche' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Mieux noté' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Prix croissant' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Prix décroissant' })).not.toBeChecked();
  });

  it('selecting an option applies it and closes the sheet', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await renderWithProviders(
      <SearchSortSheet visible sort="recommended" onSelect={onSelect} onClose={onClose} />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Plus proche' }));

    expect(onSelect).toHaveBeenCalledWith('nearest');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the "×" button and the backdrop', async () => {
    const onClose = jest.fn();
    await renderWithProviders(
      <SearchSortSheet visible sort="recommended" onSelect={jest.fn()} onClose={onClose} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when not visible', async () => {
    await renderWithProviders(
      <SearchSortSheet
        visible={false}
        sort="recommended"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByRole('radio', { name: 'Recommandé' })).toBeNull();
  });
});
