import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { InterestsScreen } from './InterestsScreen';

/** The pager holds the answers; this stands in for it. */
function InterestsScreenWithState() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((current) => {
      const updated = new Set(current);
      if (!updated.delete(id)) updated.add(id);
      return updated;
    });
  return <InterestsScreen selected={selected} onToggle={toggle} />;
}

const FR_INTERESTS = [
  'Culture',
  'Restaurants',
  'Bars & Soirées',
  'Nature',
  'Activités',
  'Shopping',
  'Bien-être',
  'Événements',
];

describe('InterestsScreen (onboarding 6)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the eight interests in French', async () => {
    await renderWithProviders(<InterestsScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('Qu’est-ce qui t’intéresse ?');
    expect(
      screen.getByText('Sélectionne tes centres d’intérêt\n(principalement).'),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
    for (const label of FR_INTERESTS) {
      expect(screen.getByRole('checkbox', { name: label })).toBeOnTheScreen();
    }
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<InterestsScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('What are you into?');
    expect(screen.getByRole('checkbox', { name: 'Wellness' })).toBeOnTheScreen();
  });

  it('starts with nothing selected', async () => {
    await renderWithProviders(<InterestsScreenWithState />);

    expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0);
  });

  it('allows several interests, and unselecting them', async () => {
    await renderWithProviders(<InterestsScreenWithState />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Culture' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Nature' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Shopping' }));
    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(3);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Culture' }));
    expect(screen.getByRole('checkbox', { name: 'Culture' })).not.toBeChecked();
    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2);
  });
});
