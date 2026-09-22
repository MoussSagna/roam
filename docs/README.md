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

Current status (2026-09-22): the mobile onboarding is implemented on the front end (no backend, no database; the
profile creation is a simulation of about 10 s). Authentication screens are being built one at a time, front-end
only and simulated: Entry, Login, Register and Forgot password (email step) are done; the reset-code screen it
leads to is next — see `DECISIONS.md` D-28, D-29, D-31–D-33, `08_AGENT_TODO.md` and
`docs/SCREEN_INTEGRATION_WORKFLOW.md`.

The product is intentionally MVP-first. Do not expand scope without an explicit requirement.
