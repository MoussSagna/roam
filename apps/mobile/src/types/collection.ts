import type { ImageSourcePropType } from 'react-native';

/**
 * An editorial grouping of experiences around a theme ("Les plus beaux rooftops de Paris", "Quand il
 * pleut"…) — Discover's curated content (sprint 6 brief), not a single place. Same "plain,
 * already-formatted mock strings" convention as `Experience` (`docs/DECISIONS.md` D-09/D-10): no
 * separate formatting layer for mock data.
 */
export type Collection = {
  id: string;
  title: string;
  subtitle: string;
  coverImage?: ImageSourcePropType;
  /** Ordered ids of the experiences it groups. */
  experienceIds: string[];
  /** e.g. "À partir de 10 €" — omitted when the collection has no meaningful floor price. */
  priceFromLabel?: string;
  /** Shown in Discover's "Sélection ROAM" featured carousel; the rest only appear in "Explorer par envie". */
  isFeatured?: boolean;
};
