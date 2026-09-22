import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { MoodScreen } from './MoodScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

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
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the nine moods in French', async () => {
    await renderWithProviders(<MoodScreen />);

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
    await renderWithProviders(<MoodScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('What’s your mood today?');
    expect(screen.getByRole('radio', { name: 'With friends' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeOnTheScreen();
  });

  it('starts on "Curieux", like the mockup', async () => {
    await renderWithProviders(<MoodScreen />);

    expect(screen.getByRole('radio', { name: 'Curieux' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Détendu' })).not.toBeChecked();
  });

  it('keeps a single mood selected', async () => {
    await renderWithProviders(<MoodScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Romantique' }));

    expect(screen.getByRole('radio', { name: 'Romantique' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Curieux' })).not.toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('shows the first of five progress bars as current', async () => {
    await renderWithProviders(<MoodScreen />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 1, max: 5, now: 1 });
  });

  it('goes to the time screen with "Suivant"', async () => {
    await renderWithProviders(<MoodScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/time');
  });

  it('jumps to the final screen with "Passer"', async () => {
    await renderWithProviders(<MoodScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/ready');
  });
});
