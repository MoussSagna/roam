import { fireEvent, screen } from '@testing-library/react-native';
import { Pressable, Text as RNText } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { renderWithProviders } from '@/test/renderWithProviders';

import { StickyRevealHeader } from './StickyRevealHeader';

/**
 * Same scope as `ExperienceDetailHeader.test.tsx`: the crossfade itself (`interpolate`) is not
 * asserted on — this project's Reanimated Jest mock stubs it as a no-op, so there is nothing
 * meaningful to compute under it. What is tested: the title and slots render, and slot content stays
 * interactive regardless of scroll position.
 */
function Wrapper({ title, onBack }: { title?: string; onBack?: () => void }) {
  const scrollY = useSharedValue(0);
  return (
    <StickyRevealHeader
      title={title}
      scrollY={scrollY}
      revealOffset={200}
      leftSlot={
        onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack}>
            <RNText>Back</RNText>
          </Pressable>
        ) : undefined
      }
      rightSlot={<RNText>Actions</RNText>}
    />
  );
}

function CenterSlotWrapper({ onPressSearch }: { onPressSearch: () => void }) {
  const scrollY = useSharedValue(0);
  return (
    <StickyRevealHeader
      title="Ignored when centerSlot is given"
      centerSlot={
        <Pressable accessibilityRole="search" onPress={onPressSearch}>
          <RNText>Search bar</RNText>
        </Pressable>
      }
      scrollY={scrollY}
      revealOffset={120}
    />
  );
}

describe('StickyRevealHeader', () => {
  it('renders the title when given one', async () => {
    await renderWithProviders(<Wrapper title="Rooftop Sunset" />);
    expect(screen.getByText('Rooftop Sunset')).toBeOnTheScreen();
  });

  it('renders with no title (background-only reveal)', async () => {
    await renderWithProviders(<Wrapper />);
    expect(screen.queryByText('Rooftop Sunset')).toBeNull();
    expect(screen.getByText('Actions')).toBeOnTheScreen();
  });

  it('keeps left/right slot content interactive', async () => {
    const onBack = jest.fn();
    await renderWithProviders(<Wrapper title="Rooftop Sunset" onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders centerSlot instead of title when both are given (sprint 6 "sticky search", D-69)', async () => {
    await renderWithProviders(<CenterSlotWrapper onPressSearch={jest.fn()} />);

    expect(screen.queryByText('Ignored when centerSlot is given')).toBeNull();
    expect(screen.getByRole('search')).toBeOnTheScreen();
  });

  it('keeps centerSlot content interactive regardless of scroll position', async () => {
    const onPressSearch = jest.fn();
    await renderWithProviders(<CenterSlotWrapper onPressSearch={onPressSearch} />);

    await fireEvent.press(screen.getByRole('search'));

    expect(onPressSearch).toHaveBeenCalledTimes(1);
  });
});
