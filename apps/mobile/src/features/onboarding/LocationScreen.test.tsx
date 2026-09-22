import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LocationScreen } from './LocationScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('LocationScreen (onboarding 5)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the three choices in French', async () => {
    await renderWithProviders(<LocationScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Où souhaites-tu sortir ?');
    expect(screen.getByText('On te propose des sorties près de toi.')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    for (const label of ['Ma position actuelle', 'Choisir une ville', 'Autour de moi']) {
      expect(screen.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<LocationScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Where do you want to go out?');
    expect(screen.getByRole('radio', { name: 'Around me' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeOnTheScreen();
  });

  it('starts on "Ma position actuelle", like the mockup, and keeps a single choice', async () => {
    await renderWithProviders(<LocationScreen />);
    expect(screen.getByRole('radio', { name: 'Ma position actuelle' })).toBeChecked();

    await fireEvent.press(screen.getByRole('radio', { name: 'Autour de moi' }));

    expect(screen.getByRole('radio', { name: 'Autour de moi' })).toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('keeps the decorative map out of the accessibility tree', async () => {
    await renderWithProviders(<LocationScreen />);

    // Reachable only when hidden elements are included.
    expect(screen.queryByText('Paris')).toBeNull();
    expect(screen.getByText('Paris', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows the fourth of five progress bars as current', async () => {
    await renderWithProviders(<LocationScreen />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 1, max: 5, now: 4 });
  });

  it('goes to the interests screen with "Suivant"', async () => {
    await renderWithProviders(<LocationScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/interests');
  });

  it('jumps to the final screen with "Passer"', async () => {
    await renderWithProviders(<LocationScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/ready');
  });
});
