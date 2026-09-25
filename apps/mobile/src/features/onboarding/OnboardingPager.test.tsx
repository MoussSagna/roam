import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { Dimensions, FlatList, StyleSheet } from 'react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { OnboardingPager } from './OnboardingPager';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const { width } = Dimensions.get('window');
/** Height of the middle zone, as the native layout reports it (less than the window: header and footer). */
const BODY_HEIGHT = 600;

/**
 * What the native list reports while it scrolls to `index` (Jest has no native scrolling): a stream of
 * scroll events. The list renders the new cells in batches, on timers, and reports the viewable slide
 * from the next event — hence two events.
 */
async function scrollToSlide(index: number) {
  const pager = screen.getByTestId('onboarding-pager');
  const nativeEvent = {
    contentOffset: { x: index * width, y: 0 },
    contentSize: { width: width * 5, height: BODY_HEIGHT },
    layoutMeasurement: { width, height: BODY_HEIGHT },
  };
  for (let i = 0; i < 2; i++) {
    await fireEvent.scroll(pager, { nativeEvent });
    await act(() => jest.advanceTimersByTimeAsync(500));
  }
}

async function renderPager() {
  await renderWithProviders(<OnboardingPager />);
  const pager = screen.getByTestId('onboarding-pager');
  await fireEvent(pager, 'layout', {
    nativeEvent: { layout: { x: 0, y: 100, width, height: BODY_HEIGHT } },
  });
  await fireEvent(pager, 'contentSizeChange', width * 5, BODY_HEIGHT);
}

function header() {
  return screen.getByRole('header');
}

function nextButton() {
  return screen.getByRole('button', { name: 'Suivant' });
}

function progressNow() {
  return screen.getByRole('progressbar').props.accessibilityValue.now;
}

/** Whether slide `index` is in the list at all (mounted, even off screen). */
function slideExists(index: number) {
  return (
    screen.queryByTestId(`onboarding-slide-${index}`, { includeHiddenElements: true }) !== null
  );
}

/** Answers the current slide with `choice`, then "Suivant" and the scroll it triggers. */
async function answerAndContinue(choice: string, toIndex: number) {
  await fireEvent.press(screen.getByRole('radio', { name: choice }));
  await fireEvent.press(nextButton());
  await scrollToSlide(toIndex);
}

