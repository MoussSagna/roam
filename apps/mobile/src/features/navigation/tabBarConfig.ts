import type { LucideIcon } from 'lucide-react-native';
import Compass from 'lucide-react-native/icons/compass';
import Heart from 'lucide-react-native/icons/heart';
import House from 'lucide-react-native/icons/house';
import User from 'lucide-react-native/icons/user';

/** Route (file) names of the four main tabs, in the order they should appear. */
export const TAB_NAMES = ['home', 'discover', 'favorites', 'profile'] as const;

export type TabName = (typeof TAB_NAMES)[number];

export function isTabName(value: string): value is TabName {
  return (TAB_NAMES as readonly string[]).includes(value);
}

type TabLabelKey =
  'navigation.home' | 'navigation.discover' | 'navigation.favorites' | 'navigation.profile';

/** Icon + translation key for each tab (`RoamTabBar` reads the active label from these). */
export const TAB_CONFIG: Record<TabName, { icon: LucideIcon; labelKey: TabLabelKey }> = {
  home: { icon: House, labelKey: 'navigation.home' },
  discover: { icon: Compass, labelKey: 'navigation.discover' },
  favorites: { icon: Heart, labelKey: 'navigation.favorites' },
  profile: { icon: User, labelKey: 'navigation.profile' },
};

/** Extra bottom padding tab screens reserve so content clears the floating pill/bubble. */
export const TAB_BAR_CLEARANCE = 100;
