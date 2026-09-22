import Heart from 'lucide-react-native/icons/heart';
import Leaf from 'lucide-react-native/icons/leaf';
import Sparkles from 'lucide-react-native/icons/sparkles';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import UsersRound from 'lucide-react-native/icons/users-round';
/**
 * "Ambiance" (mockup tile 02): a screen-specific vocabulary, not a reuse of any existing typed
 * enum — it mixes mood-like tags (calme/festive/romantique) with company-like tags (entre
 * amis/en famille/solo) in one flat multi-select set, which doesn't match the semantics of the
 * onboarding `Mood` screen's own vocabulary or `Company` (single choice). Icons mirror the
 * onboarding Mood screen's choices for the concepts they share (leaf/sparkles/heart/user/users/
 * users-round), for visual consistency across the app. `as const` keeps each `key` a literal,
 * checked i18n key (same reason as `EXPERIENCE_TYPES`).
 */
export const AMBIANCE_OPTIONS = [
  { id: 'calm', key: 'preferences.ambiance.calm', icon: Leaf },
  { id: 'festive', key: 'preferences.ambiance.festive', icon: Sparkles },
  { id: 'romantic', key: 'preferences.ambiance.romantic', icon: Heart },
  { id: 'friends', key: 'preferences.ambiance.friends', icon: Users },
  { id: 'family', key: 'preferences.ambiance.family', icon: UsersRound },
  { id: 'solo', key: 'preferences.ambiance.solo', icon: User },
] as const;

/** Default selection (mockup: Calme, Entre amis). */
export const DEFAULT_AMBIANCE: readonly string[] = ['calm', 'friends'];
