import Svg, { Circle, Path } from 'react-native-svg';

type RunnerIconProps = { size?: number; color?: string; strokeWidth?: number };

/**
 * Running figure for the "Sportif" mood. Lucide has no runner (`person-standing` stands still), so this
 * follows Lucide's conventions (24 grid, round caps) with the path of Tabler's MIT-licensed "run" icon.
 */
export function RunnerIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
}: RunnerIconProps) {
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
      <Circle cx={13} cy={4} r={1} />
      <Path d="M4 17l5 1l.75 -1.5" />
      <Path d="M15 21l0 -4l-4 -3l1 -6" />
      <Path d="M7 12l0 -3l5 -1l3 3l3 1" />
    </Svg>
  );
}
