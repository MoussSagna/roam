/**
 * Vocabulary shared by several entities. String unions mirror the i18n keys
 * (e.g. `context.mood.<Mood>`) so a value can be translated with a template key.
 */

export type Mood = 'calm' | 'discover' | 'energetic' | 'creative' | 'food' | 'shopping' | 'culture';

export type Company = 'alone' | 'couple' | 'friends' | 'family';

/** Budget brackets from docs/02_MVP_SCOPE.md. */
export type BudgetRange = 'free' | 'under10' | '10to25' | '25to50' | '50plus';

export type DurationOption = '30min' | '1h' | '2h' | '3hPlus';

export type Coordinates = {
  latitude: number;
  longitude: number;
};
