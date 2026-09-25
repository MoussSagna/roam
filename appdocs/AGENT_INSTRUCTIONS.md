# ROAM — Instructions for Coding Agent

## Mission

Build ROAM as an MVP focused on one core loop:

> Context → Recommendation → Experience → Itinerary → Real-world outing → Feedback

The agent must prioritize the core user journey over secondary features. The product is intentionally MVP-first:
do not expand scope without an explicit requirement.

## Product principles

1. ROAM recommends an outing, not just a place.
2. Context comes before discovery.
3. Recommendations must explain why they are relevant.
4. The map supports the experience; it is not the home screen.
5. The user keeps control and can modify the proposed itinerary.
6. Start with deterministic, explainable scoring. Do not introduce ML/LLM requirements for the MVP.
7. Avoid overengineering.
8. Build mobile-first while keeping the architecture ready for web.
9. All user-facing text must come from i18n files. Never hard-code French or English strings in components.
10. Theme must support light and dark modes from the beginning.

## Development rules

- Use TypeScript everywhere.
- Prefer small, reusable components.
- Keep business logic outside UI components.
- Keep API/data access separate from presentation.
- Validate user input.
- Handle loading, empty, error and success states.
- Keep accessibility in mind: touch targets, contrast, labels and semantic structure.
- Do not invent backend capabilities that are not implemented.
- Do not add social, booking, payments, monetization, conversational AI, ML or advanced gamification unless explicitly requested.

## Before implementing a feature

1. Check the relevant product/UX documentation.
2. Identify the route/screen.
3. Identify its state and user actions.
4. Identify required translation keys.
5. Identify theme tokens used by the screen.
6. Implement the smallest coherent version.
7. Add/update tests when appropriate.

## When requirements are ambiguous

Prefer the documented MVP behavior. If a decision is genuinely architectural and not documented, choose the simplest reversible option and document it in the decision log of the application concerned (mobile: [`apps/mobile/mobiledocs/DECISIONS.md`](../apps/mobile/mobiledocs/DECISIONS.md)). A decision shared by several applications goes in [`architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md) → "Decided since this proposal".

## Where the documentation lives

Start with [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md): shared product/domain/architecture in `appdocs/`, mobile implementation in
`apps/mobile/mobiledocs/`, API/backend in `apps/api/apidocs/`. Keep one source of truth per concept (see `README.md`).

## Language

Initial supported languages:
- French (`fr`)
- English (`en`)

Default language:
- French

## Theme

Supported modes:
- Light
- Dark
- System (recommended implementation option)

The user explicitly wants light/dark switching. The UI must not rely on hard-coded colors; use semantic theme tokens.

## Definition of done for a screen

A screen is not complete until:
- responsive layout is implemented;
- loading/empty/error states are considered where relevant;
- all visible copy is localized;
- light and dark themes work;
- navigation actions work;
- primary interactions work;
- no obvious console/runtime errors remain.
