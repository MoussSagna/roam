import Svg, { Path } from 'react-native-svg';

type LotusIconProps = { size?: number; color?: string; strokeWidth?: number };

/** Lotus for the "Bien-être" interest. Lucide has none; drawn on Lucide's 24 grid with round caps. */
export function LotusIcon({ size = 24, color = 'currentColor', strokeWidth = 2 }: LotusIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 3c-2.6 3-3.6 6.5-3.6 9.5 0 2.4 1.4 4.6 3.6 6.5 2.2-1.9 3.6-4.1 3.6-6.5 0-3-1-6.5-3.6-9.5z" />
      <Path d="M8.6 7.6C6.4 6.7 4.4 6.5 3 7.1c-.6 4.5.8 8.6 4.4 11.4 1.4 1.1 3 1.8 4.6 2" />
      <Path d="M15.4 7.6c2.2-.9 4.2-1.1 5.6-.5.6 4.5-.8 8.6-4.4 11.4-1.4 1.1-3 1.8-4.6 2" />
    </Svg>
  );
}
