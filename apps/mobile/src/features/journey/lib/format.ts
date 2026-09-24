/** "45 min", "2 h", "3 h 20". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** "600 m", "3,2 km" (French decimal comma) / "3.2 km". */
export function formatDistance(meters: number, language: string): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = (meters / 1000).toFixed(1);
  return `${language.startsWith('fr') ? km.replace('.', ',') : km} km`;
}

/** "≈ 26 €" — an estimate, never shown as an exact price. */
export function formatBudget(euros: number): string {
  return `≈ ${Math.round(euros)} €`;
}

/** "12 septembre" / "September 12" (the history's "Terminé le …"). */
export function formatDayMonth(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long' }).format(new Date(iso));
}
