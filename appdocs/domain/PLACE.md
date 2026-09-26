# ROAM — Place (domain)

## Purpose
Represent persistent physical places independently of events.

```text
Place
├── id
├── name
├── description
├── address
├── city
├── latitude
├── longitude
├── categories[]
├── photos[]
├── openingHours
├── priceLevel
├── rating
├── reviewCount
├── attributes
├── source
└── externalUrl
```

## Google Places
Use Google for factual metadata such as identity, location, types, photos, hours, price level, ratings/review metadata and selected place attributes.

Request only fields needed by the feature.

## ROAM
Enrich places with atmosphere, energy, audience compatibility, best moments, estimated duration, normalized price and ROAM tags.

Do not present ROAM enrichment as provider facts.

## Current implementation

**Backend (API-03):** `Place` table (provider facts), provenance in `ExternalSource`, ROAM enrichment in
`RoamEnrichment` — `apps/api/apidocs/DATABASE_SCHEMA.md`. Served inside an experience's detail (API-07); the 2 mobile mock
places are migrated (DATA-1, `apps/api/apidocs/DATA_1_MIGRATION_REPORT.md`).

**Mobile (mock data):**

`apps/mobile/src/types/place.ts`: `Place` (`id`, `name`, `categoryId`, `description`, `address`, `coordinates`,
`price` as a `BudgetRange`, optional `imageUrl`, `tags`) and `Category` (`id`, `slug`). Mock content only; no provider,
no source metadata.

