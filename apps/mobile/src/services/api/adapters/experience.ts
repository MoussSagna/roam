import { formatDuration } from '@/features/journey/lib/format';
import type { BudgetRange, Category, Experience } from '@/types';

import type { ExperienceDto } from '../dto';

/**
 * API experience (canonical model, `apps/api/apidocs/EXPERIENCE_CATALOG_API.md`) → the app's `Experience`
 * (a shape born with the mocks). Every field is either read from the API or formatted from what it sends;
 * nothing is made up (`mobiledocs/MOBILE_API_INTEGRATION.md` → "Experience mapping"):
 *
 * - served and mapped: id, title, description, categories (slug → the app's category id), places,
 *   duration (`roam.estimatedDurationMin`), budget bracket (from the price bounds), images (URLs), city,
 *   address, coordinates, rating, review count, tags;
 * - formatted here: `durationLabel`, `priceLabel`, `location` (the city);
 * - not served, left empty: moods (no mood model), distance (no user position in a catalog read), opening
 *   hours label, transport, highlights, reviews, similar experiences, hero/popular/favorite flags, history.
 *
 * Images: the API serves URLs; today every experience has none (DATA-1 did not migrate the bundled photos),
 * so `coverImage`/`images` stay unset and the cards show their existing no-photo state.
 */

type Translate = (key: string, options?: Record<string, unknown>) => string;

export type ExperienceMappingContext = {
  /** The app's category vocabulary (`CategoryRepository`), to turn API slugs into category ids. */
  categories: readonly Category[];
  /** Translates the formatted labels (price). */
  t: Translate;
};

/**
 * The MVP bracket (MVP_SCOPE.md §3) the known price falls in — the inverse of DATA-1's bracket → bounds
 * mapping, so a migrated experience gets its original bracket back. `undefined` when no price is known:
 * an unknown price is not "free".
 */
export function budgetRangeFromPrice(
  priceMin: number | null,
  priceMax: number | null,
  priceLevel: string,
): BudgetRange | undefined {
  if (priceMax !== null) {
    if (priceMax <= 0) return 'free';
    if (priceMax <= 10) return 'under10';
    if (priceMax <= 25) return '10to25';
    if (priceMax <= 50) return '25to50';
    return '50plus';
  }
  if (priceMin !== null) {
    if (priceMin >= 50) return '50plus';
    if (priceMin >= 25) return '25to50';
    if (priceMin >= 10) return '10to25';
    if (priceMin > 0) return 'under10';
  }
  if (priceLevel === 'free') return 'free';
  return undefined;
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

/** "Gratuit", "12 €", "10–25 €", "Jusqu'à 10 €", "À partir de 50 €" — from the price facts only. */
export function formatPriceLabel(dto: ExperienceDto, t: Translate): string | undefined {
  const { priceMin, priceMax, priceLevel } = dto;
  const currency = !dto.currency || dto.currency === 'EUR' ? '€' : dto.currency;
  const isFree = priceMax !== null ? priceMax <= 0 : priceMin === null && priceLevel === 'free';
  if (isFree) return t('experience.price.free');
  if (priceMin !== null && priceMax !== null) {
    if (priceMin === priceMax) return `${formatAmount(priceMin)} ${currency}`;
    return t('experience.price.range', {
      min: formatAmount(priceMin),
      max: formatAmount(priceMax),
      currency,
    });
  }
  if (priceMax !== null) {
    return t('experience.price.upTo', { max: formatAmount(priceMax), currency });
  }
  if (priceMin !== null) {
    return t('experience.price.from', { min: formatAmount(priceMin), currency });
  }
  return undefined;
}

export function mapExperienceDto(
  dto: ExperienceDto,
  { categories, t }: ExperienceMappingContext,
): Experience {
  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const duration = dto.roam?.estimatedDurationMin ?? undefined;
  const images = dto.images.map((uri) => ({ uri }));

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? '',
    // No mood on API experiences (EXPERIENCE_CATALOG_API.md → "What this layer does not do"): none invented.
    moods: [],
    // A slug the app does not know keeps its slug as id: the experience stays, without a category label.
    categoryIds: dto.categories.map((slug) => categoryIdBySlug.get(slug) ?? slug),
    placeIds: dto.placeIds,
    estimatedDurationMin: duration,
    estimatedBudget: budgetRangeFromPrice(dto.priceMin, dto.priceMax, dto.priceLevel),
    coverImage: dto.coverImage ? { uri: dto.coverImage } : undefined,
    images: images.length > 0 ? images : undefined,
    location: dto.city ?? undefined,
    coordinates: dto.coordinates ?? undefined,
    durationLabel: duration !== undefined ? formatDuration(duration) : undefined,
    priceLabel: formatPriceLabel(dto, t),
    rating: dto.rating ?? undefined,
    reviewCount: dto.reviewCount ?? undefined,
    tags: dto.roam?.tags,
    address: dto.address ?? undefined,
  };
}
