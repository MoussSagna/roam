import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ResetCodeScreen } from './ResetCodeScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: { email?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
}));

function fillCode(value: string) {
  return fireEvent.changeText(screen.getByLabelText('Chiffre 1 sur 6'), value);
}

describe('ResetCodeScreen (authentication 5 — reset code)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    mockParams = {};
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the localized copy in French, including the email passed from the previous screen', async () => {
    mockParams = { email: 'moussa@email.com' };
    await renderWithProviders(<ResetCodeScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Vérifie ton email');
    expect(screen.getByText('Nous avons envoyé un code à')).toBeOnTheScreen();
    expect(screen.getByText('moussa@email.com')).toBeOnTheScreen();
    expect(screen.getByText('Le code expire dans 10 minutes.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Renvoyer le code' })).toBeOnTheScreen();
    expect(screen.getByText("Tu n'as pas reçu l'email ?")).toBeOnTheScreen();
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(`Chiffre ${i} sur 6`)).toBeOnTheScreen();
    }
  });

  it('does not render an email line when none was passed', async () => {
    await renderWithProviders(<ResetCodeScreen />);
    expect(screen.queryByText('moussa@email.com')).toBeNull();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<ResetCodeScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Verify your email');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Digit 1 of 6')).toBeOnTheScreen();
  });

  it('the back button goes back', async () => {
    await renderWithProviders(<ResetCodeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('typing all 6 digits fills every box (paste-style entry into the first one)', async () => {
    await renderWithProviders(<ResetCodeScreen />);
    await fillCode('247193');

    for (const [i, digit] of ['2', '4', '7', '1', '9', '3'].entries()) {
      expect(screen.getByLabelText(`Chiffre ${i + 1} sur 6`).props.value).toBe(digit);
    }
  });

  it('"Continuer" is disabled until all 6 digits are entered', async () => {
    await renderWithProviders(<ResetCodeScreen />);

    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();

    await fillCode('24');
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();

    await fillCode('247193');
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeEnabled();
  });

  it('pressing "Continuer" while incomplete does nothing', async () => {
    await renderWithProviders(<ResetCodeScreen />);
    await fillCode('24');

    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rejects a well-formed but wrong code', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<ResetCodeScreen />);
    await fillCode('247193');

    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    await act(() => jest.advanceTimersByTime(1000));

    expect(
      screen.getByText('Ce code est incorrect. Vérifie-le ou clique sur « Renvoyer le code ».'),
    ).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('simulates a request then moves on to the new-password screen on the mock valid code', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<ResetCodeScreen />);
    await fillCode('123456');

    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    await act(() => jest.advanceTimersByTime(1000));

    expect(mockPush).toHaveBeenCalledWith('/auth/new-password');
    jest.useRealTimers();
  });

  it('"Renvoyer le code" clears the code', async () => {
    await renderWithProviders(<ResetCodeScreen />);
    await fillCode('247193');

    await fireEvent.press(screen.getByRole('button', { name: 'Renvoyer le code' }));

    expect(screen.getByLabelText('Chiffre 1 sur 6').props.value).toBe('');
  });
});
