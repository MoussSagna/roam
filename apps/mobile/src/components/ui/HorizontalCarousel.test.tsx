import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { HorizontalCarousel } from './HorizontalCarousel';

const DATA = ['a', 'b', 'c'];

/**
 * `HorizontalCarousel` is a thin `FlatList` props wrapper (full-bleed style + snap props) with no
 * visible behavior of its own to assert through roles/text, so — unlike the rest of this codebase's
 * tests — this reads the underlying `FlatList` element's own props via `getByTestId` (a `testID` passed
 * straight through) to check the exact mechanics the carousel full-bleed/snap pass fixed: the negative
 * margin that lets it bleed past the page's padding, and the snap interval computed from
 * `itemWidth + spacing`.
 */
describe('HorizontalCarousel', () => {
  it('renders every item', async () => {
    await renderWithProviders(
      <HorizontalCarousel
        data={DATA}
        keyExtractor={(item) => item}
        itemWidth={100}
        spacing={10}
        renderItem={({ item }) => <Text>{item}</Text>}
      />,
    );

    expect(screen.getByText('a')).toBeOnTheScreen();
    expect(screen.getByText('b')).toBeOnTheScreen();
    expect(screen.getByText('c')).toBeOnTheScreen();
  });

  it('bleeds past the page padding and snaps at itemWidth + spacing by default', async () => {
    await renderWithProviders(
      <HorizontalCarousel
        testID="carousel"
        data={DATA}
        keyExtractor={(item) => item}
        itemWidth={100}
        spacing={10}
        renderItem={({ item }) => <Text>{item}</Text>}
      />,
    );

    const list = screen.getByTestId('carousel');
    expect(list.props.style).toEqual([{ marginHorizontal: -24 }, undefined]);
    expect(list.props.contentContainerStyle).toEqual({ paddingHorizontal: 24, gap: 10 });
    expect(list.props.snapToInterval).toBe(110);
    expect(list.props.snapToAlignment).toBe('start');
    expect(list.props.decelerationRate).toBe('fast');
  });

  it('respects a custom sidePadding', async () => {
    await renderWithProviders(
      <HorizontalCarousel
        testID="carousel"
        data={DATA}
        keyExtractor={(item) => item}
        itemWidth={100}
        spacing={10}
        sidePadding={16}
        renderItem={({ item }) => <Text>{item}</Text>}
      />,
    );

    const list = screen.getByTestId('carousel');
    expect(list.props.style).toEqual([{ marginHorizontal: -16 }, undefined]);
    expect(list.props.contentContainerStyle).toEqual({ paddingHorizontal: 16, gap: 10 });
  });

  it('disables snapping when snapEnabled is false', async () => {
    await renderWithProviders(
      <HorizontalCarousel
        testID="carousel"
        data={DATA}
        keyExtractor={(item) => item}
        itemWidth={100}
        spacing={10}
        snapEnabled={false}
        renderItem={({ item }) => <Text>{item}</Text>}
      />,
    );

    const list = screen.getByTestId('carousel');
    expect(list.props.snapToInterval).toBeUndefined();
    expect(list.props.decelerationRate).toBe('normal');
  });
});
