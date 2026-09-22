import { Text } from 'react-native';

import { fontFamily } from '@/theme/typography';

/**
 * Leading glyph of a budget row: a single "€", shaped like an icon (`size`, `color`) so it fits `ChoiceRow`
 * and sits centered under the gift icon. `size` is the icon box; the sign is drawn at 0.65 of it.
 */
export function EuroGlyph({
  size = 40,
  color,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Text
      allowFontScaling={false}
      style={{
        width: size,
        textAlign: 'center',
        fontFamily: fontFamily.bodySemibold,
        fontSize: size * 0.65,
        lineHeight: size,
        color,
      }}
    >
      €
    </Text>
  );
}
