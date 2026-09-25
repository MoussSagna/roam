import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { MoodScreen } from './MoodScreen';

/** The pager holds the answer; this stands in for it. */
function MoodScreenWithState() {
  const [selected, setSelected] = useState<string | null>(null);
  return <MoodScreen selected={selected} onSelect={setSelected} />;
}

const FR_MOODS = [
  'Curieux',
  'Détendu',
  'Festif',
  'Culturel',
  'Sportif',
  'Romantique',
  'En solo',
  'Entre amis',
  'En famille',
];

describe('MoodScreen (onboarding 2)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the nine moods in French', async () => {
    await renderWithProviders(<MoodScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('Quelle est ton humeur aujourd’hui ?');
    expect(
      screen.getByText('On te propose des sorties qui correspondent à ton état d’esprit.'),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(9);
    for (const label of FR_MOODS) {
      expect(screen.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<MoodScreenWithState />);

    expect(screen.getByRole('header')).toHaveTextContent('What’s your mood today?');
    expect(screen.getByRole('radio', { name: 'With friends' })).toBeOnTheScreen();
  });

  it('starts with nothing selected', async () => {
    await renderWithProviders(<MoodScreenWithState />);

    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
  });

  it('keeps a single mood selected', async () => {
    await renderWithProviders(<MoodScreenWithState />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Curieux' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Romantique' }));

    expect(screen.getByRole('radio', { name: 'Romantique' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Curieux' })).not.toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });
});
