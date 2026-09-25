# ROAM

ROAM helps people decide what to do by turning their current context (mood, time, budget, company,
location) into a realistic outing — not just a list of places.

## Status

Mobile app (Expo + React Native + TypeScript): a front-end prototype on mock data. API (`apps/api`, NestJS + Prisma +
PostgreSQL): technical foundation only, no domain endpoint yet. No web app.

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
├── appdocs/        # Shared documentation: product, domain, design, architecture
├── apps/
│   ├── mobile/     # React Native + Expo app (+ mobiledocs/)
│   └── api/        # NestJS + Prisma backend (+ apidocs/)
```

`apps/web` and `packages/*` are planned (see [`appdocs/architecture/ARCHITECTURE.md`](appdocs/architecture/ARCHITECTURE.md))
and do not exist yet.

## Documentation

Start with [`appdocs/DOCUMENTATION_INDEX.md`](appdocs/DOCUMENTATION_INDEX.md). Mobile commands and conventions:
[`apps/mobile/mobiledocs/DEVELOPMENT.md`](apps/mobile/mobiledocs/DEVELOPMENT.md); mobile decisions:
[`apps/mobile/mobiledocs/DECISIONS.md`](apps/mobile/mobiledocs/DECISIONS.md).
