import { Image } from 'expo-image';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Height / width of the illustration once fitted (the source is about 2:1, cropped a little at the sides). */
const SCENE_RATIO = 0.62;
const FADE_HEIGHT = 70;

/**
 * Landscape at the bottom of the profile creation. Its top edge dissolves into the page background so it
 * never shows a seam; it does not move (no animation on a large image).
 */
export function ProfileScene({ width }: { width: number }) {
  const { colors, isDark } = useTheme();
  const height = Math.round(width * SCENE_RATIO);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height }}
    >
      <Image
        source={require('../../../../assets/images/onboarding/profile-landscape.jpg')}
        contentFit="cover"
        contentPosition="bottom"
        style={{ flex: 1, opacity: isDark ? 0.5 : 1 }}
      />
      <Svg width="100%" height={FADE_HEIGHT} style={{ position: 'absolute', top: 0 }}>
        <Defs>
          <LinearGradient id="sceneFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.background} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={FADE_HEIGHT} fill="url(#sceneFade)" />
      </Svg>
    </View>
  );
}
