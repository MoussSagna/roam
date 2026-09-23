import MapPin from 'lucide-react-native/icons/map-pin';
import { View } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { mapColors, useTheme } from '@/theme';
import { derived } from '@/theme/palette';

/** The illustration is drawn on this grid (design points) and scaled to cover the view. Exported so
 * `features/map/ExperienceMapView.tsx` (sprint 6) can draw the same decorative streets/parks at its
 * own container size, instead of a duplicated copy of this illustration data. */
export const MAP_DESIGN_WIDTH = 345;
export const MAP_DESIGN_HEIGHT = 256;
export const MAP_ASPECT = MAP_DESIGN_HEIGHT / MAP_DESIGN_WIDTH;

/** Below this height the city card would cover the marker, so it is left out. */
const CITY_CARD_MIN_MAP_HEIGHT = 170;

export const MAP_STREETS: readonly { d: string; width: number }[] = [
  { d: 'M-10 60 L360 -5', width: 2 },
  { d: 'M-10 122 L360 58', width: 2.6 },
  { d: 'M-10 192 L360 130', width: 2 },
  { d: 'M-10 232 L360 202', width: 1.6 },
  { d: 'M-10 20 L360 -30', width: 1.4 },
  { d: 'M-10 88 L360 30', width: 1.4 },
  { d: 'M-10 160 L360 96', width: 1.4 },
  { d: 'M60 -10 L20 270', width: 2.6 },
  { d: 'M96 -10 L62 270', width: 1.4 },
  { d: 'M132 -10 L96 270', width: 2 },
  { d: 'M166 -10 L150 270', width: 1.4 },
  { d: 'M200 -10 L216 270', width: 2.6 },
  { d: 'M238 -10 L262 270', width: 1.4 },
  { d: 'M272 -10 L332 270', width: 2 },
  { d: 'M334 -10 L300 270', width: 1.6 },
  { d: 'M40 270 L252 -10', width: 3 },
  { d: 'M110 270 L300 20', width: 1.4 },
];

export const MAP_PARKS: readonly string[] = [
  '182,56 232,50 236,96 188,100',
  '272,46 328,40 334,100 278,104',
  '92,196 128,190 132,232 96,238',
];

type MapPreviewProps = {
  width: number;
  height: number;
  /** City and country shown in the floating card (sample content for now). */
  city: string;
  country: string;
};

/**
 * Decorative map of the location screen (design mockup): a soft blob of streets and parks, a "you are
 * here" marker and a card with the city. It is an illustration, not a map, so it is hidden from
 * assistive technologies; a real map replaces it once positioning exists.
 */
export function MapPreview({ width, height, city, country }: MapPreviewProps) {
  const { colors, scheme } = useTheme();
  const map = mapColors[scheme];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: 105, overflow: 'hidden' }}
    >
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${MAP_DESIGN_WIDTH} ${MAP_DESIGN_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Rect width={MAP_DESIGN_WIDTH} height={MAP_DESIGN_HEIGHT} fill={map.base} />
        {MAP_PARKS.map((points) => (
          <Polygon key={points} points={points} fill={map.park} />
        ))}
        {MAP_STREETS.map(({ d, width: strokeWidth }) => (
          <Path key={d} d={d} stroke={map.street} strokeWidth={strokeWidth} fill="none" />
        ))}
        <Circle cx={171} cy={116} r={48} fill="none" stroke={map.street} strokeWidth={1} />
        <Circle cx={171} cy={116} r={30} fill={colors.primary} fillOpacity={0.14} />
        <Circle cx={171} cy={116} r={14} fill={colors.primary} />
        <Circle cx={171} cy={116} r={3.2} fill={colors.primaryForeground} />
      </Svg>

      {height >= CITY_CARD_MIN_MAP_HEIGHT ? (
        <View
          className="absolute flex-row items-center rounded-pill bg-surface"
          style={{
            right: 35 * (width / MAP_DESIGN_WIDTH),
            bottom: 25 * (height / MAP_DESIGN_HEIGHT),
            height: 70,
            paddingLeft: 20,
            paddingRight: 26,
            gap: 16,
            shadowColor: derived.black,
            shadowOpacity: 0.08,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 5 },
            elevation: 4,
          }}
        >
          <MapPin size={26} strokeWidth={1.5} color={colors.text} />
          <View>
            <Text variant="body" className="font-bodyMedium" style={{ lineHeight: 23 }}>
              {city}
            </Text>
            <Text variant="body" tone="secondary" style={{ lineHeight: 23 }}>
              {country}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
