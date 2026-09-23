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
  /** Deep forest green of buttons and selected states in the onboarding mockups (Forest is too light for them). */
  forestDeep: '#1A3E30',
  /** Near-black of headings in the mockups (Ink #171B18 is visibly lighter). */
  inkDeep: '#060A0E',
  /** Slate used for secondary text in the mockups. Raw Stone #747873 is only ~4.0:1 on Cream, below AA. */
  slate: '#454F5B',
  /** Warm hairline that stays visible on Cream. */
  line: '#E2DDD1',

  /** Deep navy of the "Bon retour !" / "Créer un compte" headings on the auth form screens
   * (measured on the Login and Register mockup tiles — clearly distinct from `inkDeep`, not an
   * artifact: light theme only, see `DECISIONS.md` D-31). */
  authHeading: '#000050',

  /** Icon accents of the onboarding mood tiles (mockup): Détendu, Festif, Romantique. Decorative only. */
  moodGreen: '#5E9474',
  moodOrange: '#EC9433',
  moodCoral: '#DE5A46',
  moodOrangeOnDark: '#F2AE5E',
  moodCoralOnDark: '#F0857A',

  /** Two extra categorical hues for the statistics screen's charts (mockup tile 05): decorative
   * only, chosen to stay distinguishable from `moodGreen`/`moodOrange`/`moodCoral` above. */
  chartBlue: '#3E7CB1',
  chartBlueOnDark: '#6FB2E0',
  chartViolet: '#7B5EA7',
  chartVioletOnDark: '#B29AD9',

  /** Map preview of the onboarding location screen (illustration, not a real map). */
  mapBase: '#E8E7DF',
  mapStreet: '#FAF9F5',
  mapPark: '#D8E1CD',
  mapBaseDark: '#1D2621',
  mapStreetDark: '#2C3831',
  mapParkDark: '#1F3428',

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
