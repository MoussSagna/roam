import type { TFunction } from 'i18next';

/** Explicit map so each value stays a typed, checked i18n key (`experience.categories.*`) instead of
 * a dynamic template literal, which `react-i18next`'s typed keys reject. */
const CATEGORY_LABEL_KEYS = {
  cafe: 'experience.categories.cafe',
  park: 'experience.categories.park',
  restaurant: 'experience.categories.restaurant',
  bar: 'experience.categories.bar',
  culture: 'experience.categories.culture',
  nature: 'experience.categories.nature',
  experience: 'experience.categories.experience',
} as const;

/** Resolves a `Category.slug` to its display label, or `null` for a slug with no mapped label. */
export function getCategoryLabel(t: TFunction, slug: string): string | null {
  const key = CATEGORY_LABEL_KEYS[slug as keyof typeof CATEGORY_LABEL_KEYS] as
    (typeof CATEGORY_LABEL_KEYS)[keyof typeof CATEGORY_LABEL_KEYS] | undefined;
  return key ? t(key) : null;
}
