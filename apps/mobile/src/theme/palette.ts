/**
 * Raw ROAM colors. This is the ONLY place (with `tokens.ts`) where hex values live.
 * Components never import this file: they use semantic tokens (see `tokens.ts`).
 */

/** Core palette from docs/06_DESIGN_SYSTEM.md. */
export const brand = {
  forest: '#3F624E',
  cream: '#F7F4ED',
  white: '#FFFFFF',
  ink: '#171B18',
  stone: '#747873',
  peach: '#E9CDB9',
  sage: '#DDE7DE',
} as const;

/**
 * Values derived from the core palette so both themes reach WCAG AA
 * ("accessibility and contrast take priority over exact brand colors" — 05_THEME_AND_I18N.md).
 */
export const derived = {
  /** Stone darkened: #747873 is only ~4.0:1 on Cream, below AA for body text. */
  stoneStrong: '#666A65',
  /** Warm hairline that stays visible on Cream. */
  line: '#E2DDD1',

  success: '#2F7A4F',
  warning: '#8F5B00',
  error: '#B3261E',

  /** Dark theme: near-black green surfaces, not an inversion of the light theme. */
  night: '#0F1411',
  nightSurface: '#161D19',
  nightElevated: '#1F2823',
  nightLine: '#2D3832',
  offWhite: '#F1EDE4',
  sageMuted: '#A7B4AA',
  forestLight: '#86B096',
  successOnDark: '#6CC496',
  warningOnDark: '#E5B04B',
  errorOnDark: '#F0837A',
  black: '#000000',
} as const;
