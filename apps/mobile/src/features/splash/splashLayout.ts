/**
 * Geometry of the splash screen, measured on the design mockup (941 × 1672 px).
 * Every value below is in mockup pixels; `computeSplashLayout` scales them to the device:
 * sizes and horizontal positions follow the screen WIDTH, and the two content groups are
 * anchored on the screen HEIGHT (top group centered on the mockup's 40.5 % line, bottom group
 * kept at the same distance from the bottom edge), so nothing overlaps on taller phones.
 */

export const MOCKUP = { width: 941, height: 1672 } as const;

/** Content box of each raster asset inside its (transparent) square/rect canvas. */
const LOGO_ASSET = { size: 1254, bbox: { x: 253, y: 193, w: 803, h: 882 } } as const;
const WORDMARK_ASSET = { w: 1024, h: 512, bbox: { x: 118, y: 170, w: 801, h: 187 } } as const;

/** Scale applied to the raster assets so their content matches the mockup. */
const LOGO_SCALE = 0.27;
const WORDMARK_SCALE = 0.587;

/** Target position of the visible content (mockup px). */
const TARGET = {
  logo: { centerX: 467, centerY: 567.5 },
  wordmark: { centerX: 472, top: 727 },
  tagline: { centerX: 472, centerY: 869 },
  divider: { centerX: 472, top: 907, w: 89, h: 4 },
  headline: { left: 68, firstLineTop: 1281, fontSize: 37, lineHeight: 45.5 },
  rule: { left: 69, top: 1429, w: 65, h: 3 },
  captions: { left: 69, firstCenterY: 1493.5, lineHeight: 28, fontSize: 14 },
} as const;

/**
 * The mockup's small texts shrink to ~6-8 pt on a 390 pt wide phone, which is unreadable.
 * Their size is floored at this value (in device pt); it has no effect at mockup scale.
 */
const MIN_SMALL_TEXT = 10;

/** Vertical extent of each content group in the mockup. */
const TOP_GROUP = { top: 442, bottom: 911 } as const;
const BOTTOM_GROUP = { top: 1281, bottom: 1527 } as const;

export type Box = { left: number; top: number; width: number; height: number };

export type SplashLayout = {
  scale: number;
  logo: Box;
  wordmark: Box;
  tagline: {
    top: number;
    height: number;
    offsetX: number;
    fontSize: number;
    letterSpacing: number;
  };
  divider: Box;
  headline: { left: number; top: number; fontSize: number; lineHeight: number };
  rule: Box;
  captions: {
    left: number;
    top: number;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
  };
};

type Input = { width: number; height: number };

export function computeSplashLayout({ width, height }: Input): SplashLayout {
  const k = width / MOCKUP.width;

  // Group anchors, in device px.
  const topGroupHeight = (TOP_GROUP.bottom - TOP_GROUP.top) * k;
  const topOrigin =
    height * ((TOP_GROUP.top + TOP_GROUP.bottom) / 2 / MOCKUP.height) - topGroupHeight / 2;
  const bottomInset = (MOCKUP.height - BOTTOM_GROUP.bottom) * k;
  const bottomOrigin = height - bottomInset - (BOTTOM_GROUP.bottom - BOTTOM_GROUP.top) * k;

  /** Device Y of a mockup Y that belongs to the top group. */
  const topY = (mockY: number) => topOrigin + (mockY - TOP_GROUP.top) * k;
  /** Device Y of a mockup Y that belongs to the bottom group. */
  const bottomY = (mockY: number) => bottomOrigin + (mockY - BOTTOM_GROUP.top) * k;

  const logoSize = LOGO_ASSET.size * LOGO_SCALE;
  const logoBboxCenterX = LOGO_ASSET.bbox.x + LOGO_ASSET.bbox.w / 2;

  const wordmarkBboxCenterX = WORDMARK_ASSET.bbox.x + WORDMARK_ASSET.bbox.w / 2;
  const tagline = { fontSize: 19, lineHeight: 24, letterSpacing: 0.32 };
  const taglineFont = Math.max(tagline.fontSize * k, MIN_SMALL_TEXT);
  const taglineLine = taglineFont * (tagline.lineHeight / tagline.fontSize);
  const captionFont = Math.max(TARGET.captions.fontSize * k, MIN_SMALL_TEXT);
  const captionLine = captionFont * (TARGET.captions.lineHeight / TARGET.captions.fontSize);

  return {
    scale: k,
    logo: {
      left: (TARGET.logo.centerX - logoBboxCenterX * LOGO_SCALE) * k,
      top: topY(TARGET.logo.centerY - (LOGO_ASSET.bbox.y + LOGO_ASSET.bbox.h / 2) * LOGO_SCALE),
      width: logoSize * k,
      height: logoSize * k,
    },
    wordmark: {
      left: (TARGET.wordmark.centerX - wordmarkBboxCenterX * WORDMARK_SCALE) * k,
      top: topY(TARGET.wordmark.top - WORDMARK_ASSET.bbox.y * WORDMARK_SCALE),
      width: WORDMARK_ASSET.w * WORDMARK_SCALE * k,
      height: WORDMARK_ASSET.h * WORDMARK_SCALE * k,
    },
    tagline: {
      top: topY(TARGET.tagline.centerY) - taglineLine / 2,
      height: taglineLine,
      // The centered text is 1.5 mockup px right of the screen center in the mockup.
      offsetX: (TARGET.tagline.centerX - MOCKUP.width / 2) * k,
      fontSize: taglineFont,
      letterSpacing: tagline.letterSpacing * taglineFont,
    },
    divider: {
      left: (TARGET.divider.centerX - TARGET.divider.w / 2) * k,
      top: topY(TARGET.divider.top),
      width: TARGET.divider.w * k,
      height: TARGET.divider.h * k,
    },
    headline: {
      left: TARGET.headline.left * k,
      top: bottomY(TARGET.headline.firstLineTop - 4),
      fontSize: TARGET.headline.fontSize * k,
      lineHeight: TARGET.headline.lineHeight * k,
    },
    rule: {
      left: TARGET.rule.left * k,
      top: bottomY(TARGET.rule.top),
      width: TARGET.rule.w * k,
      height: TARGET.rule.h * k,
    },
    captions: {
      left: TARGET.captions.left * k,
      top: bottomY(TARGET.captions.firstCenterY) - captionLine / 2,
      fontSize: captionFont,
      lineHeight: captionLine,
      letterSpacing: 0.267 * captionFont,
    },
  };
}
