import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { InterestsScreen } from './InterestsScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

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
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the eight interests in French', async () => {
    await renderWithProviders(<InterestsScreen />);

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
    await renderWithProviders(<InterestsScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('What are you into?');
    expect(screen.getByRole('checkbox', { name: 'Wellness' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeOnTheScreen();
  });

  it('starts on "Culture", like the mockup', async () => {
    await renderWithProviders(<InterestsScreen />);

    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'Culture' })).toBeChecked();
  });

  it('allows several interests, and unselecting them', async () => {
    await renderWithProviders(<InterestsScreen />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Nature' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Shopping' }));
    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(3);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Culture' }));
    expect(screen.getByRole('checkbox', { name: 'Culture' })).not.toBeChecked();
    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2);
  });

  it('never blocks "Suivant", even with nothing selected', async () => {
    await renderWithProviders(<InterestsScreen />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Culture' }));
    expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0);

    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/profile-creation');
  });

  it('shows the fifth of five progress bars as current', async () => {
    await renderWithProviders(<InterestsScreen />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 1, max: 5, now: 5 });
  });

  it('jumps to the final screen with "Passer"', async () => {
    await renderWithProviders(<InterestsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/ready');
  });
});
