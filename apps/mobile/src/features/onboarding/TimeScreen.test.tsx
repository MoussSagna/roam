import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { TimeScreen } from './TimeScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('TimeScreen (onboarding 3)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the four durations in French', async () => {
    await renderWithProviders(<TimeScreen />);

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
    await renderWithProviders(<TimeScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('How much time do you have?');
    expect(screen.getByRole('radio', { name: 'Under 1 h' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeOnTheScreen();
  });

  it('starts on "1 à 2 h", like the mockup, and keeps a single choice', async () => {
    await renderWithProviders(<TimeScreen />);
    expect(screen.getByRole('radio', { name: '1 à 2 h' })).toBeChecked();

    await fireEvent.press(screen.getByRole('radio', { name: 'Plus de 4 h' }));

    expect(screen.getByRole('radio', { name: 'Plus de 4 h' })).toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('shows the second of five progress bars as current', async () => {
    await renderWithProviders(<TimeScreen />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 1, max: 5, now: 2 });
  });

  it('goes to the budget screen with "Suivant"', async () => {
    await renderWithProviders(<TimeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/budget');
  });

  it('jumps to the final screen with "Passer"', async () => {
    await renderWithProviders(<TimeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/ready');
  });
});
