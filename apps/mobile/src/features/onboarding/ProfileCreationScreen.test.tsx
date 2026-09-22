import { act, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProfileCreationScreen } from './ProfileCreationScreen';
import { PROFILE_TIMELINE } from './profileCreation';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('ProfileCreationScreen (onboarding, simulation)', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the brand, the texts and the three steps in French', async () => {
    await renderWithProviders(<ProfileCreationScreen />);

    expect(screen.getByText('ROAM')).toBeOnTheScreen();
    expect(screen.getByText('Un instant…')).toBeOnTheScreen();
    expect(screen.getByText('On crée ton profil\nsur mesure')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Nous analysons tes préférences pour\nte proposer des sorties qui te ressemblent.',
      ),
    ).toBeOnTheScreen();
    for (const step of [
      'Analyse de tes réponses',
      'Sélection de recommandations',
      'Préparation de ton expérience',
      'Ton profil est prêt',
    ]) {
      expect(screen.getByText(step)).toBeOnTheScreen();
    }
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<ProfileCreationScreen />);

    expect(screen.getByText('One moment…')).toBeOnTheScreen();
    expect(screen.getByText('Analysing your answers')).toBeOnTheScreen();
  });

  it('has nothing to press and announces itself as a progress indicator', async () => {
    await renderWithProviders(<ProfileCreationScreen />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByRole('progressbar', { name: 'Un instant…' })).toBeOnTheScreen();
  });

  it('goes to "Prêt à explorer ?" by itself, once, after about ten seconds', async () => {
    await renderWithProviders(<ProfileCreationScreen />);

    await act(() => jest.advanceTimersByTimeAsync(PROFILE_TIMELINE.navigate - 1));
    expect(mockReplace).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTimeAsync(1));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/ready');

    await act(() => jest.advanceTimersByTimeAsync(60000));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not navigate when it is left early, and starts over when it is opened again', async () => {
    const { unmount } = await renderWithProviders(<ProfileCreationScreen />);
    await act(() => jest.advanceTimersByTimeAsync(PROFILE_TIMELINE.secondStep));

    await unmount();
    await act(() => jest.advanceTimersByTimeAsync(30000));
    expect(mockReplace).not.toHaveBeenCalled();

    // Opened again: a fresh ten seconds, not what was left of the first run.
    await renderWithProviders(<ProfileCreationScreen />);
    await act(() => jest.advanceTimersByTimeAsync(PROFILE_TIMELINE.navigate - 1));
    expect(mockReplace).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTimeAsync(1));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
