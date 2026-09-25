import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { BudgetScreen } from './BudgetScreen';

/** The pager holds the answer; this stands in for it. */
function BudgetScreenWithState() {
  const [selected, setSelected] = useState<string | null>(null);
  return <BudgetScreen selected={selected} onSelect={setSelected} />;
}

// The unit is the leading "€" glyph; the spoken name of a row adds it back (non-breaking space).
const FR_BUDGETS = ['Gratuit', 'Moins de 10 €', '10 – 30 €', '30 – 50 €', 'Plus de 50 €'];

describe('BudgetScreen (onboarding 4)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the five budgets in French', async () => {
    await renderWithProviders(<BudgetScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('Quel est ton budget ?');
    expect(screen.getByText('On trouve des sorties qui respectent\nton budget.')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    for (const label of FR_BUDGETS) {
      expect(screen.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
  });

  it('shows a single euro sign per priced row, and none in the labels', async () => {
    await renderWithProviders(<BudgetScreenWithState />);

    expect(screen.getAllByText('€')).toHaveLength(4);
    expect(screen.queryAllByText(/€€/)).toHaveLength(0);
    expect(screen.getByText('10 – 30')).toBeOnTheScreen();
    expect(screen.getByText('Plus de 50')).toBeOnTheScreen();
    expect(screen.queryAllByText(/\d\s*€/)).toHaveLength(0);
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<BudgetScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('What’s your budget?');
    expect(screen.getByRole('radio', { name: 'Free' })).toBeOnTheScreen();
  });

  it('starts with nothing selected, then keeps a single choice', async () => {
    await renderWithProviders(<BudgetScreenWithState />);
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);

    await fireEvent.press(screen.getByRole('radio', { name: 'Moins de 10 €' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Gratuit' }));

    expect(screen.getByRole('radio', { name: 'Gratuit' })).toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });
});
