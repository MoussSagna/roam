import { fireEvent, screen } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ExperienceDetailHeader } from './ExperienceDetailHeader';

/**
 * The title/background crossfade itself (`revealStyle`, built with `interpolate`) is not asserted on
 * here: this project's Reanimated Jest mock stubs `interpolate` as a no-op (same reason D-39 keeps
 * `useAnimatedScrollHandler` out of tests) — there is nothing meaningful to compute under it. What is
 * tested: the title renders, and the always-visible buttons work regardless of scroll position.
 */
function Wrapper({
  isFavorite = false,
  onBack = jest.fn(),
  onShare = jest.fn(),
  onToggleFavorite = jest.fn(),
}: {
  isFavorite?: boolean;
  onBack?: () => void;
  onShare?: () => void;
  onToggleFavorite?: () => void;
}) {
  const scrollY = useSharedValue(0);
  return (
    <ExperienceDetailHeader
      title="Rooftop Sunset"
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      onShare={onShare}
      onBack={onBack}
      topInset={47}
      scrollY={scrollY}
      revealOffset={200}
    />
  );
}

describe('ExperienceDetailHeader', () => {
  it('renders the title', async () => {
    await renderWithProviders(<Wrapper />);
    expect(screen.getByText('Rooftop Sunset')).toBeOnTheScreen();
  });

  it('calls back/share/favorite handlers', async () => {
    const onBack = jest.fn();
    const onShare = jest.fn();
    const onToggleFavorite = jest.fn();
    await renderWithProviders(
      <Wrapper onBack={onBack} onShare={onShare} onToggleFavorite={onToggleFavorite} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Partager' }));
    expect(onShare).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter aux favoris' }));
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('reflects the favorite state', async () => {
    await renderWithProviders(<Wrapper isFavorite />);
    expect(screen.getByRole('button', { name: 'Retirer des favoris' })).toBeSelected();
  });
});
