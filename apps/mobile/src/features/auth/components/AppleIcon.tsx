import Svg, { Path } from 'react-native-svg';

type AppleIconProps = { size?: number; color?: string };

/** Apple logo mark. Not in Lucide (brand logos aren't part of an outline icon set); follows `colors.text`. */
export function AppleIcon({ size = 20, color = 'currentColor' }: AppleIconProps) {
  return (
    <Svg width={size} height={size * (24 / 22)} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        d="M17.05 12.536c-.03-2.71 2.213-4.01 2.313-4.073-1.26-1.842-3.223-2.096-3.923-2.126-1.67-.17-3.257.983-4.103.983-.846 0-2.15-.958-3.537-.933-1.82.027-3.5 1.058-4.435 2.69-1.892 3.28-.484 8.14 1.36 10.804.903 1.303 1.977 2.766 3.39 2.713 1.36-.055 1.874-.88 3.52-.88 1.64 0 2.106.88 3.545.85 1.464-.023 2.39-1.325 3.283-2.633.688-.977 1.222-2.073 1.552-3.244-.037-.016-2.947-1.13-2.976-4.15z"
      />
      <Path
        fill={color}
        d="M14.417 4.526c.746-.906 1.25-2.17 1.113-3.426-1.076.045-2.383.72-3.157 1.626-.693.802-1.3 2.1-1.137 3.334 1.232.096 2.436-.62 3.181-1.534z"
      />
    </Svg>
  );
}
