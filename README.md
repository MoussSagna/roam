# ROAM

ROAM helps people decide what to do by turning their current context (mood, time, budget, company,
location) into a realistic outing — not just a list of places.

## Status

Mobile foundation only (Expo + React Native + TypeScript). The web app and the API are not started.
Product features are built sprint by sprint on top of mock data.

## Quick start

```bash
pnpm install
pnpm --filter mobile start   # or: pnpm mobile:start
```

Then open the app with Expo Go (scan the QR code) or press `i` / `a` for a simulator/emulator.

Requirements: Node ≥ 22.13 and pnpm ≥ 10 (developed with Node 24 and pnpm 12).

## Repository layout

```text
roam/
├── apps/
│   └── mobile/     # React Native + Expo app
└── docs/           # Product, UX, design and technical documentation
```

`apps/web`, `apps/api` and `packages/*` are planned (see `docs/04_TECH_STACK.md`) and do not exist yet.

## Documentation

Start with [`docs/README.md`](docs/README.md). Day-to-day commands and conventions are in
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md); technical decisions are in
[`docs/DECISIONS.md`](docs/DECISIONS.md).
