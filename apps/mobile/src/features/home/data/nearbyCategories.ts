import type { ImageSourcePropType } from 'react-native';

/**
 * "Lieux proches de toi" tiles (Home). Static config, not a repository: it is a fixed set of category
 * shortcuts, not fetched content (same precedent as `HOME_MOODS`). No real geolocation/distance is
 * wired up yet (`08_AGENT_TODO.md` Phase E) — see `docs/DECISIONS.md` D-45.
 */
export type NearbyCategory = {
  id: string;
  /** Matches a `Category.slug` from the mock repository. */
  categorySlug: string;
  labelKey: `home.nearby.${'restaurants' | 'bars' | 'culture' | 'parks' | 'experiences'}`;
  image: ImageSourcePropType;
};

export const NEARBY_CATEGORIES: readonly NearbyCategory[] = [
  {
    id: 'nearby-restaurants',
    categorySlug: 'restaurant',
    labelKey: 'home.nearby.restaurants',
    image: require('../../../../assets/images/onboarding/welcome-cafe.png') as number,
  },
  {
    id: 'nearby-bars',
    categorySlug: 'bar',
    labelKey: 'home.nearby.bars',
    image: require('../../../../assets/images/auth/entry-background.png') as number,
  },
  {
    id: 'nearby-culture',
    categorySlug: 'culture',
    labelKey: 'home.nearby.culture',
    image: require('../../../../assets/images/splash-background.png') as number,
  },
  {
    id: 'nearby-parks',
    categorySlug: 'park',
    labelKey: 'home.nearby.parks',
    image: require('../../../../assets/images/onboarding/welcome-lake.png') as number,
  },
  {
    id: 'nearby-experiences',
    categorySlug: 'experience',
    labelKey: 'home.nearby.experiences',
    image: require('../../../../assets/images/onboarding/welcome-terrace.png') as number,
  },
];
