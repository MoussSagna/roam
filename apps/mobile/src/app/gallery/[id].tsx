import { useLocalSearchParams } from 'expo-router';

import { ExperienceGalleryScreen } from '@/features/experiences/gallery/ExperienceGalleryScreen';
import type { GalleryOpenRect } from '@/types';

type GalleryParams = {
  id: string;
  index?: string;
  heroX?: string;
  heroY?: string;
  heroW?: string;
  heroH?: string;
};

/** Reached from `ExperienceHero`'s tap (`heroX/Y/W/H` = its measured on-screen rect, `docs/DECISIONS.md`
 * D-48) — a flat `gallery/[id]` route, not a nested `experience/[id]/gallery`, to keep every route in
 * `src/app/` a simple, single-dynamic-segment file like the rest of this app's routes. */
export default function ExperienceGalleryRoute() {
  const { id, index, heroX, heroY, heroW, heroH } = useLocalSearchParams<GalleryParams>();

  const originRect: GalleryOpenRect | undefined =
    heroX && heroY && heroW && heroH
      ? { x: Number(heroX), y: Number(heroY), width: Number(heroW), height: Number(heroH) }
      : undefined;

  return (
    <ExperienceGalleryScreen
      experienceId={id}
      initialIndex={index ? Number(index) : 0}
      originRect={originRect}
    />
  );
}
