import { act, fireEvent, screen } from '@testing-library/react-native';
import { Dimensions, View } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ExperienceHero } from './ExperienceHero';

/** `measureInWindow` never invokes its callback under this test renderer (no native bridge) — stub a
 * realistic rect so the hero -> gallery interaction (which depends on it) is actually exercisable. */
function mockMeasure(rect: { x: number; y: number; width: number; height: number }) {
  jest
    .spyOn(View.prototype, 'measureInWindow')
    .mockImplementation((callback: (x: number, y: number, w: number, h: number) => void) =>
      callback(rect.x, rect.y, rect.width, rect.height),
    );
}

async function renderHero(overrides: Partial<Parameters<typeof ExperienceHero>[0]> = {}) {
  const onOpenGallery = jest.fn();

  await renderWithProviders(
    <ExperienceHero
      images={[1, 2, 3]}
      title="Rooftop Sunset"
      onOpenGallery={onOpenGallery}
      {...overrides}
    />,
  );

  return { onOpenGallery };
}

describe('ExperienceHero', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the "1 / n" counter for the first image', async () => {
    await renderHero();
    expect(screen.getByText('1 / 3')).toBeOnTheScreen();
  });

  it('keeps the counter in sync as the pager scrolls', async () => {
    await renderHero();
    const carousel = screen.getByTestId('experience-hero-scroll');
    const { width: screenWidth } = Dimensions.get('window');

    await fireEvent.scroll(carousel, {
      nativeEvent: {
        contentOffset: { x: screenWidth * 2 },
        layoutMeasurement: { width: screenWidth },
      },
    });

    expect(screen.getByText('3 / 3')).toBeOnTheScreen();
  });

  it('opens the gallery on the current index with the measured rect when a slide is pressed', async () => {
    mockMeasure({ x: 10, y: 20, width: 300, height: 400 });
    const { onOpenGallery } = await renderHero();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('1 / 3'));
    });

    expect(onOpenGallery).toHaveBeenCalledWith(0, { x: 10, y: 20, width: 300, height: 400 });
  });
});
