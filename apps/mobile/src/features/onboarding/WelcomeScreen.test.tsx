import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { WelcomeScreen } from './WelcomeScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));

describe('WelcomeScreen (placeholder)', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the localized value proposition', async () => {
    await renderWithProviders(<WelcomeScreen />);
    expect(
      screen.getByText('Trouve quoi faire, sans passer ton temps à chercher.'),
    ).toBeOnTheScreen();
  });

  it('goes back when there is history', async () => {
    await renderWithProviders(<WelcomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('falls back to / when opened directly (deep link)', async () => {
    mockCanGoBack = false;
    await renderWithProviders(<WelcomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
