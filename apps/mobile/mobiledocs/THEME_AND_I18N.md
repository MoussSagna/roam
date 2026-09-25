# Mobile — Theme and i18n

Implementation of the shared requirements in [`appdocs/design/THEME_AND_I18N.md`](../../../appdocs/design/THEME_AND_I18N.md).

## Theme

- Tokens: `apps/mobile/src/theme/tokens.ts` (light and dark values), raw colors in `palette.ts`.
  All 13 documented semantic tokens exist in both themes. Use them as NativeWind classes
  (`bg-background`, `text-textSecondary`, `bg-surfaceElevated`, `bg-overlay/40`…).
- Light / Dark / **System** are all implemented. The preference is persisted under `roam.theme`
  (`light` | `dark` | `system`) and restored before the first screen renders.
- `useTheme()` → `{ preference, scheme, isDark, colors, setPreference }`.
- Resulting dark palette: background `#0F1411`, surface `#161D19`, surfaceElevated `#1F2823`,
  text `#F1EDE4`, textSecondary `#A7B4AA`, primary `#86B096`, accent Peach `#E9CDB9`.
- Light theme values changed to match the onboarding mockups: `primary` `#1A3E30`, `text` `#060A0E`,
  `textSecondary` `#454F5B` (raw Stone is below AA on Cream) — see [`DECISIONS.md`](DECISIONS.md) D-04 and D-19. A test asserts WCAG AA contrast in both themes.
- The Light / Dark / System switch has a real screen (`/profile/theme` → `ThemeScreen`, sprint 5,
  [`DECISIONS.md`](DECISIONS.md) D-61): a row per `THEME_PREFERENCES` entry, selecting one calls
  `useTheme().setPreference` directly. The Français / English switch also has one — see "Langue
  screen" below.

## i18n

- Library: i18next + react-i18next. Resources: `apps/mobile/src/i18n/locales/{fr,en}.json` (moved
  from the repository root). French is the default; the language is persisted under `roam.language`.
- Keys are type-checked against `fr.json`; a test enforces that FR and EN have identical keys.
- Interpolation uses single braces (`{count}`) to match these files.
- Switching language updates the UI immediately, without restart.
- Keys added beyond this document's namespace list: `brand` and `splash` (splash tagline, the
  "Explorer. Ressentir. Sortir." headline and the category line; English wording is a natural
  translation, to be validated), `common.next`, and `onboarding.welcome.*` (welcome screen title,
  subtitle and handwritten line). The legacy `welcome` namespace already present in the files is used by the
  Welcome placeholder.

## Langue screen (`/profile/language`, sprint 5, [`DECISIONS.md`](DECISIONS.md) D-60)

**The languages shown in this screen are derived from the i18n resources — never hardcoded in the
screen.** `getAvailableLanguages()` (`apps/mobile/src/i18n/index.ts`) maps `SUPPORTED_LANGUAGES` to
`{ code, nativeName, flag }`, reading each language's native name from **its own** resource bundle
(`settings.languages.<code>`, via `i18n.getResource`) rather than the currently active one — so
switching the UI to English still shows "Français", not a translation of it. `LanguageScreen`
(`features/profile/LanguageScreen.tsx`) just renders whatever that function returns; it has no
per-language logic of its own.

**To add a language** (e.g. Spanish):

1. Create `apps/mobile/src/i18n/locales/es.json` with every key `fr.json` has (a test enforces key
   parity between `fr.json` and `en.json` only today — extend it if a third locale is added for real).
2. Give it its own `settings.languages.es: "Español"` key — this is what makes its name appear
   correctly regardless of which language is currently active. No other locale file needs an `es` key.
3. In `apps/mobile/src/i18n/index.ts`: add `'es'` to `SUPPORTED_LANGUAGES`, add `es: { translation: es }`
   to the `resources` object passed to `i18n.init`, and import the new JSON file — the one explicit,
   unavoidable step, since Metro needs a static import per locale file (no dynamic glob import).
4. Optionally add `es: '🇪🇸'` to `LANGUAGE_FLAGS` (`i18n/index.ts`) — purely decorative; a language
   without an entry there still appears, just without a flag.

Nothing in `LanguageScreen` or any other screen changes.

## Theme provider (conventions)

- `ThemeProvider` (mounted in `src/app/_layout.tsx`) resolves the preference, injects the theme as
  CSS variables and syncs native chrome via `Appearance.setColorScheme`.
- `useTheme()` returns `{ preference, scheme, isDark, colors, setPreference }`. Use `colors` only where
  a class is impossible (icons, navigation theme).
- The preference is persisted under `roam.theme` (`light` | `dark` | `system`).

## i18n (conventions)

- Every visible string comes from `src/i18n/locales/{fr,en}.json`; keys are semantic
  (`recommendations.title`), never screen-coordinate based. French is the default language.
- `const { t } = useTranslation(); t('common.continue')` — keys are type-checked against `fr.json`.
- Interpolation uses **single braces**: `"{count} sélectionnés"` → `t('…', { count: 3 })`.
- Add every key to **both** files; a test fails if they diverge.
- Language is switched with `setLanguage('fr' | 'en')` (updates the UI immediately, persisted under
  `roam.language`).
