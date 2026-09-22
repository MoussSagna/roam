import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Landmark from 'lucide-react-native/icons/landmark';
import Martini from 'lucide-react-native/icons/martini';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import TreeDeciduous from 'lucide-react-native/icons/tree-deciduous';
import Utensils from 'lucide-react-native/icons/utensils';
import { LotusIcon } from '@/features/onboarding/components/LotusIcon';
import { RunnerIcon } from '@/features/onboarding/components/RunnerIcon';

/**
 * "Types d'expériences" (mockup tile 02): the exact same 8-item vocabulary as onboarding's
 * "Centres d'intérêt" (`onboarding.interests.*`, `InterestsScreen.tsx`) — same ids, icons and i18n
 * keys reused rather than duplicated, only the tile grid is rebuilt for this screen's own layout.
 * `as const` (not a widened `key: string` annotation) keeps each `key` a literal, checked i18n key
 * — a plain `string` type is rejected by `t()` (same reason as `categoryLabel.ts`, D-48).
 */
export const EXPERIENCE_TYPES = [
  { id: 'restaurants', key: 'onboarding.interests.restaurants', icon: Utensils, iconScale: 1 },
  { id: 'nightlife', key: 'onboarding.interests.nightlife', icon: Martini, iconScale: 1 },
  { id: 'culture', key: 'onboarding.interests.culture', icon: Landmark, iconScale: 1 },
  { id: 'nature', key: 'onboarding.interests.nature', icon: TreeDeciduous, iconScale: 1.2 },
  { id: 'activities', key: 'onboarding.interests.activities', icon: RunnerIcon, iconScale: 1.2 },
  { id: 'shopping', key: 'onboarding.interests.shopping', icon: ShoppingBag, iconScale: 1 },
  { id: 'wellness', key: 'onboarding.interests.wellness', icon: LotusIcon, iconScale: 1.2 },
  { id: 'events', key: 'onboarding.interests.events', icon: CalendarDays, iconScale: 1 },
] as const;

/** Default selection (mockup: Bars & Soirées, Culture, Bien-être). */
export const DEFAULT_EXPERIENCE_TYPES: readonly string[] = ['nightlife', 'culture', 'wellness'];
