export const HERO_HEIGHT_RATIO = 0.46;
export const HERO_MIN_HEIGHT = 340;

/** Shared by `ExperienceHero` (its own height) and `ExperienceDetailScreen` (where the sticky
 * header's title crossfade should trigger) so the two stay in sync without duplicating the formula. */
export function getHeroHeight(windowHeight: number): number {
  return Math.max(HERO_MIN_HEIGHT, Math.round(windowHeight * HERO_HEIGHT_RATIO));
}
