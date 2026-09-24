import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { AuthTopBar } from './AuthTopBar';

const mockBack = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, canGoBack: () => mockCanGoBack }),
}));

describe('AuthTopBar', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockCanGoBack = true;
  });

  it('shows a working back button when there is somewhere to go back to', async () => {
    await renderWithProviders(<AuthTopBar />);

    const back = screen.getByRole('button', { name: 'Retour' });
    expect(back).toBeOnTheScreen();

    await fireEvent.press(back);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('hides the back button when there is nothing to go back to (e.g. reached via logout)', async () => {
    mockCanGoBack = false;
    await renderWithProviders(<AuthTopBar />);

    expect(screen.queryByRole('button', { name: 'Retour' })).toBeNull();
    // The wordmark still renders — the bar isn't empty, just missing the dead back action.
    expect(screen.getByText('ROAM')).toBeOnTheScreen();
  });
});
