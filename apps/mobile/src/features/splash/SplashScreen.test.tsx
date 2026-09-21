import { act, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { SplashScreen } from './SplashScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('SplashScreen', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the brand, the tagline and the editorial texts in French', async () => {
    await renderWithProviders(<SplashScreen />);

    expect(screen.getByLabelText('Logo ROAM')).toBeOnTheScreen();
    expect(screen.getByLabelText('ROAM')).toBeOnTheScreen();
    expect(screen.getByText('Des sorties qui te ressemblent.')).toBeOnTheScreen();
    expect(screen.getByText('Explorer.\nRessentir.\nSortir.')).toBeOnTheScreen();
    expect(
      screen.getByText('Culture · Food · Nature · Soirées\net bien plus encore.'),
    ).toBeOnTheScreen();
  });

  it('is localized', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<SplashScreen />);

    expect(screen.getByText('Outings that feel like you.')).toBeOnTheScreen();
    expect(screen.getByText('Explore.\nFeel.\nGo out.')).toBeOnTheScreen();
  });

  it('moves on to /welcome after the splash duration, and only then', async () => {
    await renderWithProviders(<SplashScreen />);

    await act(async () => jest.advanceTimersByTime(2500));
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTime(200));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/welcome');
  });

  it('does not navigate once unmounted', async () => {
    const view = await renderWithProviders(<SplashScreen />);
    await view.unmount();

    await act(async () => jest.advanceTimersByTime(5000));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