async function reachInterests() {
  await answerAndContinue('Curieux', 1);
  await answerAndContinue('1 à 2 h', 2);
  await answerAndContinue('Gratuit', 3);
  // The location: a spot picked by hand (no device position needed).
  await fireEvent.press(screen.getByRole('radio', { name: 'Choisir un lieu' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Bastille' }));
  await fireEvent.press(nextButton());
  await scrollToSlide(4);
}

describe('OnboardingPager: fixed header and footer around the question slides', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    mockPush.mockClear();
    mockReplace.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('layout', () => {
    it('stacks header, list and footer; the list holds the slides only', async () => {
      await renderPager();

      const headerZone = screen.getByTestId('onboarding-header');
      const pager = screen.getByTestId('onboarding-pager');
      const footer = screen.getByTestId('onboarding-footer');
      const zones = headerZone.parent?.children ?? [];
      expect(zones[0]).toBe(headerZone);
      expect(zones.at(-1)).toBe(footer);
      expect(within(pager).queryByRole('button', { name: 'Passer' })).toBeNull();
      expect(within(pager).queryByRole('button', { name: 'Suivant' })).toBeNull();
      expect(within(pager).queryByRole('progressbar')).toBeNull();
    });

    it('shows "Passer" once, in the header, and keeps it there when the slide changes', async () => {
      await renderPager();
      const headerZone = screen.getByTestId('onboarding-header');

      expect(screen.getAllByText('Passer', { includeHiddenElements: true })).toHaveLength(1);
      expect(within(headerZone).getByRole('button', { name: 'Passer' })).toBeOnTheScreen();

      await answerAndContinue('Curieux', 1);

      expect(header()).toHaveTextContent('Combien de temps as-tu ?');
      expect(screen.getAllByText('Passer', { includeHiddenElements: true })).toHaveLength(1);
      expect(within(headerZone).getByRole('button', { name: 'Passer' })).toBeOnTheScreen();
    });

    it('puts the progress bars, then "Suivant", in the footer, which stays out of the list', async () => {
      await renderPager();
      const footer = screen.getByTestId('onboarding-footer');

      expect(within(footer).getByRole('progressbar')).toBeOnTheScreen();
      expect(within(footer).getByRole('button', { name: 'Suivant' })).toBeOnTheScreen();
      expect(screen.getAllByRole('progressbar', { includeHiddenElements: true })).toHaveLength(1);

      await answerAndContinue('Curieux', 1);
      expect(within(footer).getByRole('progressbar')).toBeOnTheScreen();
      expect(within(footer).getByRole('button', { name: 'Suivant' })).toBeOnTheScreen();
    });

    it('sizes each slide to the middle zone: full width, the height left by header and footer', async () => {
      await renderPager();

      const pager = screen.getByTestId('onboarding-pager');
      expect(pager.props.horizontal).toBe(true);
      expect(pager.props.pagingEnabled).toBe(true);
      expect(pager.props.showsHorizontalScrollIndicator).toBe(false);
      const style = StyleSheet.flatten(screen.getByTestId('onboarding-slide-0').props.style);
      expect(style.width).toBe(width);
      expect(style.height).toBe(BODY_HEIGHT);
    });
  });

  describe('progress bars', () => {
    it('follow the current index, whether it moves by "Suivant" or by a swipe', async () => {
      await renderPager();
      expect(progressNow()).toBe(1);

      await answerAndContinue('Curieux', 1);
      expect(progressNow()).toBe(2);

      await scrollToSlide(0);
      expect(progressNow()).toBe(1);
      expect(header()).toHaveTextContent('Quelle est ton humeur aujourd’hui ?');
    });

    it('animate the current bar (wider), driven by the same index', async () => {
      await renderPager();
      const barWidth = (i: number) =>
        StyleSheet.flatten(screen.getByTestId(`progress-bar-${i}`).props.style).width;
      expect(barWidth(0)).toBeGreaterThan(barWidth(1));

      await answerAndContinue('Curieux', 1);
      await act(() => jest.advanceTimersByTimeAsync(500));

      expect(barWidth(1)).toBeGreaterThan(barWidth(0));
    });
  });

  describe('canGoNext: "Suivant" and the swipe follow the same rule', () => {
    it('with nothing selected: "Suivant" is disabled and there is no next slide to swipe to', async () => {
      const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex');
      await renderPager();
      await act(() => jest.advanceTimersByTimeAsync(500));

      expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
      expect(nextButton()).toBeDisabled();
      expect(slideExists(1)).toBe(false);

      await fireEvent.press(nextButton());
      await scrollToSlide(1);

      expect(scrollToIndex).not.toHaveBeenCalled();
      expect(header()).toHaveTextContent('Quelle est ton humeur aujourd’hui ?');
      expect(progressNow()).toBe(1);
      scrollToIndex.mockRestore();
    });

    it('once a choice is made: "Suivant" is enabled and the next slide can be swiped to', async () => {
      await renderPager();

      await fireEvent.press(screen.getByRole('radio', { name: 'Festif' }));
      // The list mounts the slide it now holds in its next render batch.
      await act(() => jest.advanceTimersByTimeAsync(100));

      expect(nextButton()).toBeEnabled();
      expect(slideExists(1)).toBe(true);
      await scrollToSlide(1);
      expect(header()).toHaveTextContent('Combien de temps as-tu ?');
      // The new slide has no answer yet: blocked again, and still no slide after it.
      expect(nextButton()).toBeDisabled();
      expect(slideExists(2)).toBe(false);
    });

    it('"Suivant" moves one slide forward, without a route change', async () => {
      const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex');
      await renderPager();
      await fireEvent.press(screen.getByRole('radio', { name: 'Curieux' }));

      await fireEvent.press(nextButton());

      expect(scrollToIndex).toHaveBeenCalledWith({ index: 1, animated: true });
      expect(progressNow()).toBe(2);
      expect(mockPush).not.toHaveBeenCalled();
      scrollToIndex.mockRestore();
    });

    it('going back stays possible, and answers are kept', async () => {
      await renderPager();
      await answerAndContinue('Curieux', 1);

      await scrollToSlide(0);

      expect(screen.getByRole('radio', { name: 'Curieux' })).toBeChecked();
      expect(nextButton()).toBeEnabled();
    });
  });

  describe('last slide', () => {
    it('needs at least one interest, then "Suivant" opens the profile creation', async () => {
      await renderPager();
      await reachInterests();

      expect(header()).toHaveTextContent('Qu’est-ce qui t’intéresse ?');
      expect(progressNow()).toBe(5);
      expect(nextButton()).toBeDisabled();

      await fireEvent.press(screen.getByRole('checkbox', { name: 'Nature' }));
      expect(nextButton()).toBeEnabled();
      expect(slideExists(5)).toBe(false);

      // Unselecting the only interest blocks it again.
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Nature' }));
      expect(nextButton()).toBeDisabled();

      await fireEvent.press(screen.getByRole('checkbox', { name: 'Culture' }));
      await fireEvent.press(nextButton());
      expect(mockPush).toHaveBeenCalledWith('/onboarding/profile-creation');
    });
  });

  describe('"Passer"', () => {
    it('jumps to the final screen even when the current slide has no answer', async () => {
      await renderPager();
      expect(nextButton()).toBeDisabled();

      await fireEvent.press(screen.getByRole('button', { name: 'Passer' }));

      expect(mockReplace).toHaveBeenCalledWith('/onboarding/ready');
    });
  });

  it('only exposes the slide on screen to assistive technologies', async () => {
    await renderPager();
    await answerAndContinue('Curieux', 1);

    expect(slideExists(0)).toBe(true);
    expect(screen.queryByTestId('onboarding-slide-0')).toBeNull();
    expect(screen.getByTestId('onboarding-slide-1')).toBeOnTheScreen();
    expect(screen.getAllByRole('header')).toHaveLength(1);
  });
});
