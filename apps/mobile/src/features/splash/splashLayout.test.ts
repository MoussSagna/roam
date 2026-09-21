import { computeSplashLayout, MOCKUP } from './splashLayout';

const phones = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'Android small', width: 360, height: 640 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
];

describe('computeSplashLayout', () => {
  it('reproduces the mockup geometry at mockup size', () => {
    const layout = computeSplashLayout({ width: MOCKUP.width, height: MOCKUP.height });

    expect(layout.scale).toBe(1);
    expect(layout.rule).toEqual({ left: 69, top: 1429, width: 65, height: 3 });
    expect(layout.divider.width).toBe(89);
    expect(layout.divider.top).toBeCloseTo(907, 5);
    expect(layout.headline.fontSize).toBe(37);
    expect(layout.tagline.fontSize).toBe(19);
    expect(layout.captions.fontSize).toBe(14);
    // The wordmark keeps its asset ratio (1024 × 512) and its visible letters (465 px) fit inside it around the mockup's axis.
    expect(layout.wordmark.width / layout.wordmark.height).toBeCloseTo(2, 5);
    expect(layout.wordmark.left).toBeLessThan(472 - 465 / 2);
    expect(layout.wordmark.left + layout.wordmark.width).toBeGreaterThan(472 + 465 / 2);
  });

  it('scales sizes with the screen width', () => {
    const layout = computeSplashLayout({ width: 470.5, height: 836 });
    expect(layout.scale).toBeCloseTo(0.5, 5);
    expect(layout.headline.fontSize).toBeCloseTo(18.5, 5);
    expect(layout.rule.width).toBeCloseTo(32.5, 5);
  });

  it.each(phones)('keeps small texts legible on $name', ({ width, height }) => {
    const { tagline, captions } = computeSplashLayout({ width, height });
    expect(tagline.fontSize).toBeGreaterThanOrEqual(10);
    expect(captions.fontSize).toBeGreaterThanOrEqual(10);
  });

  it.each(phones)('never overlaps the two content groups on $name', ({ width, height }) => {
    const layout = computeSplashLayout({ width, height });
    const topGroupBottom = layout.divider.top + layout.divider.height;
    expect(layout.logo.top).toBeGreaterThan(0);
    expect(topGroupBottom).toBeLessThan(layout.headline.top);
    // Bottom text must clear the home indicator area.
    const captionsBottom = layout.captions.top + layout.captions.lineHeight * 2;
    expect(captionsBottom).toBeLessThan(height - 24);
  });

  it.each(phones)('keeps every element inside the screen width on $name', ({ width, height }) => {
    const layout = computeSplashLayout({ width, height });
    for (const box of [layout.wordmark, layout.divider, layout.rule]) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.left + box.width).toBeLessThanOrEqual(width);
    }
  });
});
