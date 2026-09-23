import Heart from 'lucide-react-native/icons/heart';
import Landmark from 'lucide-react-native/icons/landmark';
import Moon from 'lucide-react-native/icons/moon';
import TreeDeciduous from 'lucide-react-native/icons/tree-deciduous';
import Users from 'lucide-react-native/icons/users';
import type { ComponentType } from 'react';

import { RunnerIcon } from '@/features/onboarding/components/RunnerIcon';

export type SuggestionMoodId =
  'tonight' | 'friends' | 'couple' | 'culture' | 'nature' | 'activities';

/** Loose enough to accept both a Lucide icon and a custom SVG component like `RunnerIcon` (same
 * call shape: `size`/`color`/`strokeWidth`). */
type MoodIcon = ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;

export type SuggestionMood = {
  id: SuggestionMoodId;
  labelKey: `discover.suggestions.${SuggestionMoodId}`;
  icon: MoodIcon;
};

/**
 * "Suggestions pour toi" tiles (Discover, sprint 6): a different, smaller vocabulary than Home's own
 * mood chips (`HOME_MOODS`) — moments/company/category shortcuts to inspire browsing, not a filter on
 * a `Mood` value. Static config, not a repository (same precedent as `HOME_MOODS`/`NEARBY_CATEGORIES`).
 */
export const SUGGESTION_MOODS: readonly SuggestionMood[] = [
  { id: 'tonight', labelKey: 'discover.suggestions.tonight', icon: Moon },
  { id: 'friends', labelKey: 'discover.suggestions.friends', icon: Users },
  { id: 'couple', labelKey: 'discover.suggestions.couple', icon: Heart },
  { id: 'culture', labelKey: 'discover.suggestions.culture', icon: Landmark },
  { id: 'nature', labelKey: 'discover.suggestions.nature', icon: TreeDeciduous },
  { id: 'activities', labelKey: 'discover.suggestions.activities', icon: RunnerIcon },
];
