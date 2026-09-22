import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { WelcomeScreen } from './WelcomeScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('WelcomeScreen (onboarding 1)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the localized welcome copy', async () => {
    await renderWithProviders(<WelcomeScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Bienvenue sur ROAM');
    expect(
      screen.getByText(
        'Découvre des expériences uniques, proches de toi, adaptées à ton humeur, ton temps et ton budget.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Plus\nqu'une sortie,\nune expérience.")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Passer' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeOnTheScreen();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<WelcomeScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Welcome to ROAM');
    expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeOnTheScreen();
  });

  it('has no pagination dots (removed on purpose)', async () => {
    await renderWithProviders(<WelcomeScreen />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('goes to the mood screen with "Suivant"', async () => {
    await renderWithProviders(<WelcomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/mood');
  });

  it('jumps to the final screen with "Passer"', async () => {
    await renderWithProviders(<WelcomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/ready');
  });
});
