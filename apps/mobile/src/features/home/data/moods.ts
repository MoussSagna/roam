import type { LucideIcon } from 'lucide-react-native';
import Heart from 'lucide-react-native/icons/heart';
import Landmark from 'lucide-react-native/icons/landmark';
import Leaf from 'lucide-react-native/icons/leaf';
import Music from 'lucide-react-native/icons/music';
import Utensils from 'lucide-react-native/icons/utensils';

import type { Mood } from '@/types';

export type HomeMoodOption = {
  id: Mood;
  labelKey: `home.moods.${'calm' | 'food' | 'culture' | 'festive' | 'romantic'}`;
  icon: LucideIcon;
};

/**
 * "Selon ton humeur" chips (Home). A different, smaller vocabulary than the onboarding mood grid
 * (`MoodScreen`'s own local `Mood` type) — this one filters the discovery feed, not a profile answer.
 * Static config, like `TAB_CONFIG`/onboarding's `MOODS`: no repository needed for a fixed option list.
 */
export const HOME_MOODS: readonly HomeMoodOption[] = [
  { id: 'calm', labelKey: 'home.moods.calm', icon: Leaf },
  { id: 'food', labelKey: 'home.moods.food', icon: Utensils },
  { id: 'culture', labelKey: 'home.moods.culture', icon: Landmark },
  { id: 'festive', labelKey: 'home.moods.festive', icon: Music },
  { id: 'romantic', labelKey: 'home.moods.romantic', icon: Heart },
];
