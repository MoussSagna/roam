import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HorizontalCarousel, LoadingSpinner } from '@/components/ui';
import { useDelayedFlag } from '@/hooks/useDelayedFlag';

import { CARD_WIDTH } from './ExperienceCard';
import { ExperienceCardSkeleton } from './ExperienceCardSkeleton';

/** Below this, a wait stays discreet (a spinner); past it, the section shows skeleton cards. */
export const SKELETON_DELAY_MS = 300;
/** Enough skeleton cards to fill the screen width and hint at the scroll. */
const SKELETON_COUNT = 3;
const SKELETONS = Array.from({ length: SKELETON_COUNT }, (_, index) => index);
/** Room the spinner keeps, about a card's height, so the skeletons and the cards do not push the page down. */
const RESERVED_HEIGHT = 280;

type ExperienceCarouselLoadingProps = {
  /** The real carousel's gap, so the skeletons sit exactly where the cards will. */
  spacing: number;
  testID?: string;
};

/**
 * A horizontal section of `ExperienceCard`s still loading: a spinner for a short wait, then skeleton cards laid out
 * by the same `HorizontalCarousel` as the real list (same item width, gap, side padding and bleed) — the switch to
 * the real cards does not move them. Announced once as "Chargement…".
 */
export function ExperienceCarouselLoading({ spacing, testID }: ExperienceCarouselLoadingProps) {
  const { t } = useTranslation();
  const showSkeletons = useDelayedFlag(true, SKELETON_DELAY_MS);

  if (!showSkeletons) {
    return (
      <View testID={testID} style={{ height: RESERVED_HEIGHT }} className="justify-center">
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
    >
      <HorizontalCarousel
        testID={testID ? `${testID}-list` : undefined}
        data={SKELETONS}
        keyExtractor={(item) => `skeleton-${item}`}
        itemWidth={CARD_WIDTH}
        spacing={spacing}
        scrollEnabled={false}
        renderItem={() => <ExperienceCardSkeleton />}
      />
    </View>
  );
}
