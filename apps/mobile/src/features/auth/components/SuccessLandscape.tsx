import Svg, { Path, Polygon, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * Decorative landscape behind the reset-success screen's button card (design mockup
 * "Authentification", tile 7: layered mountains, a lake and a couple of evergreens). No such
 * illustration asset exists, so this approximates it with flat theme-colored shapes rather than
 * reproducing it exactly — same approximation spirit as the onboarding's `MapPreview`
 * (`DECISIONS.md` D-24, D-36). Fills its container, anchored to the bottom.
 */
export function SuccessLandscape() {
  const { colors } = useTheme();

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMax slice"
      accessible={false}
    >
      {/* Back range */}
      <Polygon
        points="0,150 60,105 130,140 210,90 290,135 340,110 400,145 400,240 0,240"
        fill={colors.primary}
        opacity={0.14}
      />
      {/* Mid range */}
      <Polygon
        points="0,180 50,150 120,175 190,120 260,165 330,140 400,175 400,240 0,240"
        fill={colors.primary}
        opacity={0.26}
      />
      {/* Front range */}
      <Polygon
        points="0,205 70,165 150,200 230,150 300,195 400,175 400,240 0,240"
        fill={colors.primary}
        opacity={0.42}
      />
      {/* Evergreens, front-right */}
      <Path
        d="M318 165 L330 195 L306 195 Z M318 150 L328 172 L308 172 Z"
        fill={colors.primary}
        opacity={0.55}
      />
      <Path
        d="M352 175 L362 202 L342 202 Z M352 162 L360 182 L344 182 Z"
        fill={colors.primary}
        opacity={0.55}
      />
      {/* Water */}
      <Rect x="0" y="205" width="400" height="35" fill={colors.primary} opacity={0.08} />
    </Svg>
  );
}
