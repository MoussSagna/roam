import type { Config } from 'tailwindcss';
// @ts-expect-error nativewind@4 ships an empty type declaration for its preset
import nativewindPreset from 'nativewind/preset';

import { colorTokenNames, cssVarName, radius } from './src/theme/tokens';
import { fontFamily, fontSize } from './src/theme/typography';

/**
 * Colors point at CSS variables injected by `ThemeProvider`, so the same class
 * (`bg-background`) resolves to the light or the dark value. `<alpha-value>` enables `bg-primary/50`.
 * Spacing keeps Tailwind's 4px-based default scale (a superset of the documented 4…96 scale).
 */
const colors = Object.fromEntries(
  colorTokenNames.map((token) => [token, `rgb(var(${cssVarName(token)}) / <alpha-value>)`]),
);

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors,
      fontFamily: Object.fromEntries(Object.entries(fontFamily).map(([k, v]) => [k, [v]])),
      fontSize: { ...fontSize },
      borderRadius: { ...radius },
    },
  },
  plugins: [],
};

export default config;
