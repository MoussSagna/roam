import { FlatList, type FlatListProps } from 'react-native';

/** Matches the page's own horizontal padding (`px-6` = 24px, `06_DESIGN_SYSTEM.md`'s 4px scale) — the
 * amount a carousel must negate to bleed past it, and re-add so its first/last item still lines up
 * with the rest of the page's content. */
const DEFAULT_SIDE_PADDING = 24;

export type HorizontalCarouselProps<T> = Omit<
  FlatListProps<T>,
  'horizontal' | 'showsHorizontalScrollIndicator' | 'contentContainerStyle'
> & {
  /** Width (px) of one item — must match what the item itself actually renders at (a fixed constant,
   * or a value derived from `useWindowDimensions` the same way the item derives it), otherwise the
   * snap points drift out of sync with the cards. */
  itemWidth: number;
  /** Gap (px) between items, also folded into `snapToInterval` (`itemWidth + spacing`). */
  spacing: number;
  /** Horizontal inset (px) to bleed past. Defaults to the page's own `px-6` padding — override only if
   * the carousel sits inside a container with a different one. */
  sidePadding?: number;
  /** `false` renders a plain (non-snapping) full-bleed carousel — no known caller needs this yet, but
   * a future non-card carousel (e.g. free-scrolling thumbnails) might. */
  snapEnabled?: boolean;
};

/**
 * Full-bleed, snapping horizontal carousel (`docs/DECISIONS.md` — Discover carousel full-bleed/snap
 * pass): a `FlatList horizontal` that visually escapes its parent's own horizontal padding
 * (`marginHorizontal: -sidePadding` on the list itself) while keeping the first/last item aligned with
 * the rest of the page's content (a matching `paddingHorizontal` in `contentContainerStyle`), and snaps
 * one item at a time (`snapToInterval` = `itemWidth + spacing`, `decelerationRate="fast"`).
 *
 * Generic over the list's own `renderItem`/`data`/`keyExtractor` (passed through via `...props`) — this
 * only owns the full-bleed/snap mechanics, not any card's shape, so it can wrap any horizontal list of
 * cards in the app, not just Discover's.
 */
export function HorizontalCarousel<T>({
  itemWidth,
  spacing,
  sidePadding = DEFAULT_SIDE_PADDING,
  snapEnabled = true,
  style,
  ...props
}: HorizontalCarouselProps<T>) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ marginHorizontal: -sidePadding }, style]}
      contentContainerStyle={{ paddingHorizontal: sidePadding, gap: spacing }}
      snapToInterval={snapEnabled ? itemWidth + spacing : undefined}
      snapToAlignment="start"
      decelerationRate={snapEnabled ? 'fast' : 'normal'}
      {...props}
    />
  );
}
