export const HERO_HEIGHT_RATIO = 0.56;
export const HERO_MIN_HEIGHT = 420;

/** Shared by `HeroCarousel` (its own height) and `HomeScreen` (where the sticky header's search row
 * should finish revealing, sprint 6 "sticky search" D-69) so the two stay in sync without duplicating
 * the formula — same "measured hero height" precedent as `features/experiences/lib/heroHeight.ts`. */
export function getHeroHeight(windowHeight: number): number {
  return Math.max(HERO_MIN_HEIGHT, Math.round(windowHeight * HERO_HEIGHT_RATIO));
}
