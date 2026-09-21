// Import each weight from its own entry point: the package root would bundle every
// weight and italic of both families (several MB) into the app.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';

import { fontFamily } from './typography';

/**
 * Font files to register with `useFonts`. Keys must match `fontFamily` values.
 * To swap a font, change the import here and the name in `typography.ts` — nothing else.
 */
export const fontAssets = {
  [fontFamily.display]: PlusJakartaSans_700Bold,
  [fontFamily.displaySemibold]: PlusJakartaSans_600SemiBold,
  [fontFamily.body]: Inter_400Regular,
  [fontFamily.bodyMedium]: Inter_500Medium,
  [fontFamily.bodySemibold]: Inter_600SemiBold,
};
