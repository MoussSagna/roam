import { act, fireEvent, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ExperienceGalleryScreen } from './ExperienceGalleryScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

async function renderGallery(props: Partial<Parameters<typeof ExperienceGalleryScreen>[0]> = {}) {
  return renderWithProviders(
    <ExperienceGalleryScreen experienceId="exp-rooftop-sunset" {...props} />,
  );
}

describe('ExperienceGalleryScreen (sprint 5)', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the counter for the first image and one thumbnail per photo', async () => {
    await renderGallery();

    expect(screen.getByText('1 / 5')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /^\d \/ 5$/ })).toHaveLength(5);
  });

  it('opens on the requested initial index', async () => {
    await renderGallery({ initialIndex: 2 });

    expect(screen.getByText('3 / 5')).toBeOnTheScreen();
  });

  it('advances the counter when the main list finishes a swipe', async () => {
    await renderGallery();
    const { width: screenWidth } = Dimensions.get('window');

    await act(async () => {
      fireEvent(screen.getByTestId('gallery-main-list'), 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: screenWidth * 2 } },
      });
    });

    expect(screen.getByText('3 / 5')).toBeOnTheScreen();
  });

  it('selects a thumbnail and marks it as the active one', async () => {
    await renderGallery();

    await fireEvent.press(screen.getByRole('button', { name: '4 / 5' }));

    expect(screen.getByText('4 / 5')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '4 / 5' })).toBeSelected();
    expect(screen.getByRole('button', { name: '1 / 5' })).not.toBeSelected();
  });

  it('closes back to the previous screen without a rect (no morph to play)', async () => {
    await renderGallery();

    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('closes back to the previous screen when a hero rect was provided (morph then back)', async () => {
    await renderGallery({ originRect: { x: 0, y: 100, width: 390, height: 340 } });

    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows a coming-soon fallback for an unknown experience id', async () => {
    await renderGallery({ experienceId: 'does-not-exist' });

    expect(screen.getByText('Cet écran arrive bientôt.')).toBeOnTheScreen();
  });
});
