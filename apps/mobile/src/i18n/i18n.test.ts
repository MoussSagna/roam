import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import fr from './locales/fr.json';
import i18n, { DEFAULT_LANGUAGE, getStoredLanguage, setLanguage } from './index';

function leafKeys(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe('i18n', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage(DEFAULT_LANGUAGE);
  });

  it('uses French by default', () => {
    expect(DEFAULT_LANGUAGE).toBe('fr');
    expect(i18n.t('common.continue')).toBe('Continuer');
  });

  it('keeps French and English in sync', () => {
    expect(leafKeys(en).sort()).toEqual(leafKeys(fr).sort());
  });

  it('interpolates {count} with the single-brace syntax of the locale files', () => {
    expect(i18n.t('onboarding.interests.selected', { count: 3 })).toBe('3 sélectionnés');
  });

  it('switches language without restart and persists it under roam.language', async () => {
    await setLanguage('en');
    expect(i18n.t('common.continue')).toBe('Continue');
    expect(await AsyncStorage.getItem('roam.language')).toBe('en');
    expect(await getStoredLanguage()).toBe('en');
  });

  it('ignores unsupported stored languages', async () => {
    await AsyncStorage.setItem('roam.language', 'de');
    expect(await getStoredLanguage()).toBeNull();
  });
});
