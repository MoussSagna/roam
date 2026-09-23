# ROAM — Agent Handoff

This folder (`docs/`) is the development handoff for the ROAM MVP.

Read first:

1. `00_AGENT_INSTRUCTIONS.md`
2. `01_PRODUCT_CONTEXT.md`
3. `02_MVP_SCOPE.md`
4. `03_UX_SCREENS_AND_FLOWS.md`
5. `04_TECH_STACK.md`
6. `05_THEME_AND_I18N.md`
7. `06_DESIGN_SYSTEM.md`
8. `07_DATA_AND_RECOMMENDATION.md`
9. `08_AGENT_TODO.md`

Implementation documents (kept in sync with the code):

- `DEVELOPMENT.md` — install, run, commands, structure, conventions
- `DECISIONS.md` — technical decisions taken where the docs were silent
- `SCREEN_INTEGRATION_WORKFLOW.md` — the step-by-step procedure for integrating one screen at a time

Translation resources (used by the mobile app):

- `apps/mobile/src/i18n/locales/fr.json`
- `apps/mobile/src/i18n/locales/en.json`

Current status (2026-09-23): the mobile onboarding is implemented on the front end (no backend, no database; the
profile creation is a simulation of about 10 s). Authentication screens are now all built, front-end only and
simulated: Entry, Login, Register, and the whole Forgot password sub-flow (email → reset code → new password →
success) — see `DECISIONS.md` D-28, D-29, D-31–D-36, `08_AGENT_TODO.md` and `docs/SCREEN_INTEGRATION_WORKFLOW.md`.
The main navigation is also built: four tabs (Home, Discover, Favorites, Profile) behind a floating pill/bubble
tab bar that collapses into a bubble on scroll and expands on tap — see `DECISIONS.md` D-38 to D-43. **Home is
now the real discovery screen** (hero carousel, mood chips, popular/nearby/for-you sections, mock data only) —
see `DECISIONS.md` D-45; the `Discover` tab and the `Favorites` tab are still sprint 3 placeholder content.
**Experience detail and its full-screen photo gallery are built** (hero → gallery transition, reviews, similar
experiences, mock data only) — see `DECISIONS.md` D-48; the itinerary/journey screen its CTAs lead to is still
a placeholder. **Profile is now identity/activity/taste** (header, stats, "Parcours en cours", "Ce que
j'aime", favorites/history previews, a yearly activity summary) **and configuration moved to a new,
real Settings screen** (`/profile/settings`: account, préférences, langue/thème, aide, confidentialité,
déconnexion) — "Mes préférences", "Mes favoris", "Mon historique", "Mes statistiques", "Langue" and
"Thème" are all real, reached from both Profile and Settings where called for; summary cards, a
genre/city breakdown and a mood donut chart (`react-native-gifted-charts`); a dynamically derived,
never-hardcoded language list; Light/Dark/System selection — mock data only except the language/theme
systems, one screen at a time — see `DECISIONS.md` D-50, D-51, D-57, D-58, D-59, D-60, D-61, D-63; the
other screens Settings links to (edit profile, help, privacy) are still placeholders, each built in its
own session. **Logout now asks for confirmation** (a reusable `ConfirmationModal`, now living in
Settings) before calling the existing mocked `logout()`/navigation-reset flow, and a real navigation bug
is fixed: `AuthTopBar`'s back button no longer renders when there's nothing to go back to (previously
always rendered, so it could be pressed with no route behind it right after logout) — see `DECISIONS.md`
D-62.

The product is intentionally MVP-first. Do not expand scope without an explicit requirement.
