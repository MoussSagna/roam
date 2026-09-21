/**
 * Typography (docs/06_DESIGN_SYSTEM.md): Plus Jakarta Sans for headings, Inter for body.
 * Pure module — also read by `tailwind.config.ts`. Font files are loaded in `fonts.ts`.
 */

/** Names registered with `expo-font` (see `fonts.ts`). One entry per weight actually used. */
export const fontFamily = {
  display: 'PlusJakartaSans_700Bold',
  displaySemibold: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

type FontSizeEntry = [size: string, config: { lineHeight: string }];

/**
 * Mobile type scale. The documented desktop scale (Display 56/60, H1 40/44, H2 32/38…) is
 * scaled down one step for phones; Body, Small and Caption keep the documented sizes.
 */
export const fontSize = {
  display: ['40px', { lineHeight: '44px' }],
  h1: ['32px', { lineHeight: '38px' }],
  h2: ['28px', { lineHeight: '34px' }],
  h3: ['24px', { lineHeight: '30px' }],
  h4: ['20px', { lineHeight: '26px' }],
  bodyLg: ['18px', { lineHeight: '28px' }],
  body: ['16px', { lineHeight: '24px' }],
  small: ['14px', { lineHeight: '20px' }],
  caption: ['12px', { lineHeight: '16px' }],
} satisfies Record<string, FontSizeEntry>;

/** Scale steps plus `label` (Body size, semibold) for buttons and chips. */
export type TextVariant = keyof typeof fontSize | 'label';

/** Class strings live here (inside `src/`) so Tailwind's content scan finds them. */
export const textVariantClasses: Record<TextVariant, string> = {
  label: 'font-bodySemibold text-body',
  display: 'font-display text-display',
  h1: 'font-display text-h1',
  h2: 'font-display text-h2',
  h3: 'font-displaySemibold text-h3',
  h4: 'font-displaySemibold text-h4',
  bodyLg: 'font-body text-bodyLg',
  body: 'font-body text-body',
  small: 'font-body text-small',
  caption: 'font-bodyMedium text-caption',
};
