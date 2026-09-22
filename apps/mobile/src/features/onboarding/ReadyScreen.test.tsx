import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ReadyScreen } from './ReadyScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('ReadyScreen (onboarding 7)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the handwritten line in French', async () => {
    await renderWithProviders(<ReadyScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Prêt à explorer ?');
    expect(
      screen.getByText(
        'Des sorties, des rencontres,\ndes découvertes…\nTout ça t’attend sur ROAM.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeOnTheScreen();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<ReadyScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Ready to explore?');
    expect(screen.getByRole('button', { name: 'Get started' })).toBeOnTheScreen();
  });

  it('is the end of the journey: no "Passer", no "Suivant"', async () => {
    await renderWithProviders(<ReadyScreen />);

    expect(screen.queryByRole('button', { name: 'Passer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Suivant' })).toBeNull();
  });

  it('enters the app with "Commencer"', async () => {
    await renderWithProviders(<ReadyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Commencer' }));

    expect(mockReplace).toHaveBeenCalledWith('/home');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
