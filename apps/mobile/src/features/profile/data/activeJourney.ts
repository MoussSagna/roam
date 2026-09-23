/**
 * "Parcours en cours" (Profile, sprint 5 refactor): static, curated mock overlay on top of an
 * existing pool experience — same "plain mock content" convention as `UserStats`/the statistics
 * breakdown (`docs/DECISIONS.md` D-09/D-59). There is no itinerary/journey-progress system built yet
 * (`itinerary/create` is still a placeholder, `04_TECH_STACK.md`), so the progress fields below are
 * authored directly rather than computed from anything real.
 */
export const ACTIVE_JOURNEY = {
  /** Reuses an existing mock experience for its image/title/location — not a duplicate entity.
   * Deliberately one that isn't also seeded as a favorite/history entry (D-57/D-58), so this section
   * reads as its own distinct thing rather than overlapping the favorites/history previews below it. */
  experienceId: 'exp-live-concert',
  currentStep: 2,
  totalSteps: 5,
  nextStep: {
    title: 'Le Hasard Ludique',
    categoryId: 'cat-bar',
    distanceLabel: '1,2 km',
  },
} as const;
