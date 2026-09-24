import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n, { getAvailableLanguages } from '@/i18n';
import * as i18nModule from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LanguageScreen } from './LanguageScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

describe('LanguageScreen', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the header and every available language, French selected by default', async () => {
    await renderWithProviders(<LanguageScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Langue');

    const french = screen.getByRole('radio', { name: 'Français' });
    const english = screen.getByRole('radio', { name: 'English' });
    expect(french).toBeOnTheScreen();
    expect(english).toBeOnTheScreen();
    expect(french).toBeChecked();
    expect(english).not.toBeChecked();
  });

  it('selecting a language switches the active locale, updating the UI immediately', async () => {
    await renderWithProviders(<LanguageScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    // The screen's own title re-renders in the new language — real i18n.changeLanguage, not just a
    // visual toggle.
    expect(await screen.findByRole('header')).toHaveTextContent('Language');
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Français' })).not.toBeChecked();
  });

  it('persists the choice under roam.language', async () => {
    await renderWithProviders(<LanguageScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    expect(await AsyncStorage.getItem('roam.language')).toBe('en');
  });

  it('the back button calls router.back', async () => {
    await renderWithProviders(<LanguageScreen />);

    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders a third language automatically once the i18n layer reports it — no screen change needed', async () => {
    const realLanguages = getAvailableLanguages();
    jest
      .spyOn(i18nModule, 'getAvailableLanguages')
      .mockReturnValue([
        ...realLanguages,
        { code: 'es' as never, nativeName: 'Español', flag: '🇪🇸' },
      ]);

    await renderWithProviders(<LanguageScreen />);

    expect(screen.getByRole('radio', { name: 'Français' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'English' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Español' })).toBeOnTheScreen();

    jest.restoreAllMocks();
  });
});
