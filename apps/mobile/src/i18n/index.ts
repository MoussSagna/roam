import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';

import en from './locales/en.json';
import fr from './locales/fr.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
/** French is the primary product language (docs/00_AGENT_INSTRUCTIONS.md). */
export const DEFAULT_LANGUAGE: Language = 'fr';

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  // Resources are bundled: initialise synchronously so the first render is already translated.
  initAsync: false,
  // The locale files use single braces: "{count} sélectionnés".
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
});

export async function getStoredLanguage(): Promise<Language | null> {
  const value = await readStorage(STORAGE_KEYS.language);
  return isLanguage(value) ? value : null;
}

/** Switches the UI language immediately and persists the choice. */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  await writeStorage(STORAGE_KEYS.language, language);
}

export default i18n;
