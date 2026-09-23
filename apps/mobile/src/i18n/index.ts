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

export type LanguageOption = {
  code: Language;
  /** Native name (e.g. "Français", "English"), never the currently active UI language's translation
   * of it — read from that language's own `settings.languages.<code>` resource key via
   * `i18n.getResource`, so each locale file only ever has to describe itself. */
  nativeName: string;
  /** Purely decorative — `code` remains the real source of truth (`docs/DECISIONS.md`). */
  flag?: string;
};

/** One flag emoji per supported language — the one piece of language metadata a translation
 * resource has no natural home for (a flag isn't translatable text, unlike `nativeName`). Kept
 * separate from `SUPPORTED_LANGUAGES`/`resources`: a language missing from this map still appears in
 * `getAvailableLanguages()`, just without a flag. */
const LANGUAGE_FLAGS: Partial<Record<Language, string>> = {
  fr: '🇫🇷',
  en: '🇬🇧',
};

/**
 * The selectable language list for "Langue" (`LanguageScreen`) — derived from the i18n resources
 * themselves, never hardcoded in a screen (`docs/DECISIONS.md`). Adding a language: add its resource
 * file, add it to `SUPPORTED_LANGUAGES` and `resources` above (Metro needs a static import per
 * locale file — the one unavoidable step), give that file its own `settings.languages.<code>` key,
 * and optionally add it to `LANGUAGE_FLAGS`. Nothing else, and nothing in `LanguageScreen`, changes.
 */
export function getAvailableLanguages(): LanguageOption[] {
  return SUPPORTED_LANGUAGES.map((code) => ({
    code,
    nativeName: i18n.getResource(code, 'translation', `settings.languages.${code}`) as string,
    flag: LANGUAGE_FLAGS[code],
  }));
}

export default i18n;
