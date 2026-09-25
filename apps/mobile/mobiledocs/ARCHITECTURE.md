# Mobile — Architecture

The shared, cross-application architecture (planned web and API, domains, provider boundary) is
[`appdocs/architecture/ARCHITECTURE.md`](../../../appdocs/architecture/ARCHITECTURE.md). This document is the mobile app's own.

Only the **mobile** application exists (the repository layout and what is not built yet are in
[`appdocs/architecture/ARCHITECTURE.md`](../../../appdocs/architecture/ARCHITECTURE.md) → "Implementation status"). Mobile map: `react-native-maps` (sprint 7,
[`DECISIONS.md`](DECISIONS.md) D-70) on mock data only — no Places/Directions API. Rationale for every choice: [`DECISIONS.md`](DECISIONS.md). Commands:
[`DEVELOPMENT.md`](DEVELOPMENT.md); conventions: [`CONVENTIONS.md`](CONVENTIONS.md).

## Mobile stack (installed)

| Area             | Choice                                                                                                   | Version                |
| ---------------- | -------------------------------------------------------------------------------------------------------- | ---------------------- |
| Runtime          | Expo SDK / React Native / React                                                                          | 57.0 / 0.86.3 / 19.2.3 |
| Language         | TypeScript (strict)                                                                                      | 6.0                    |
| Navigation       | Expo Router (file-based, typed routes)                                                                   | 57.0                   |
| Styling          | NativeWind (stable) + Tailwind CSS                                                                       | 4.2.7 + 3.4.19         |
| Animation        | Moti on Reanimated + Worklets                                                                            | 0.30 on 4.5.1 / 0.10.1 |
| i18n             | i18next + react-i18next                                                                                  | 26.4 / 17.0            |
| Persistence      | `@react-native-async-storage/async-storage` (theme, language)                                            | 2.2.0                  |
| Fonts            | Plus Jakarta Sans + Inter (+ Newsreader, Mrs Saint Delafield for the mockups) via `@expo-google-fonts/*` | 0.4.x                  |
| Icons            | `lucide-react-native` (one import per icon) + `react-native-svg`                                         | 1.47 / 15.15           |
| Charts           | `react-native-gifted-charts` (donut chart only, sprint 5, [`DECISIONS.md`](DECISIONS.md) D-59)           | 1.4.78                 |
| Maps             | `react-native-maps` behind `RoamMap` (Apple Maps on iOS, Google Maps on Android, D-70)                   | 1.27.2                 |
| Location         | `expo-location`, foreground only, on request (D-89)                                                      | 57.0                   |
| Toasts           | `react-native-toast-message` behind `showToast` (D-54)                                                   | 2.5.2                  |
| Builds / updates | EAS Build, `expo-dev-client`, `expo-updates` ([`DEPLOYMENT.md`](DEPLOYMENT.md))                          | 57.0                   |
| Images           | `expo-image`                                                                                             | 57.0                   |
| Tests            | Jest 29 (`jest-expo`) + React Native Testing Library                                                     | 57.0 / 14.0            |
| Lint / format    | ESLint 9 (`eslint-config-expo`) + Prettier                                                               | 9.39 / 3.9             |
| Package manager  | pnpm workspaces                                                                                          | 12 (≥ 10 supported)    |

## Data access (mock now, API later)

```text
Screen → hook / service → Repository (interface) → mock implementation  (today)
                                                 → API implementation   (later)
```

- Interfaces: `src/services/repositories/types.ts`. Mock: `src/services/mock/`.
- `src/services/index.ts` exports `repositories`, the single place that picks the implementation.
- Screens and components import `repositories` (through a hook) — never a mock file, never `fetch`.
- Add a repository interface when the feature that needs it is built.
- The API implementation of the repositories comes with the backend (Phase C).

## Testing

Jest was chosen over Vitest (the document left it open). The foundation tests cover theme tokens and
contrast, theme provider (light/dark/system, persistence), i18n (FR/EN parity, switching), the mock
repositories, NativeWind UI components, the splash layout and screen, and the Welcome placeholder.

- Jest + `@testing-library/react-native` **v14**: `render`, `renderHook`, `fireEvent` and `act` are
  **async** — always `await` them.
- Use `renderWithProviders` (`src/test/`) so components get safe-area, theme and i18n.
- Reanimated / Worklets and AsyncStorage are mocked in `jest.setup.ts`; `react-native-maps` too, globally
  (`src/test/reactNativeMapsMock.tsx`, with `mockAnimateToRegion`). `expo-location` is mocked per test file (D-89).
- Priorities from [`ARCHITECTURE.md`](../../../appdocs/architecture/ARCHITECTURE.md): scoring, itinerary constraints, localization, theme, critical
  navigation, feedback persistence.
