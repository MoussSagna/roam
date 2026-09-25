import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LocationScreen } from './LocationScreen';

/** The pager holds the answer; this stands in for it. */
function LocationScreenWithState() {
  const [selected, setSelected] = useState<string | null>(null);
  return <LocationScreen selected={selected} onSelect={setSelected} />;
}

describe('LocationScreen (onboarding 5)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the three choices in French', async () => {
    await renderWithProviders(<LocationScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('Où souhaites-tu sortir ?');
    expect(screen.getByText('On te propose des sorties près de toi.')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    for (const label of ['Ma position actuelle', 'Choisir une ville', 'Autour de moi']) {
      expect(screen.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<LocationScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('Where do you want to go out?');
    expect(screen.getByRole('radio', { name: 'Around me' })).toBeOnTheScreen();
  });

  it('starts with nothing selected, then keeps a single choice', async () => {
    await renderWithProviders(<LocationScreenWithState />);
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);

    await fireEvent.press(screen.getByRole('radio', { name: 'Ma position actuelle' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Autour de moi' }));

    expect(screen.getByRole('radio', { name: 'Autour de moi' })).toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('keeps the decorative map out of the accessibility tree', async () => {
    await renderWithProviders(<LocationScreenWithState />);

    // Reachable only when hidden elements are included.
    expect(screen.queryByText('Paris')).toBeNull();
    expect(screen.getByText('Paris', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
