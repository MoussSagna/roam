# ROAM — Provider Architecture

## Goal

External APIs must not leak into the mobile application or core domain model.

```text
Mobile
  ↓
ROAM API
  ↓
Application services
  ↓
Repositories
  ↓
Canonical ROAM models
  ↓
Provider adapters
  ├── Google Places
  ├── Ticketmaster
  └── Open Data
```

## Adapter responsibilities

1. Call the external provider.
2. Validate the response.
3. Map it to an internal provider DTO.
4. Normalize into ROAM models.
5. Record source metadata.
6. Handle provider-specific errors.

Keep provider DTOs separate from domain models.

## Failure handling

Providers can timeout, rate-limit, return partial data or no results. Fail gracefully.

## Secrets

API keys belong on the backend/server environment. Never put provider keys in React Native source or Git.
