import 'i18next';

import type fr from './locales/fr.json';

// Makes `t('some.key')` type-checked against the French (primary) resources.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof fr };
  }
}
