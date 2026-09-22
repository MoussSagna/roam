import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { BudgetScreen } from './BudgetScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// The unit is the leading "€" glyph; the spoken name of a row adds it back (non-breaking space).
const FR_BUDGETS = ['Gratuit', 'Moins de 10 €', '10 – 30 €', '30 – 50 €', 'Plus de 50 €'];

describe('BudgetScreen (onboarding 4)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the title, the subtitle and the five budgets in French', async () => {
    await renderWithProviders(<BudgetScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('Quel est ton budget ?');
    expect(screen.getByText('On trouve des sorties qui respectent\nton budget.')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    for (const label of FR_BUDGETS) {
      expect(screen.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
  });

  it('shows a single euro sign per priced row, and none in the labels', async () => {
    await renderWithProviders(<BudgetScreen />);

    expect(screen.getAllByText('€')).toHaveLength(4);
    expect(screen.queryAllByText(/€€/)).toHaveLength(0);
    expect(screen.getByText('10 – 30')).toBeOnTheScreen();
    expect(screen.getByText('Plus de 50')).toBeOnTheScreen();
    expect(screen.queryAllByText(/\d\s*€/)).toHaveLength(0);
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderWithProviders(<BudgetScreen />);

    expect(screen.getByRole('header')).toHaveTextContent('What’s your budget?');
    expect(screen.getByRole('radio', { name: 'Free' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeOnTheScreen();
  });

  it('starts on "Moins de 10 €", like the mockup, and keeps a single choice', async () => {
    await renderWithProviders(<BudgetScreen />);
    expect(screen.getByRole('radio', { name: 'Moins de 10 €' })).toBeChecked();

    await fireEvent.press(screen.getByRole('radio', { name: 'Gratuit' }));

    expect(screen.getByRole('radio', { name: 'Gratuit' })).toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('shows the third of five progress bars as current', async () => {
    await renderWithProviders(<BudgetScreen />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 1, max: 5, now: 3 });
  });

  it('goes to the location screen with "Suivant"', async () => {
    await renderWithProviders(<BudgetScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/location');
  });

  it('jumps to the final screen with "Passer"', async () => {
    await renderWithProviders(<BudgetScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/ready');
  });
});
