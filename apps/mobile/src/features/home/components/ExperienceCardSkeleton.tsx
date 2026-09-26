import { View } from 'react-native';

import { Skeleton } from '@/components/ui';

import { CARD_IMAGE_HEIGHT, CARD_WIDTH } from './ExperienceCard';

/** Line heights of the text it stands for (h4 title, two `small` description lines, `caption` details). */
const TITLE_HEIGHT = 20;
const LINE_HEIGHT = 14;
const DETAILS_HEIGHT = 12;

/**
 * `ExperienceCard` while its data loads: the same frame (`CARD_WIDTH`, `rounded-card`, border, surface), the same
 * image area (`CARD_IMAGE_HEIGHT`) and the same body padding and gaps, with blocks where the title, the description
 * and the details will be — so the real card replaces it without moving the layout.
 */
export function ExperienceCardSkeleton() {
  return (
    <View
      testID="experience-card-skeleton"
      style={{ width: CARD_WIDTH }}
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <Skeleton style={{ height: CARD_IMAGE_HEIGHT }} />
      <View className="gap-2 p-4">
        <Skeleton style={{ height: TITLE_HEIGHT, width: '70%' }} className="rounded-pill" />
        <Skeleton style={{ height: LINE_HEIGHT, width: '100%' }} className="rounded-pill" />
        <Skeleton style={{ height: LINE_HEIGHT, width: '85%' }} className="rounded-pill" />
        <Skeleton style={{ height: DETAILS_HEIGHT, width: '55%' }} className="rounded-pill" />
      </View>
    </View>
  );
}
