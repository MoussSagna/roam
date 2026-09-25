import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { TimeScreen } from './TimeScreen';

/** The pager holds the answer; this stands in for it. */
function TimeScreenWithState() {
  const [selected, setSelected] = useState<string | null>(null);
  return <TimeScreen selected={selected} onSelect={setSelected} />;
}

describe('TimeScreen (onboarding 3)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the four durations in French', async () => {
    await renderWithProviders(<TimeScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('Combien de temps as-tu ?');
    expect(
      screen.getByText('On adapte les suggestions\nen fonction du temps dont tu disposes.'),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    for (const label of ['Moins d’1 h', '1 à 2 h', '2 à 4 h', 'Plus de 4 h']) {
      expect(screen.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<TimeScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('How much time do you have?');
    expect(screen.getByRole('radio', { name: 'Under 1 h' })).toBeOnTheScreen();
  });

  it('starts with nothing selected, then keeps a single choice', async () => {
    await renderWithProviders(<TimeScreenWithState />);
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);

    await fireEvent.press(screen.getByRole('radio', { name: '1 à 2 h' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Plus de 4 h' }));

    expect(screen.getByRole('radio', { name: 'Plus de 4 h' })).toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });
});
