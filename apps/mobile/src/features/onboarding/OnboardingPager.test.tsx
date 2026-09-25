import { act, fireEvent, screen } from '@testing-library/react-native';
import { Dimensions, FlatList, StyleSheet } from 'react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { OnboardingPager } from './OnboardingPager';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const { width, height } = Dimensions.get('window');

/**
 * What the native list reports while it scrolls to `index` (Jest has no native scrolling): a stream of
 * scroll events. The list renders the new cells in batches, on timers, and reports the viewable slide
 * from the next event — hence two events.
 */
async function scrollToSlide(index: number) {
  const pager = screen.getByTestId('onboarding-pager');
  const nativeEvent = {
    contentOffset: { x: index * width, y: 0 },
    contentSize: { width: width * 5, height },
    layoutMeasurement: { width, height },
  };
  for (let i = 0; i < 2; i++) {
    await fireEvent.scroll(pager, { nativeEvent });
    await act(() => jest.advanceTimersByTimeAsync(500));
  }
}

async function renderPager(ui = <OnboardingPager />) {
  await renderWithProviders(ui);
  const pager = screen.getByTestId('onboarding-pager');
  await fireEvent(pager, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
  await fireEvent(pager, 'contentSizeChange', width * 5, height);
}

function progressNow() {
  return screen.getByRole('progressbar').props.accessibilityValue.now;
}

describe('OnboardingPager (onboarding questions as fullscreen slides)', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the first slide (mood) first, as a horizontal paging list', async () => {
    await renderPager();

    const pager = screen.getByTestId('onboarding-pager');
    expect(pager.props.horizontal).toBe(true);
    expect(pager.props.pagingEnabled).toBe(true);
    expect(pager.props.showsHorizontalScrollIndicator).toBe(false);
    expect(screen.getByRole('header')).toHaveTextContent('Quelle est ton humeur aujourd’hui ?');
    expect(progressNow()).toBe(1);
  });

  it('gives every slide the whole window: full width and full height', async () => {
    await renderPager();

    const style = StyleSheet.flatten(screen.getByTestId('onboarding-slide-0').props.style);
    expect(style.width).toBe(width);
    expect(style.height).toBe(height);
  });

  it('a swipe moves to the next slide and updates the progress bars', async () => {
    await renderPager();

    await scrollToSlide(1);

    expect(screen.getByRole('header')).toHaveTextContent('Combien de temps as-tu ?');
    expect(progressNow()).toBe(2);

    await scrollToSlide(2);
    expect(screen.getByRole('header')).toHaveTextContent('Quel est ton budget ?');
    expect(progressNow()).toBe(3);

    // Swiping back works the same way.
    await scrollToSlide(1);
    expect(screen.getByRole('header')).toHaveTextContent('Combien de temps as-tu ?');
    expect(progressNow()).toBe(2);
  });

  it('"Suivant" moves one slide forward, without a route change', async () => {
    const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex');
    await renderPager();

    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));

    // The index moves at once (single source of truth for the bars and the list)…
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 1, animated: true });
    expect(
      screen.getByTestId('onboarding-slide-0', { includeHiddenElements: true }).props
        .accessibilityElementsHidden,
    ).toBe(true);
    // …and, once the list has scrolled, the time slide is the one on screen.
    await scrollToSlide(1);
    expect(progressNow()).toBe(2);
    expect(screen.getByRole('header')).toHaveTextContent('Combien de temps as-tu ?');
    expect(mockPush).not.toHaveBeenCalled();
    scrollToIndex.mockRestore();
  });

  it('"Suivant" after a swipe continues from the swiped slide', async () => {
    await renderPager();
    await scrollToSlide(1);
    await scrollToSlide(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    await scrollToSlide(3);

    expect(screen.getByRole('header')).toHaveTextContent('Où souhaites-tu sortir ?');
    expect(progressNow()).toBe(4);
  });

  it('"Suivant" on the last slide opens the profile creation', async () => {
    await renderPager(<OnboardingPager initialStep="interests" />);

    expect(screen.getByRole('header')).toHaveTextContent('Qu’est-ce qui t’intéresse ?');
    expect(progressNow()).toBe(5);
    await fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));

    expect(mockPush).toHaveBeenCalledWith('/onboarding/profile-creation');
  });

  it('"Passer" still jumps to the final screen, from any slide', async () => {
    await renderPager();
    await scrollToSlide(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/ready');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('only exposes the slide on screen to assistive technologies', async () => {
    await renderPager();
    await scrollToSlide(1);

    // Its neighbors are mounted (swipe-ready) but hidden: queries and screen readers skip them.
    expect(screen.getByTestId('onboarding-slide-0', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('onboarding-slide-0')).toBeNull();
    expect(screen.getByTestId('onboarding-slide-1')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Suivant' })).toHaveLength(1);
    expect(screen.getAllByRole('header')).toHaveLength(1);
  });
});
