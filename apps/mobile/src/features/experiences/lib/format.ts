/** Locale-aware compact count ("1,2 k" fr / "1.2K" en) for a large review total, e.g. "1.2k avis". */
export function formatCompactCount(count: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    count,
  );
}
