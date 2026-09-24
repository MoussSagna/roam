import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { SearchFiltersSheet } from './SearchFiltersSheet';

async function renderSheet(onApply = jest.fn(), onClose = jest.fn()) {
  const utils = await renderWithProviders(
    <SearchFiltersSheet
      visible
      filters={{}}
      queryText=""
      onApply={onApply}
      onClose={onClose}
    />,
  );
  return { ...utils, onApply, onClose };
}

describe('SearchFiltersSheet (sprint 6 — search filters)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the category, distance, budget, when and options sections', async () => {
    await renderSheet();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Restaurant' })).toBeOnTheScreen();
    });
    expect(screen.getByText('Distance')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '3 km' })).toBeOnTheScreen();
    expect(screen.getByText('Budget')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Gratuit' })).toBeOnTheScreen();
    expect(screen.getByText('Quand ?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ce week-end' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ouvert maintenant' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Accessible à pied' })).toBeOnTheScreen();
  });

  it('selects a single filter per facet and lets several facets be selected at once', async () => {
    await renderSheet();
    await waitFor(() => screen.getByRole('button', { name: 'Restaurant' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Restaurant' }));
    await fireEvent.press(screen.getByRole('button', { name: '3 km' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gratuit' }));

    expect(screen.getByRole('button', { name: 'Restaurant' })).toBeSelected();
    expect(screen.getByRole('button', { name: '3 km' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Gratuit' })).toBeSelected();
  });

  it('resets every selection', async () => {
    await renderSheet();
    await waitFor(() => screen.getByRole('button', { name: 'Restaurant' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Restaurant' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvert maintenant' }));
    expect(screen.getByRole('button', { name: 'Restaurant' })).toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'Réinitialiser' }));

    expect(screen.getByRole('button', { name: 'Restaurant' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Ouvert maintenant' })).not.toBeSelected();
  });

  it('applies the draft filters and closes when "Voir X résultats" is pressed', async () => {
    const { onApply, onClose } = await renderSheet();
    await waitFor(() => screen.getByRole('button', { name: 'Restaurant' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Gratuit' }));
    await fireEvent.press(screen.getByRole('button', { name: /Voir \d+ résultats/ }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ budget: 'free' }));
    expect(onClose).toHaveBeenCalled();
  });
});
