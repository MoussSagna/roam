import type { LucideIcon } from 'lucide-react-native';
import Compass from 'lucide-react-native/icons/compass';
import House from 'lucide-react-native/icons/house';
import Route from 'lucide-react-native/icons/route';
import User from 'lucide-react-native/icons/user';

/**
 * Route (file) names of the four main tabs, in the order they should appear. Sprint 11: `journey`
 * (Parcours) replaced `favorites` in the bar; the `/favorites` route itself still exists.
 */
export const TAB_NAMES = ['home', 'discover', 'journey', 'profile'] as const;

export type TabName = (typeof TAB_NAMES)[number];

export function isTabName(value: string): value is TabName {
  return (TAB_NAMES as readonly string[]).includes(value);
}

type TabLabelKey =
  'navigation.home' | 'navigation.discover' | 'navigation.journey' | 'navigation.profile';

/** Icon + translation key for each tab (`RoamTabBar` reads the active label from these). */
export const TAB_CONFIG: Record<TabName, { icon: LucideIcon; labelKey: TabLabelKey }> = {
  home: { icon: House, labelKey: 'navigation.home' },
  discover: { icon: Compass, labelKey: 'navigation.discover' },
  // The winding path of the ROAM mark / a journey's route on the map.
  journey: { icon: Route, labelKey: 'navigation.journey' },
  profile: { icon: User, labelKey: 'navigation.profile' },
};

/** Extra bottom padding tab screens reserve so content clears the floating pill/bubble. */
export const TAB_BAR_CLEARANCE = 100;
